import { node_class_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import { CMP_EPSILON } from 'engine/core/math/math_defs';
import { deg2rad, rad2deg } from 'engine/core/math/math_funcs';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { Transform2D } from 'engine/core/math/transform_2d';

import { VSG } from 'engine/servers/visual/visual_server_globals';

import { Node } from '../main/node';
import { CanvasItem } from './canvas_item';


export class Node2D extends CanvasItem {
    get class() { return 'Node2D' }

    /**
     * @param {number} x
     * @param {number} y
     */
    set_position_n(x, y) {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        this.position.set(x, y);
        this._update_transform();
    }
    /**
     * @param {Vector2Like} position
     */
    set_position(position) {
        this.set_position_n(position.x, position.y);
    }
    get_position() {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        return this.position;
    }

    /**
     * @param {number} value
     */
    set_rotation(value) {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        this.rotation = value;
        this._update_transform();
    }
    get_rotation() {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        return this.rotation;
    }

    /**
     * @param {number} value
     */
    set_rotation_degrees(value) {
        this.rotation = deg2rad(value);
    }
    get_rotation_degrees() {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        return rad2deg(this.rotation);
    }

    /**
     * @param {number} x
     * @param {number} [y]
     */
    set_scale_n(x, y) {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        this.scale.set(x, y);
        if (this.scale.x === 0) {
            this.scale.x = CMP_EPSILON;
        }
        if (this.scale.y === 0) {
            this.scale.y = CMP_EPSILON;
        }
        this._update_transform();
    }
    /**
     * @param {Vector2Like} scale
     */
    set_scale(scale) {
        this.set_scale_n(scale.x, scale.y);
    }
    get_scale() {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        return this.scale;
    }

    /**
     * @param {number} a
     * @param {number} b
     * @param {number} c
     * @param {number} d
     * @param {number} tx
     * @param {number} ty
     */
    set_transform_n(a, b, c, d, tx, ty) {
        this.transform.set(a, b, c, d, tx, ty);
        this._xform_dirty = true;

        VSG.canvas.canvas_item_set_transform(this.canvas_item, this.transform);

        if (!this.is_inside_tree()) {
            return;
        }

        this._notify_transform_self();
    }
    /**
     * @param {Transform2D} mat
     */
    set_transform(mat) {
        this.set_transform_n(mat.a, mat.b, mat.c, mat.d, mat.tx, mat.ty);
    }
    get_transform() {
        return this.transform;
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    set_global_position_n(x, y) {
        const pi = this.get_parent_item();
        if (pi) {
            const inv = pi.get_global_transform().clone().affine_inverse();
            this.set_position(inv.xform(this.position.set(x, y)));
            Transform2D.free(inv);
        } else {
            this.set_position_n(x, y);
        }
    }
    /**
     * @param {Vector2Like} value
     */
    set_global_position(value) {
        this.set_global_position_n(value.x, value.y);
    }
    get_global_position() {
        return this.get_global_transform().origin;
    }

    /**
     * @param {number} value
     */
    set_global_rotation(value) {
        const pi = this.get_parent_item();
        if (pi) {
            const parent_global_rot = pi.get_global_transform().rotation;
            this.set_rotation(value - parent_global_rot);
        } else {
            this.set_rotation(value);
        }
    }
    get_global_rotation() {
        return this.get_global_transform().rotation;
    }

    /**
     * @param {number} value
     */
    set_global_rotation_degrees(value) {
        this.set_global_rotation(deg2rad(value));
    }
    get_global_rotation_degrees() {
        return rad2deg(this.get_global_rotation());
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    set_global_scale_n(x, y) {
        const pi = this.get_parent_item();
        if (pi) {
            const parent_global_scale = pi.get_global_transform().get_scale();
            this.set_scale_n(x / parent_global_scale.x, y / parent_global_scale.y);
            Vector2.free(parent_global_scale);
        } else {
            this.set_scale_n(x, y);
        }
    }
    /**
     * @param {Vector2Like} value
     */
    set_global_scale(value) {
        this.set_global_scale_n(value.x, value.y);
    }
    get_global_scale() {
        return this.get_global_transform().get_scale();
    }

    /**
     * @param {number} a
     * @param {number} b
     * @param {number} c
     * @param {number} d
     * @param {number} tx
     * @param {number} ty
     */
    set_global_transform_n(a, b, c, d, tx, ty) {
        const mat = Transform2D.new(a, b, c, d, tx, ty);
        this.set_global_transform(mat);
        Transform2D.free(mat);
    }
    /**
     * @param {Transform2D} xform
     */
    set_global_transform(xform) {
        const pi = this.get_parent_item();
        if (pi) {
            const mat = pi.global_transform.clone().affine_inverse().append(xform);
            this.set_transform(mat);
            Transform2D.free(mat);
        } else {
            this.set_transform(xform);
        }
    }

    /**
     * @param {number} value
     */
    set_z_index(value) {
        this.z_index = value;
        VSG.canvas.canvas_item_set_z_index(this.canvas_item, this.z_index);
    }
    get_z_index() {
        return this.z_index;
    }

    /**
     * @param {boolean} value
     */
    set_z_relative(value) {
        this.z_relative = value;
        VSG.canvas.canvas_item_set_z_as_relative_to_parent(this.canvas_item, value);
    }
    get_z_relative() {
        return this.z_relative;
    }

    constructor() {
        super();

        this.is_node_2d = true;

        this.position = new Vector2();
        this.rotation = 0;
        this.scale = new Vector2(1, 1);
        this.z_index = 0;
        this.z_relative = false;
        this.transform = new Transform2D();

        /* private */

        this._xform_dirty = false;
    }

    /**
     * @param {Vector2} p_pos
     */
    get_angle_to(p_pos) {
        const vec = this.to_local(p_pos).multiply(this.scale);
        const angle = vec.angle();
        Vector2.free(vec);
        return angle;
    }
    /**
     * @param {Node} p_parent
     * @returns {Transform2D}
     */
    get_relative_transform_to_parent(p_parent) {
        if (p_parent === this) {
            return Transform2D.new();
        }

        const parent_2d = /** @type {Node2D} */(this.get_parent());
        if (!parent_2d.is_node_2d) {
            return Transform2D.new();
        }

        if (p_parent === parent_2d) {
            return this.transform;
        } else {
            return parent_2d.get_relative_transform_to_parent(p_parent).clone().append(this.transform);
        }
    }

    /**
     * @param {number} p_radians
     */
    rotate(p_radians) {
        this.rotation += p_radians;
    }
    /**
     * @param {Vector2} p_pos
     */
    look_at(p_pos) {
        this.rotate(this.get_angle_to(p_pos));
    }

    /**
     * @param {Vector2Like} p_amount
     */
    translate(p_amount) {
        this.set_position_n(this.position.x + p_amount.x, this.position.y + p_amount.y);
    }
    /**
     * @param {Vector2Like} p_amount
     */
    global_translate(p_amount) {
        const global_position = this.get_global_position();
        this.set_global_position_n(global_position.x + p_amount.x, global_position.y + p_amount.y);
    }
    /**
     * @param {number} p_delta
     * @param {boolean} [p_scaled]
     */
    move_local_x(p_delta, p_scaled = false) {
        const t = this.transform;
        const m = Vector2.new(t.a, t.b);
        if (!p_scaled) {
            m.normalize();
        }
        m.scale(p_delta);
        this.set_position_n(t.tx + m.x, t.ty + m.y);
        Vector2.free(m);
    }
    /**
     * @param {number} p_delta
     * @param {boolean} [p_scaled]
     */
    move_local_y(p_delta, p_scaled = false) {
        const t = this.transform;
        const m = Vector2.new(t.c, t.d);
        if (!p_scaled) {
            m.normalize();
        }
        m.scale(p_delta);
        this.set_position_n(t.tx + m.x, t.ty + m.y);
        Vector2.free(m);
    }

    /**
     * @param {Vector2Like} p_amount
     */
    apply_scale(p_amount) {
        this.set_scale_n(this.scale.x * p_amount.x, this.scale.y * p_amount.y);
    }

    /**
     * @param {Vector2} p_global
     */
    to_local(p_global) {
        const inv = this.get_global_transform().clone().affine_inverse();
        const vec = inv.xform(p_global.clone());
        Transform2D.free(inv);
        return vec;
    }
    /**
     * @param {Vector2} p_global
     */
    to_global(p_global) {
        return this.get_global_transform().xform(p_global.clone());
    }

    /* private */

    _update_transform() {
        this.transform.set_rotation_and_scale(this.rotation, this.scale);
        this.transform.tx = this.position.x;
        this.transform.ty = this.position.y;

        VSG.canvas.canvas_item_set_transform(this.canvas_item, this.transform);

        if (!this.is_inside_tree()) {
            return;
        }

        this._notify_transform_self();
    }

    _update_xform_values() {
        this.position.set(this.transform.tx, this.transform.ty);
        this.rotation = this.transform.rotation;
        const scale = this.transform.get_scale();
        this.scale.copy(scale);
        Vector2.free(scale);
        this._xform_dirty = false;
    }
}
node_class_map['Node2D'] = GDCLASS(Node2D, CanvasItem)