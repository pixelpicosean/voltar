import {
    Vector2,
    Transform,
    Matrix,
} from "engine/math/index";

import {
    ShapeType,
    SpaceParameter,
    AreaParameter,
    AreaSpaceOverrideMode,
} from './const';
import {
    ShapeResult,
    Physics2DDirectSpaceState,
    Physics2DDirectBodyState,
} from "./state";
import Step2D from "./step_2d";
import Space2D from "./space_2d";

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
        this.active = false;
        this.iterations = 0;
        this.doing_sync = false;
        this.last_step = 0;

        this.island_count = 0;
        this.active_objects = 0;
        this.collision_pairs = 0;

        this.flushing_queries = false;

        /**
         * @type {Step2D}
         */
        this.stepper = null;

        /**
         * @type {Array<Space2D>}
         */
        this.active_spaces = [];

        /**
         * @type {Physics2DDirectBodyState}
         */
        this.direct_state = null;

        this.shape_owner = null;
        this.space_owner = null;
        this.area_owner = null;
        this.body_owner = null;
        this.joint_owner = null;

        this.is_initialized = false;
    }

    // /**
    //  *
    //  * @param {any} body
    //  * @param {Transform} xfrom
    //  * @param {Vector2} motion
    //  * @param {Boolean} infinite_inertia
    //  * @param {number} [margin]
    //  * @param {Physics2DTestMotionResult} [result]
    //  * @returns {Boolean}
    //  */
    // _body_test_motion(body, xfrom, motion, infinite_inertia, margin = 0.08, result = undefined) { }

    /**
     * @param {ShapeType} shape
     */
    _shape_create(shape) {

    }

    line_shape_create() { }
    ray_shape_create() { }
    segment_shape_create() { }
    circle_shape_create() { }
    rectangle_shape_create() { }
    capsule_shape_create() { }
    convex_polygon_shape_create() { }
    concave_polygon_shape_create() { }

    shape_set_data(shape, data) { }
    /**
     * @param {any} shape
     * @param {number} bias
     */
    shape_set_custom_solver_bias(shape, bias) { }

    /**
     *
     * @param {any} shape_A
     * @param {Transform} xform_A
     * @param {Vector2} motion_A
     * @param {any} shape_B
     * @param {Transform} xform_B
     * @param {Vector2} motion_B
     * @param {Vector2[]} results
     * @param {number} result_max
     * @param {number} result_count
     * @returns {Boolean}
     */
    shape_collide(shape_A, xform_A, motion_A, shape_B, xform_B, motion_B, results, result_max, result_count) {
        return false;
    }

    /* SPACE API */

    space_create() { }
    /**
     * @param {any} space
     * @param {Boolean} active
     */
    space_set_active(space, active) { }
    /**
     * @returns {Boolean}
     */
    space_is_active(space) {
        return false;
    }

    /**
     * @param {any} space
     * @param {SpaceParameter} param
     * @param {number} value
     */
    space_set_param(space, param, value) { }
    /**
     * @param {any} space
     * @param {SpaceParameter} param
     * @returns {number}
     */
    space_get_param(space, param) {
        return 0;
    }

    /**
     * @param {any} space
     * @returns {Physics2DDirectSpaceState}
     */
    space_get_direct_state(space) {
        return null;
    }

    /**
     * @param {any} space
     * @returns {Vector2[]}
     */
    space_get_contacts(space) {
        return null;
    }
    /**
     * @param {any} space
     * @returns {number}
     */
    space_get_contact_count(space) {
        return 0;
    }

    /* AERA API */

    area_create() { }

    area_set_space(area, space) { }
    area_get_space(area) { }

    /**
     * @param {any} area
     * @param {AreaSpaceOverrideMode} mode
     */
    area_set_space_override_mode(area, mode) { }
    /**
     * @param {any} area
     * @returns {AreaSpaceOverrideMode}
     */
    area_get_space_override_mode(area) {
        return null;
    }

    area_add_shape(area, shape, transform = undefined) { }
    area_set_shape(area, shape_idx, shape) { }
    area_set_shape_transform(area, shape_idx, transform) { }

    area_get_shape_count(area) { }
    area_get_shape(area, shape_idx) { }
    area_get_shape_transform(area, shape_idx) { }

    area_remove_shape(area, shape_idx) { }
    area_clear_shapes(area) { }

    area_set_shape_disabled(area, shape_idx, disabled) { }

    area_attach_object_instance(area, id) { }
    area_get_object_instance(area) { }

    area_attach_canvas_instance(area, id) { }
    area_get_canvas_instance(area) { }

    area_set_param(area, param) { }
    area_get_param(area) { }

    area_set_collision_mask(area, mask) { }
    area_set_collision_layer(area, layer) { }

    area_set_monitorable(area, monitorable) { }

    area_set_monitor_callback(area, receiver, method) { }
    area_set_area_monitor_callback(area, receiver, method) { }

    /* MISC */

    init(settings) {
        if (this.is_initialized) {
            return;
        }

        this.doing_sync = false;
        this.last_step = 0.001;
        this.iterations = 8;
        this.stepper = new Step2D();
        this.direct_state = new Physics2DDirectBodyState();

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
        // Physics2DDirectBodyState.singleton.step = p_step;
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
