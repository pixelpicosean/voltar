import { remove_items } from 'engine/dep/index.ts';
import { GDCLASS } from 'engine/core/v_object';
import { node_class_map } from 'engine/registry';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { ProjectSettings } from 'engine/core/project_settings';

import { NOTIFICATION_EXIT_TREE, Node } from '../main/node.js';
import { AreaSpaceOverrideMode } from 'engine/scene/2d/const';
import { Physics2DServer, AREA_BODY_ADDED } from 'engine/servers/physics_2d/physics_2d_server.js';
import { Area2DSW } from 'engine/servers/physics_2d/area_2d_sw.js';
import { MotionResult } from 'engine/servers/physics_2d/state.js';

import { CollisionObject2D } from './collision_object_2d.js';
import {
    PhysicsBody2D,
    KinematicCollision2D,
} from './physics_body_2d.js';


class ShapePair {
    /**
     * @param {number} p_bs
     * @param {number} p_as
     */
    constructor(p_bs = 0, p_as = 0) {
        this.body_shape = p_bs;
        this.area_shape = p_as;
    }
    /**
     * @param {ShapePair} p_sp
     */
    is_less_than(p_sp) {
        if (this.body_shape === p_sp.body_shape) {
            return this.area_shape < p_sp.area_shape;
        } else {
            return this.body_shape < p_sp.body_shape;
        }
    }
}

class BodyState {
    constructor() {
        this.rc = 0;
        this.in_tree = false;
        /**
         * @type {ShapePair[]}
         */
        this.shapes = [];
    }
}

class AreaShapePair {
    constructor(p_bs = 0, p_as = 0) {
        this.area_shape = p_bs;
        this.self_shape = p_as;
    }
    /**
     * @param {AreaShapePair} p_sp
     */
    is_less_than(p_sp) {
        if (this.area_shape === p_sp.area_shape) {
            return this.area_shape < p_sp.area_shape;
        } else {
            return this.area_shape < p_sp.area_shape;
        }
    }
}

class AreaState {
    constructor() {
        this.rc = 0;
        this.in_tree = false;
        /**
         * @type {AreaShapePair[]}
         */
        this.shapes = [];
    }
}

let motion_result = new MotionResult;
let kcol = new KinematicCollision2D;

export class Area2D extends CollisionObject2D {
    get class() { return 'Area2D' }

    constructor() {
        super(Physics2DServer.get_singleton().area_create(), true);

        /**
         * @type {Area2DSW}
         */
        this.rid;

        this.space_override = AreaSpaceOverrideMode.DISABLED;
        this.gravity_vec = new Vector2(0, 1);
        this.gravity = 98;
        this.gravity_point = false;
        this.gravity_distance_scale = 0;
        this.linear_damp = 0.1;
        this.angular_damp = 1;
        this.collision_mask = 1;
        this.collision_layer = 1;
        this.priority = 0;
        this.monitoring = false;
        this.monitorable = false;
        this.first_shape = null;

        /**
         * @type {Map<import('./physics_body_2d').PhysicsBody2D, BodyState>}
         */
        this.body_map = new Map();

        /**
         * @type {Map<Area2D, AreaState>}
         */
        this.area_map = new Map();

        this.gravity = 98;
        this.gravity_vec = new Vector2(0, 1);

        this.set_monitoring(true);
        this.set_monitorable(true);
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.collision_layer !== undefined) {
            this.set_collision_layer(data.collision_layer);
        }
        if (data.collision_mask !== undefined) {
            this.set_collision_mask(data.collision_mask);
        }
        if (data.gravity_point !== undefined) {
            this.set_gravity_point(data.gravity_point);
        }
        if (data.gravity_distance_scale !== undefined) {
            this.set_gravity_distance_scale(data.gravity_distance_scale);
        }
        if (data.gravity !== undefined) {
            this.set_gravity(data.gravity);
        }
        if (data.linear_damp !== undefined) {
            this.set_linear_damp(data.linear_damp);
        }
        if (data.angular_damp !== undefined) {
            this.set_angular_damp(data.angular_damp);
        }
        if (data.gravity_vec !== undefined) {
            this.set_gravity_vec(data.gravity_vec);
        }
        if (data.monitorable !== undefined) {
            this.set_monitorable(data.monitorable);
        }
        if (data.monitoring !== undefined) {
            this.set_monitoring(data.monitoring);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_EXIT_TREE: {
                this._clear_monitoring();
            } break;
        }
    }

    /* public */

    get_overlapping_areas() {
        /** @type {Area2D[]} */
        const ret = new Array(this.area_map.size);
        let i = 0;
        for (let area of this.area_map.keys()) {
            ret[i] = area;
            i++;
        }
        return ret;
    }

    get_overlapping_bodies() {
        /** @type {PhysicsBody2D[]} */
        const ret = new Array(this.body_map.size);
        let i = 0;
        for (let area of this.body_map.keys()) {
            ret[i] = area;
            i++;
        }
        return ret;
    }

    /**
     * @param {Area2D} p_area
     */
    overlaps_area(p_area) {
        return this.area_map.has(p_area);
    }

    /**
     * @param {PhysicsBody2D} p_body
     */
    overlaps_body(p_body) {
        return this.body_map.has(p_body);
    }

    /**
     * Calculate collision result like KinematicBody2D,
     * and return a KinematicCollision2D if is overlapping any physics body.
     * @param {Vector2} p_motion
     */
    test_collision_with_body(p_motion) {
        const gt = this.get_global_transform();
        motion_result.reset();
        const colliding = Physics2DServer.get_singleton().body_test_motion(/** @type {any} */(this.rid), gt, p_motion, true, 0.08, motion_result, true);

        if (colliding) {
            let col = kcol.collision;

            col.collider_metadata = motion_result.collider_metadata;
            col.collider_shape = motion_result.collider_shape;
            col.collider_vel.copy(motion_result.collider_velocity);
            col.collision.copy(motion_result.collision_point);
            col.normal.copy(motion_result.collision_normal);
            col.collider = motion_result.collider_id;
            col.collider_rid = motion_result.collider;
            col.travel.copy(motion_result.motion);
            col.remainder.copy(motion_result.remainder);
            col.local_shape = motion_result.collision_local_shape;

            return kcol;
        }

        return null;
    }


    /**
     * Return an individual bit on the layer mask. Describes whether
     * other areas will collide with this one on the given layer.
     *
     * @param {number} bit
     */
    get_collision_layer_bit(bit) {
        return !!(this.collision_layer & (1 << bit));
    }
    /**
     * Return an individual bit on the layer mask. Describes whether
     * other areas will collide with this one on the given layer.
     *
     * @param {string} layer_name
     */
    get_collision_layer_bit_named(layer_name) {
        return !!(this.collision_layer & (1 << ProjectSettings.get_singleton().get_physics_layer_bit(layer_name)));
    }
    /**
     * @param {number} layer
     */
    set_collision_layer(layer) {
        this.collision_layer = layer;
        if (this.rid) {
            this.rid.collision_layer = this.collision_layer;
        }
    }
    /**
     * Set/clear individual bits on the layer mask. This makes
     * getting an area in/out of only one layer easier.
     *
     * @param {number} bit
     * @param {boolean} value
     */
    set_collision_layer_bit(bit, value) {
        if (value) {
            this.collision_layer |= 1 << bit;
        } else {
            this.collision_layer &= ~(1 << bit);
        }

        if (this.rid) {
            this.rid.collision_layer = this.collision_layer;
        }
    }
    /**
     * Set/clear individual bits on the layer mask. This makes
     * getting an area in/out of only one layer easier.
     *
     * @param {string} layer_name
     * @param {boolean} value
     */
    set_collision_layer_bit_named(layer_name, value) {
        if (value) {
            this.collision_layer |= ProjectSettings.get_singleton().get_physics_layer_value(layer_name);
        } else {
            this.collision_layer &= ~ProjectSettings.get_singleton().get_physics_layer_value(layer_name);
        }

        if (this.rid) {
            this.rid.collision_layer = this.collision_layer;
        }
    }

    /**
     * Return an individual bit on the collision mask. Describes whether
     * this area will collide with others on the given layer.
     *
     * @param {number} bit
     */
    get_collision_mask_bit(bit) {
        return !!(this.collision_mask & (1 << bit));
    }
    /**
     * Return an individual bit on the layer mask. Describes whether
     * other areas will collide with this one on the given layer.
     *
     * @param {string} layer_name
     */
    get_collision_mask_bit_named(layer_name) {
        return !!(this.collision_mask & (1 << ProjectSettings.get_singleton().get_physics_layer_bit(layer_name)));
    }
    /**
     * @param {number} mask
     */
    set_collision_mask(mask) {
        this.collision_mask = mask;

        if (this.rid) {
            this.rid.collision_mask = this.collision_mask;
        }
    }
    /**
     * Set/clear individual bits on the collision mask. This makes
     * selecting the areas scanned easier.
     *
     * @param {number} bit
     * @param {boolean} value
     */
    set_collision_mask_bit(bit, value) {
        if (value) {
            this.collision_mask |= 1 << bit;
        } else {
            this.collision_mask &= ~(1 << bit);
        }

        if (this.rid) {
            this.rid.collision_mask = this.collision_mask;
        }
    }
    /**
     * Set/clear individual bits on the collision mask. This makes
     * selecting the areas scanned easier.
     *
     * @param {string} layer_name
     * @param {boolean} value
     */
    set_collision_mask_bit_named(layer_name, value) {
        if (value) {
            this.collision_mask |= ProjectSettings.get_singleton().get_physics_layer_value(layer_name);
        } else {
            this.collision_mask &= ~ProjectSettings.get_singleton().get_physics_layer_value(layer_name);
        }

        if (this.rid) {
            this.rid.collision_mask = this.collision_mask;
        }
    }

    /**
     * @param {number} value
     */
    set_gravity(value) {
        this.gravity = value;
        this.rid.gravity = this.gravity;
    }

    /**
     * @param {Vector2Like} value
     */
    set_gravity_vec(value) {
        this.gravity_vec.copy(value);
        this.rid.gravity_vector.copy(this.gravity_vec);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_gravity_vec_n(x, y) {
        this.gravity_vec.set(x, y);
        this.rid.gravity_vector.copy(this.gravity_vec);
    }

    /**
     * @param {number} p_gravity_distance_scale
     */
    set_gravity_distance_scale(p_gravity_distance_scale) {
        this.gravity_distance_scale = p_gravity_distance_scale;
        this.rid.gravity_distance_scale = p_gravity_distance_scale;
    }

    /**
     * @param {boolean} p_gravity_point
     */
    set_gravity_point(p_gravity_point) {
        this.gravity_point = p_gravity_point;
        this.rid.gravity_is_point = p_gravity_point;
    }

    /**
     * @param {boolean} value
     */
    set_monitoring(value) {
        if (value === this.monitoring) {
            return;
        }

        this.monitoring = value;

        if (this.monitoring) {
            Physics2DServer.get_singleton().area_set_monitor_callback(this.rid, this, this._body_inout);
            Physics2DServer.get_singleton().area_set_area_monitor_callback(this.rid, this, this._area_inout);
        } else {
            Physics2DServer.get_singleton().area_set_monitor_callback(this.rid, null, null);
            Physics2DServer.get_singleton().area_set_area_monitor_callback(this.rid, null, null);
            this._clear_monitoring();
        }
    }

    /**
     * @param {boolean} p_enable
     */
    set_monitorable(p_enable) {
        if (p_enable === this.monitorable) {
            return;
        }

        this.monitorable = p_enable;

        Physics2DServer.get_singleton().area_set_monitorable(this.rid, this.monitorable);
    }

    /**
     * @param {number} p_linear_damp
     */
    set_linear_damp(p_linear_damp) {
        this.linear_damp = p_linear_damp;
        this.rid.linear_damp = p_linear_damp;
    }

    /**
     * @param {number} p_angular_damp
     */
    set_angular_damp(p_angular_damp) {
        this.angular_damp = p_angular_damp;
        this.rid.angular_damp = p_angular_damp;
    }

    /**
     * @param {number} p_priority
     */
    set_priority(p_priority) {
        this.priority = p_priority;
        this.rid.priority = p_priority;
    }

    /**
     * @param {number} p_space_override
     */
    set_space_override(p_space_override) {
        this.space_override = p_space_override;
        this.rid.space_override_mode = p_space_override;
    }


    /* private */

    /**
     * @param {number} p_status
     * @param {PhysicsBody2D} p_body
     * @param {any} p_instance
     * @param {number} p_body_shape
     * @param {number} p_area_shape
     */
    _body_inout(p_status, p_body, p_instance, p_body_shape, p_area_shape) {
        const body_in = (p_status === AREA_BODY_ADDED);
        const obj = p_instance;
        /** @type {Node} */
        const node = (p_instance.is_node ? p_instance : null);
        let E = this.body_map.get(p_instance);

        if (!body_in && !E) {
            return; // does not exist because it was likely removed from the tree
        }

        if (body_in) {
            if (!E) {
                E = new BodyState();
                E.rc = 0;
                E.in_tree = node && node.is_inside_tree();
                this.body_map.set(p_instance, E);
                if (node) {
                    node.connect('tree_entered', this._body_enter_tree, this);
                    node.connect('tree_exiting', this._body_exit_tree, this);
                    if (E.in_tree) {
                        this.emit_signal('body_entered', node);
                    }
                }
            }
            E.rc++;
            if (node) {
                E.shapes.push(new ShapePair(p_body_shape, p_area_shape));
            }

            if (!node || E.in_tree) {
                this.emit_signal('body_shape_entered', p_instance, node, p_body_shape, p_area_shape);
            }
        } else {
            E.rc--;

            if (node) {
                for (let i = 0; i < E.shapes.length; i++) {
                    if (E.shapes[i].body_shape === p_body_shape && E.shapes[i].area_shape === p_area_shape) {
                        remove_items(E.shapes, i, 1);
                        break;
                    }
                }
            }

            let eraseit = false;

            if (E.rc === 0) {
                if (node) {
                    node.disconnect('tree_entered', this._body_enter_tree, this);
                    node.disconnect('tree_exiting', this._body_exit_tree, this);
                    if (E.in_tree) {
                        this.emit_signal('body_exited', node);
                    }
                }

                eraseit = true;
            }
            if (!node || E.in_tree) {
                this.emit_signal('body_shape_exited', obj, obj, p_body_shape, p_area_shape);
            }

            if (eraseit) {
                this.body_map.delete(p_instance);
            }
        }
    }
    /**
     * @param {PhysicsBody2D} p_node
     */
    _body_enter_tree(p_node) {
        const st = this.body_map.get(p_node);
        if (!st) return;
        st.in_tree = true;
        this.emit_signal('body_entered', p_node);
        for (let s of st.shapes) {
            this.emit_signal('body_shape_entered', p_node, p_node, s.body_shape, s.area_shape);
        }
    }
    /**
     * @param {PhysicsBody2D} p_node
     */
    _body_exit_tree(p_node) {
        const st = this.body_map.get(p_node);
        if (!st) return;
        st.in_tree = false;
        this.emit_signal('body_exited', p_node);
        for (let s of st.shapes) {
            this.emit_signal('body_shape_exited', p_node, p_node, s.body_shape, s.area_shape);
        }
    }

    /**
     * @param {number} p_status
     * @param {Area2D} p_area
     * @param {any} p_instance
     * @param {number} p_area_shape
     * @param {number} p_self_shape
     */
    _area_inout(p_status, p_area, p_instance, p_area_shape, p_self_shape) {
        const area_in = (p_status === AREA_BODY_ADDED);
        const obj = p_instance;

        if (!p_instance) return;

        /** @type {Node} */
        const node = (p_instance.is_node ? p_instance : null);
        let E = this.area_map.get(p_instance);

        if (!area_in && !E) {
            return; // does not exist because it was likely removed from the tree
        }

        if (area_in) {
            if (!E) {
                E = new AreaState();
                E.rc = 0;
                E.in_tree = node && node.is_inside_tree();
                this.area_map.set(p_instance, E);
                if (node) {
                    node.connect('tree_entered', this._area_enter_tree, this);
                    node.connect('tree_exiting', this._area_exit_tree, this);
                    if (E.in_tree) {
                        this.emit_signal('area_entered', node);
                    }
                }
            }
            E.rc++;
            if (node) {
                E.shapes.push(new AreaShapePair(p_area_shape, p_self_shape));
            }

            if (!node || E.in_tree) {
                this.emit_signal('area_shape_entered', p_instance, node, p_area_shape, p_self_shape);
            }
        } else {
            E.rc--;

            if (node) {
                for (let i = 0; i < E.shapes.length; i++) {
                    if (E.shapes[i].area_shape === p_area_shape && E.shapes[i].self_shape === p_self_shape) {
                        remove_items(E.shapes, i, 1);
                        break;
                    }
                }
            }

            let eraseit = false;

            if (E.rc === 0) {
                if (node) {
                    node.disconnect('tree_entered', this._area_enter_tree, this);
                    node.disconnect('tree_exiting', this._area_exit_tree, this);
                    if (E.in_tree) {
                        this.emit_signal('area_exited', node);
                    }
                }

                eraseit = true;
            }
            if (!node || E.in_tree) {
                this.emit_signal('area_shape_exited', obj, obj, p_area_shape, p_self_shape);
            }

            if (eraseit) {
                this.area_map.delete(p_instance);
            }
        }
    }
    /**
     * @param {Area2D} p_node
     */
    _area_enter_tree(p_node) {
        const st = this.area_map.get(p_node);
        st.in_tree = true;
        this.emit_signal('area_entered', p_node);
        for (let s of st.shapes) {
            this.emit_signal('area_shape_entered', p_node, p_node, s.area_shape, s.self_shape);
        }
    }
    /**
     * @param {Area2D} p_node
     */
    _area_exit_tree(p_node) {
        const st = this.area_map.get(p_node);
        st.in_tree = false;
        this.emit_signal('area_exited', p_node);
        for (let s of st.shapes) {
            this.emit_signal('area_shape_exited', p_node, p_node, s.area_shape, s.self_shape);
        }
    }

    _clear_monitoring() {
        {
            for (let [node, bs] of this.body_map) {
                if (node.is_queued_for_deletion) {
                    continue;
                }

                node.disconnect('tree_entered', this._body_enter_tree, this);
                node.disconnect('tree_exiting', this._body_exit_tree, this);

                if (!bs.in_tree) {
                    continue;
                }

                for (let s of bs.shapes) {
                    this.emit_signal('body_shape_exited', node, node, s.body_shape, s.area_shape);
                }

                this.emit_signal('body_exited', node);
            }
            this.body_map.clear();
        }

        {
            for (let [node, as] of this.area_map) {
                if (node.is_queued_for_deletion) {
                    continue;
                }

                node.disconnect('tree_entered', this._area_enter_tree, this);
                node.disconnect('tree_exiting', this._area_exit_tree, this);

                if (!as.in_tree) {
                    continue;
                }

                for (let s of as.shapes) {
                    this.emit_signal('area_shape_exited', node, node, s.area_shape, s.self_shape);
                }

                this.emit_signal('area_exited', node);
            }
            this.area_map.clear();
        }
    }
}

node_class_map['Area2D'] = GDCLASS(Area2D, CollisionObject2D)
