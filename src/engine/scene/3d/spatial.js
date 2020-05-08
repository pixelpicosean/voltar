import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { SelfList } from "engine/core/self_list";
import { Vector3, Vector3Like } from "engine/core/math/vector3";
import { Transform } from "engine/core/math/transform";

import {
    Node,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
} from "../main/node";
import { Viewport } from "../main/viewport";
import { Basis } from "engine/core/math/basis";

export const NOTIFICATION_ENTER_WORLD = 41;
export const NOTIFICATION_EXIT_WORLD = 42;
export const NOTIFICATION_VISIBILITY_CHANGED_3D = 43;
export const NOTIFICATION_LOCAL_TRANSFORM_CHANGED_3D = 44;
export const NOTIFICATION_TRANSFORM_CHANGED_3D = 2000;

export const TRANSFORM_DIRTY_NONE = 0;
export const TRANSFORM_DIRTY_VECTORS = 1;
export const TRANSFORM_DIRTY_LOCAL = 2;
export const TRANSFORM_DIRTY_GLOBAL = 4;

const DEG_2_RAD = Math.PI / 180;

export class Spatial extends Node {
    get class() { return "Spatial" }

    constructor() {
        super();

        this.is_spatial = true;

        /** @type {SelfList<Node>} */
        this.xform_change = new SelfList(this);

        this.d_data = {
            global_transform: new Transform,
            local_transform: new Transform,
            rotation: new Vector3,
            scale: new Vector3(1, 1, 1),

            dirty: TRANSFORM_DIRTY_NONE,

            /** @type {Spatial} */
            parent: null,

            toplevel_active: false,
            toplevel: false,
            inside_world: false,

            children_lock: 0,

            ignore_notification: false,
            notify_local_transform: false,
            notify_transform: false,

            visible: true,
            disable_scale: false,
        }
    }

    /**
     * @param {Vector3Like} offset
     */
    translate(offset) {
        let t = this.get_transform();
        t.translate(offset);
        this.set_transform(t);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    translate_n(x, y, z) {
        let t = this.get_transform();
        t.translate_n(x, y, z);
        this.set_transform(t);
    }

    /**
     * @param {Vector3Like} offset
     */
    translate_object_local(offset) { }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    translate_object_local_n(x, y, z) { }

    /**
     * @param {number} p_angle
     */
    rotate_x(p_angle) {
        let t = this.get_transform();
        t.basis.rotate(Vector3.RIGHT, p_angle);
        this.set_transform(t);
    }

    /**
     * @param {number} p_angle
     */
    rotate_y(p_angle) {
        let t = this.get_transform();
        t.basis.rotate(Vector3.UP, p_angle);
        this.set_transform(t);
    }

    /**
     * @param {number} p_angle
     */
    rotate_z(p_angle) {
        let t = this.get_transform();
        t.basis.rotate(Vector3.BACK, p_angle);
        this.set_transform(t);
    }

    /**
     * @param {Vector3Like} p_translation
     */
    set_translation(p_translation) {
        this.set_translation_n(p_translation.x, p_translation.y, p_translation.z);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set_translation_n(x, y, z) {
        this.d_data.local_transform.origin.set(x, y, z);
        this._propagate_transform_changed(this);
        if (this.d_data.notify_local_transform) {
            this.notification(NOTIFICATION_LOCAL_TRANSFORM_CHANGED_3D);
        }
    }

    /**
     * @param {Vector3Like} p_rotation
     */
    set_rotation(p_rotation) {
        this.set_rotation_n(p_rotation.x, p_rotation.y, p_rotation.z);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set_rotation_n(x, y, z) {
        if (this.d_data.dirty & TRANSFORM_DIRTY_VECTORS) {
            let scale = this.d_data.local_transform.basis.get_scale();
            this.d_data.scale.copy(scale);
            Vector3.free(scale);

            this.d_data.dirty &= ~TRANSFORM_DIRTY_VECTORS;
        }

        this.d_data.rotation.set(x, y, z);
        this.d_data.dirty |= TRANSFORM_DIRTY_LOCAL;

        this._propagate_transform_changed(this);
        if (this.d_data.notify_local_transform) {
            this.notification(NOTIFICATION_LOCAL_TRANSFORM_CHANGED_3D);
        }
    }

    /**
     * @param {Vector3Like} p_rotation
     */
    set_rotation_degrees(p_rotation) {
        this.set_rotation_n(p_rotation.x * DEG_2_RAD, p_rotation.y * DEG_2_RAD, p_rotation.z * DEG_2_RAD);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set_rotation_degrees_n(x, y, z) {
        this.set_rotation_n(x * DEG_2_RAD, y * DEG_2_RAD, z * DEG_2_RAD);
    }

    /**
     * @param {Vector3Like} p_scale
     */
    set_scale(p_scale) {
        this.set_scale_n(p_scale.x, p_scale.y, p_scale.z);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set_scale_n(x, y, z) {
        if (this.d_data.dirty & TRANSFORM_DIRTY_VECTORS) {
            let rotation = this.d_data.local_transform.basis.get_rotation();
            this.d_data.rotation.copy(rotation);
            Vector3.free(rotation);

            this.d_data.dirty &= ~TRANSFORM_DIRTY_VECTORS;
        }

        this.d_data.scale.set(x, y, z);
        this.d_data.dirty |= TRANSFORM_DIRTY_LOCAL;

        this._propagate_transform_changed(this);
        if (this.d_data.notify_local_transform) {
            this.notification(NOTIFICATION_LOCAL_TRANSFORM_CHANGED_3D);
        }
    }

    /**
     * @param {Transform} p_transform
     */
    set_transform(p_transform) {
        this.set_transform_n(
            p_transform.basis.elements[0].x,
            p_transform.basis.elements[0].y,
            p_transform.basis.elements[0].z,
            p_transform.basis.elements[1].x,
            p_transform.basis.elements[1].y,
            p_transform.basis.elements[1].z,
            p_transform.basis.elements[2].x,
            p_transform.basis.elements[2].y,
            p_transform.basis.elements[2].z,
            p_transform.origin.x,
            p_transform.origin.y,
            p_transform.origin.z
        )
    }

    /**
     * @param {Basis} basis
     * @param {Vector3Like} origin
     */
    set_transform_v(basis, origin) {
        this.set_transform_n(
            basis.elements[0].x,
            basis.elements[0].y,
            basis.elements[0].z,
            basis.elements[1].x,
            basis.elements[1].y,
            basis.elements[1].z,
            basis.elements[2].x,
            basis.elements[2].y,
            basis.elements[2].z,
            origin.x,
            origin.y,
            origin.z
        )
    }

    /**
     * @param {number} xx
     * @param {number} xy
     * @param {number} xz
     * @param {number} yx
     * @param {number} yy
     * @param {number} yz
     * @param {number} zx
     * @param {number} zy
     * @param {number} zz
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set_transform_n(xx, xy, xz, yx, yy, yz, zx, zy, zz, x, y, z) {
        this.d_data.local_transform.set(xx, xy, xz, yx, yy, yz, zx, zy, zz, x, y, z);
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
        let xform = Transform.new();
        if (this.d_data.parent && !this.d_data.toplevel_active) {
            let p = this.d_data.parent;
            xform.copy(p.get_global_transform()).affine_invert().append(p_transform);
        } else {
            xform.copy(p_transform);
        }
        this.set_transform(xform);
        Transform.free(xform);
    }

    /**
     * @param {Basis} basis
     * @param {Vector3Like} origin
     */
    set_global_transform_v(basis, origin) {
        let xform = Transform.new();
        xform.set(
            basis.elements[0].x,
            basis.elements[0].y,
            basis.elements[0].z,
            basis.elements[1].x,
            basis.elements[1].y,
            basis.elements[1].z,
            basis.elements[2].x,
            basis.elements[2].y,
            basis.elements[2].z,
            origin.x,
            origin.y,
            origin.z
        );
        this.set_global_transform(xform);
        Transform.free(xform);
    }

    /**
     * @param {number} xx
     * @param {number} xy
     * @param {number} xz
     * @param {number} yx
     * @param {number} yy
     * @param {number} yz
     * @param {number} zx
     * @param {number} zy
     * @param {number} zz
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set_global_transform_n(xx, xy, xz, yx, yy, yz, zx, zy, zz, x, y, z) {
        let xform = Transform.new();
        xform.set(
            xx, xy, xz,
            yx, yy, yz,
            zx, zy, zz,
            x,  y,  z
        );
        this.set_global_transform(xform);
        Transform.free(xform);
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
            if (this.d_data.parent && !this.d_data.toplevel_active) {
                let p = this.d_data.parent;
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

    orthonormalize() {
        let t = this.get_transform().orthonormalized();
        this.set_transform(t);
        Transform.free(t);
    }

    set_identity() {
        let t = Transform.new();
        this.set_transform(t);
        Transform.free(t);
    }

    /**
     * @param {boolean} enable
     */
    set_notify_transform(enable) {
        this.d_data.notify_transform = enable;
    }

    /**
     * @param {boolean} p_visible
     */
    set_visible(p_visible) {
        if (p_visible) this.show();
        else this.hide();
    }

    is_visibile_in_tree() {
        /** @type {Spatial} */
        let s = this;

        while (s) {
            if (!s.d_data.visible) {
                return false;
            }
            s = s.d_data.parent;
        }

        return true;
    }

    show() {
        if (this.d_data.visible) return;

        this.d_data.visible = true;

        if (!this.is_inside_tree()) return;

        this._propagate_visibility_changed();
    }

    hide() {
        if (!this.d_data.visible) return;

        this.d_data.visible = false;

        if (!this.is_inside_tree()) return;

        this._propagate_visibility_changed();
    }

    force_update_transform() {
        if (!this.xform_change.in_list()) {
            return;
        }
        this.get_tree().xform_change_list.remove(this.xform_change);

        this.notification(NOTIFICATION_TRANSFORM_CHANGED_3D);
    }

    get_world() {
        return this.data.viewport.find_world();
    }

    /* virtual methods */

    _load_data(data) {
        super._load_data(data);

        if (data.visible !== undefined) this.set_visible(data.visible);

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
    _propagate_transform_changed(p_origin) {
        if (!this.is_inside_tree()) return;

        for (let i = 0, children = this.data.children; i < children.length; i++) {
            let c = /** @type {Spatial} */(children[i]);
            if (c.is_spatial) continue;
            if (c.d_data.toplevel_active) continue;

            c._propagate_transform_changed(p_origin);
        }

        if (this.d_data.notify_transform && !this.d_data.ignore_notification && !this.xform_change.in_list()) {
            this.get_tree().xform_change_list.add(this.xform_change);
        }

        this.d_data.dirty |= TRANSFORM_DIRTY_GLOBAL;
    }

    _propagate_visibility_changed() {
        this.notification(NOTIFICATION_VISIBILITY_CHANGED_3D);
        this.emit_signal("visibility_changed");

        for (let i = 0, children = this.data.children; i < children.length; i++) {
            let c = /** @type {Spatial} */(children[i]);
            if (c.is_spatial) continue;

            if (!c.d_data.visible) continue;

            c._propagate_visibility_changed();
        }
    }

    _update_local_transform() {
        this.d_data.local_transform.basis.set_euler_scale(this.d_data.rotation, this.d_data.scale);
    }

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
                    this.d_data.parent = /** @type {Spatial} */(p);
                }

                if (this.d_data.toplevel) {
                    if (this.d_data.parent) {
                        let p = this.d_data.parent;
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
                this.d_data.parent = null;
                this.d_data.toplevel_active = false;
            } break;
            case NOTIFICATION_ENTER_WORLD: {
                this.d_data.inside_world = true;
                this.data.viewport = null;
                let parent = this.get_parent();
                while (parent && !this.data.viewport) {
                    if (parent.class === "Viewport") {
                        this.data.viewport = /** @type {Viewport} */(parent);
                    }
                    parent = parent.get_parent();
                }

                this._enter_world();
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
