import { remove_items } from "engine/dep/index";
import SelfList from "engine/core/self_list";
import {
    Vector2,
    Matrix,
} from "engine/math/index";
import CollisionObject2DSW from "./collision_object_2d_sw";
import {
    BodyMode,
    CollisionObjectType,
    CCDMode,
    BodyState,
} from "engine/scene/physics/const";
import {
    Physics2DDirectBodyStateSW,
} from "./state";

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
        if (this._active === p_enable) {
            return;
        }

        this._active = p_enable;
        if (!p_enable) {
            if (this.space) {
                this.space.body_remove_from_active_list(this.active_list);
            }
        } else {
            if (this.mode === BodyMode.STATIC) {
                return;
            }
            if (this.space) {
                this.space.body_add_to_active_list(this.active_list);
            }
        }
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
         * @type {Map<import('./constraint_2d_sw').default, number>}
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

        this.static = false;
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
     * @param {import('./area_2d_sw').default} p_area
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

    /**
     * @param {import('./area_2d_sw').default} p_area
     */
    add_area(p_area) {
        const index = this.areas.indexOf(p_area);
        if (index < 0) {
            // FIXME: use "ordered_insert" instead
            this.areas.push(p_area);
        }
    }
    /**
     * @param {import('./area_2d_sw').default} p_area
     */
    remove_area(p_area) {
        const index = this.areas.indexOf(p_area);
        if (index >= 0) {
            remove_items(this.areas, index, 1);
        }
    }

    /**
     * @param {number} p_size
     */
    set_max_contacts_reported(p_size) {
        this.contacts.length = p_size;
        for (let i = 0; i < p_size; i++) {
            // TODO: cache the contacts
            if (!this.contacts[i]) this.contacts[i] = new Contact();
        }
        this.contact_count = 0;
        if (this.mode === BodyMode.KINEMATIC && p_size) this.set_active(true);
    }

    get_max_contacts_reported() {
        return this.contacts.length;
    }

    can_report_contacts() {
        return this.contacts.length > 0;
    }
    /**
     * @param {Vector2} p_local_pos
     * @param {Vector2} p_local_normal
     * @param {number} p_depth
     * @param {number} p_local_shape
     * @param {Vector2} p_collider_pos
     * @param {number} p_collider_shape
     * @param {any} p_collider_instance
     * @param {any} p_collider
     * @param {Vector2} p_collider_velocity_at_pos
     */
    add_contact(p_local_pos, p_local_normal, p_depth, p_local_shape, p_collider_pos, p_collider_shape, p_collider_instance, p_collider, p_collider_velocity_at_pos) {
        const c_max = this.contacts.length;

        if (c_max === 0) {
            return;
        }

        const c = this.contacts;

        let idx = -1;

        if (this.contact_count < c_max) {
            idx = this.contact_count++;
        } else {
            let least_depth = 1e20;
            let least_deep = -1;
            for (let i = 0; i < c_max; i++) {
                if (i === 0 || c[i].depth < least_depth) {
                    least_deep = i;
                    least_depth = c[i].depth;
                }
            }

            if (least_deep >= 0 && least_depth < p_depth) {
                idx = least_deep;
            }
            if (idx === -1) {
                return; // none least deeper than this
            }
        }

        c[idx].local_pos.copy(p_local_pos);
        c[idx].local_normal.copy(p_local_normal);
        c[idx].depth = p_depth;
        c[idx].local_shape = p_local_shape;
        c[idx].collider_pos.copy(p_collider_pos);
        c[idx].collider_shape = p_collider_shape;
        c[idx].collider_instance = p_collider_instance;
        c[idx].collider = p_collider;
        c[idx].collider_velocity_at_pos.copy(p_collider_velocity_at_pos);
    }

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
     * @param {import('./constraint_2d_sw').default} p_constraint
     * @param {number} p_pos
     */
    add_constraint(p_constraint, p_pos) {
        this.constraint_map.set(p_constraint, p_pos);
    }
    /**
     * @param {import('./constraint_2d_sw').default} p_constraint
     */
    remove_constraint(p_constraint) {
        this.constraint_map.delete(p_constraint);
    }
    get_constraint() {
        return this.constraint_map;
    }

    /**
     * @param {Vector2} p_impulse
     */
    apply_central_impulse(p_impulse) {
        this.linear_velocity.x += p_impulse.x * this._inv_mass;
        this.linear_velocity.y += p_impulse.y * this._inv_mass;
    }
    /**
     * @param {Vector2} p_offset
     * @param {Vector2} p_impulse
     */
    apply_impulse(p_offset, p_impulse) {
        this.linear_velocity.x += p_impulse.x * this._inv_mass;
        this.linear_velocity.y += p_impulse.y * this._inv_mass;

        this.angular_velocity += this._inv_inertia * p_offset.cross(p_impulse);
    }
    /**
     * @param {Vector2} p_pos
     * @param {Vector2} p_impulse
     */
    apply_bias_impulse(p_pos, p_impulse) {
        this.biased_linear_velocity.x += p_impulse.x * this._inv_mass;
        this.biased_linear_velocity.y += p_impulse.y * this._inv_mass;

        this.angular_velocity += this._inv_mass * p_pos.cross(p_impulse);
    }

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
            }
            case BodyState.LINEAR_VELOCITY: {
                return this.linear_velocity;
            }
            case BodyState.ANGULAR_VELOCITY: {
                return this.angular_velocity;
            }
            case BodyState.SLEEPING: {
                return !this.active;
            }
            case BodyState.CAN_SLEEP: {
                return this.can_sleep;
            }
        }
    }

    add_central_force(p_force) { }
    add_force(p_force) { }

    add_torque(p_torque) { }

    /**
     * @param {import('./space_2d_sw').default} p_space
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
    integrate_forces(p_step) {
        if (this.mode === BodyMode.STATIC) {
            return;
        }

        const def_area = this.space.default_area;

        const ac = this.areas.length;
        let stopped = false;
        this.gravity.set(0, 0);
        this.area_angular_damp = 0;
        this.area_linear_damp = 0;
        if (ac) {
            // TODO
        }
        if (!stopped) {
            this._compute_area_gravity_and_dampenings(def_area);
        }
        this.gravity.scale(this.gravity_scale);

        if (this.angular_damp >= 0) {
            this.area_angular_damp = this.angular_damp;
        }

        if (this.linear_damp >= 0) {
            this.area_linear_damp = this.linear_damp;
        }

        const motion = Vector2.new();
        let do_motion = false;

        if (this.mode === BodyMode.KINEMATIC) {
            // compute motion, angular and etc. velocities from prev transform
            motion.copy(this.new_transform.origin).subtract(this.transform.origin);
            this.linear_velocity.copy(motion).divide(p_step);

            const rot = this.new_transform.rotation - this.transform.rotation;
            this.angular_velocity = rot / p_step;

            do_motion = true;
        } else {
            if (!this.omit_force_integration && !this.first_integration) {
                // overridden by direct state query

                const force = this.gravity.clone().scale(this.mass);
                force.add(this.applied_force);
                let torque = this.applied_torque;

                let damp = 1 - p_step * this.area_linear_damp;

                if (damp < 0) {
                    damp = 0;
                }

                let angular_damp = 1 - p_step * this.area_angular_damp;

                if (angular_damp < 0) {
                    angular_damp = 0;
                }

                this.linear_velocity.scale(damp);
                this.angular_velocity *= angular_damp;

                this.linear_velocity.add(force.scale(this._inv_mass * p_step));
                this.angular_velocity += this._inv_inertia * torque * p_step;
            }

            if (this.continuous_cd_mode !== CCDMode.DISABLED) {
                motion.copy(this.linear_velocity).scale(p_step);
                do_motion = true;
            }
        }

        this.first_integration = false;
        this.biased_angular_velocity = 0;
        this.biased_linear_velocity.set(0, 0);

        if (do_motion) {
            this._update_shapes_with_motion(motion);
        }

        this.def_area = null; // clear the area, so it is set in the next frame
        this.contact_count = 0;
    }
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
        const pos = this.transform.origin.clone().add(total_linear_velocity.scale(p_step));

        const t = Matrix.new().rotate(angle).translate(pos.x, pos.y);
        this._set_transform(t, this.continuous_cd_mode === CCDMode.DISABLED);
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
        return Vector2.ZERO;
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
            const n = c._bodies;
            const bc = c._body_count;

            for (let i = 0; i < bc; i++) {
                if (i === E) {
                    continue;
                }
                const b = n[i];
                if (b.mode !== BodyMode.RIGID) {
                    continue;
                }

                if (!b.active) {
                    b.set_active(true);
                }
            }
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
