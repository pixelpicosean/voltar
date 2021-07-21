import { List as SelfList$List } from 'engine/core/self_list';
import { Vector2 } from 'engine/core/math/vector2';
import { Transform2D } from 'engine/core/math/transform_2d';
import {
    AreaSpaceOverrideMode,
    AreaParameter,
    BodyState,
    SpaceParameter,
} from 'engine/scene/2d/const';

import { Step2DSW } from "./step_2d_sw";
import {
    Shape2DSW,

    RayShape2DSW,
    SegmentShape2DSW,
    CircleShape2DSW,
    RectangleShape2DSW,
    CapsuleShape2DSW,
    ConvexPolygonShape2DSW,
} from "./shape_2d_sw";
import { CollisionSolver2DSW } from "./collision_solver_2d_sw";
import { Physics2DDirectSpaceStateSW, Space2DSW } from "./space_2d_sw";
import { Area2DSW } from "./area_2d_sw";
import { Body2DSW, Physics2DDirectBodyStateSW } from "./body_2d_sw";
import {
    MotionResult,
    ShapeResult,

    CollCbkData,

    _shape_col_cbk,
} from './state';
import { NoShrinkArray } from 'engine/core/v_array';

type Node2D = import("engine/scene/2d/node_2d").Node2D;
type CanvasLayer = import("engine/scene/main/canvas_layer").CanvasLayer;
type CollisionObject2DSW = import("./collision_object_2d_sw").CollisionObject2DSW;

export const AREA_BODY_ADDED = 0;
export const AREA_BODY_REMOVED = 1;

const cbk = new CollCbkData;

export class Physics2DServer {
    static get_singleton() {
        return singleton;
    }

    active = true;
    iterations = 0;
    doing_sync = false;
    last_step = 0;

    island_count = 0;
    active_objects = 0;
    collision_pairs = 0;

    flushing_queries = false;

    stepper: Step2DSW = null;

    active_spaces: Set<Space2DSW> = new Set;

    direct_state: Physics2DDirectBodyStateSW = null;

    pending_shape_update_list = new SelfList$List<CollisionObject2DSW>();

    is_initialized = false;

    constructor() {
        if (!singleton) singleton = this;
    }

    ray_shape_create() {
        return new RayShape2DSW;
    }
    segment_shape_create() {
        return new SegmentShape2DSW;
    }
    circle_shape_create() {
        return new CircleShape2DSW;
    }
    rectangle_shape_create() {
        return new RectangleShape2DSW;
    }
    capsule_shape_create() {
        return new CapsuleShape2DSW;
    }
    convex_polygon_shape_create() {
        return new ConvexPolygonShape2DSW;
    }

    shape_set_data(p_shape: Shape2DSW, p_data: number) {
        p_shape.set_data(p_data);
    }
    shape_set_custom_solver_bias(p_shape: Shape2DSW, p_bias: number) {
        p_shape.custom_bias = p_bias;
    }

    shape_collide(p_shape_A: Shape2DSW, p_xform_A: Transform2D, p_motion_A: Vector2, p_shape_B: Shape2DSW, p_xform_B: Transform2D, p_motion_B: Vector2, r_results: Vector2[], p_result_max: number, r_ret: { value: number }): boolean {
        if (p_result_max === 0) {
            return CollisionSolver2DSW.solve(p_shape_A, p_xform_A, p_motion_A, p_shape_B, p_xform_B, p_motion_B, null, null);
        }

        cbk.reset();
        cbk.max = p_result_max;
        cbk.amount = 0;
        cbk.ptr = r_results;

        const res = CollisionSolver2DSW.solve(p_shape_A, p_xform_A, p_motion_A, p_shape_B, p_xform_B, p_motion_B, _shape_col_cbk, cbk);
        r_ret.value = cbk.amount;

        return res;
    }

    /* SPACE API */

    space_create() {
        const space = new Space2DSW;
        const area = this.area_create();
        space.area = area;
        area.set_space(space);
        area.priority = -1;

        return space;
    }
    space_free(p_space: Space2DSW) {
        this._update_shapes();

        for (let co of p_space.objects) {
            (co as Body2DSW).set_space(null);
        }

        this.active_spaces.delete(p_space);
        p_space.area._free();
        p_space._free();
    }

    space_set_active(p_space: Space2DSW, p_active: boolean) {
        if (p_active) {
            this.active_spaces.add(p_space);
        } else {
            this.active_spaces.delete(p_space);
        }
    }
    space_is_active(p_space: Space2DSW): boolean {
        return this.active_spaces.has(p_space);
    }

    space_get_direct_state(p_space: Space2DSW): Physics2DDirectSpaceStateSW {
        return p_space.direct_access;
    }

    /* AERA API */

    area_create(): Area2DSW {
        const area = new Area2DSW;
        area.self = area;
        return area;
    }
    area_set_space_override_mode(p_area: Area2DSW, p_mode: AreaSpaceOverrideMode) {
        p_area.space_override_mode = p_mode;
    }
    area_get_space_override_mode(p_area: Area2DSW): AreaSpaceOverrideMode {
        return p_area.space_override_mode;
    }
    area_set_space(p_area: Area2DSW, p_space: Space2DSW) {
        if (p_area.space === p_space) {
            return;
        }

        p_area.clear_constraints();
        p_area.set_space(p_space);
    }
    area_get_space(p_area: Area2DSW) {
        return p_area.space;
    }
    area_add_shape(p_area: Area2DSW, p_shape: Shape2DSW, p_transform: Transform2D = Transform2D.IDENTITY) {
        p_area.add_shape(p_shape, p_transform);
    }
    area_set_shape(p_area: Area2DSW, p_shape_idx: number, p_shape: Shape2DSW) {
        p_area.set_shape(p_shape_idx, p_shape);
    }
    area_set_shape_transform(p_area: Area2DSW, p_shape_idx: number, p_transform: Transform2D) {
        p_area.set_shape_transform(p_shape_idx, p_transform);
    }
    area_get_shape_count(p_area: Area2DSW) {
        return p_area.shapes.length;
    }
    area_get_shape(p_area: Area2DSW, p_shape_idx: number) {
        return p_area.get_shape(p_shape_idx);
    }
    area_get_shape_transform(p_area: Area2DSW, p_shape_idx: number) {
        return p_area.get_shape_transform(p_shape_idx);
    }
    area_remove_shape(p_area: Area2DSW, p_shape_idx: number) {
        p_area.remove_shape_by_index(p_shape_idx);
    }
    area_clear_shapes(p_area: Area2DSW) {
        while (p_area.shapes.length) {
            p_area.remove_shape_by_index(0);
        }
    }
    area_set_shape_disabled(p_area: Area2DSW, p_shape_idx: number, p_disabled: boolean) {
        p_area.set_shape_as_disabled(p_shape_idx, p_disabled);
    }
    area_attach_object_instance(p_area: Area2DSW, instance: Node2D) {
        p_area.instance = instance;
    }
    area_get_object_instance(p_area: Area2DSW) {
        return p_area.instance;
    }
    area_attach_canvas_instance(p_area: Area2DSW, canvas: CanvasLayer) {
        p_area.canvas_instance = canvas;
    }
    area_get_canvas_instance(p_area: Area2DSW) {
        return p_area.canvas_instance;
    }
    area_set_param(p_area: Area2DSW, p_param: AreaParameter, p_value: any) {
        p_area.set_param(p_param, p_value)
    }
    area_get_param(p_area: Area2DSW, p_param: AreaParameter) {
        return p_area.get_param(p_param);
    }
    area_set_transform(p_area: Area2DSW, p_transform: Transform2D) {
        p_area.set_transform(p_transform);
    }
    area_get_transform(p_area: Area2DSW) {
        return p_area.transform;
    }
    area_set_monitorable(p_area: Area2DSW, p_monitorable: boolean) {
        p_area.set_monitorable(p_monitorable);
    }
    area_set_collision_mask(p_area: Area2DSW, p_mask: number) {
        p_area.collision_mask = p_mask;
    }
    area_set_collision_layer(p_area: Area2DSW, p_layer: number) {
        p_area.collision_layer = p_layer;
    }
    area_set_monitor_callback(p_area: Area2DSW, p_receiver: any, p_method: Function) {
        p_area.set_monitor_callback(p_receiver, p_method);
    }
    area_set_area_monitor_callback(p_area: Area2DSW, p_receiver: any, p_method: Function) {
        p_area.set_area_monitor_callback(p_receiver, p_method);
    }
    area_set_pickable(p_area: Area2DSW, p_pickable: boolean) {
        p_area.pickable = p_pickable;
    }

    /* BODY API */

    body_create(): Body2DSW {
        const body = new Body2DSW;
        body.self = body;
        return body;
    }
    body_set_space(p_body: Body2DSW, p_space: Space2DSW) {
        if (p_body.space === p_space) {
            return;
        }

        p_body.constraint_map.clear();
        p_body.set_space(p_space);
    }
    body_get_space(p_body: Body2DSW) {
        return p_body.space;
    }
    body_set_state(p_body: Body2DSW, p_state: BodyState, p_var: any) {
        p_body.set_state(p_state, p_var);
    }
    body_get_direct_state(p_body: Body2DSW): Physics2DDirectBodyStateSW {
        this.direct_state.body = p_body;
        return this.direct_state;
    }
    body_add_shape(p_body: Body2DSW, p_shape: Shape2DSW, p_transform: Transform2D) {
        p_body.add_shape(p_shape, p_transform);
    }
    body_remove_shape(p_body: Body2DSW, p_shape: number) {
        p_body.remove_shape_by_index(p_shape);
    }
    body_clear_shapes(p_body: Body2DSW) {
        while (p_body.shapes.length) {
            p_body.remove_shape_by_index(0);
        }
    }
    body_set_shape(p_body: Body2DSW, p_shape_idx: number, p_shape: Shape2DSW) {
        p_body.set_shape(p_shape_idx, p_shape);
    }
    body_get_shape(p_body: Body2DSW, p_shape_idx: number) {
        return p_body.get_shape(p_shape_idx);
    }
    body_set_shape_transform(p_body: Body2DSW, p_shape_idx: number, p_transform: Transform2D) {
        p_body.set_shape_transform(p_shape_idx, p_transform);
    }
    body_get_shape_transform(p_body: Body2DSW, p_shape_idx: number) {
        return p_body.get_shape_transform(p_shape_idx);
    }
    body_set_shape_metadata(p_body: Body2DSW, p_shape_idx: number, p_metadata: any) {
        p_body.set_shape_metadata(p_shape_idx, p_metadata);
    }
    body_get_shape_metadata(p_body: Body2DSW, p_shape_idx: number) {
        return p_body.get_shape_metadata(p_shape_idx);
    }
    body_set_shape_disabled(p_body: Body2DSW, p_shape_idx: number, p_disabled: boolean) {
        p_body.set_shape_as_disabled(p_shape_idx, p_disabled);
    }
    body_set_shape_as_one_way_collision(p_body: Body2DSW, p_shape_idx: number, p_enabled: boolean, p_margin: number) {
        p_body.set_shape_as_one_way_collision(p_shape_idx, p_enabled, p_margin);
    }
    body_attach_object_instance(p_body: Body2DSW, id: Node2D) {
        p_body.instance = id;
    }
    body_set_collision_layer(p_body: Body2DSW, p_layer: number) {
        p_body.collision_layer = p_layer;
    }
    body_set_collision_mask(p_body: Body2DSW, p_mask: number) {
        p_body.collision_mask = p_mask;
    }
    body_set_pickable(p_body: Body2DSW, p_pickable: boolean) {
        p_body.pickable = p_pickable;
    }
    body_set_applied_force(p_body: Body2DSW, p_force: Vector2) {
        p_body.applied_force.copy(p_force);
        p_body.wakeup();
    }
    body_set_applied_torque(p_body: Body2DSW, p_torque: number) {
        p_body.applied_torque = p_torque;
        p_body.wakeup();
    }
    body_apply_central_impulse(p_body: Body2DSW, p_impulse: Vector2) {
        p_body.apply_central_impulse(p_impulse);
        p_body.wakeup();
    }
    body_apply_torque_impulse(p_body: Body2DSW, p_torque: number) {
        this._update_shapes();

        p_body.apply_torque_impulse(p_torque);
        p_body.wakeup();
    }
    body_apply_impulse(p_body: Body2DSW, p_pos: Vector2, p_impulse: Vector2) {
        this._update_shapes();

        p_body.apply_impulse(p_pos, p_impulse);
        p_body.wakeup();
    }
    body_add_central_force(p_body: Body2DSW, p_force: Vector2) {
        p_body.add_central_force(p_force);
        p_body.wakeup();
    }
    body_add_force(p_body: Body2DSW, p_offset: Vector2, p_force: Vector2) {
        p_body.add_force(p_offset, p_force);
        p_body.wakeup();
    }
    body_add_torque(p_body: Body2DSW, p_torque: number) {
        p_body.add_torque(p_torque);
        p_body.wakeup();
    }
    body_set_axis_velocity(p_body: Body2DSW, p_axis_velocity: Vector2) {
        this._update_shapes();

        let v = p_body.linear_velocity.clone();
        let axis = p_axis_velocity.normalized();
        v.subtract(axis.scale(axis.dot(v)));
        v.add(p_axis_velocity);
        p_body.linear_velocity.copy(v);
        p_body.wakeup();
        Vector2.free(axis);
        Vector2.free(v);
    }
    body_set_force_integration_callback(p_body: Body2DSW, p_method: Function, p_scope: any, p_params?: any) {
        if (p_body.fi_callback) {
            p_body.fi_callback = null;
        }
        if (p_method && p_scope) {
            p_body.fi_callback = {
                id: p_scope,
                method: p_method,
                callback_udata: p_params || Object.create(null),
            }
        }
    }
    body_test_motion(p_body: Body2DSW, p_from: Transform2D, p_motion: Vector2, p_infinite_inertia: boolean, p_margin: number = 0.001, r_result: MotionResult = null, p_exclude_raycast_shapes: boolean = true, p_excludes: NoShrinkArray<any> = null) {
        this._update_shapes();

        return p_body.space.test_body_motion(p_body, p_from, p_motion, p_infinite_inertia, p_margin, r_result, p_exclude_raycast_shapes, p_excludes);
    }

    /* JOINT API */

    /* MISC */

    init() {
        this.doing_sync = false;
        this.last_step = 0.001;
        this.iterations = 8;
        this.stepper = new Step2DSW;
        this.direct_state = new Physics2DDirectBodyStateSW;

        // sleep_threshold_linear = settings.sleep_threshold_linear;
        // sleep_threshold_linear_sqr = sleep_threshold_linear * sleep_threshold_linear;
        // sleep_threshold_angular = settings.sleep_threshold_angular;
        // time_before_sleep = settings.time_before_sleep;
    }

    set_active(p_active: boolean) {
        this.active = p_active;
    }

    sync() {
        this.doing_sync = true;
    }
    flush_queries() {
        if (!this.active) {
            return;
        }

        this.flushing_queries = true;

        for (let space of this.active_spaces) {
            space.call_queries();
        }

        this.flushing_queries = false;
    }
    end_sync() {
        this.doing_sync = false;
    }

    step(p_step: number) {
        if (!this.active) {
            return;
        }

        this._update_shapes();

        this.last_step = p_step;
        Physics2DDirectBodyStateSW.singleton.step = p_step;
        this.island_count = 0;
        this.active_objects = 0;
        this.collision_pairs = 0;
        for (let space of this.active_spaces) {
            this.stepper.step(space, p_step, this.iterations);
            this.island_count += space.island_count;
            this.active_objects += space.active_objects;
            this.collision_pairs += space.collision_pairs;
        }
    }

    finish() {
        this.stepper._free();
        this.direct_state._free();
    }

    _update_shapes() {
        while (this.pending_shape_update_list.first()) {
            this.pending_shape_update_list.first().self()._shape_changed();
            this.pending_shape_update_list.remove(this.pending_shape_update_list.first());
        }
    }

    is_flushing_queries(): boolean {
        return this.flushing_queries;
    }
}

/** @type {Physics2DServer} */
let singleton: Physics2DServer = null;
