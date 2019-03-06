import {
    Vector2,
    Matrix,
} from "engine/core/math/index";

import {
    AreaSpaceOverrideMode, AreaParameter,
} from '../../scene/physics/const';
import {
    ShapeResult,
    Physics2DDirectSpaceStateSW,
    Physics2DDirectBodyStateSW,
    MotionResult,
    CollCbkData,
    _shape_col_cbk,
} from "./state";
import Step2DSW from "./step_2d_sw";
import { CircleShape2DSW, Shape2DSW, RectangleShape2DSW, SegmentShape2DSW, RayShape2DSW, ConvexPolygonShape2DSW } from "./shape_2d_sw";
import CollisionSolver2DSW from "./collision_solver_2d_sw";
import Space2DSW from "./space_2d_sw";
import Area2DSW from "./area_2d_sw";
import Body2DSW from "./body_2d_sw";

class RayResult {
    constructor() {
        this.position = new Vector2();
        this.normal = new Vector2();
        this.collider = null;
        this.shape = 0;
        this.metadata = null;
    }
}

class Physics2DShapeQueryResult {
    constructor() {
        /**
         * @type {Array<ShapeResult>}
         */
        this.result = [];
    }
    get_result_count() { }
    get_result() { }
    get_result_object_shape() { }
}

export default class PhysicsServer {
    static get_singleton() {
        return PhysicsServer.singleton;
    }
    constructor() {
        this.active = true;
        this.iterations = 0;
        this.doing_sync = false;
        this.last_step = 0;

        this.island_count = 0;
        this.active_objects = 0;
        this.collision_pairs = 0;

        this.flushing_queries = false;

        /**
         * @type {Step2DSW}
         */
        this.stepper = null;

        /**
         * @type {Set<Space2DSW>}
         */
        this.active_spaces = new Set();

        /**
         * @type {Physics2DDirectBodyStateSW}
         */
        this.direct_state = null;

        this.is_initialized = false;
    }

    line_shape_create() { }
    ray_shape_create() {
        return new RayShape2DSW();
    }
    segment_shape_create() {
        return new SegmentShape2DSW();
    }
    circle_shape_create() {
        return new CircleShape2DSW();
    }
    rectangle_shape_create() {
        return new RectangleShape2DSW();
    }
    capsule_shape_create() { }
    convex_polygon_shape_create() {
        return new ConvexPolygonShape2DSW();
    }
    concave_polygon_shape_create() { }

    /**
     * @param {Shape2DSW} p_shape
     * @param {number} p_data
     */
    shape_set_data(p_shape, p_data) {
        // TODO: remove this useless method
        p_shape.set_data(p_data);
    }
    /**
     * @param {Shape2DSW} p_shape
     * @returns {any}
     */
    shape_get_data(p_shape) {
        // TODO: remove this useless method
        return p_shape.get_data();
    }
    /**
     * @param {Shape2DSW} p_shape
     * @param {number} p_bias
     */
    shape_set_custom_solver_bias(p_shape, p_bias) {
        // TODO: remove this useless method
        p_shape.custom_bias = p_bias;
    }

    /**
     * @param {Shape2DSW} p_shape_A
     * @param {Matrix} p_xform_A
     * @param {Vector2} p_motion_A
     * @param {Shape2DSW} p_shape_B
     * @param {Matrix} p_xform_B
     * @param {Vector2} p_motion_B
     * @param {Vector2[]} r_results
     * @param {number} p_result_max
     * @param {{ value: number }} r_ret
     * @returns {boolean}
     */
    shape_collide(p_shape_A, p_xform_A, p_motion_A, p_shape_B, p_xform_B, p_motion_B, r_results, p_result_max, r_ret) {
        if (p_result_max === 0) {
            return CollisionSolver2DSW.solve(p_shape_A, p_xform_A, p_motion_A, p_shape_B, p_xform_B, p_motion_B, null, null);
        }

        const cbk = new CollCbkData();
        cbk.max = p_result_max;
        cbk.amount = 0;
        cbk.ptr = r_results;

        const res = CollisionSolver2DSW.solve(p_shape_A, p_xform_A, p_motion_A, p_shape_B, p_xform_B, p_motion_B, _shape_col_cbk, cbk);
        r_ret.value = cbk.amount;

        return res;
    }

    /* SPACE API */

    space_create() {
        const space = new Space2DSW();
        const area = this.area_create();
        space.default_area = area;
        area.space = space;
        area.priotity = -1;

        return space;
    }
    /**
     * @param {Space2DSW} p_space
     * @param {boolean} p_active
     */
    space_set_active(p_space, p_active) {
        if (p_active) {
            this.active_spaces.add(p_space);
        } else {
            this.active_spaces.delete(p_space);
        }
    }
    /**
     * @param {Space2DSW} p_space
     * @returns {boolean}
     */
    space_is_active(p_space) {
        return this.active_spaces.has(p_space);
    }

    /**
     * @param {Space2DSW} p_space
     * @returns {Physics2DDirectSpaceStateSW}
     */
    space_get_direct_state(p_space) {
        return p_space.direct_access;
    }

    /* AERA API */

    /**
     * @returns {Area2DSW}
     */
    area_create() {
        const area = new Area2DSW();
        area.self = area;
        return area;
    }

    /**
     * @param {Area2DSW} p_area
     * @param {AreaSpaceOverrideMode} p_mode
     */
    area_set_space_override_mode(p_area, p_mode) {
        p_area.space_override_mode = p_mode;
    }
    /**
     * @param {Area2DSW} p_area
     * @returns {AreaSpaceOverrideMode}
     */
    area_get_space_override_mode(p_area) {
        return p_area.space_override_mode;
    }

    /**
     * @param {Area2DSW} p_area
     * @param {Space2DSW} p_space
     */
    area_set_space(p_area, p_space) {
        if (p_area.space === p_space) {
            return;
        }

        p_area.clear_constraints();
        p_area.set_space(p_space);
    }
    /**
     * @param {Area2DSW} p_area
     */
    area_get_space(p_area) {
        return p_area.space;
    }

    /**
     * @param {Area2DSW} p_area
     * @param {Shape2DSW} p_shape
     * @param {Matrix} p_transform
     */
    area_add_shape(p_area, p_shape, p_transform = Matrix.IDENTITY) {
        p_area.add_shape(p_shape, p_transform);
    }
    /**
     * @param {Area2DSW} p_area
     * @param {number} p_shape_idx
     * @param {Shape2DSW} p_shape
     */
    area_set_shape(p_area, p_shape_idx, p_shape) {
        p_area.set_shape(p_shape_idx, p_shape);
    }
    /**
     * @param {Area2DSW} p_area
     * @param {number} p_shape_idx
     * @param {Matrix} p_transform
     */
    area_set_shape_transform(p_area, p_shape_idx, p_transform) {
        p_area.set_shape_transform(p_shape_idx, p_transform);
    }

    /**
     * @param {Area2DSW} p_area
     */
    area_get_shape_count(p_area) {
        return p_area.shapes.length;
    }
    /**
     * @param {Area2DSW} p_area
     * @param {number} p_shape_idx
     */
    area_get_shape(p_area, p_shape_idx) {
        return p_area.get_shape(p_shape_idx);
    }
    /**
     * @param {Area2DSW} p_area
     * @param {number} p_shape_idx
     */
    area_get_shape_transform(p_area, p_shape_idx) {
        return p_area.get_shape_transform(p_shape_idx);
    }

    /**
     * @param {Area2DSW} p_area
     * @param {number} p_shape_idx
     */
    area_remove_shape(p_area, p_shape_idx) {
        p_area.remove_shape_by_index(p_shape_idx);
    }
    /**
     * @param {Area2DSW} p_area
     */
    area_clear_shapes(p_area) {
        while (p_area.shapes.length) {
            p_area.remove_shape_by_index(0);
        }
    }

    /**
     * @param {Area2DSW} p_area
     * @param {number} p_shape_idx
     * @param {boolean} p_disabled
     */
    area_set_shape_disabled(p_area, p_shape_idx, p_disabled) {
        p_area.set_shape_as_disabled(p_shape_idx, p_disabled);
    }

    /**
     * @param {Area2DSW} p_area
     * @param {import('engine/scene/physics/area_2d').default} id
     */
    area_attach_object_instance(p_area, id) {
        p_area.instance = id;
    }
    /**
     * @param {Area2DSW} p_area
     */
    area_get_object_instance(p_area) {
        return p_area.instance;
    }

    /**
     * @param {Area2DSW} p_area
     * @param {import('engine/scene/physics/area_2d').default} id
     */
    area_attach_canvas_instance(p_area, id) {
        p_area.instance = id;
    }
    /**
     * @param {Area2DSW} p_area
     */
    area_get_canvas_instance(p_area) {
        return p_area.instance;
    }

    /**
     * @param {Area2DSW} p_area
     * @param {AreaParameter} p_param
     * @param {any} p_value
     */
    area_set_param(p_area, p_param, p_value) {
        p_area.set_param(p_param, p_value)
    }
    /**
     * @param {Area2DSW} p_area
     * @param {AreaParameter} p_param
     */
    area_get_param(p_area, p_param) {
        return p_area.get_param(p_param);
    }

    /**
     * @param {Area2DSW} p_area
     */
    area_set_transform(p_area, p_transform) {
        p_area.set_transform(p_transform);
    }
    /**
     * @param {Area2DSW} p_area
     */
    area_get_transform(p_area) {
        return p_area.transform;
    }
    /**
     * @param {Area2DSW} p_area
     * @param {boolean} p_monitorable
     */
    area_set_monitorable(p_area, p_monitorable) {
        p_area.set_monitorable(p_monitorable);
    }
    /**
     * @param {Area2DSW} p_area
     * @param {number} p_mask
     */
    area_set_collision_mask(p_area, p_mask) {
        p_area.collision_mask = p_mask;
    }
    /**
     * @param {Area2DSW} p_area
     * @param {number} p_layer
     */
    area_set_collision_layer(p_area, p_layer) {
        p_area.collision_layer = p_layer;
    }
    /**
     * @param {Area2DSW} p_area
     */

    /**
    * @param {Area2DSW} p_area
    * @param {any} p_receiver
    * @param {Function} p_method
    */
    area_set_monitor_callback(p_area, p_receiver, p_method) {
        p_area.set_monitor_callback(p_receiver, p_method);
    }
    /**
     * @param {Area2DSW} p_area
     * @param {any} p_receiver
     * @param {Function} p_method
     */
    area_set_area_monitor_callback(p_area, p_receiver, p_method) {
        p_area.set_area_monitor_callback(p_receiver, p_method);
    }

    /**
     * @param {Area2DSW} p_area
     */
    area_set_pickable(p_area, p_pickable) { }

    /* BODY API */

    /**
     * @returns {Body2DSW}
     */
    body_create() {
        const body = new Body2DSW();
        body.self = body;
        return body;
    }

    /**
     * @param {Body2DSW} p_body
     * @param {Space2DSW} p_space
     */
    body_set_space(p_body, p_space) {
        if (p_body.space === p_space) {
            return;
        }

        p_body.constraint_map.clear();
        p_body.set_space(p_space);
    }
    /**
     * @param {Body2DSW} p_body
     */
    body_get_space(p_body) {
        return p_body.space;
    }

    /**
     * @param {Body2DSW} p_body
     * @param {Shape2DSW} p_shape
     * @param {Matrix} p_transform
     */
    body_add_shape(p_body, p_shape, p_transform) {
        p_body.add_shape(p_shape, p_transform);
    }
    /**
     * @param {Body2DSW} p_body
     * @param {number} p_shape
     */
    body_remove_shape(p_body, p_shape) {
        p_body.remove_shape_by_index(p_shape);
    }
    /**
     * @param {Body2DSW} p_body
     */
    body_clear_shapes(p_body) {
        while (p_body.shapes.length) {
            p_body.remove_shape_by_index(0);
        }
    }
    /**
     * @param {Body2DSW} p_body
     * @param {number} p_shape_idx
     * @param {Shape2DSW} p_shape
     */
    body_set_shape(p_body, p_shape_idx, p_shape) {
        p_body.set_shape(p_shape_idx, p_shape);
    }
    /**
     * @param {Body2DSW} p_body
     * @param {number} p_shape_idx
     */
    body_get_shape(p_body, p_shape_idx) {
        return p_body.get_shape(p_shape_idx);
    }
    /**
     * @param {Body2DSW} p_body
     * @param {number} p_shape_idx
     * @param {Matrix} p_transform
     */
    body_set_shape_transform(p_body, p_shape_idx, p_transform) {
        p_body.set_shape_transform(p_shape_idx, p_transform);
    }
    /**
     * @param {Body2DSW} p_body
     * @param {number} p_shape_idx
     */
    body_get_shape_transform(p_body, p_shape_idx) {
        return p_body.get_shape_transform(p_shape_idx);
    }
    /**
     * @param {Body2DSW} p_body
     * @param {number} p_shape_idx
     * @param {any} p_metadata
     */
    body_set_shape_metadata(p_body, p_shape_idx, p_metadata) {
        p_body.set_shape_metadata(p_shape_idx, p_metadata);
    }
    /**
     * @param {Body2DSW} p_body
     * @param {number} p_shape_idx
     */
    body_get_shape_metadata(p_body, p_shape_idx) {
        return p_body.get_shape_metadata(p_shape_idx);
    }

    /**
     * @param {Body2DSW} p_body
     * @param {number} p_shape_idx
     * @param {boolean} p_disabled
     */
    body_set_shape_disabled(p_body, p_shape_idx, p_disabled) {
        p_body.set_shape_as_disabled(p_shape_idx, p_disabled);
    }
    /**
     * @param {Body2DSW} p_body
     * @param {number} p_shape_idx
     * @param {boolean} p_enabled
     * @param {number} p_margin
     */
    body_set_shape_as_one_way_collision(p_body, p_shape_idx, p_enabled, p_margin) {
        p_body.set_shape_as_one_way_collision(p_shape_idx, p_enabled, p_margin);
    }

    /**
     * @param {Body2DSW} p_body
     * @param {import('engine/scene/physics/physics_body_2d').PhysicsBody2D} id
     */
    body_attach_object_instance(p_body, id) {
        p_body.instance = id;
    }

    /**
     * @param {import('engine/scene/physics/physics_body_2d').PhysicsBody2D} p_body
     * @param {number} p_layer
     */
    body_set_collision_layer(p_body, p_layer) {
        p_body.rid.collision_layer = p_layer;
    }

    /**
     * @param {import('engine/scene/physics/physics_body_2d').PhysicsBody2D} p_body
     * @param {number} p_mask
     */
    body_set_collision_mask(p_body, p_mask) {
        p_body.rid.collision_mask = p_mask;
    }

    /**
     * @param {Body2DSW} p_body
     * @param {Matrix} p_from
     * @param {Vector2} p_motion
     * @param {boolean} p_infinite_inertia
     * @param {number} [p_margin]
     * @param {MotionResult} [r_result]
     * @param {boolean} [p_exclude_raycast_shapes]
     */
    body_test_motion(p_body, p_from, p_motion, p_infinite_inertia, p_margin = 0.001, r_result = null, p_exclude_raycast_shapes = true) {
        return p_body.space.test_body_motion(p_body, p_from, p_motion, p_infinite_inertia, p_margin, r_result, p_exclude_raycast_shapes);
    }

    /* JOINT API */

    /* MISC */

    init(settings) {
        if (this.is_initialized) {
            return;
        }

        this.doing_sync = false;
        this.last_step = 0.001;
        this.iterations = 8;
        this.stepper = new Step2DSW();
        this.direct_state = Physics2DDirectBodyStateSW.new();

        // sleep_threshold_linear = settings.sleep_threshold_linear;
        // sleep_threshold_linear_sqr = sleep_threshold_linear * sleep_threshold_linear;
        // sleep_threshold_angular = settings.sleep_threshold_angular;
        // time_before_sleep = settings.time_before_sleep;

        this.is_initialized = true;
    }
    free(rid) { }

    set_active(p_active) {
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
    /**
     * @param {number} p_step
     */
    step(p_step) {
        if (!this.active) {
            return;
        }

        this.doing_sync = false;

        this.last_step = p_step;
        if (Physics2DDirectBodyStateSW.singleton) {
            Physics2DDirectBodyStateSW.singleton.step = p_step;
        }
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

    finish() { }

    is_flushing_queries() { }
}
PhysicsServer.singleton = new PhysicsServer();
