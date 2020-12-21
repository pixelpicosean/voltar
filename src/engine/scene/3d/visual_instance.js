import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";

import { VSG } from "engine/servers/visual/visual_server_globals.js";

import { Material } from "../resources/material.js";
import { NOTIFICATION_TRANSFORM_CHANGED } from "../const";
import {
    Spatial,
    NOTIFICATION_ENTER_WORLD,
    NOTIFICATION_EXIT_WORLD,
    NOTIFICATION_VISIBILITY_CHANGED_3D,
} from "./spatial.js";


export class VisualInstance extends Spatial {
    get class() { return "VisualInstance" }

    constructor() {
        super();

        /** @type {import('engine/drivers/webgl/rasterizer_storage').Mesh_t} */
        this.base = null;
        this.instance = VSG.scene.instance_create();
        this.layers = 1;

        VSG.scene.instance_attach_object_instance(this.instance, this);
        this.set_notify_transform(true);
    }

    /**
     * @param {import('engine/drivers/webgl/rasterizer_storage').Mesh_t} p_base
     */
    set_base(p_base) {
        VSG.scene.instance_set_base(this.instance, p_base);
        this.base = p_base;
    }

    /* virtual method */

    _load_data(data) {
        super._load_data(data);

        if (data.layers) {
            this.layers = data.layers;
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_WORLD: {
                VSG.scene.instance_set_scenario(this.instance, this.get_world().scenario);
                this._update_visibility();
            } break;
            case NOTIFICATION_TRANSFORM_CHANGED: {
                let gt = this.get_global_transform();
                VSG.scene.instance_set_transform(this.instance, gt);
            } break;
            case NOTIFICATION_EXIT_WORLD: {
                VSG.scene.instance_set_scenario(this.instance, null);
            } break;
            case NOTIFICATION_VISIBILITY_CHANGED_3D: {
                this._update_visibility();
            } break;
        }
    }

    _update_visibility() {
        if (!this.is_inside_tree()) return;

        VSG.scene.instance_set_visible(this.instance, this.is_visibile_in_tree());
    }
}
node_class_map["VisualInstance"] = GDCLASS(VisualInstance, Spatial);

export class GeometryInstance extends VisualInstance {
    get class() { return "GeometryInstance" }

    constructor() {
        super();

        this.cast_shadow = 1;

        this.extra_cull_margin = 0;

        this.lod_min_distance = 0;
        this.lod_max_distance = 0;
        this.lod_min_hysteresis = 0;
        this.lod_max_hysteresis = 0;

        /** @type {Material} */
        this.material_override = null;

        this.use_in_baked_light = false;
    }

    _load_data(data) {
        super._load_data(data);

        if (data.material_override) {
            this.set_material_override(data.material_override);
        }

        return this;
    }

    /**
     * @param {Material} p_material
     */
    set_material_override(p_material) {
        this.material_override = p_material;
        VSG.scene.instance_geometry_set_material_override(this.instance, p_material ? p_material.material : null);
    }
}
node_class_map["GeometryInstance"] = GDCLASS(GeometryInstance, Spatial);
