export const AREA_BODY_ADDED = 0;
export const AREA_BODY_REMOVED = 1;

type Shape2DSW = any;
type BodyState = any;
type AreaParameter = any;
type CanvasLayer = any;
type Node2D = any;
type Vector2 = any;
type Transform2D = any;
type Space2DSW = any;
type Area2DSW = any;
type AreaSpaceOverrideMode = any;
export type CollisionObject2DSW = any;
export type Physics2DDirectBodyStateSW = any;

export class RayResult {}
export class MotionResult {}
export class SeparationResult {}
export class Body2DSW {}

export class Physics2DServer {
    static get_singleton() {
        return singleton;
    }

    constructor() {
        if (!singleton) singleton = this;
    }

    ray_shape_create(): any {
        return null;
    }
    segment_shape_create(): any {
        return null;
    }
    circle_shape_create(): any {
        return null;
    }
    rectangle_shape_create(): any {
        return null;
    }
    capsule_shape_create(): any {
        return null;
    }
    convex_polygon_shape_create(): any {
        return null;
    }

    shape_set_data(p_shape: Shape2DSW, p_data: number) { }
    shape_set_custom_solver_bias(p_shape: Shape2DSW, p_bias: number) { }

    shape_collide(p_shape_A: Shape2DSW, p_xform_A: Transform2D, p_motion_A: Vector2, p_shape_B: Shape2DSW, p_xform_B: Transform2D, p_motion_B: Vector2, r_results: Vector2[], p_result_max: number, r_ret: { value: number }): boolean {
        return false;
    }

    /* SPACE API */

    space_create(): any {
        return null;
    }
    space_free(p_space: Space2DSW) { }

    space_set_active(p_space: Space2DSW, p_active: boolean) { }
    space_is_active(p_space: Space2DSW): boolean {
        return false;
    }

    space_get_direct_state(p_space: Space2DSW): any { }

    /* AERA API */

    area_create(): any {
        return null;
    }
    area_set_space_override_mode(p_area: Area2DSW, p_mode: AreaSpaceOverrideMode) { }
    area_get_space_override_mode(p_area: Area2DSW): AreaSpaceOverrideMode { }
    area_set_space(p_area: Area2DSW, p_space: Space2DSW) { }
    area_get_space(p_area: Area2DSW) { }
    area_add_shape(p_area: Area2DSW, p_shape: Shape2DSW, p_transform?: Transform2D) { }
    area_set_shape(p_area: Area2DSW, p_shape_idx: number, p_shape: Shape2DSW) { }
    area_set_shape_transform(p_area: Area2DSW, p_shape_idx: number, p_transform: Transform2D) { }
    area_get_shape_count(p_area: Area2DSW) { }
    area_get_shape(p_area: Area2DSW, p_shape_idx: number) { }
    area_get_shape_transform(p_area: Area2DSW, p_shape_idx: number) { }
    area_remove_shape(p_area: Area2DSW, p_shape_idx: number) { }
    area_clear_shapes(p_area: Area2DSW) { }
    area_set_shape_disabled(p_area: Area2DSW, p_shape_idx: number, p_disabled: boolean) { }
    area_attach_object_instance(p_area: Area2DSW, instance: Node2D) { }
    area_get_object_instance(p_area: Area2DSW) { }
    area_attach_canvas_instance(p_area: Area2DSW, canvas: CanvasLayer) { }
    area_get_canvas_instance(p_area: Area2DSW) { }
    area_set_param(p_area: Area2DSW, p_param: AreaParameter, p_value: any) { }
    area_get_param(p_area: Area2DSW, p_param: AreaParameter) { }
    area_set_transform(p_area: Area2DSW, p_transform: Transform2D) { }
    area_get_transform(p_area: Area2DSW) { }
    area_set_monitorable(p_area: Area2DSW, p_monitorable: boolean) { }
    area_set_collision_mask(p_area: Area2DSW, p_mask: number) { }
    area_set_collision_layer(p_area: Area2DSW, p_layer: number) { }
    area_set_monitor_callback(p_area: Area2DSW, p_receiver: any, p_method: Function) { }
    area_set_area_monitor_callback(p_area: Area2DSW, p_receiver: any, p_method: Function) { }
    area_set_pickable(p_area: Area2DSW, p_pickable: boolean) { }

    /* BODY API */

    body_create(): Body2DSW { }
    body_set_space(p_body: Body2DSW, p_space: Space2DSW) { }
    body_get_space(p_body: Body2DSW) { }
    body_set_state(p_body: Body2DSW, p_state: BodyState, p_var: any) { }
    body_get_direct_state(p_body: Body2DSW): Physics2DDirectBodyStateSW { }
    body_add_shape(p_body: Body2DSW, p_shape: Shape2DSW, p_transform: Transform2D) { }
    body_remove_shape(p_body: Body2DSW, p_shape: number) { }
    body_clear_shapes(p_body: Body2DSW) { }
    body_set_shape(p_body: Body2DSW, p_shape_idx: number, p_shape: Shape2DSW) { }
    body_get_shape(p_body: Body2DSW, p_shape_idx: number) { }
    body_set_shape_transform(p_body: Body2DSW, p_shape_idx: number, p_transform: Transform2D) { }
    body_get_shape_transform(p_body: Body2DSW, p_shape_idx: number) { }
    body_set_shape_metadata(p_body: Body2DSW, p_shape_idx: number, p_metadata: any) { }
    body_get_shape_metadata(p_body: Body2DSW, p_shape_idx: number) { }
    body_set_shape_disabled(p_body: Body2DSW, p_shape_idx: number, p_disabled: boolean) { }
    body_set_shape_as_one_way_collision(p_body: Body2DSW, p_shape_idx: number, p_enabled: boolean, p_margin: number) { }
    body_attach_object_instance(p_body: Body2DSW, id: Node2D) { }
    body_set_collision_layer(p_body: Body2DSW, p_layer: number) { }
    body_set_collision_mask(p_body: Body2DSW, p_mask: number) { }
    body_set_pickable(p_body: Body2DSW, p_pickable: boolean) { }
    body_set_applied_force(p_body: Body2DSW, p_force: Vector2) { }
    body_set_applied_torque(p_body: Body2DSW, p_torque: number) { }
    body_apply_central_impulse(p_body: Body2DSW, p_impulse: Vector2) { }
    body_apply_torque_impulse(p_body: Body2DSW, p_torque: number) { }
    body_apply_impulse(p_body: Body2DSW, p_pos: Vector2, p_impulse: Vector2) { }
    body_add_central_force(p_body: Body2DSW, p_force: Vector2) { }
    body_add_force(p_body: Body2DSW, p_offset: Vector2, p_force: Vector2) { }
    body_add_torque(p_body: Body2DSW, p_torque: number) { }
    body_set_axis_velocity(p_body: Body2DSW, p_axis_velocity: Vector2) { }
    body_set_force_integration_callback(p_body: Body2DSW, p_method: Function, p_scope: any, p_params?: any) { }
    body_test_motion(p_body: Body2DSW, p_from: Transform2D, p_motion: Vector2, p_infinite_inertia: boolean, p_margin: number = 0.001, r_result: MotionResult = null, p_exclude_raycast_shapes: boolean = true) { }

    /* JOINT API */

    /* MISC */

    init() { }

    set_active(p_active: boolean) { }

    sync() { }
    flush_queries() { }
    end_sync() { }

    step(p_step: number) { }
}

/** @type {Physics2DServer} */
let singleton: Physics2DServer = null;
