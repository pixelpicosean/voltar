import { Physics2DDirectSpaceState } from "../servers/physics_2d/state";
import { INTERSECTION_QUERY_MAX } from "./const";

const ElapsedTime = {
    INTEGRATE_FORCES: 0,
    GENERATE_ISLANDS: 1,
    SETUP_CONSTRAINTS: 2,
    SOLVE_CONSTRAINTS: 3,
    INTEGRATE_VELOCITIES: 4,
    MAX: 5,
}

export default class Space2D {
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
        this.space = null;

        this.elapsed_time = new Array(ElapsedTime.MAX);
        /** @type {Physics2DDirectSpaceState} */
        this.direct_access = null;

        /** @type {import('./broadphase').default} */
        this.broadphase = null;
        this.active_list = [];
        /** @type {Array<import('../scene/physics/PhysicsBody2D').default>} */
        this.inertia_update_list = [];
        /** @type {Array<import('../scene/physics/PhysicsBody2D').default>} */
        this.state_query_list = [];
        /** @type {Array<import('../scene/physics/Area2D').default>} */
        this.monitor_query_list = [];
        /** @type {Array<import('../scene/physics/Area2D').default>} */
        this.area_moved_list = [];

        this.objects = [];

        this.area = null;

        this.contact_recycle_radius = 0;
        this.contact_max_separation = 0;
        this.contact_max_allowed_penetration = 0;
        this.constraint_bias = 0;

        /** @type {import('./collision_object_2d').default[]} */
        this.intersection_query_results = new Array(INTERSECTION_QUERY_MAX);
        /** @type {number[]} */
        this.intersection_query_subindex_results = new Array(INTERSECTION_QUERY_MAX);

        this.island_count = 0;
        this.active_objects = 0;
        this.collision_pairs = 0;
    }

    get_moved_area_list() {
        return this.area_moved_list;
    }

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
}
