import { res_class_map } from "engine/registry";
import { VObject } from "engine/core/v_object";

import { Mesh_t } from "engine/drivers/webgl/rasterizer_storage";

export class Mesh extends VObject {
    constructor() {
        super();

        this.triangle_mesh = null;

        /** @type {Mesh_t} */
        this.mesh = null;
    }

    get_surface_count() { return 0 }

    clear_cache() {
        this.triangle_mesh = null;
    }
}
res_class_map["Mesh"] = Mesh;
