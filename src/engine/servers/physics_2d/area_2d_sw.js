import SelfList from "engine/core/self_list";
import {
    Vector2,
    Matrix,
} from "engine/math/index";
import {
    CollisionObjectType,
    AreaSpaceOverrideMode,
    AreaParameter,
} from "engine/scene/physics/const";
import CollisionObject2DSW from "./collision_object_2d_sw";

class BodyKey {
    /**
     * @param {Area2DSW|import('./body_2d_sw').default} p_body
     * @param {number} p_body_shape
     * @param {number} p_area_shape
     */
    constructor(p_body, p_body_shape, p_area_shape) {
        this.rid = p_body;
        this.instance = p_body.instance;
        this.body_shape = p_body_shape;
        this.area_shape = p_area_shape;
    }
}

class BodyState {
    inc() { this.state++ }
    dec() { this.state-- }
    constructor() { this.state = 0 }
}

export default class Area2DSW extends CollisionObject2DSW {
    constructor() {
        super(CollisionObjectType.AREA);

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
        this.monitorable = false;

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
         * @type {Set<import('./constraint_2d_sw').default>}
         */
        this.constraints = new Set();

        this.static = true;
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
     * @param {import('./body_2d_sw').default} p_body
     * @param {number} p_body_shape
     * @param {number} p_area_shape
     */
    add_body_to_query(p_body, p_body_shape, p_area_shape) {
        let E;
        for (let [bk, s] of this.monitored_bodies) {
            if (bk.instance === p_body && bk.body_shape === p_body_shape && bk.area_shape === p_area_shape) {
                E = s;
                break;
            }
        }
        if (!E) {
            const bk = new BodyKey(p_body, p_body_shape, p_area_shape);
            E = new BodyState();
            this.monitored_bodies.set(bk, E);
        }

        E.inc();

        if (!this.monitor_query_list.in_list()) {
            this._queue_monitor_update();
        }
    }
    /**
     * @param {import('./body_2d_sw').default} p_body
     * @param {number} p_body_shape
     * @param {number} p_area_shape
     */
    remove_body_from_query(p_body, p_body_shape, p_area_shape) {
        let E;
        for (let [bk, s] of this.monitored_bodies) {
            if (bk.instance === p_body && bk.body_shape === p_body_shape && bk.area_shape === p_area_shape) {
                E = s;
                break;
            }
        }
        if (!E) {
            const bk = new BodyKey(p_body, p_body_shape, p_area_shape);
            E = new BodyState();
            this.monitored_bodies.set(bk, E);
        }

        E.dec();

        if (!this.monitor_query_list.in_list()) {
            this._queue_monitor_update();
        }
    }

    /**
     * @param {Area2DSW} p_area
     * @param {number} p_area_shape
     * @param {number} p_self_shape
     */
    add_area_to_query(p_area, p_area_shape, p_self_shape) {
        let E;
        for (let [bk, s] of this.monitored_areas) {
            if (bk.instance === p_area && bk.area_shape === p_area_shape && bk.body_shape === p_self_shape) {
                E = s;
                break;
            }
        }
        if (!E) {
            const bk = new BodyKey(p_area, p_area_shape, p_self_shape);
            E = new BodyState();
            this.monitored_areas.set(bk, E);
        }

        E.inc();

        if (!this.monitor_query_list.in_list()) {
            this._queue_monitor_update();
        }
    }
    remove_area_from_query(p_area, p_area_shape, p_self_shape) {
        let E;
        for (let [bk, s] of this.monitored_areas) {
            if (bk.instance === p_area && bk.area_shape === p_area_shape && bk.body_shape === p_self_shape) {
                E = s;
                break;
            }
        }
        if (!E) {
            const bk = new BodyKey(p_area, p_area_shape, p_self_shape);
            E = new BodyState();
            this.monitored_areas.set(bk, E);
        }

        E.dec();

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
     * @param {import('./constraint_2d_sw').default} p_constraint
     */
    add_constraint(p_constraint) {
        this.constraints.add(p_constraint);
    }
    /**
     * @param {import('./constraint_2d_sw').default} p_constraint
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
        if (this.monitorable === p_monitorable) {
            return;
        }

        this.monitorable = p_monitorable;
        this.static = !this.monitorable;
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

        const m = p_transform.clone().affine_inverse();
        this._set_inv_transform(m);
        Matrix.delete(m);
    }

    /**
     * @param {import('./space_2d_sw').default} p_sapce
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
                    bs.state > 0,
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
                    bs.state > 0,
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
