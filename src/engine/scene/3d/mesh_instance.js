import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object.js";

import { VSG } from "engine/servers/visual/visual_server_globals.js";

import { Mesh } from "../resources/mesh.js";
import { Material } from "../resources/material.js";
import { Skin } from "../resources/skin.js";
import { NOTIFICATION_ENTER_TREE } from "../main/node.js";
import { GeometryInstance } from "./visual_instance.js";
import {
    SkinReference,
    Skeleton,
} from "./skeleton.js";

export class MeshInstance extends GeometryInstance {
    get class() { return "MeshInstance" }

    constructor() {
        super();

        /** @type {Mesh} */
        this.mesh = null;
        /** @type {Skin} */
        this.skin = null;
        /** @type {Skin} */
        this.skin_internal = null;
        /** @type {SkinReference} */
        this.skin_ref = null;
        this.skeleton_path = "..";

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
     * @param {Skin} p_skin
     */
    set_skin(p_skin) {
        this.skin_internal = p_skin;
        this.skin = p_skin;
        if (!this.is_inside_tree()) return;
        this._resolve_skeleton_path();
    }

    /**
     * @param {import('engine/drivers/webgl/rasterizer_storage').Mesh_t} p_base
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
        if (data.skin) this.set_skin(data.skin);

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        if (p_what === NOTIFICATION_ENTER_TREE) {
            this._resolve_skeleton_path();
        }
    }

    /* private */

    _mesh_changed() {
        this.materials.length = this.mesh.get_surface_count();
    }

    _resolve_skeleton_path() {
        /** @type {SkinReference} */
        let new_skin_ref = null;

        if (this.skeleton_path) {
            let skeleton = /** @type {Skeleton} */(this.get_node(this.skeleton_path));
            if (skeleton && skeleton.is_skeleton) {
                new_skin_ref = skeleton.register_skin(this.skin_internal);
                if (!this.skin_internal) {
                    this.skin_internal = new_skin_ref.skin;
                }
            }
        }

        this.skin_ref = new_skin_ref;

        VSG.scene.instance_attach_skeleton(this.instance, this.skin_ref ? this.skin_ref.skeleton : null);
    }
}

node_class_map["MeshInstance"] = GDCLASS(MeshInstance, GeometryInstance);
