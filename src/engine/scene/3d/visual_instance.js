import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";

import { VSG } from "engine/servers/visual/visual_server_globals";

import {
    Spatial,
    NOTIFICATION_ENTER_WORLD,
    NOTIFICATION_EXIT_WORLD,
    NOTIFICATION_VISIBILITY_CHANGED_3D,
} from "./spatial";
import { NOTIFICATION_TRANSFORM_CHANGED } from "../const";

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
    }
}
node_class_map["GeometryInstance"] = GDCLASS(GeometryInstance, Spatial);
