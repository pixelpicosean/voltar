import CollisionObject2DSW from "./collision_object_2d_sw";
import { BodyMode, CollisionObjectType, CCDMode, BodyState } from "engine/scene/physics/const";
import { Vector2, Matrix, mod } from "engine/math/index";
import SelfList from "engine/core/self_list";
import Constraint2DSW from "./constraint_2d_sw";
import Space2DSW from "./space_2d_sw";
import { Physics2DDirectBodyStateSW } from "./state";
import Area2DSW from "./area_2d_sw";

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

        this.mode = BodyMode.RIGID;

        this.biased_linear_velocity = new Vector2();
        this.biased_angular_velocity = 0;

        this.linear_velocity = new Vector2();
        this.angular_velocity = 0;

        this.linear_damp = -1;
        this.angular_damp = -1;
        this.gravity_scale = 1;

        this.mass = 1;
        this.bounce = 0;
        this.friction = 1;

        this._inv_mass = 1;
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
        this.active_list = new SelfList(this);
        /**
         * @type {SelfList<Body2DSW>}
         */
        this.inertia_update_list = new SelfList(this);
        /**
         * @type {SelfList<Body2DSW>}
         */
        this.direct_state_query_list = new SelfList(this);

        /** @type {Set<CollisionObject2DSW>} */
        this.exceptions = new Set();
        this.continuous_cd_mode = CCDMode.DISABLED;
        this.omit_force_integration = false;
        this._active = true;
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

        this._set_static(false);
    }

    _update_inertia() {
        if (!this.user_inertia && this.space && this.inertia_update_list.in_list()) {
            this.space.body_add_to_inertia_update_list(this.inertia_update_list);
        }
    }
    _shapes_changed() {
        this._update_inertia();
        this.wakeup_neighbours();
    }

    /**
     * @param {Area2DSW} p_area
     */
    _compute_area_gravity_and_dampenings(p_area) {
        if (p_area.gravity_is_point) {
            // TODO: support gravity_is_point
        } else {
            this.gravity.add(p_area.gravity_vector.clone().scale(p_area.gravity));
        }

        this.area_linear_damp += p_area.linear_damp;
        this.area_angular_damp += p_area.angular_damp;
    }

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

    /**
     * @param {Constraint2DSW} p_constraint
     * @param {number} p_pos
     */
    add_constraint(p_constraint, p_pos) {
        this.constraint_map.set(p_constraint, p_pos);
    }
    /**
     * @param {Constraint2DSW} p_constraint
     */
    remove_constraint(p_constraint) {
        this.constraint_map.delete(p_constraint);
    }
    get_constraint() {
        return this.constraint_map;
    }

    apply_central_impulse(p_impulse) { }
    apply_impulse(p_impulse) { }
    apply_bias_impulse(p_impulse) { }

    wakeup() {
        if ((!this.space) || this.mode === BodyMode.STATIC || this.mode === BodyMode.KINEMATIC) {
            return;
        }
        this.set_active(true);
    }

    /**
     * @param {BodyMode} p_mode
     */
    set_mode(p_mode) {
        const prev = this.mode;
        this.mode = p_mode;

        switch (p_mode) {
            case BodyMode.STATIC:
            case BodyMode.KINEMATIC: {
                this._set_inv_transform(this.transform.clone().affine_inverse());
                this._set_static(p_mode === BodyMode.STATIC);
                this.set_active(p_mode === BodyMode.KINEMATIC && this.contacts.length > 0);
                this._inv_mass = 0;
                this.linear_velocity.set(0, 0);
                this.angular_velocity = 0;
                if (this.mode === BodyMode.KINEMATIC && prev !== this.mode) {
                    this.first_time_kinematic = true;
                }
            } break;
            case BodyMode.RIGID: {
                this._inv_mass = this.mass > 0 ? (1 / this.mass) : 0;
                this._set_static(false);
            } break;
            case BodyMode.CHARACTER: {
                this._inv_mass = this.mass > 0 ? (1 / this.mass) : 0;
                this._set_static(false);
            } break;
        }
    }
    get_mode() {
        return this.mode;
    }

    /**
     * @param {number} p_state
     * @param {any} p_value
     */
    set_state(p_state, p_value) {
        switch (p_state) {
            case BodyState.TRANSFORM: {
                if (this.mode === BodyMode.KINEMATIC) {
                    this.new_transform.copy(p_value);
                    this.set_active(true);
                    if (this.first_time_kinematic) {
                        this._set_transform(p_value);
                        this._set_inv_transform(this.transform.clone().affine_inverse());
                        this.first_time_kinematic = false;
                    }
                } else if (this.mode === BodyMode.STATIC) {
                    this._set_transform(p_value);
                    this._set_inv_transform(this.transform.clone().affine_inverse());
                    this.wakeup_neighbours();
                } else {
                    /** @type {Matrix} */
                    const t = p_value;
                    t.orthonormalize();
                    this.new_transform.copy(this.transform);
                    if (t.equals(this.new_transform)) {
                        break;
                    }
                    this._set_transform(t);
                    this._set_inv_transform(this.transform.inverse());
                }
                this.wakeup();
            } break;
            case BodyState.LINEAR_VELOCITY: {
                this.linear_velocity.copy(p_value);
                this.wakeup();
            } break;
            case BodyState.ANGULAR_VELOCITY: {
                this.angular_velocity = p_value;
                this.wakeup();
            } break;
            case BodyState.SLEEPING: {
                if (this.mode === BodyMode.STATIC || this.mode === BodyMode.KINEMATIC) {
                    break;
                }
                /** @type {boolean} */
                let do_sleep = p_value;
                if (do_sleep) {
                    this.linear_velocity.set(0, 0);
                    this.angular_velocity = 0;
                    this.set_active(false);
                } else {
                    if (this.mode !== BodyMode.STATIC) {
                        this.set_active(true);
                    }
                }
            } break;
            case BodyState.CAN_SLEEP: {
                this.can_sleep = p_value;
                if (this.mode === BodyMode.RIGID && !this.active && !this.can_sleep) {
                    this.set_active(true);
                }
            } break;
        }
    }
    /**
     * @param {number} p_state
     */
    get_state(p_state) {
        switch (p_state) {
            case BodyState.TRANSFORM: {
                return this.transform;
            } break;
            case BodyState.LINEAR_VELOCITY: {
                return this.linear_velocity;
            } break;
            case BodyState.ANGULAR_VELOCITY: {
                return this.angular_velocity;
            } break;
            case BodyState.SLEEPING: {
                return !this.active;
            } break;
            case BodyState.CAN_SLEEP: {
                return this.can_sleep;
            } break;
        }
    }

    add_central_force(p_force) { }
    add_force(p_force) { }

    add_torque(p_torque) { }

    /**
     * @param {Space2DSW} p_space
     */
    set_space(p_space) {
        if (this.space) {
            this.wakeup_neighbours();

            if (this.inertia_update_list.in_list()) {
                this.space.body_remove_from_inertia_update_list(this.inertia_update_list);
            }
            if (this.active_list.in_list()) {
                this.space.body_remove_from_active_list(this.active_list);
            }
            if (this.direct_state_query_list.in_list()) {
                this.space.body_remove_from_state_query_list(this.direct_state_query_list);
            }
        }

        this._set_space(p_space);

        if (this.space) {
            this._update_inertia();
            if (this.active) {
                this.space.body_add_to_active_list(this.active_list);
            }
        }

        this.first_integration = false;
    }

    update_inertias() {
        // update shapes and motions
        switch (this.mode) {
            case BodyMode.RIGID: { } break;
            case BodyMode.KINEMATIC:
            case BodyMode.STATIC: {
                this._inv_inertia = 0;
                this._inv_mass = 0;
            } break;
            case BodyMode.CHARACTER: {
                this._inv_inertia = 0;
                this._inv_mass = 1 / this.mass;
            } break;
        }
    }

    /**
     * @param {number} p_step
     */
    integrate_forces(p_step) { }
    /**
     * @param {number} p_step
     */
    integrate_velocities(p_step) {
        if (this.mode === BodyMode.STATIC) {
            return;
        }

        if (this.fi_callback) {
            this.space.body_add_to_state_query_list(this.direct_state_query_list);
        }

        if (this.mode === BodyMode.KINEMATIC) {
            this._set_transform(this.new_transform, false);
            this._set_inv_transform(this.new_transform.clone().affine_inverse());
            if (this.contacts.length === 0 && this.linear_velocity.is_zero() && this.angular_velocity === 0) {
                this.set_active(false); // stopped moving, deactivate
            }
            return;
        }

        const total_angular_velocity = this.angular_velocity + this.biased_angular_velocity;
        const total_linear_velocity = this.linear_velocity.clone().add(this.biased_linear_velocity);

        const angle = this.transform.rotation + total_angular_velocity * p_step;
        this._set_inv_transform(this.transform.inverse());

        if (this.continuous_cd_mode !== CCDMode.DISABLED) {
            this.new_transform.copy(this.transform);
        }
    }

    get_motion() {
        if (this.mode > BodyMode.KINEMATIC) {
            return this.new_transform.origin.clone().subtract(this.transform.origin);
        } else if (this.mode === BodyMode.KINEMATIC) {
            return this.transform.origin.clone().subtract(this.new_transform.origin);
        }
        return Vector2.Zero;
    }

    call_queries() {
        if (this.fi_callback) {
            const dbs = Physics2DDirectBodyStateSW.singleton;
            dbs.body = this;

            const v = dbs;
            const vp = [v, this.fi_callback.callback_udata];

            const obj = this.fi_callback.id;
            if (!obj) {
                this.set_force_integration_callback(null, null, null);
            } else {
                if (this.fi_callback.callback_udata.type) {
                    this.fi_callback.method.call(obj, vp, 2);
                } else {
                    this.fi_callback.method.call(obj, vp, 1);
                }
            }
        }
    }
    wakeup_neighbours() {
        for (let [c, E] of this.constraint_map) {

        }
    }

    sleep_test(p_step) {
        if (this.mode === BodyMode.STATIC || this.mode === BodyMode.KINEMATIC)
            return true; //
        else if (this.mode === BodyMode.CHARACTER)
            return !this.active; // characters and kinematic bodies don't sleep unless asked to sleep
        else if (!this.can_sleep)
            return false;

        if (Math.abs(this.angular_velocity) < this.space.body_angular_velocity_sleep_threshold && Math.abs(this.linear_velocity.length_squared()) < this.space.body_linear_velocity_sleep_threshold * this.space.body_linear_velocity_sleep_threshold) {

            this.still_time += p_step;

            return this.still_time > this.space.body_time_to_sleep;
        } else {
            this.still_time = 0; //maybe this should be set to 0 on set_active?
            return false;
        }
    }
}
