import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Color, ColorLike } from "engine/core/color";

import {
    LIGHT_DIRECTIONAL,
    LIGHT_PARAM_ENERGY,
    LIGHT_PARAM_INDIRECT_ENERGY,
    LIGHT_PARAM_SPECULAR,
    LIGHT_PARAM_RANGE,
    LIGHT_PARAM_SPOT_ANGLE,
    LIGHT_PARAM_CONTACT_SHADOW_SIZE,
    LIGHT_PARAM_SHADOW_MAX_DISTANCE,
    LIGHT_PARAM_SHADOW_NORMAL_BIAS,
    LIGHT_PARAM_SHADOW_BIAS,
    LIGHT_PARAM_SHADOW_BIAS_SPLIT_SCALE,
    LIGHT_PARAM_SHADOW_SPLIT_1_OFFSET,
    LIGHT_PARAM_SHADOW_SPLIT_2_OFFSET,
    LIGHT_PARAM_SHADOW_SPLIT_3_OFFSET,
} from "engine/servers/visual_server";
import { VSG } from "engine/servers/visual/visual_server_globals";

import { NOTIFICATION_ENTER_TREE } from "../main/node";
import { NOTIFICATION_VISIBILITY_CHANGED_3D } from "./spatial";
import { VisualInstance } from "./visual_instance";

export class Light extends VisualInstance {
    get class() { return "Light" }

    /**
     * @param {number} p_type
     */
    constructor(p_type) {
        super();

        this.light_color = new Color;
        this.param = [
            0, // energy
            0, // indirect energy
            0, // specular
            0, // range
            0, // spot angle
        ];
        this.light_negative = false;
        this.reverse_cull = false;
        this.cull_mask = 0xFFFFFFFF;
        this.type = p_type;

        this.shadow_bias = 0;
        this.shadow_color = new Color(0, 0, 0, 1);
        this.shadow_contact = 0;
        this.shadow_enabled = false;
        this.shadow_reverse_cull_face = false;
        this.shadow_mode = 0;

        /** @type {import('engine/drivers/webgl/rasterizer_storage').Light_t} */
        this.light = null;

        this.light = VSG.storage.light_create(p_type);
        VSG.scene.instance_set_base(this.instance, this.light);

        this.set_light_color_n(1, 1, 1, 1);
        this.set_light_negative(false);

        this.set_param(LIGHT_PARAM_ENERGY, 1);
        this.set_param(LIGHT_PARAM_INDIRECT_ENERGY, 1);
        this.set_param(LIGHT_PARAM_SPECULAR, 0.5);
        this.set_param(LIGHT_PARAM_RANGE, 5);
        this.set_param(LIGHT_PARAM_SPOT_ANGLE, 45);
        this.set_param(LIGHT_PARAM_CONTACT_SHADOW_SIZE, 0);
        this.set_param(LIGHT_PARAM_SHADOW_MAX_DISTANCE, 0);
        this.set_param(LIGHT_PARAM_SHADOW_SPLIT_1_OFFSET, 0.1);
        this.set_param(LIGHT_PARAM_SHADOW_SPLIT_2_OFFSET, 0.2);
        this.set_param(LIGHT_PARAM_SHADOW_SPLIT_3_OFFSET, 0.5);
        this.set_param(LIGHT_PARAM_SHADOW_NORMAL_BIAS, 0);
        this.set_param(LIGHT_PARAM_SHADOW_BIAS, 0.15);

        this.d_data.disable_scale = true;
    }

    /**
     * @param {ColorLike} p_color
     */
    set_light_color(p_color) {
        this.light_color.copy(p_color);
        VSG.storage.light_set_color(this.light, this.light_color);
    }

    /**
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} a
     */
    set_light_color_n(r, g, b, a) {
        this.light_color.set(r, g, b, a);
        VSG.storage.light_set_color(this.light, this.light_color);
    }

    get light_energy() {
        return this.param[0];
    }

    /**
     * @param {number} p_energy
     */
    set_light_energy(p_energy) {
        this.param[0] = p_energy;
        VSG.storage.light_set_param(this.light, 0, p_energy);
    }

    /**
     * @param {boolean} p_enable
     */
    set_light_negative(p_enable) {
        this.light_negative = p_enable;
        VSG.storage.light_set_negative(this.light, p_enable);
    }

    /**
     * @param {number} p_param
     * @param {number} p_value
     */
    set_param(p_param, p_value) {
        this.param[p_param] = p_value;
        VSG.storage.light_set_param(this.light, p_param, p_value);
    }

    set_shadow_bias() { }
    /**
     * @param {ColorLike} p_shadow_color
     */
    set_shadow_color(p_shadow_color) {
        this.shadow_color.copy(p_shadow_color);
        VSG.storage.light_set_shadow_color(this.light, p_shadow_color);
    }
    set_shadow_contact() { }
    /**
     * @param {boolean} p_enable
     */
    set_shadow_enabled(p_enable) {
        this.shadow_enabled = p_enable;
        VSG.storage.light_set_shadow(this.light, p_enable);
    }
    set_shadow_reverse_cull_face() { }
    set_directional_shadow_mode(mode) {
        this.shadow_mode = mode;
        VSG.storage.light_set_shadow_mode(this.light, mode);
    }

    /* virtual methods */

    free() {
        VSG.scene.instance_set_base(this.instance, null);

        return super.free();
    }

    _load_data(data) {
        super._load_data(data);

        if (data.light_color) this.set_light_color(data.light_color);
        if (data.light_energy) this.set_light_energy(data.light_energy);
        if (data.light_negative) this.set_light_negative(data.light_negative);

        if (data.shadow_color) this.set_shadow_color(data.shadow_color);
        if (data.shadow_enabled !== undefined) this.set_shadow_enabled(data.shadow_enabled);
        if (data.directional_shadow_mode !== undefined) this.set_directional_shadow_mode(data.directional_shadow_mode);
        if (data.directional_shadow_max_distance !== undefined) this.set_param(LIGHT_PARAM_SHADOW_MAX_DISTANCE, data.directional_shadow_max_distance);

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        if (p_what === NOTIFICATION_VISIBILITY_CHANGED_3D) {
            this._update_visibility();
        }

        if (p_what === NOTIFICATION_ENTER_TREE) {
            this._update_visibility();
        }
    }
}

node_class_map["Light"] = GDCLASS(Light, VisualInstance)


export class DirectionalLight extends Light {
    get class() { return "DirectionalLight" }

    constructor() {
        super(LIGHT_DIRECTIONAL);

        /* only ortho is supported right now */
        this.shadow_mode = 0;
        this.shadow_max_distance = 0;
        this.shadow_depth_range = 0;
        this.shadow_depth_bias = 0;

        this.set_param(LIGHT_PARAM_SHADOW_NORMAL_BIAS, 0.8);
        this.set_param(LIGHT_PARAM_SHADOW_BIAS, 0.1);
        this.set_param(LIGHT_PARAM_SHADOW_MAX_DISTANCE, 100);
        this.set_param(LIGHT_PARAM_SHADOW_BIAS_SPLIT_SCALE, 0.25);
        // TODO: this.set_shadow_depth_range(LIGHT_PARAM_SHADOW_DEPTH_RANGE_STABLE);
    }

    set_shadow_mode(p) { }
    set_shadow_max_distance(p) { }
    set_shadow_depth_bias(p) { }
    set_shadow_depth_range(p) { }

    /* virtual methods */

    _load_data(data) {
        super._load_data(data);

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) { }
}

node_class_map["DirectionalLight"] = GDCLASS(DirectionalLight, Light)
