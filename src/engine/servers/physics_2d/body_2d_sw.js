import CollisionObject2DSW from "./collision_object_2d_sw";
import { BodyMode, CollisionObjectType, CCDMode } from "engine/scene/physics/const";
import { Vector2, Matrix } from "engine/math/index";
import SelfList from "engine/core/self_list";
import Constraint2DSW from "./constraint_2d_sw";

class AreaCMP { }

class Contact {
    constructor() {
        this.local_pos = new Vector2();
        this.local_normal = new Vector2();
        this.depth = 0;
        this.local_shape = 0;
        this.collider_pos = new Vector2();
        this.collider_shape = 0;
        this.collider_instance = null;
        this.collider = null;
        this.collider_velocity_at_pos = new Vector2();
    }
}

class ForceIntegrationCallback {
    constructor() {
        this.id = null;
        this.method = null;
        this.callback_udata = null;;
    }
}

export default class Body2DSW extends CollisionObject2DSW {
    get inv_mass() {
        return this._inv_mass;
    }
    /**
     * @param {number} p_value
     */
    set inv_mass(p_value) {
        this._inv_mass = p_value;
    }
    /**
     * @param {number} p_value
     */
    set_inv_mass(p_value) {
        this.inv_mass = p_value;
        return this;
    }

    get inv_inertia() {
        return this._inv_inertia;
    }
    /**
     * @param {number} p_value
     */
    set inv_inertia(p_value) {
        this._inv_inertia = p_value;
    }
    /**
     * @param {number} p_value
     */
    set_inv_inertia(p_value) {
        this.inv_inertia = p_value;
        return this;
    }

    get active() {
        return this._active;
    }
    /**
     * @param {boolean} p_enable
     */
    set active(p_enable) {
        this._active = p_enable;
    }
    /**
     * @param {boolean} p_enable
     */
    set_active(p_enable) {
        this.active = p_enable;
        return this;
    }

    constructor() {
        super(CollisionObjectType.BODY);

        this.mode = BodyMode.STATIC;

        this.biased_linear_velocity = new Vector2();
        this.biased_angular_velocity = 0;

        this.linear_velocity = new Vector2();
        this.angular_velocity = 0;

        this.linear_damp = 0;
        this.angular_damp = 0;
        this.gravity_scale = 0;

        this.mass = 0;
        this.bounce = 0;
        this.friction = 0;

        this._inv_mass = 0;
        this._inv_inertia = 0;
        this.user_inertia = false;

        this.gravity = new Vector2();
        this.area_linear_damp = 0;
        this.area_angular_damp = 0;

        this.still_time = 0;

        this.applied_force = new Vector2();
        this.applied_torque = 0;

        /**
         * @type {SelfList<Body2DSW>}
         */
        this.active_list = null;
        /**
         * @type {SelfList<Body2DSW>}
         */
        this.inertia_update_list = null;
        /**
         * @type {SelfList<Body2DSW>}
         */
        this.direct_state_query_list = null;

        /** @type {Set<CollisionObject2DSW>} */
        this.exceptions = new Set();
        this.continuous_cd_mode = CCDMode.DISABLED;
        this.omit_force_integration = false;
        this._active = false;
        this.can_sleep = false;
        this.first_time_kinematic = false;
        this.first_integration = false;
        this.new_transform = new Matrix();

        /**
         * @type {Map<Constraint2DSW, number>}
         */
        this.constraint_map = new Map();

        /**
         * @type {AreaCMP[]}
         */
        this.areas = [];

        /**
         * @type {Contact[]}
         */
        this.contacts = [];
        this.contact_count = 0;

        this.fi_callback = null;

        this.island_step = 0;
        /** @type {Body2DSW} */
        this.island_next = null;
        /** @type {Body2DSW} */
        this.island_list_next = null;
    }

    _update_inertia() { }
    _shapes_changed() { }

    _compute_area_gravity_and_dampenings(p_area) { }

    set_force_integration_callback(p_id, p_method, p_udata = {}) { }

    add_area(p_area) { }
    remove_area(p_area) { }

    set_max_contacts_reported(p_size) { }

    get_max_contacts_reported() { }

    can_report_contacts() { }
    add_contact() { }

    /**
     * @param {CollisionObject2DSW} p_exception
     */
    add_exception(p_exception) {
        this.exceptions.add(p_exception);
    }
    /**
     * @param {CollisionObject2DSW} p_exception
     */
    remove_exception(p_exception) {
        this.exceptions.delete(p_exception);
    }
    /**
     * @param {CollisionObject2DSW} p_exception
     */
    has_exception(p_exception) {
        return this.exceptions.has(p_exception);
    }

    add_constraint() { }
    remove_constraint() { }
    get_constraint() { }

    apply_central_impulse(p_impulse) { }
    apply_impulse(p_impulse) { }
    apply_bias_impulse(p_impulse) { }

    set_mode(p_mode) { }
    get_mode() { }

    set_state(p_state, p_value) { }
    get_state(p_state) { }

    add_central_force(p_force) { }
    add_force(p_force) { }

    add_torque(p_torque) { }

    set_space(p_space) { }

    update_inertias() { }

    integrate_forces(p_step) { }
    integrate_velocities(p_step) { }

    get_motion() { }

    call_queries() { }
    wakeup_neighbours() { }

    sleep_test(p_step) {
        return false;
    }
}
