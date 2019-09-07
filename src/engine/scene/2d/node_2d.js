import { node_class_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import { CMP_EPSILON } from 'engine/core/math/math_defs';
import { deg2rad, rad2deg } from 'engine/core/math/math_funcs';
import { Vector2 } from 'engine/core/math/vector2';
import { Transform2D } from 'engine/core/math/transform_2d';

import { VSG } from 'engine/servers/visual/visual_server_globals';

import { Node } from '../main/node';
import { CanvasItem } from './canvas_item';


export class Node2D extends CanvasItem {
    /**
     * @param {Vector2} value
     */
    set position(value) {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        this._position.copy(value);
        this._update_transform();
    }
    get position() {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        return this._position;
    }

    /**
     * @param {number} value
     */
    set rotation(value) {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        this._rotation = value;
        this._update_transform();
    }
    get rotation() {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        return this._rotation;
    }

    /**
     * @param {number} value
     */
    set rotation_degrees(value) {
        this.rotation = deg2rad(value);
    }
    get rotation_degrees() {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        return rad2deg(this._rotation);
    }

    /**
     * @param {Vector2} value
     */
    set scale(value) {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        this._scale.copy(value);
        if (this._scale.x === 0) {
            this._scale.x = CMP_EPSILON;
        }
        if (this._scale.y === 0) {
            this._scale.y = CMP_EPSILON;
        }
        this._update_transform();
    }
    get scale() {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        return this._scale;
    }

    set transform(mat) {
        this._transform.copy(mat);
        this._xform_dirty = true;

        VSG.canvas.canvas_item_set_transform(this.canvas_item, this._transform);

        if (!this.is_inside_tree()) {
            return;
        }

        this._notify_transform_self();
    }
    get transform() {
        return this._transform;
    }

    /**
     * @param {Vector2} value
     */
    set global_position(value) {
        const inv = Transform2D.new();
        const pi = this.get_parent_item();
        if (pi) {
            inv.copy(pi.get_global_transform()).affine_inverse();
            this.position = inv.xform(this.position.copy(value));
        } else {
            this.position = value;
        }
        Transform2D.free(inv);
    }
    get global_position() {
        return this.get_global_transform().origin;
    }

    /**
     * @param {number} value
     */
    set global_rotation(value) {
        const pi = this.get_parent_item();
        if (pi) {
            const parent_global_rot = pi.get_global_transform().rotation;
            this.rotation = value - parent_global_rot;
        } else {
            this.rotation = value;
        }
    }
    get global_rotation() {
        return this.get_global_transform().rotation;
    }

    /**
     * @param {number} value
     */
    set global_rotation_degrees(value) {
        this.global_rotation = deg2rad(value);
    }
    get global_rotation_degrees() {
        return rad2deg(this.global_rotation);
    }

    /**
     * @param {Vector2} value
     */
    set global_scale(value) {
        const pi = this.get_parent_item();
        if (pi) {
            const parent_global_scale = pi.get_global_transform().get_scale();
            this.scale = this.scale.set(value.x / parent_global_scale.x, value.y / parent_global_scale.y);
            Vector2.free(parent_global_scale);
        } else {
            this.scale = value;
        }
    }
    get global_scale() {
        return this.get_global_transform().get_scale();
    }

    set global_transform(value) {
        const pi = this.get_parent_item();
        if (pi) {
            const mat = pi._global_transform.clone().affine_inverse().append(value);
            this.transform = mat;
            Transform2D.free(mat);
        } else {
            this.transform = value;
        }
    }
    get global_transform() {
        return this.get_global_transform();
    }

    /**
     * @param {number} value
     */
    set z_index(value) {
        this._z_index = value;
        VSG.canvas.canvas_item_set_z_index(this.canvas_item, this._z_index);
    }
    get z_index() {
        return this._z_index;
    }

    /**
     * @param {boolean} value
     */
    set z_relative(value) {
        this._z_relative = value;
        VSG.canvas.canvas_item_set_z_as_relative_to_parent(this.canvas_item, value);
    }
    get z_relative() {
        return this._z_relative;
    }

    constructor() {
        super();

        this.is_node_2d = true;

        this.class = 'Node2D';

        this._position = new Vector2();
        this._rotation = 0;
        this._scale = new Vector2(1, 1);
        this._z_index = 0;
        this._z_relative = false;

        this._transform = new Transform2D();
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
     * @param {number} p_amount
     */
    translate(p_amount) {
        this.position = this.position.add(p_amount);
    }
    /**
     * @param {number} p_amount
     */
    global_translate(p_amount) {
        this.global_position = this.global_position.add(p_amount);
    }
    /**
     * @param {number} p_delta
     * @param {boolean} [p_scaled]
     */
    move_local_x(p_delta, p_scaled = false) {
        const t = this._transform;
        const m = Vector2.new(t.a, t.b);
        if (!p_scaled) {
            m.normalize();
        }
        this.position = this.position.set(t.tx, t.ty).add(m.scale(p_delta));
        Vector2.free(m);
    }
    /**
     * @param {number} p_delta
     * @param {boolean} [p_scaled]
     */
    move_local_y(p_delta, p_scaled = false) {
        const t = this._transform;
        const m = Vector2.new(t.c, t.d);
        if (!p_scaled) {
            m.normalize();
        }
        this.position = this.position.set(t.tx, t.ty).add(m.scale(p_delta));
        Vector2.free(m);
    }

    /**
     * @param {Vector2} p_amount
     */
    apply_scale(p_amount) {
        this.scale = this.scale.multiply(p_amount);
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
        this._transform.set_rotation_and_scale(this._rotation, this._scale);
        this._transform.tx = this._position.x;
        this._transform.ty = this._position.y;

        VSG.canvas.canvas_item_set_transform(this.canvas_item, this._transform);

        if (!this.is_inside_tree()) {
            return;
        }

        this._notify_transform_self();
    }

    _update_xform_values() {
        this._position.set(this._transform.tx, this._transform.ty);
        this._rotation = this._transform.rotation;
        const scale = this._transform.get_scale();
        this._scale.copy(scale);
        Vector2.free(scale);
        this._xform_dirty = false;
    }
}
node_class_map['Node2D'] = GDCLASS(Node2D, CanvasItem)
