import { SelfList } from "engine/core/self_list";
import { Vector2 } from "engine/core/math/vector2";
import { Transform2D } from "engine/core/math/transform_2d";
import {
    CollisionObject2DSW$Type,
    AreaSpaceOverrideMode,
    AreaParameter,
} from "engine/scene/2d/const";

import { AREA_BODY_ADDED, AREA_BODY_REMOVED } from "./physics_2d_server";
import { CollisionObject2DSW } from "./collision_object_2d_sw";

type Node2D = import("engine/scene/2d/node_2d").Node2D;

type Space2DSW = import("./space_2d_sw").Space2DSW;
type Body2DSW = import("./body_2d_sw").Body2DSW;
type Constraint2DSW = import("./constraint_2d_sw").Constraint2DSW;

class BodyKey {
    rid: Area2DSW | Body2DSW;
    instance: Node2D;
    body_shape: number;
    area_shape: number;

    constructor(p_body: Area2DSW | Body2DSW, p_body_shape: number, p_area_shape: number) {
        this.rid = p_body;
        this.instance = p_body.instance;
        this.body_shape = p_body_shape;
        this.area_shape = p_area_shape;
    }
}

class BodyState {
    state = 0;
    inc() { this.state++ }
    dec() { this.state-- }
}

export class Area2DSW extends CollisionObject2DSW {
    space_override_mode = AreaSpaceOverrideMode.DISABLED;
    gravity = 9.80665;
    gravity_vector = new Vector2(0, -1);
    gravity_is_point = false;
    gravity_distance_scale = 0;
    point_attenuation = 1;

    angular_damp = 1.0;
    linear_damp = 0.1;
    priority = 0;
    monitorable = false;

    monitor_callback_scope: any = null;
    monitor_callback_method: Function = null;

    area_monitor_callback_scope: any = null;
    area_monitor_callback_method: Function = null;

    monitor_query_list: SelfList<Area2DSW> = new SelfList(this);
    moved_list: SelfList<Area2DSW> = new SelfList(this);

    monitored_bodies: Map<BodyKey, BodyState> = new Map;
    monitored_areas: Map<BodyKey, BodyState> = new Map;

    constraints: Set<Constraint2DSW> = new Set;

    constructor() {
        super(CollisionObject2DSW$Type.AREA);

        this._set_static(true);
    }

    _shapes_changed() {
        if (!this.moved_list.in_list() && this.space) {
            this.space.area_add_to_moved_list(this.moved_list);
        }
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
    set_monitor_callback(p_object: any, p_method: Function) {
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
    set_area_monitor_callback(p_object: any, p_method: Function) {
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

    add_body_to_query(p_body: Body2DSW, p_body_shape: number, p_area_shape: number) {
        let E: BodyState;
        for (let [bk, s] of this.monitored_bodies) {
            if (bk.rid === p_body && bk.body_shape === p_body_shape && bk.area_shape === p_area_shape) {
                E = s;
                break;
            }
        }
        if (!E) {
            let bk = new BodyKey(p_body, p_body_shape, p_area_shape);
            E = new BodyState;
            this.monitored_bodies.set(bk, E);
        }

        E.inc();

        if (!this.monitor_query_list.in_list()) {
            this._queue_monitor_update();
        }
    }
    remove_body_from_query(p_body: Body2DSW, p_body_shape: number, p_area_shape: number) {
        let E: BodyState;
        for (let [bk, s] of this.monitored_bodies) {
            if (bk.rid === p_body && bk.body_shape === p_body_shape && bk.area_shape === p_area_shape) {
                E = s;
                break;
            }
        }
        if (!E) {
            let bk = new BodyKey(p_body, p_body_shape, p_area_shape);
            E = new BodyState;
            this.monitored_bodies.set(bk, E);
        }

        E.dec();

        if (!this.monitor_query_list.in_list()) {
            this._queue_monitor_update();
        }
    }

    add_area_to_query(p_area: Area2DSW, p_area_shape: number, p_self_shape: number) {
        let E: BodyState;
        for (let [bk, s] of this.monitored_areas) {
            if (bk.rid === p_area && bk.area_shape === p_area_shape && bk.body_shape === p_self_shape) {
                E = s;
                break;
            }
        }
        if (!E) {
            let bk = new BodyKey(p_area, p_area_shape, p_self_shape);
            E = new BodyState;
            this.monitored_areas.set(bk, E);
        }

        E.inc();

        if (!this.monitor_query_list.in_list()) {
            this._queue_monitor_update();
        }
    }
    remove_area_from_query(p_area: Area2DSW, p_area_shape: number, p_self_shape: number) {
        let E: BodyState;
        for (let [bk, s] of this.monitored_areas) {
            if (bk.rid === p_area && bk.area_shape === p_area_shape && bk.body_shape === p_self_shape) {
                E = s;
                break;
            }
        }
        if (!E) {
            let bk = new BodyKey(p_area, p_area_shape, p_self_shape);
            E = new BodyState;
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
    set_param(p_param: AreaParameter, p_value: any) {
        switch (p_param) {
            case AreaParameter.GRAVITY: this.gravity = p_value; break;
            case AreaParameter.GRAVITY_VECTOR: this.gravity_vector.copy(p_value); break;
            case AreaParameter.GRAVITY_IS_POINT: this.gravity_is_point = p_value; break;
            case AreaParameter.GRAVITY_DISTANCE_SCALE: this.gravity_distance_scale = p_value; break;
            case AreaParameter.GRAVITY_POINT_ATTENUATION: this.point_attenuation = p_value; break;
            case AreaParameter.LINEAR_DAMP: this.linear_damp = p_value; break;
            case AreaParameter.ANGULAR_DAMP: this.angular_damp = p_value; break;
            case AreaParameter.PRIORITY: this.priority = p_value; break;
        }
    }
    /**
     * @param {AreaParameter} p_param
     */
    get_param(p_param: AreaParameter) {
        switch (p_param) {
            case AreaParameter.GRAVITY: return this.gravity;
            case AreaParameter.GRAVITY_VECTOR: return this.gravity_vector;
            case AreaParameter.GRAVITY_IS_POINT: return this.gravity_is_point;
            case AreaParameter.GRAVITY_DISTANCE_SCALE: return this.gravity_distance_scale;
            case AreaParameter.GRAVITY_POINT_ATTENUATION: return this.point_attenuation;
            case AreaParameter.LINEAR_DAMP: return this.linear_damp;
            case AreaParameter.ANGULAR_DAMP: return this.angular_damp;
            case AreaParameter.PRIORITY: return this.priority;
        }
    }

    set_space_override_mode(p_mode: AreaSpaceOverrideMode) {
        let do_override = p_mode !== AreaSpaceOverrideMode.DISABLED;
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
    get_space_override_mode(): AreaSpaceOverrideMode {
        return this.space_override_mode;
    }

    /**
     * @param {import('./constraint_2d_sw').Constraint2DSW} p_constraint
     */
    add_constraint(p_constraint: import('./constraint_2d_sw').Constraint2DSW) {
        this.constraints.add(p_constraint);
    }
    /**
     * @param {import('./constraint_2d_sw').Constraint2DSW} p_constraint
     */
    remove_constraint(p_constraint: import('./constraint_2d_sw').Constraint2DSW) {
        this.constraints.delete(p_constraint);
    }
    clear_constraints() {
        this.constraints.clear();
    }

    set_monitorable(p_monitorable: boolean) {
        if (this.monitorable === p_monitorable) {
            return;
        }

        this.monitorable = p_monitorable;
        this._set_static(!this.monitorable);
    }
    get_monitorable() {
        return this.monitorable;
    }

    set_transform(p_transform: Transform2D) {
        if (!this.moved_list.in_list() && this.space) {
            this.space.area_add_to_moved_list(this.moved_list);
        }

        this._set_transform(p_transform);

        let m = p_transform.clone().affine_inverse();
        this._set_inv_transform(m);
        Transform2D.free(m);
    }

    set_space(p_sapce: Space2DSW) {
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
            let obj = this.monitor_callback_scope;
            if (!obj) {
                this.monitored_bodies.clear();
                this.monitor_callback_scope = null;
                return;
            }

            for (let [bk, bs] of this.monitored_bodies) {
                if (bs.state === 0) {
                    continue;
                }

                this.monitored_bodies.delete(bk);

                this.monitor_callback_method.call(this.monitor_callback_scope,
                    bs.state > 0 ? AREA_BODY_ADDED : AREA_BODY_REMOVED,
                    bk.rid,
                    bk.instance,
                    bk.body_shape,
                    bk.area_shape
                );
            }
        }

        if (this.area_monitor_callback_scope && this.monitored_areas.size > 0) {
            let obj = this.area_monitor_callback_scope;
            if (!obj) {
                this.monitored_areas.clear();
                this.area_monitor_callback_scope = null;
                return;
            }

            for (let [bk, bs] of this.monitored_areas) {
                if (bs.state === 0) {
                    continue;
                }

                this.monitored_areas.delete(bk);

                this.area_monitor_callback_method.call(this.area_monitor_callback_scope,
                    bs.state > 0 ? AREA_BODY_ADDED : AREA_BODY_REMOVED,
                    bk.rid,
                    bk.instance,
                    bk.body_shape,
                    bk.area_shape
                );
            }
        }
    }
}
