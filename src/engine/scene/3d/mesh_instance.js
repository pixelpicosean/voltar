import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";

import { VSG } from "engine/servers/visual/visual_server_globals";

import { Mesh } from "../resources/mesh";
import { Material } from "../resources/material";
import { GeometryInstance } from "./visual_instance";

/**
 * @typedef {import('engine/drivers/webgl/rasterizer_storage').Mesh_t} Mesh_t
 */

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
            this.mesh.disconnect('changed', this._mesh_changed, this);
            this.materials.length = 0;
        }

        this.mesh = mesh;

        if (this.mesh) {
            this.mesh.connect('changed', this._mesh_changed, this);
            this.materials.length = mesh.get_surface_count();
            this.set_base(mesh.mesh);
        }
    }

    /**
     * @param {Mesh_t} p_base
     */
    set_base(p_base) {
        VSG.scene.instance_set_base(this.instance, p_base);
        this.base = p_base;
    }

    /**
     * @param {number} p_surface
     * @param {Material} p_material
     */
    set_surface_material(p_surface, p_material) {
        this.materials[p_surface] = p_material;
        VSG.scene.instance_set_surface_material(this.instance, p_surface, p_material.material);
    }

    /* virtual method */

    _load_data(data) {
        super._load_data(data);

        if (data.mesh) this.set_mesh(data.mesh);
        if (data.material && data.material.length) {
            for (let i = 0; i < data.material.length; i++) {
                this.set_surface_material(i, data.material[i]);
            }
        }

        return this;
    }

    _mesh_changed() {
        this.materials.length = this.mesh.get_surface_count();
    }
}

node_class_map["MeshInstance"] = GDCLASS(MeshInstance, GeometryInstance);
