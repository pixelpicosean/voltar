import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";

import { Mesh_t } from "engine/drivers/webgl/rasterizer_storage";

import { Spatial } from "./spatial";
import { VSG } from "engine/servers/visual/visual_server_globals";

export class VisualInstance extends Spatial {
    get class() { return "VisualInstance" }

    constructor() {
        super();

        /** @type {Mesh_t} */
        this.base = null;
        this.instance = null;
        this.layers = 0;
    }

    /**
     * @param {Mesh_t} p_base
     */
    set_base(p_base) {
        VSG.scene.instance_set_base(this.instance, p_base);
        this.base = p_base;
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
