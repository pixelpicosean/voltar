import { Mesh } from "../resources/mesh";
import { Material } from "../resources/material";

import { GeometryInstance } from "./visual_instance";
import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";

export class MeshInstance extends GeometryInstance {
    get class() { return "MeshInstance" }

    constructor() {
        super();

        /** @type {Mesh} */
        this.mesh = null;
        this.skeleton_path = "";
        /** @type {Material[]} */
        this.materials = [];
    }

    /**
     * @param {Mesh} mesh
     */
    set_mesh(mesh) {
        if (mesh === this.mesh) return;

        if (this.mesh) {
            this.materials.length = 0;
        }

        this.mesh = mesh;

        if (this.mesh) {
            this.materials.length = mesh.get_surface_count();
            this.set_base(mesh.mesh);
        }
    }

    set_base(mesh) {

    }

    /* virtual method */

    _load_data(data) {
        super._load_data(data);

        if (data.mesh) this.set_mesh(data.mesh);

        return this;
    }
}

node_class_map["MeshInstance"] = GDCLASS(MeshInstance, GeometryInstance);
