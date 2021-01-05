import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";

import { VSG } from "engine/servers/visual/visual_server_globals";

import { Mesh } from "../resources/mesh";
import { Material } from "../resources/material";
import { Skin } from "../resources/skin";
import { NOTIFICATION_ENTER_TREE } from "../main/node";
import { GeometryInstance } from "./visual_instance";
import {
    SkinReference,
    Skeleton,
} from "./skeleton";

export class MeshInstance extends GeometryInstance {
    get class() { return "MeshInstance" }

    mesh: Mesh = null;
    skin: Skin = null;
    skin_internal: Skin = null;
    skin_ref: SkinReference = null;
    skeleton_path = "..";

    materials: Material[] = [];

    set_mesh(mesh: Mesh) {
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
    set_skin(p_skin: Skin) {
        this.skin_internal = p_skin;
        this.skin = p_skin;
        if (!this.is_inside_tree()) return;
        this._resolve_skeleton_path();
    }

    set_base(p_base: import('engine/drivers/webgl/rasterizer_storage').Mesh_t) {
        VSG.scene.instance_set_base(this.instance, p_base);
        this.base = p_base;
    }

    /**
     * @param {number} p_surface
     * @param {Material} p_material
     */
    set_surface_material(p_surface: number, p_material: Material) {
        this.materials[p_surface] = p_material;
        VSG.scene.instance_set_surface_material(this.instance, p_surface, p_material.material);
    }

    /* virtual method */

    _load_data(data: any) {
        super._load_data(data);

        if (data.mesh) this.set_mesh(data.mesh);
        if (data.material && data.material.length) {
            for (let i = 0; i < data.material.length; i++) {
                if (data.material[i]) {
                    this.set_surface_material(i, data.material[i]);
                }
            }
        }
        if (data.skin) this.set_skin(data.skin);

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
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
        let new_skin_ref: SkinReference = null;

        if (this.skeleton_path) {
            let skeleton = this.get_node(this.skeleton_path) as Skeleton;
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
