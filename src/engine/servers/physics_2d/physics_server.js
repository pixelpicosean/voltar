import {
    Vector2,
    Matrix,
} from "engine/math/index";

import {
    ShapeType,
    SpaceParameter,
    AreaParameter,
    AreaSpaceOverrideMode,
} from '../../physics/const';
import {
    ShapeResult,
    Physics2DDirectSpaceState,
    Physics2DDirectBodyStateSW,
} from "./state";
import Step2D from "./step_2d";
import Space2D from "../../physics/space_2d";
import { CircleShape2DSW, Shape2DSW } from "./shape_2d_sw";
import CollisionSolver2DSW from "./collision_solver_2d_sw";

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

class CollCbkData {
    constructor() {
        this.valid_dir = new Vector2();
        this.valid_depth = 0;
        this.max = 0;
        this.amount = 0;
        this.invalid_by_dir = 0;
        /**
         * @type {Vector2[]}
         */
        this.ptr = null;
    }
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
         * @type {Physics2DDirectBodyStateSW}
         */
        this.direct_state = null;

        this.is_initialized = false;
    }

    line_shape_create() { }
    ray_shape_create() { }
    segment_shape_create() { }
    circle_shape_create() {
        return new CircleShape2DSW();
    }
    rectangle_shape_create() { }
    capsule_shape_create() { }
    convex_polygon_shape_create() { }
    concave_polygon_shape_create() { }

    /**
     * @param {Vector2} p_point_A
     * @param {Vector2} p_point_B
     * @param {CollCbkData} p_userdata
     */
    _shape_col_cbk(p_point_A, p_point_B, p_userdata) {
        const cbk = p_userdata;

        if (cbk.max === 0) {
            return;
        }

        if (!cbk.valid_dir.is_zero()) {
            if (p_point_A.distance_squared_to(p_point_B) > cbk.valid_depth * cbk.valid_depth) {
                cbk.invalid_by_dir++;
                return;
            }
            const rel_dir = p_point_A.clone().subtract(p_point_B).normalize();

            if (cbk.valid_dir.dot(rel_dir) < 0.7071) { // sqrt(2) / 2 - 45 degrees
                cbk.invalid_by_dir++;
                return;
            }
        }

        if (cbk.amount === cbk.max) {
            let min_depth = Number.MAX_VALUE;
            let min_depth_idx = 0;
            for (let i = 0; i < cbk.amount; i++) {
                const d = cbk.ptr[i * 2 + 0].distance_squared_to(cbk.ptr[i * 2 + 1]);
                if (d < min_depth) {
                    min_depth = d;
                    min_depth_idx = i;
                }
            }

            let d = p_point_A.distance_squared_to(p_point_B);
            if (d < min_depth) {
                return;
            }
            cbk.ptr[min_depth_idx * 2 + 0].copy(p_point_A);
            cbk.ptr[min_depth_idx * 2 + 1].copy(p_point_B);
        } else {
            cbk.ptr[cbk.amount * 2 + 0].copy(p_point_A);
            cbk.ptr[cbk.amount * 2 + 1].copy(p_point_B);
            cbk.amount++;
        }
    }

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

        const res = CollisionSolver2DSW.solve(p_shape_A, p_xform_A, p_motion_A, p_shape_B, p_xform_B, p_motion_B, this._shape_col_cbk, cbk);
        r_ret.value = cbk.amount;

        return res;
    }

    /* SPACE API */

    space_create() { }
    /**
     * @param {any} space
     * @param {boolean} active
     */
    space_set_active(space, active) { }
    /**
     * @returns {boolean}
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

    /**
     * @param {any} space
     * @returns {Physics2DDirectSpaceState}
     */
    space_get_direct_state(space) {
        return null;
    }

    /* AERA API */

    area_create() { }

    /**
     * @param {any} p_area
     * @param {AreaSpaceOverrideMode} p_mode
     */
    area_set_space_override_mode(p_area, p_mode) { }
    /**
     * @param {any} p_area
     * @returns {AreaSpaceOverrideMode}
     */
    area_get_space_override_mode(p_area) {
        return null;
    }

    area_set_space(p_area, space) { }
    area_get_space(p_area) { }

    area_add_shape(p_area, shape, transform = undefined) { }
    area_set_shape(p_area, shape_idx, shape) { }
    area_set_shape_transform(p_area, shape_idx, transform) { }

    area_get_shape_count(p_area) { }
    area_get_shape(p_area, shape_idx) { }
    area_get_shape_transform(p_area, shape_idx) { }

    area_remove_shape(p_area, shape_idx) { }
    area_clear_shapes(p_area) { }

    area_set_shape_disabled(p_area, shape_idx, disabled) { }

    area_attach_object_instance(p_area, id) { }
    area_get_object_instance(p_area) { }

    area_attach_canvas_instance(p_area, id) { }
    area_get_canvas_instance(p_area) { }

    area_set_param(p_area, param) { }
    area_get_param(p_area) { }

    area_set_transform(p_area, p_transform) { }
    area_get_transform(p_area) { }
    area_set_monitorable(p_area, monitorable) { }
    area_set_collision_mask(p_area, mask) { }
    area_set_collision_layer(p_area, layer) { }

    area_set_monitor_callback(p_area, receiver, method) { }
    area_set_area_monitor_callback(p_area, receiver, method) { }

    area_set_pickable(p_area, p_pickable) { }

    /* BODY API */

    /* JOINT API */

    /* MISC */

    init(settings) {
        if (this.is_initialized) {
            return;
        }

        this.doing_sync = false;
        this.last_step = 0.001;
        this.iterations = 8;
        this.stepper = new Step2D();
        this.direct_state = new Physics2DDirectBodyStateSW();

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
