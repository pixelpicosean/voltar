import { GDCLASS } from "engine/core/v_object";
import { res_class_map, get_resource_map } from "engine/registry";
import {
    deg2rad,
    rad2deg,
    clamp,
    ease,
} from "engine/core/math/math_funcs";
import { Math_LN2 } from "engine/core/math/math_defs";
import { Vector3 } from "engine/core/math/vector3";
import { Basis } from "engine/core/math/basis";
import { Color, ColorLike } from "engine/core/color";
import { Resource } from "engine/core/resource";
import { SelfList } from "engine/core/self_list";

import {
    Texture,
    PIXEL_FORMAT_RGBA8,
} from "./texture";
import { VSG } from "engine/servers/visual/visual_server_globals";
import { TEXTURE_TYPE_2D } from "engine/servers/visual_server";

const HALF_PI = Math.PI / 2;

export const RADIANCE_SIZE_32 = 0;
export const RADIANCE_SIZE_64 = 1;
export const RADIANCE_SIZE_128 = 2;
export const RADIANCE_SIZE_256 = 3;
export const RADIANCE_SIZE_512 = 4;
export const RADIANCE_SIZE_1024 = 5;
export const RADIANCE_SIZE_2048 = 6;

const RADIANCE_SIZES = [
    32, 64, 128, 256, 512, 1024, 2048,
];

const PROC_TEX_SIZES = [
    256, 512, 1024, 2048, 4096,
];

const color_exp = (() => {
    const pow2to9 = 512;
    const B = 15;
    const N = 9;

    const sharedexp = 65408;

    function color_exp(p_color: ColorLike) {
        let cR = Math.max(0, Math.min(sharedexp), p_color.r);
        let cG = Math.max(0, Math.min(sharedexp), p_color.g);
        let cB = Math.max(0, Math.min(sharedexp), p_color.b);

        let cMax = Math.max(cR, cG, cB);

        let expp = Math.max(-B - 1, Math.floor(Math.log(cMax) / Math_LN2)) + 1 + B;

        let sMax = Math.floor((cMax / Math.pow(2.0, expp - B - N)) + 0.5);

        let exps = expp + 1;

        if (0.0 <= sMax && sMax < pow2to9) {
            exps = expp;
        }

        p_color.r = p_color.r < 0.0031308 ? 12.92 * p_color.r : 1.055 * Math.pow(p_color.r, 1 / 2.4) - 0.055;
        p_color.g = p_color.g < 0.0031308 ? 12.92 * p_color.g : 1.055 * Math.pow(p_color.g, 1 / 2.4) - 0.055;
        p_color.b = p_color.b < 0.0031308 ? 12.92 * p_color.b : 1.055 * Math.pow(p_color.b, 1 / 2.4) - 0.055;

        p_color.r *= 255;
        p_color.g *= 255;
        p_color.b *= 255;
        p_color.a *= 255;
    }
    return color_exp;
})()

export class Sky extends Resource {
    get class() { return "Sky" }

    radiance_size = RADIANCE_SIZE_128;

    /**
     * @param {number} p_size
     */
    set_radiance_size(p_size: number) {
        this.radiance_size = p_size;
        this._radiance_changed();
    }

    /* virtual */

    _radiance_changed() { }
}
GDCLASS(Sky, Resource)


export class PanoramaSky extends Sky {
    get class() { return "PanoramaSky" }

    sky = VSG.storage.sky_create();
    panorama: Texture = null;

    panorama_key = '';

    /**
     * @param {Texture | string} p_panorama
     */
    set_panorama(p_panorama: Texture | string) {
        if (typeof p_panorama === "string") {
            this.panorama_key = /** @type {string} */(p_panorama);

            let self = this;
            VSG.storage.onload_update_list.add(new SelfList(() => {
                let res = get_resource_map();
                self.set_panorama(res[self.panorama_key]);
            }));
        } else {
            this.panorama = p_panorama;
        }

        if (this.panorama) {
            this._radiance_changed();
        } else {
            VSG.storage.sky_set_texture(this.sky, null, 0);
        }
    }

    /* virtual */

    _load_data(data: any) {
        for (let k in data) {
            if (this.hasOwnProperty(k)) {
                // @ts-ignore
                if (typeof this[`set_${k}`] === "function") {
                    // @ts-ignore
                    this[`set_${k}`](data[k]);
                }
            }
        }
        return this;
    }

    _radiance_changed() {
        if (this.panorama) {
            VSG.storage.sky_set_texture(this.sky, this.panorama.get_rid(), RADIANCE_SIZES[this.radiance_size]);
        }
    }
}
// @ts-ignore
res_class_map["PanoramaSky"] = GDCLASS(PanoramaSky, Sky)


export const PROCEDURAL_TEXTURE_SIZE_256 = 0;
export const PROCEDURAL_TEXTURE_SIZE_512 = 1;
export const PROCEDURAL_TEXTURE_SIZE_1024 = 2;
export const PROCEDURAL_TEXTURE_SIZE_2048 = 3;
export const PROCEDURAL_TEXTURE_SIZE_4096 = 4;

export class ProceduralSky extends Sky {
    get class() { return "ProceduralSky" }

    sky_top_color = Color.hex(0xa5d6f1);
    sky_horizon_color = Color.hex(0xd6eafa);
    sky_curve = 0.09;
    sky_energy = 1;

    ground_bottom_color = Color.hex(0x282f36);
    ground_horizon_color = Color.hex(0x6c655f);
    ground_curve = 0.02;
    ground_energy = 1;

    sun_color = new Color(1, 1, 1, 1);
    sun_latitude = 35;
    sun_longitude = 0;
    sun_angle_min = 1;
    sun_angle_max = 100;
    sun_curve = 0.05;
    sun_energy = 1;

    texture_size = PROCEDURAL_TEXTURE_SIZE_1024;

    sky = VSG.storage.sky_create();
    texture = VSG.storage.texture_create();

    update_queued = false;
    first_time = true;

    constructor() {
        super();

        this._queue_update();
    }

    /**
     * @param {number} p_value
     */
    set_texture_size(p_value: number) {
        this.texture_size = p_value;
        this._queue_update();
    }

    /**
     * @param {ColorLike} p_color
     */
    set_sky_top_color(p_color: ColorLike) {
        this.sky_top_color.copy(p_color);
        this._queue_update();
    }
    /**
     * @param {ColorLike} p_color
     */
    set_sky_horizon_color(p_color: ColorLike) {
        this.sky_horizon_color.copy(p_color);
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sky_curve(p_value: number) {
        this.sky_curve = p_value;
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sky_energy(p_value: number) {
        this.sky_energy = p_value;
        this._queue_update();
    }

    /**
     * @param {ColorLike} p_color
     */
    set_ground_bottom_color(p_color: ColorLike) {
        this.ground_bottom_color.copy(p_color);
        this._queue_update();
    }
    /**
     * @param {ColorLike} p_color
     */
    set_ground_horizon_color(p_color: ColorLike) {
        this.ground_horizon_color.copy(p_color);
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_ground_curve(p_value: number) {
        this.ground_curve = p_value;
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_ground_energy(p_value: number) {
        this.ground_energy = p_value;
        this._queue_update();
    }

    /**
     * @param {ColorLike} p_color
     */
    set_sun_color(p_color: ColorLike) {
        this.sun_color.copy(p_color);
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sun_latitude(p_value: number) {
        this.sun_latitude = p_value;
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sun_longitude(p_value: number) {
        this.sun_longitude = p_value;
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sun_angle_min(p_value: number) {
        this.sun_angle_min = p_value;
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sun_angle_max(p_value: number) {
        this.sun_angle_max = p_value;
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sun_curve(p_value: number) {
        this.sun_curve = p_value;
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sun_energy(p_value: number) {
        this.sun_energy = p_value;
        this._queue_update();
    }

    /* virtual */

    _load_data(data: any) {
        for (let k in data) {
            if (this.hasOwnProperty(k)) {
                // @ts-ignore
                if (typeof this[`set_${k}`] === "function") {
                    // @ts-ignore
                    this[`set_${k}`](data[k]);
                }
            }
        }
        return this;
    }

    _radiance_changed() {
        if (this.update_queued) return;

        VSG.storage.sky_set_texture(this.sky, this.texture, RADIANCE_SIZES[this.radiance_size]);
    }

    _generate_sky() {
        this.update_queued = false;

        let w = PROC_TEX_SIZES[this.texture_size];
        let h = w / 2;

        let imgdata = new Uint8Array(w * h * 4);

        let sky_top_linear = this.sky_top_color.to_linear(_i_generate_sky_color_1);
        let sky_horizon_linear = this.sky_horizon_color.to_linear(_i_generate_sky_color_2);

        let ground_bottom_linear = this.ground_bottom_color.to_linear(_i_generate_sky_color_3);
        let ground_horizon_linear = this.ground_horizon_color.to_linear(_i_generate_sky_color_4);

        let sun_linear = _i_generate_sky_color_5.copy(this.sun_color);
        sun_linear.r *= this.sun_energy;
        sun_linear.g *= this.sun_energy;
        sun_linear.b *= this.sun_energy;

        let sun = _i_generate_sky_vec3_1.set(0, 0, -1);

        let axis = _i_generate_sky_vec3_2.set(0, 0, 0);
        let basis = _i_generate_sky_basis.identity();

        basis.set_axis_angle(axis.set(1, 0, 0), deg2rad(this.sun_latitude)).xform(sun, sun);
        basis.set_axis_angle(axis.set(0, 1, 0), deg2rad(this.sun_longitude)).xform(sun, sun);

        sun.normalize();

        let normal = _i_generate_sky_vec3_3.set(0, 0, 0);
        let color = _i_generate_sky_color_6.set(1, 1, 1, 1);

        for (let i = 0; i < w; i++) {
            let u = i / (w - 1);
            let phi = u * 2 * Math.PI;

            for (let j = 0; j < h; j++) {
                let v = j / (h - 1);
                let theta = v * Math.PI;

                normal.set(
                    -Math.sin(phi) * Math.sin(theta),
                    Math.cos(theta),
                    -Math.cos(phi) * Math.sin(theta)
                ).normalize();

                let v_angle = Math.acos(clamp(normal.y, -1, 1));

                if (normal.y < 0) {
                    /* ground */

                    let c = (v_angle - HALF_PI) / HALF_PI;
                    ground_horizon_linear.linear_interpolate(ground_bottom_linear, ease(c, this.ground_curve), color);
                    color.r *= this.ground_energy;
                    color.g *= this.ground_energy;
                    color.b *= this.ground_energy;
                } else {
                    let c = v_angle / HALF_PI;
                    // color.copy(sky_horizon_linear).linear_interpolate(sky_top_linear, ease(1 - c, this.sky_curve));
                    let f = ease(1 - c, this.sky_curve);
                    sky_horizon_linear.linear_interpolate(sky_top_linear, f, color);
                    color.r *= this.sky_energy;
                    color.g *= this.sky_energy;
                    color.b *= this.sky_energy;

                    let sun_angle = rad2deg(Math.acos(clamp(sun.dot(normal), -1, 1)));

                    if (sun_angle < this.sun_angle_min) {
                        color.blend(sun_linear);
                    } else if (sun_angle < this.sun_angle_max) {
                        let c2 = (sun_angle - this.sun_angle_min) / (this.sun_angle_max - this.sun_angle_min);
                        c2 = ease(c2, this.sun_curve);

                        color.blend(sun_linear).linear_interpolate(color, c2, color);
                    }
                }

                color_exp(color);

                imgdata[(j * w + i) * 4 + 0] = color.r;
                imgdata[(j * w + i) * 4 + 1] = color.g;
                imgdata[(j * w + i) * 4 + 2] = color.b;
                imgdata[(j * w + i) * 4 + 3] = color.a;
            }
        }

        return {
            width: w,
            height: h,
            data: imgdata,
        }
    }
    _update_sky() {
        if (this.first_time) {
            this.first_time = false;
        }

        let img = this._generate_sky();
        VSG.storage.texture_allocate(this.texture, img.width, img.height, 0, PIXEL_FORMAT_RGBA8, TEXTURE_TYPE_2D, { FILTER: true, REPEAT: true });
        VSG.storage.texture_set_data(this.texture, img.data);
        this._radiance_changed();
    }
    _queue_update() {
        if (this.update_queued) return;

        this.update_queued = true;
        this.call_deferred("_update_sky");
    }
}
res_class_map["ProceduralSky"] = GDCLASS(ProceduralSky, Sky)

const _i_generate_sky_color_1 = new Color;
const _i_generate_sky_color_2 = new Color;
const _i_generate_sky_color_3 = new Color;
const _i_generate_sky_color_4 = new Color;
const _i_generate_sky_color_5 = new Color;
const _i_generate_sky_color_6 = new Color;

const _i_generate_sky_vec3_1 = new Vector3;
const _i_generate_sky_vec3_2 = new Vector3;
const _i_generate_sky_vec3_3 = new Vector3;

const _i_generate_sky_basis = new Basis;
