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

    /**
     * @param {ColorLike} p_color
     */
    function color_exp(p_color) {
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
    constructor() {
        super();

        this.radiance_size = RADIANCE_SIZE_128;
    }

    /**
     * @param {number} p_size
     */
    set_radiance_size(p_size) {
        this.radiance_size = p_size;
        this._radiance_changed();
    }

    /* virtual */

    _radiance_changed() { }
}
GDCLASS(Sky, Resource)


export class PanoramaSky extends Sky {
    get class() { return "PanoramaSky" }
    constructor() {
        super();

        this.sky = VSG.storage.sky_create();
        /** @type {Texture} */
        this.panorama = null;

        this.panorama_key = '';
    }

    /**
     * @param {Texture | string} p_panorama
     */
    set_panorama(p_panorama) {
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

    _load_data(data) {
        for (let k in data) {
            if (this.hasOwnProperty(k)) {
                if (typeof this[`set_${k}`] === "function") {
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
    constructor() {
        super();

        this.sky_top_color = Color.hex(0xa5d6f1);
        this.sky_horizon_color = Color.hex(0xd6eafa);
        this.sky_curve = 0.09;
        this.sky_energy = 1;

        this.ground_bottom_color = Color.hex(0x282f36);
        this.ground_horizon_color = Color.hex(0x6c655f);
        this.ground_curve = 0.02;
        this.ground_energy = 1;

        this.sun_color = new Color(1, 1, 1, 1);
        this.sun_latitude = 35;
        this.sun_longitude = 0;
        this.sun_angle_min = 1;
        this.sun_angle_max = 100;
        this.sun_curve = 0.05;
        this.sun_energy = 1;

        this.texture_size = PROCEDURAL_TEXTURE_SIZE_1024;

        this.sky = VSG.storage.sky_create();
        this.texture = VSG.storage.texture_create();

        this.update_queued = false;
        this.first_time = true;

        this._queue_update();
    }

    /**
     * @param {number} p_value
     */
    set_texture_size(p_value) {
        this.texture_size = p_value;
        this._queue_update();
    }

    /**
     * @param {ColorLike} p_color
     */
    set_sky_top_color(p_color) {
        this.sky_top_color.copy(p_color);
        this._queue_update();
    }
    /**
     * @param {ColorLike} p_color
     */
    set_sky_horizon_color(p_color) {
        this.sky_horizon_color.copy(p_color);
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sky_curve(p_value) {
        this.sky_curve = p_value;
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sky_energy(p_value) {
        this.sky_energy = p_value;
        this._queue_update();
    }

    /**
     * @param {ColorLike} p_color
     */
    set_ground_bottom_color(p_color) {
        this.ground_bottom_color.copy(p_color);
        this._queue_update();
    }
    /**
     * @param {ColorLike} p_color
     */
    set_ground_horizon_color(p_color) {
        this.ground_horizon_color.copy(p_color);
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_ground_curve(p_value) {
        this.ground_curve = p_value;
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_ground_energy(p_value) {
        this.ground_energy = p_value;
        this._queue_update();
    }

    /**
     * @param {ColorLike} p_color
     */
    set_sun_color(p_color) {
        this.sun_color.copy(p_color);
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sun_latitude(p_value) {
        this.sun_latitude = p_value;
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sun_longitude(p_value) {
        this.sun_longitude = p_value;
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sun_angle_min(p_value) {
        this.sun_angle_min = p_value;
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sun_angle_max(p_value) {
        this.sun_angle_max = p_value;
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sun_curve(p_value) {
        this.sun_curve = p_value;
        this._queue_update();
    }
    /**
     * @param {number} p_value
     */
    set_sun_energy(p_value) {
        this.sun_energy = p_value;
        this._queue_update();
    }

    /* virtual */

    _load_data(data) {
        for (let k in data) {
            if (this.hasOwnProperty(k)) {
                if (typeof this[`set_${k}`] === "function") {
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

        let sky_top_linear = this.sky_top_color.to_linear();
        let sky_horizon_linear = this.sky_horizon_color.to_linear();

        let ground_bottom_linear = this.ground_bottom_color.to_linear();
        let ground_horizon_linear = this.ground_horizon_color.to_linear();

        let sun_linear = this.sun_color.clone();
        sun_linear.r *= this.sun_energy;
        sun_linear.g *= this.sun_energy;
        sun_linear.b *= this.sun_energy;

        let sun = Vector3.new(0, 0, -1);

        let axis = Vector3.new();
        let basis = Basis.new();

        basis.set_axis_angle(axis.set(1, 0, 0), deg2rad(this.sun_latitude)).xform(sun, sun);
        basis.set_axis_angle(axis.set(0, 1, 0), deg2rad(this.sun_longitude)).xform(sun, sun);

        sun.normalize();

        let normal = Vector3.new();
        let color = Color.new();

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

        Color.free(color);
        Vector3.free(normal);
        Basis.free(basis);
        Vector3.free(axis);
        Vector3.free(sun);
        Color.free(sun_linear);
        Color.free(ground_horizon_linear);
        Color.free(ground_bottom_linear);
        Color.free(sky_horizon_linear);
        Color.free(sky_top_linear);

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
