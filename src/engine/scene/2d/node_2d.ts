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

    set_position_n(x: number, y: number) {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        this._position.set(x, y);
        this._update_transform();
    }
    set_position(position: Vector2Like) {
        this.set_position_n(position.x, position.y);
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
    set_rotation(value: number) {
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
    set_rotation_degrees(value: number) {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        this._rotation = deg2rad(value);
        this._update_transform();
    }
    get rotation_degrees() {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        return rad2deg(this._rotation);
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    set_scale_n(x: number, y: number) {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        this._scale.set(x, y);
        if (this._scale.x === 0) {
            this._scale.x = CMP_EPSILON;
        }
        if (this._scale.y === 0) {
            this._scale.y = CMP_EPSILON;
        }
        this._update_transform();
    }
    /**
     * @param {Vector2Like} scale
     */
    set_scale(scale: Vector2Like) {
        this.set_scale_n(scale.x, scale.y);
    }
    get scale() {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        return this._scale;
    }
    /**
     * @param {number} p_angle
     */
    set_skew(p_angle: number) {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        this._skew = p_angle;
        this._update_transform();
    }
    get skew() {
        if (this._xform_dirty) {
            this._update_xform_values();
        }
        return this._skew;
    }

    /**
     * @param {number} a
     * @param {number} b
     * @param {number} c
     * @param {number} d
     * @param {number} tx
     * @param {number} ty
     */
    set_transform_n(a: number, b: number, c: number, d: number, tx: number, ty: number) {
        this._transform.set(a, b, c, d, tx, ty);
        this._xform_dirty = true;

        VSG.canvas.canvas_item_set_transform(this.canvas_item, this._transform);

        if (!this.is_inside_tree()) {
            return;
        }

        this._notify_transform();
    }
    /**
     * @param {Transform2D} mat
     */
    set_transform(mat: Transform2D) {
        this.set_transform_n(mat.a, mat.b, mat.c, mat.d, mat.tx, mat.ty);
    }

    /**
     * Returns a new Transform2D
     */
    get_transform() {
        return this._transform.clone();
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    set_global_position_n(x: number, y: number) {
        const pi = this.get_parent_item();
        if (pi) {
            const inv = pi.get_global_transform().clone().affine_inverse();
            this.set_position(inv.xform(this._position.set(x, y)));
            Transform2D.free(inv);
        } else {
            this.set_position_n(x, y);
        }
    }
    /**
     * @param {Vector2Like} value
     */
    set_global_position(value: Vector2Like) {
        this.set_global_position_n(value.x, value.y);
    }
    /**
     * returns new Vector2
     */
    get_global_position() {
        return this.get_global_transform().get_origin();
    }

    /**
     * @param {number} value
     */
    set_global_rotation(value: number) {
        const pi = this.get_parent_item();
        if (pi) {
            const parent_global_rot = pi.get_global_transform().get_rotation();
            this.set_rotation(value - parent_global_rot);
        } else {
            this.set_rotation(value);
        }
    }
    get_global_rotation() {
        return this.get_global_transform().get_rotation();
    }

    /**
     * @param {number} value
     */
    set_global_rotation_degrees(value: number) {
        this.set_global_rotation(deg2rad(value));
    }
    get_global_rotation_degrees() {
        return rad2deg(this.get_global_rotation());
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    set_global_scale_n(x: number, y: number) {
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
    set_global_scale(value: Vector2Like) {
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
    set_global_transform_n(a: number, b: number, c: number, d: number, tx: number, ty: number) {
        const mat = Transform2D.create(a, b, c, d, tx, ty);
        this.set_global_transform(mat);
        Transform2D.free(mat);
    }
    /**
     * @param {Transform2D} p_transform
     */
    set_global_transform(p_transform: Transform2D) {
        const pi = this.get_parent_item();
        if (pi) {
            const mat = pi.get_global_transform().clone().affine_inverse().append(p_transform);
            this.set_transform(mat);
            Transform2D.free(mat);
        } else {
            this.set_transform(p_transform);
        }
    }

    /**
     * @param {number} value
     */
    set_z_index(value: number) {
        this.z_index = value;
        VSG.canvas.canvas_item_set_z_index(this.canvas_item, this.z_index);
    }

    /**
     * @param {boolean} value
     */
    set_z_as_relative(value: boolean) {
        this.z_as_relative = value;
        VSG.canvas.canvas_item_set_z_as_relative_to_parent(this.canvas_item, value);
    }

    is_node_2d = true;

    _position = new Vector2;
    _rotation = 0;
    _scale = new Vector2(1, 1);
    _skew = 0;
    z_index = 0;
    z_as_relative = false;
    _transform = new Transform2D;

    /* private */

    _xform_dirty = false;

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.position !== undefined) this.set_position(data.position);
        if (data.rotation !== undefined) this.set_rotation(data.rotation);
        if (data.scale !== undefined) this.set_scale(data.scale);
        if (data.skew !== undefined) this.set_skew(data.skew);
        if (data.z_index !== undefined) this.set_z_index(data.z_index);
        if (data.z_relative !== undefined) this.set_z_as_relative(data.z_relative);

        return this;
    }

    /**
     * @param {Vector2} p_pos
     */
    get_angle_to(p_pos: Vector2) {
        const vec = this.to_local(p_pos).multiply(this._scale);
        const angle = vec.angle();
        Vector2.free(vec);
        return angle;
    }
    /**
     * return new Transform2D
     * @param {Node} p_parent
     * @returns {Transform2D}
     */
    get_relative_transform_to_parent(p_parent: Node): Transform2D {
        if (p_parent === this) {
            return Transform2D.create();
        }

        let parent_2d: Node2D = this.get_parent() as Node2D;
        if (!parent_2d.is_node_2d) {
            return Transform2D.create();
        }

        if (p_parent === parent_2d) {
            return this._transform;
        } else {
            return parent_2d.get_relative_transform_to_parent(p_parent).clone().append(this._transform);
        }
    }

    /**
     * @param {number} p_radians
     */
    rotate(p_radians: number) {
        this._rotation += p_radians;
    }
    /**
     * @param {Vector2} p_pos
     */
    look_at(p_pos: Vector2) {
        this.rotate(this.get_angle_to(p_pos));
    }

    /**
     * @param {Vector2Like} p_amount
     */
    translate(p_amount: Vector2Like) {
        this.set_position_n(this._position.x + p_amount.x, this._position.y + p_amount.y);
    }
    /**
     * @param {Vector2Like} p_amount
     */
    global_translate(p_amount: Vector2Like) {
        const global_position = this.get_global_position();
        this.set_global_position_n(global_position.x + p_amount.x, global_position.y + p_amount.y);
    }
    /**
     * @param {number} p_delta
     * @param {boolean} [p_scaled]
     */
    move_local_x(p_delta: number, p_scaled: boolean = false) {
        const t = this._transform;
        const m = Vector2.create(t.a, t.b);
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
    move_local_y(p_delta: number, p_scaled: boolean = false) {
        const t = this._transform;
        const m = Vector2.create(t.c, t.d);
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
    apply_scale(p_amount: Vector2Like) {
        this.set_scale_n(this._scale.x * p_amount.x, this._scale.y * p_amount.y);
    }

    /**
     * @param {Vector2} p_global
     */
    to_local(p_global: Vector2) {
        const inv = this.get_global_transform().clone().affine_inverse();
        const vec = inv.xform(p_global.clone());
        Transform2D.free(inv);
        return vec;
    }
    /**
     * @param {Vector2} p_global
     */
    to_global(p_global: Vector2) {
        return this.get_global_transform().xform(p_global.clone());
    }

    /* private */

    _update_transform() {
        this._transform.set_rotation_scale_and_skew(this._rotation, this._scale, this._skew);
        this._transform.tx = this._position.x;
        this._transform.ty = this._position.y;

        VSG.canvas.canvas_item_set_transform(this.canvas_item, this._transform);

        if (!this.is_inside_tree()) {
            return;
        }

        this._notify_transform();
    }

    _update_xform_values() {
        this._position.set(this._transform.tx, this._transform.ty);
        this._rotation = this._transform.get_rotation();
        this._transform.get_scale(this._scale);
        this._skew = this._transform.get_skew();
        this._xform_dirty = false;
    }
}
node_class_map['Node2D'] = GDCLASS(Node2D, CanvasItem)
