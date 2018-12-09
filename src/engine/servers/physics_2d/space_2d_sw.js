import { Physics2DDirectSpaceStateSW, MotionResult } from "../../servers/physics_2d/state";
import { INTERSECTION_QUERY_MAX, CollisionObjectType } from "../../scene/physics/const";
import Area2DSW from "./area_2d_sw";
import SelfList, { List } from "engine/core/self_list";
import BroadPhase2D from "./broad_phase_2d_sw";
import CollisionObject2DSW from "./collision_object_2d_sw";
import { Area2Pair2DSW } from "./area_pair_2d";
import Constraint2DSW from "./constraint_2d_sw";
import Body2DSW from "./body_2d_sw";
import { Shape2DSW } from "./shape_2d_sw";
import { Matrix, Vector2, Rectangle } from "engine/math/index";

const ElapsedTime = {
    INTEGRATE_FORCES: 0,
    GENERATE_ISLANDS: 1,
    SETUP_CONSTRAINTS: 2,
    SOLVE_CONSTRAINTS: 3,
    INTEGRATE_VELOCITIES: 4,
    MAX: 5,
}

class ExcludedShapeSW {
    constructor() {
        /** @type {Shape2DSW} */
        this.local_shape = null;
        /** @type {CollisionObject2DSW} */
        this.against_object = null;
        this.against_shape_index = 0;
    }
}

export default class Space2DSW {
    get active() {
        return this._active;
    }
    /**
     * @param {boolean} value
     */
    set active(value) {
        this._active = value;
    }
    /**
     * @param {boolean} value
     * @returns {this}
     */
    set_active(value) {
        this.active = value;
        return this;
    }
    constructor() {
        this._active = false;

        this.elapsed_time = new Array(ElapsedTime.MAX);

        /** @type {Physics2DDirectSpaceStateSW} */
        this.direct_access = null;
        this.self = this;

        /** @type {BroadPhase2D} */
        this.broadphase = new BroadPhase2D();
        this.broadphase.set_pair_callback(this._broadphase_pair, this);
        this.broadphase.set_unpair_callback(this._broadphase_unpair, this);

        /** @type {List<Body2DSW>} */
        this.active_list = new List();
        /** @type {List<Body2DSW>} */
        this.inertia_update_list = new List();
        /** @type {List<Body2DSW>} */
        this.state_query_list = new List();
        /** @type {List<Area2DSW>} */
        this.monitor_query_list = new List();
        /** @type {List<Area2DSW>} */
        this.area_moved_list = new List();

        /** @type {Set<CollisionObject2DSW>} */
        this.objects = new Set();

        /**
         * @type {Area2DSW}
         */
        this.default_area = null;

        this.contact_recycle_radius = 0;
        this.contact_max_separation = 0;
        this.contact_max_allowed_penetration = 0;
        this.constraint_bias = 0;

        /** @type {CollisionObject2DSW[]} */
        this.intersection_query_results = new Array(INTERSECTION_QUERY_MAX);
        /** @type {number[]} */
        this.intersection_query_subindex_results = new Array(INTERSECTION_QUERY_MAX);

        this.body_linear_velocity_sleep_threshold = 0;
        this.body_angular_velocity_sleep_threshold = 0;
        this.body_time_to_sleep = 0;

        this.island_count = 0;
        this.active_objects = 0;
        this.collision_pairs = 0;
    }

    /**
     * @param {Body2DSW} p_body
     * @param {Body2DSW} p_aabb
     */
    _cull_aabb_for_body(p_body, p_aabb) { }

    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_add_to_active_list(p_body) {
        this.active_list.add(p_body);
    }
    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_remove_from_active_list(p_body) {
        this.active_list.remove(p_body);
    }
    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_add_to_inertia_update_list(p_body) {
        this.inertia_update_list.add(p_body);
    }
    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_remove_from_inertia_update_list(p_body) {
        this.inertia_update_list.remove(p_body);
    }

    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_add_to_moved_list(p_area) {
        this.area_moved_list.add(p_area);
    }
    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_remove_from_moved_list(p_area) {
        this.area_moved_list.remove(p_area);
    }

    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_add_to_state_query_list(p_body) {
        this.state_query_list.add(p_body);
    }
    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_remove_from_state_query_list(p_body) {
        this.state_query_list.remove(p_body);
    }

    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_add_to_state_query_list(p_area) {
        this.monitor_query_list.add(p_area);
    }
    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_remove_from_state_query_list(p_area) {
        this.monitor_query_list.remove(p_area);
    }

    /**
     * @param {CollisionObject2DSW} p_object
     */
    add_object(p_object) {
        this.objects.add(p_object);
    }
    /**
     * @param {CollisionObject2DSW} p_object
     */
    remove_object(p_object) {
        this.objects.delete(p_object);
    }

    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_add_to_monitor_query_list(p_area) {
        this.monitor_query_list.add(p_area);
    }
    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_remove_from_monitor_query_list(p_area) {
        this.monitor_query_list.remove(p_area);
    }

    setup() {
        // while (this.inertia_update_list.first()) {
        //     this.inertia_update_list.first().self().update_inertias();
        //     this.inertia_update_list.remove(this.inertia_update_list.first())
        // }
    }
    update() {
        this.broadphase.update();
    }

    call_queries() {
        while (this.state_query_list.first()) {
            // TODO: query bodies
        }

        while (this.monitor_query_list.first()) {
            const a = this.monitor_query_list.first().self();
            this.monitor_query_list.remove(this.monitor_query_list.first());
            a.call_queries();
        }
    }

    set_param(p_param, p_value) { }
    get_param(p_param) { }

    /**
     * @param {Body2DSW} p_body
     * @param {Matrix} p_from
     * @param {Vector2} p_motion
     * @param {boolean} p_infinite_inertia
     * @param {number} p_margin
     * @param {MotionResult} r_result
     * @param {boolean} [p_exclude_raycast_shapes]
     */
    body_test_motion(p_body, p_from, p_motion, p_infinite_inertia, p_margin, r_result, p_exclude_raycast_shapes = true) {
        if (r_result) {
            r_result.collider_id = null;
            r_result.collider_shape = 0;
        }
        const body_aabb = Rectangle.create();

        let shapes_found = false;
    }

    /**
     * @param {CollisionObject2DSW} A
     * @param {number} p_subindex_A
     * @param {CollisionObject2DSW} B
     * @param {number} p_subindex_B
     * @param {Space2DSW} p_self
     */
    _broadphase_pair(A, p_subindex_A, B, p_subindex_B, p_self) {
        let type_A = A.type;
        let type_B = B.type;
        if (type_A > type_B) {
            let tmp;
            tmp = B; B = A; A = tmp;
            tmp = p_subindex_A; p_subindex_A = p_subindex_B; p_subindex_B = tmp;
            tmp = type_B; type_B = type_A; type_A = tmp;
        }

        p_self.collision_pairs++;

        if (type_A === CollisionObjectType.AREA) {
            /** @type {Area2DSW} */
            // @ts-ignore
            const area = A;
            if (type_B === CollisionObjectType.AREA) {
                /** @type {Area2DSW} */
                // @ts-ignore
                const area_b = B;
                return new Area2Pair2DSW(area_b, p_subindex_B, area, p_subindex_A);
            } else {
                // TODO: body pair
            }
        } else {
            // TODO: body pair
        }

        return null;
    }
    /**
     * @param {CollisionObject2DSW} A
     * @param {number} p_subindex_A
     * @param {CollisionObject2DSW} B
     * @param {number} p_subindex_B
     * @param {Constraint2DSW} p_data
     * @param {Space2DSW} p_self
     */
    _broadphase_unpair(A, p_subindex_A, B, p_subindex_B, p_data, p_self) {
        p_self.collision_pairs--;
        p_data.free();
    }
}
