import CollisionObject2DSW from "./collision_object_2d_sw";
import { Type, AreaSpaceOverrideMode, AreaParameter } from "engine/physics/const";
import { Vector2, Matrix } from "engine/math/index";
import Constraint2DSW from "./constraint_2d_sw";
import Space2DSW from "./space_2d_sw";
import SelfList from "engine/core/self_list";

class BodyKey {
    constructor(p_body = null, p_body_shape = 0, p_area_shape = 0) {
        this.rid = p_body;
        this.instance = p_body;
        this.body_shape = p_body_shape;
        this.area_shape = p_area_shape;
    }
    /**
     * @param {BodyKey} p_key
     */
    is_less_than(p_key) {
        if (this.rid === p_key.rid) {
            if (this.body_shape === p_key.body_shape) {
                return this.area_shape < p_key.area_shape;
            } else {
                return this.body_shape < p_key.body_shape;
            }
        } else {
            return this.rid < p_key.rid;
        }
    }
}

class BodyState {
    inc() { this.state++ }
    dec() { this.state-- }
    constructor() { this.state = 0 }
}

export default class Area2DSW extends CollisionObject2DSW {
    constructor() {
        super(Type.AREA);

        /**
         * @type {AreaSpaceOverrideMode}
         */
        this.space_override_mode = AreaSpaceOverrideMode.DISABLED;
        this.gravity = 9.80665;
        this.gravity_vector = new Vector2(0, -1);
        this.gravity_is_point = false;
        this.gravity_distance_scale = 0;
        this.point_attenuation = 1;
        this.linear_damp = 0.1;
        this.angular_damp = 1;
        this.priotity = 0;
        this.monitorable = true;

        this.monitor_callback_scope = null;
        /**
         * @type {Function}
         */
        this.monitor_callback_method = null;

        this.area_monitor_callback_scope = null;
        /**
         * @type {Function}
         */
        this.area_monitor_callback_method = null;

        /**
         * @type {SelfList<Area2DSW>}
         */
        this.monitor_query_list = new SelfList(this);
        /**
         * @type {SelfList<Area2DSW>}
         */
        this.moved_list = new SelfList(this);

        /**
         * @type {Map<BodyKey, BodyState>}
         */
        this.monitored_bodies = new Map();
        /**
         * @type {Map<BodyKey, BodyState>}
         */
        this.monitored_areas = new Map();

        /**
         * @type {Set<Constraint2DSW>}
         */
        this.constraints = new Set();
    }

    _queue_monitor_update() {
        if (!this.monitor_query_list.in_list()) {
            this.space.area_add_to_monitor_query_list(this.monitor_query_list);
        }
    }

    /**
     * @param {any} p_object
     * @param {Function} p_method
     */
    set_monitor_callback(p_object, p_method) {
        if (p_object === this.monitor_callback_scope) {
            this.monitor_callback_method = p_method;
            return;
        }

        this._unregister_shapes();

        this.monitor_callback_scope = p_object;
        this.monitor_callback_method = p_method;

        this.monitored_bodies.clear();
        this.monitored_areas.clear();

        this._shape_changed();

        if (!this.moved_list.in_list() && this.space) {
            this.space.area_add_to_moved_list(this.moved_list);
        }
    }
    has_monitor_callback() {
        return this.monitor_callback_scope;
    }

    /**
     * @param {any} p_object
     * @param {Function} p_method
     */
    set_area_monitor_callback(p_object, p_method) {
        if (p_object === this.area_monitor_callback_scope) {
            this.area_monitor_callback_method = p_method;
            return;
        }

        this._unregister_shapes();

        this.area_monitor_callback_scope = p_object;
        this.area_monitor_callback_method = p_method;

        this.monitored_bodies.clear();
        this.monitored_areas.clear();

        this._shape_changed();

        if (!this.moved_list.in_list() && this.space) {
            this.space.area_add_to_moved_list(this.moved_list);
        }
    }
    has_area_monitor_callback() {
        return this.area_monitor_callback_scope;
    }

    /**
     * @param {Area2DSW} p_area
     * @param {number} p_area_shape
     * @param {number} p_self_shape
     */
    add_area_to_query(p_area, p_area_shape, p_self_shape) {
        for (let [bk, s] of this.monitored_areas) {
            if (bk.instance === p_area && bk.area_shape === p_area_shape && bk.body_shape === p_self_shape) {
                s.inc();
                break;
            }
        }
        if (!this.monitor_query_list.in_list()) {
            this._queue_monitor_update();
        }
    }
    remove_area_to_query(p_area, p_area_shape, p_self_shape) {
        for (let [bk, s] of this.monitored_areas) {
            if (bk.instance === p_area && bk.area_shape === p_area_shape && bk.body_shape === p_self_shape) {
                s.dec();
                break;
            }
        }
        if (!this.monitor_query_list.in_list()) {
            this._queue_monitor_update();
        }
    }

    /**
     * @param {AreaParameter} p_param
     * @param {any} p_value
     */
    set_param(p_param, p_value) { }
    /**
     * @param {AreaParameter} p_param
     */
    get_param(p_param) { }

    /**
     * @param {AreaSpaceOverrideMode} p_mode
     */
    set_space_override_mode(p_mode) {
        const do_override = p_mode !== AreaSpaceOverrideMode.DISABLED;
        if (do_override === (this.space_override_mode !== AreaSpaceOverrideMode.DISABLED)) {
            return;
        }
        this._unregister_shapes();
        this.space_override_mode = p_mode;
        this._shape_changed();
    }
    /**
     * @returns {AreaSpaceOverrideMode}
     */
    get_space_override_mode() {
        return this.space_override_mode;
    }

    /**
     * @param {Constraint2DSW} p_constraint
     */
    add_constraint(p_constraint) {
        this.constraints.add(p_constraint);
    }
    /**
     * @param {Constraint2DSW} p_constraint
     */
    remove_constraint(p_constraint) {
        this.constraints.delete(p_constraint);
    }
    clear_constraints() {
        this.constraints.clear();
    }

    /**
     * @param {boolean} p_monitorable
     */
    set_monitorable(p_monitorable) {
        if (this.monitorable == p_monitorable) {
            return;
        }

        this.monitorable = p_monitorable;
        this._set_static(!this.monitorable);
    }
    get_monitorable() {
        return this.monitorable;
    }

    /**
     * @param {Matrix} p_transform
     */
    set_transform(p_transform) {
        if (!this.moved_list.in_list() && this.space) {
            this.space.area_add_to_moved_list(this.moved_list);
        }

        this._set_transform(p_transform);
        this._set_inv_transform(p_transform.clone().affine_inverse());
    }

    /**
     * @param {Space2DSW} p_sapce
     */
    set_space(p_sapce) {
        if (this.space) {
            if (this.monitor_query_list.in_list()) {
                this.space.area_remove_from_monitor_query_list(this.monitor_query_list);
            }
            if (this.moved_list.in_list()) {
                this.space.area_remove_from_moved_list(this.moved_list);
            }
        }

        this.monitored_bodies.clear();
        this.monitored_areas.clear();

        this._set_space(p_sapce);
    }

    call_queries() {
        if (this.monitor_callback_scope && this.monitored_bodies.size > 0) {
            const obj = this.monitor_callback_scope;
            if (!obj) {
                this.monitored_bodies.clear();
                this.monitor_callback_scope = null;
                return;
            }

            for (let [bk, bs] of this.monitored_bodies) {
                if (bs.state === 0) {
                    continue;
                }

                this.monitor_callback_method.call(this.monitor_callback_scope,
                    bs.state > 0 ? 'AREA_BODY_ADDED' : 'AREA_BODY_REMOVED',
                    bk.rid,
                    bk.instance,
                    bk.body_shape,
                    bk.area_shape
                )
            }
        }

        this.monitored_bodies.clear();

        if (this.area_monitor_callback_scope && this.monitored_areas.size > 0) {
            const obj = this.area_monitor_callback_scope;
            if (!obj) {
                this.monitored_areas.clear();
                this.area_monitor_callback_scope = null;
                return;
            }

            for (let [bk, bs] of this.monitored_areas) {
                if (bs.state === 0) {
                    continue;
                }

                this.area_monitor_callback_method.call(this.area_monitor_callback_scope,
                    bs.state > 0 ? 'AREA_BODY_ADDED' : 'AREA_BODY_REMOVED',
                    bk.rid,
                    bk.instance,
                    bk.body_shape,
                    bk.area_shape
                )
            }
        }

        this.monitored_areas.clear();
    }
}
