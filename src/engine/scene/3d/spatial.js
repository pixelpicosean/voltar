import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { SelfList } from "engine/core/self_list";
import { Vector3 } from "engine/core/math/vector3";
import { Transform } from "engine/core/math/transform";

import {
    Node,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
} from "../main/node";
import { Viewport } from "../main/viewport";

export const NOTIFICATION_ENTER_WORLD = 41;
export const NOTIFICATION_EXIT_WORLD = 42;
export const NOTIFICATION_VISIBILITY_CHANGED_3D = 43;
export const NOTIFICATION_LOCAL_TRANSFORM_CHANGED_3D = 44;

export const TRANSFORM_DIRTY_NONE = 0;
export const TRANSFORM_DIRTY_VECTORS = 1;
export const TRANSFORM_DIRTY_LOCAL = 2;
export const TRANSFORM_DIRTY_GLOBAL = 3;

export class Spatial extends Node {
    get class() { return "Spatial" }

    constructor() {
        super();

        /** @type {SelfList<Node>} */
        this.xform_change = new SelfList(this);

        this.d_data = {
            global_transform: new Transform,
            local_transform: new Transform,
            rotation: new Vector3,
            scale: new Vector3,

            dirty: 0,

            /** @type {import('../main/viewport').Viewport} */
            viewport: null,

            toplevel_active: false,
            toplevel: false,
            inside_world: false,

            children_lock: 0,

            ignore_notification: false,
            notify_local_transform: false,
            notify_transform: false,

            visible: false,
            disable_scale: false,
        }
    }

    /**
     * @param {Transform} p_transform
     */
    set_transform(p_transform) {
        this.set_transform_n(
            p_transform.basis.elements[0],
            p_transform.basis.elements[1],
            p_transform.basis.elements[2],
            p_transform.basis.elements[3],
            p_transform.basis.elements[4],
            p_transform.basis.elements[5],
            p_transform.basis.elements[6],
            p_transform.basis.elements[7],
            p_transform.basis.elements[8],
            p_transform.origin.x,
            p_transform.origin.y,
            p_transform.origin.z
        )
    }

    /**
     * @param {number} m11
     * @param {number} m12
     * @param {number} m13
     * @param {number} m21
     * @param {number} m22
     * @param {number} m23
     * @param {number} m31
     * @param {number} m32
     * @param {number} m33
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set_transform_n(m11, m12, m13, m21, m22, m23, m31, m32, m33, x, y, z) {
        this.d_data.local_transform.set(m11, m12, m13, m21, m22, m23, m31, m32, m33, x, y, z);
        this.d_data.dirty |= TRANSFORM_DIRTY_VECTORS;
        this._propagate_transform_changed(this);
        if (this.d_data.notify_local_transform) {
            this.notification(NOTIFICATION_LOCAL_TRANSFORM_CHANGED_3D);
        }
    }

    /**
     * @param {Transform} p_transform
     */
    set_global_transform(p_transform) {

    }

    get_transform() {
        if (this.d_data.dirty & TRANSFORM_DIRTY_LOCAL) {
            this._update_local_transform();
        }
        return this.d_data.local_transform;
    }

    get_global_transform() {
        if (this.d_data.dirty & TRANSFORM_DIRTY_GLOBAL) {
            if (this.d_data.dirty & TRANSFORM_DIRTY_LOCAL) {
                this._update_local_transform();
            }
            if (this.data.parent && !this.d_data.toplevel_active) {
                let p = /** @type {Spatial} */(this.data.parent);
                this.d_data.global_transform.copy(p.get_global_transform())
                    .append(this.d_data.local_transform)
            } else {
                this.d_data.global_transform.copy(this.d_data.local_transform);
            }

            if (this.d_data.disable_scale) {
                this.d_data.global_transform.basis.orthonormalize();
            }

            this.d_data.dirty &= ~TRANSFORM_DIRTY_GLOBAL;
        }
        return this.d_data.global_transform;
    }

    orthonormalize() { }
    set_identity() { }

    /**
     * @param {boolean} p_visible
     */
    set_visible(p_visible) { }

    is_visibile_in_tree() {
        return false;
    }

    show() { }
    hide() { }

    force_update_transform() { }


    /* virtual methods */

    _load_data(data) {
        super._load_data(data);

        if (data.transform) this.set_transform_n(
            data.transform[0],
            data.transform[1],
            data.transform[2],
            data.transform[3],
            data.transform[4],
            data.transform[5],
            data.transform[6],
            data.transform[7],
            data.transform[8],
            data.transform[9],
            data.transform[10],
            data.transform[11]
        );

        return this;
    }

    _enter_world() { }

    _exit_world() { }

    /**
     * @param {Spatial} p_origin
     */
    _propagate_transform_changed(p_origin) { }

    _propagate_visibility_changed() { }

    _update_local_transform() { }

    _notify_dirty() {
        if (this.d_data.notify_transform && !this.d_data.ignore_notification && !this.xform_change.in_list()) {
            this.get_tree().xform_change_list.add(this.xform_change);
        }
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                let p = this.get_parent();
                if (p && p.is_spatial) {
                    this.data.parent = p;
                }

                if (this.d_data.toplevel) {
                    if (this.data.parent) {
                        let p = /** @type {Spatial} */(this.data.parent);
                        this.d_data.local_transform
                            .copy(p.get_global_transform())
                            .append(this.get_transform())
                        this.d_data.dirty = TRANSFORM_DIRTY_VECTORS;
                    }
                    this.d_data.toplevel_active = true;
                }

                this.d_data.dirty |= TRANSFORM_DIRTY_GLOBAL;
                this._notify_dirty();

                this.notification(NOTIFICATION_ENTER_WORLD);
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this.notification(NOTIFICATION_EXIT_WORLD, true);
                if (this.xform_change.in_list()) {
                    this.get_tree().xform_change_list.remove(this.xform_change);
                }
                this.data.parent = null;
                this.d_data.toplevel_active = false;
            } break;
            case NOTIFICATION_ENTER_WORLD: {
                this.d_data.inside_world = true;
                this.data.viewport = null;
                let parent = this.get_parent();
                while (parent && !this.data.viewport) {
                    if (parent.class === "Viewport") {
                        this.data.viewport = /** @type {Viewport} */(parent);
                        parent = parent.get_parent();

                        this._enter_world();
                    }
                }
            } break;
            case NOTIFICATION_EXIT_WORLD: {
                this._exit_world();

                this.data.viewport = null;
                this.d_data.inside_world = false;
            } break;
        }
    }
}

node_class_map["Spatial"] = GDCLASS(Spatial, Node)
