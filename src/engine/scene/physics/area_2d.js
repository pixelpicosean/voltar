import CollisionObject2D, { CollisionObjectTypes } from './collision_object_2d';
import { node_class_map } from 'engine/registry';
import PhysicsServer from 'engine/servers/physics_2d/physics_server';
import { AreaSpaceOverrideMode } from 'engine/scene/physics/const';
import { Vector2 } from 'engine/math/index';
import Area2DSW from 'engine/servers/physics_2d/area_2d_sw';
import { remove_items } from 'engine/dep/index';
import Node2D from '../Node2D';

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

export default class Area2D extends CollisionObject2D {
    /**
     * @returns {number}
     */
    get_collision_layer() {
        return this.collision_layer;
    }
    /**
     * Return an individual bit on the layer mask. Describes whether
     * other areas will collide with this one on the given layer.
     *
     * @param {number} bit
     * @returns {boolean}
     */
    get_collision_layer_bit(bit) {
        return !!(this.collision_layer & (1 << bit));
    }
    /**
     * @param {number} layer
     * @returns {this}
     */
    set_collision_layer(layer) {
        this.collision_layer = layer;

        return this;
    }
    /**
     * Set/clear individual bits on the layer mask. This makes
     * getting an area in/out of only one layer easier.
     *
     * @param {number} bit
     * @param {boolean} value
     * @returns {this}
     */
    set_collision_layer_bit(bit, value) {
        if (value) {
            this.collision_layer |= (1 << bit);
        } else {
            this.collision_layer &= ~(1 << bit);
        }

        return this;
    }

    /**
     * @returns {number}
     */
    get_collision_mask() {
        return this.collision_mask;
    }
    /**
     * Return an individual bit on the collision mask. Describes whether
     * this area will collide with others on the given layer.
     *
     * @param {number} bit
     * @returns {boolean}
     */
    get_collision_mask_bit(bit) {
        return !!(this.collision_mask & (1 << bit));
    }
    /**
     * @param {number} mask
     * @returns {this}
     */
    set_collision_mask(mask) {
        this.collision_mask = mask;

        return this;
    }
    /**
     * Set/clear individual bits on the collision mask. This makes
     * selecting the areas scanned easier.
     *
     * @param {number} bit
     * @param {boolean} value
     * @returns {this}
     */
    set_collision_mask_bit(bit, value) {
        if (value) {
            this.collision_mask |= (1 << bit);
        } else {
            this.collision_mask &= ~(1 << bit);
        }

        return this;
    }

    get gravity() {
        return this._gravity;
    }
    /**
     * @param {number} value
     */
    set gravity(value) {
        this._gravity = value;
        this.rid.gravity = this._gravity;
    }
    /**
     * @param {number} value
     */
    set_gravity(value) {
        this.gravity = value;
        return this;
    }

    get gravity_vec() {
        return this._gravity_vec;
    }
    /**
     * @param {Vector2} value
     */
    set gravity_vec(value) {
        this._gravity_vec.copy(value);
        this.rid.gravity_vector.copy(this._gravity_vec);
    }
    /**
     * @param {Vector2} value
     */
    set_gravity_vec(value) {
        this.gravity_vec = value;
        return this;
    }

    get monitoring() {
        return this._monitoring;
    }
    /**
     * @param {boolean} value
     */
    set monitoring(value) {
        if (value === this._monitoring) {
            return;
        }

        this._monitoring = value;

        if (this._monitoring) {
            PhysicsServer.singleton.area_set_monitor_callback(this.rid, this, this._body_inout);
            PhysicsServer.singleton.area_set_area_monitor_callback(this.rid, this, this._area_inout);
        } else {
            PhysicsServer.singleton.area_set_monitor_callback(this.rid, null, null);
            PhysicsServer.singleton.area_set_area_monitor_callback(this.rid, null, null);
            this._clear_monitoring();
        }
    }
    /**
     * @param {boolean} value
     */
    set_monitoring(value) {
        this.monitoring = value;
        return this;
    }

    get monitorable() {
        return this._monitorable;
    }
    /**
     * @param {boolean} p_enable
     */
    set monitorable(p_enable) {
        if (p_enable === this._monitorable) {
            return;
        }

        this._monitorable = p_enable;

        PhysicsServer.singleton.area_set_monitorable(this.rid, this._monitorable);
    }
    /**
     * @param {boolean} value
     */
    set_monitorable(value) {
        this.monitorable = value;
        return this;
    }

    constructor() {
        super(PhysicsServer.singleton.area_create(), true);

        this.type = 'Area2D';

        /**
         * @type {Area2DSW}
         */
        this.rid;

        this.space_override = AreaSpaceOverrideMode.DISABLED;
        this._gravity_vec = new Vector2(0, 1);
        this._gravity = 98;
        this.gravity_point = false;
        this.gravity_distance_scale = 0;
        this.linear_damp = 0.1;
        this.angular_damp = 1;
        this.collision_mask = 1;
        this.collision_layer = 1;
        this.priority = 0;
        this._monitoring = false;
        this._monitorable = false;

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
        this.monitoring = true;
        this.monitorable = true;
    }
    _load_data(data) {
        super._load_data(data);

        if (data.gravity_point !== undefined) {
            this.gravity_point = data.gravity_point;
        }
        if (data.gravity_distance_scale !== undefined) {
            this.gravity_distance_scale = data.gravity_distance_scale;
        }
        if (data.gravity !== undefined) {
            this.gravity = data.gravity;
        }
        if (data.linear_damp !== undefined) {
            this.linear_damp = data.linear_damp;
        }
        if (data.angular_damp !== undefined) {
            this.angular_damp = data.angular_damp;
        }
        if (data.gravity_vec !== undefined) {
            this.gravity_vec = data.gravity_vec;
        }

        return this;
    }
    _propagate_exit_tree() {
        this._clear_monitoring();
    }

    _body_inout(p_status, p_body, p_instance, p_area_shape, p_self_shape) { }
    _body_enter_tree(p_id) { }
    _body_exit_tree(p_id) { }

    /**
     * @param {string} p_status
     * @param {Area2D} p_area
     * @param {any} p_instance
     * @param {number} p_area_shape
     * @param {number} p_self_shape
     */
    _area_inout(p_status, p_area, p_instance, p_area_shape, p_self_shape) {
        // TODO: [optimize] change the status to number enum
        const area_in = p_status === 'AREA_BODY_ADDED';
        const obj = p_instance;
        /**
         * @type {Node2D}
         */
        const node = (p_instance.is_node ? p_instance : null);
        let E = this.area_map.get(p_instance);

        if (area_in) {
            if (!E) {
                E = new AreaState();
                E.rc = 0;
                E.in_tree = node && node.is_inside_tree;
                this.area_map.set(p_instance, E);
                if (node) {
                    node.connect('tree_entered', this._area_enter_tree, this);
                    node.connect('tree_exited', this._area_exit_tree, this);
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
                    node.disconnect('tree_exited', this._area_exit_tree, this);
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
                if (node._destroyed) {
                    continue;
                }

                node.disconnect('tree_entered', this._body_enter_tree);
                node.disconnect('tree_exited', this._body_exit_tree);

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
                if (node._destroyed) {
                    continue;
                }

                node.disconnect('tree_entered', this._area_enter_tree);
                node.disconnect('tree_exited', this._area_exit_tree);

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

node_class_map['Area2D'] = Area2D;
