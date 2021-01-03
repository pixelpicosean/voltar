import { remove_items } from 'engine/dep/index';
import { GDCLASS } from 'engine/core/v_object';
import { node_class_map } from 'engine/registry';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { ProjectSettings } from 'engine/core/project_settings';

import { NOTIFICATION_EXIT_TREE, Node } from '../main/node';
import { AreaSpaceOverrideMode } from 'engine/scene/2d/const';
import { Physics2DServer, AREA_BODY_ADDED } from 'engine/servers/physics_2d/physics_2d_server';
import { Area2DSW } from 'engine/servers/physics_2d/area_2d_sw';
import { MotionResult } from 'engine/servers/physics_2d/state';

import { CollisionObject2D } from './collision_object_2d';
import {
    PhysicsBody2D,
    KinematicCollision2D,
} from './physics_body_2d';


class ShapePair {
    body_shape: number;
    area_shape: number;

    constructor(p_bs: number = 0, p_as: number = 0) {
        this.body_shape = p_bs;
        this.area_shape = p_as;
    }
    is_less_than(p_sp: ShapePair) {
        if (this.body_shape === p_sp.body_shape) {
            return this.area_shape < p_sp.area_shape;
        } else {
            return this.body_shape < p_sp.body_shape;
        }
    }
}

class BodyState {
    rc = 0;
    in_tree = false;
    shapes: ShapePair[] = [];
}

class AreaShapePair {
    area_shape: number;
    self_shape: number;

    constructor(p_bs = 0, p_as = 0) {
        this.area_shape = p_bs;
        this.self_shape = p_as;
    }
    is_less_than(p_sp: AreaShapePair) {
        if (this.area_shape === p_sp.area_shape) {
            return this.area_shape < p_sp.area_shape;
        } else {
            return this.area_shape < p_sp.area_shape;
        }
    }
}

class AreaState {
    rc = 0;
    in_tree = false;
    shapes: AreaShapePair[] = [];
}

let motion_result = new MotionResult;
let kcol = new KinematicCollision2D;

export class Area2D extends CollisionObject2D {
    get class() { return 'Area2D' }

    rid: Area2DSW;

    space_override = AreaSpaceOverrideMode.DISABLED;
    gravity_vec = new Vector2(0, 1);
    gravity = 98;
    gravity_point = false;
    gravity_distance_scale = 0;
    linear_damp = 0.1;
    angular_damp = 1;
    collision_mask = 1;
    collision_layer = 1;
    priority = 0;
    monitoring = false;
    monitorable = false;

    body_map: Map<import('./physics_body_2d').PhysicsBody2D, BodyState> = new Map;

    area_map: Map<Area2D, AreaState> = new Map;

    constructor() {
        super(Physics2DServer.get_singleton().area_create(), true);


        this.set_monitoring(true);
        this.set_monitorable(true);
    }

    /* virtual */

    _load_data(data: any) {
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
    _notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_EXIT_TREE: {
                this._clear_monitoring();
            } break;
        }
    }

    /* public */

    get_overlapping_areas() {
        const ret: Area2D[] = Array(this.area_map.size);
        let i = 0;
        for (let area of this.area_map.keys()) {
            ret[i] = area;
            i++;
        }
        return ret;
    }

    get_overlapping_bodies() {
        const ret: PhysicsBody2D[] = Array(this.body_map.size);
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
    overlaps_area(p_area: Area2D) {
        return this.area_map.has(p_area);
    }

    /**
     * @param {PhysicsBody2D} p_body
     */
    overlaps_body(p_body: PhysicsBody2D) {
        return this.body_map.has(p_body);
    }

    /**
     * Return an individual bit on the layer mask. Describes whether
     * other areas will collide with this one on the given layer.
     *
     * @param {number} bit
     */
    get_collision_layer_bit(bit: number) {
        return !!(this.collision_layer & (1 << bit));
    }
    /**
     * Return an individual bit on the layer mask. Describes whether
     * other areas will collide with this one on the given layer.
     *
     * @param {string} layer_name
     */
    get_collision_layer_bit_named(layer_name: string) {
        return !!(this.collision_layer & (1 << ProjectSettings.get_singleton().get_physics_layer_bit(layer_name)));
    }
    /**
     * @param {number} layer
     */
    set_collision_layer(layer: number) {
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
    set_collision_layer_bit(bit: number, value: boolean) {
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
    set_collision_layer_bit_named(layer_name: string, value: boolean) {
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
    get_collision_mask_bit(bit: number) {
        return !!(this.collision_mask & (1 << bit));
    }
    /**
     * Return an individual bit on the layer mask. Describes whether
     * other areas will collide with this one on the given layer.
     *
     * @param {string} layer_name
     */
    get_collision_mask_bit_named(layer_name: string) {
        return !!(this.collision_mask & (1 << ProjectSettings.get_singleton().get_physics_layer_bit(layer_name)));
    }
    /**
     * @param {number} mask
     */
    set_collision_mask(mask: number) {
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
    set_collision_mask_bit(bit: number, value: boolean) {
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
    set_collision_mask_bit_named(layer_name: string, value: boolean) {
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
    set_gravity(value: number) {
        this.gravity = value;
        this.rid.gravity = this.gravity;
    }

    /**
     * @param {Vector2Like} value
     */
    set_gravity_vec(value: Vector2Like) {
        this.gravity_vec.copy(value);
        this.rid.gravity_vector.copy(this.gravity_vec);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_gravity_vec_n(x: number, y: number) {
        this.gravity_vec.set(x, y);
        this.rid.gravity_vector.copy(this.gravity_vec);
    }

    /**
     * @param {number} p_gravity_distance_scale
     */
    set_gravity_distance_scale(p_gravity_distance_scale: number) {
        this.gravity_distance_scale = p_gravity_distance_scale;
        this.rid.gravity_distance_scale = p_gravity_distance_scale;
    }

    /**
     * @param {boolean} p_gravity_point
     */
    set_gravity_point(p_gravity_point: boolean) {
        this.gravity_point = p_gravity_point;
        this.rid.gravity_is_point = p_gravity_point;
    }

    /**
     * @param {boolean} value
     */
    set_monitoring(value: boolean) {
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
    set_monitorable(p_enable: boolean) {
        if (p_enable === this.monitorable) {
            return;
        }

        this.monitorable = p_enable;

        Physics2DServer.get_singleton().area_set_monitorable(this.rid, this.monitorable);
    }

    /**
     * @param {number} p_linear_damp
     */
    set_linear_damp(p_linear_damp: number) {
        this.linear_damp = p_linear_damp;
        this.rid.linear_damp = p_linear_damp;
    }

    /**
     * @param {number} p_angular_damp
     */
    set_angular_damp(p_angular_damp: number) {
        this.angular_damp = p_angular_damp;
        this.rid.angular_damp = p_angular_damp;
    }

    /**
     * @param {number} p_priority
     */
    set_priority(p_priority: number) {
        this.priority = p_priority;
        this.rid.priority = p_priority;
    }

    /**
     * @param {number} p_space_override
     */
    set_space_override(p_space_override: number) {
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
    _body_inout(p_status: number, p_body: PhysicsBody2D, p_instance: any, p_body_shape: number, p_area_shape: number) {
        const body_in = (p_status === AREA_BODY_ADDED);
        const obj = p_instance;
        /** @type {Node} */
        const node: Node = (p_instance.is_node ? p_instance : null);
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
    _body_enter_tree(p_node: PhysicsBody2D) {
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
    _body_exit_tree(p_node: PhysicsBody2D) {
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
    _area_inout(p_status: number, p_area: Area2D, p_instance: any, p_area_shape: number, p_self_shape: number) {
        const area_in = (p_status === AREA_BODY_ADDED);
        const obj = p_instance;

        if (!p_instance) return;

        /** @type {Node} */
        const node: Node = (p_instance.is_node ? p_instance : null);
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
    _area_enter_tree(p_node: Area2D) {
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
    _area_exit_tree(p_node: Area2D) {
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
