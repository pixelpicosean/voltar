import { res_class_map } from "engine/registry";

import { Mesh_t } from "engine/drivers/webgl/rasterizer_storage";

export class Mesh {
    constructor() {
        /** @type {Mesh_t} */
        this.mesh = null;
    }

    get_surface_count() { return 0 }
}
res_class_map["Mesh"] = Mesh;
