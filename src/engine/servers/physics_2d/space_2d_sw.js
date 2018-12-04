import { Physics2DDirectSpaceStateSW } from "../../servers/physics_2d/state";
import { INTERSECTION_QUERY_MAX } from "../../physics/const";
import Area2DSW from "./area_2d_sw";
import SelfList from "engine/core/self_list";

const ElapsedTime = {
    INTEGRATE_FORCES: 0,
    GENERATE_ISLANDS: 1,
    SETUP_CONSTRAINTS: 2,
    SOLVE_CONSTRAINTS: 3,
    INTEGRATE_VELOCITIES: 4,
    MAX: 5,
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

        this.self = this;
        /** @type {Physics2DDirectSpaceStateSW} */
        this.direct_access = null;

        /** @type {import('./broad_phase_2d_sw').default} */
        this.broadphase = null;
        this.active_list = [];
        this.inertia_update_list = [];
        this.state_query_list = [];
        this.monitor_query_list = [];
        this.area_moved_list = [];

        this.objects = new Set();

        this.default_area = null;

        this.contact_recycle_radius = 0;
        this.contact_max_separation = 0;
        this.contact_max_allowed_penetration = 0;
        this.constraint_bias = 0;

        /** @type {import('../../physics/collision_object_2d').default[]} */
        this.intersection_query_results = new Array(INTERSECTION_QUERY_MAX);
        /** @type {number[]} */
        this.intersection_query_subindex_results = new Array(INTERSECTION_QUERY_MAX);

        this.island_count = 0;
        this.active_objects = 0;
        this.collision_pairs = 0;
    }

    area_add_to_moved_list(p_area) { }
    area_remove_from_moved_list(p_area) { }

    area_add_to_state_query_list(p_area) { }
    area_remove_from_state_query_list(p_area) { }

    add_object(p_object) { }
    remove_object(p_object) { }

    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_add_to_monitor_query_list(p_area) { }
    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_remove_from_monitor_query_list(p_area) { }

    setup() {
        while (this.inertia_update_list.length > 0) {
            this.inertia_update_list.shift().update_inertias();
        }
    }
    update() {
        this.broadphase.update();
    }

    call_queries() {
        while (this.state_query_list.length > 0) {
            // TODO: query bodies
        }

        while (this.monitor_query_list.length > 0) {
            this.monitor_query_list.shift().call_queries();
        }
    }

    set_param(p_param, p_value) { }
    get_param(p_param) { }
}
