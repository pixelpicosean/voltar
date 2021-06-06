import { remove_item, remove_items } from "engine/dep/index";
import { SelfList } from "engine/core/self_list";
import { Math_TAU } from "engine/core/math/math_defs";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { remainder } from "engine/core/math/math_funcs";
import { Transform2D } from "engine/core/math/transform_2d";

import {
    BodyMode,
    CollisionObject2DSW$Type,
    CCDMode,
    BodyState,
    AreaSpaceOverrideMode,
} from "engine/scene/2d/const";

import { CollisionObject2DSW } from "./collision_object_2d_sw";

type Node2D = import("engine/scene/2d/node_2d").Node2D;

type Area2DSW = import("./area_2d_sw").Area2DSW;
type Constraint2DSW = import("./constraint_2d_sw").Constraint2DSW;
type Space2DSW = import('./space_2d_sw').Space2DSW;


class AreaCMP {
    area: Area2DSW;
    ref_count = 1;

    constructor(p_area: Area2DSW) {
        this.area = p_area;
    }
}
function sort_AreaCMP(a: AreaCMP, b: AreaCMP): number {
    if (a.area === b.area) return 0;
    else return a.area.priority - b.area.priority;
}

class Contact {
    local_pos = new Vector2;
    local_normal = new Vector2;
    depth = 0;
    local_shape = 0;
    collider_pos = new Vector2;
    collider_shape = 0;
    collider_instance: Node2D = null;
    collider: Body2DSW = null;
    collider_velocity_at_pos = new Vector2;
}

class ForceIntegrationCallback {
    id: any;
    method: Function;
    callback_udata: any;
}

export class Body2DSW extends CollisionObject2DSW {
    set_active(p_enable: boolean) {
        if (this.active === p_enable) {
            return;
        }

        this.active = p_enable;
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

    mode = BodyMode.RIGID;

    biased_linear_velocity = new Vector2;
    biased_angular_velocity = 0;

    linear_velocity = new Vector2;
    angular_velocity = 0;

    linear_damp = -1;
    angular_damp = -1;
    gravity_scale = 1;

    mass = 1;
    inertia = 1;
    bounce = 0;
    friction = 1;

    _inv_mass = 1;
    _inv_inertia = 0;
    user_inertia = false;

    gravity = new Vector2;
    area_linear_damp = 0;
    area_angular_damp = 0;

    still_time = 0;

    applied_force = new Vector2;
    applied_torque = 0;

    active_list: SelfList<Body2DSW> = new SelfList(this);
    inertia_update_list: SelfList<Body2DSW> = new SelfList(this);
    direct_state_query_list: SelfList<Body2DSW> = new SelfList(this);

    exceptions: Set<CollisionObject2DSW> = new Set;
    continuous_cd_mode = CCDMode.DISABLED;
    omit_force_integration = false;
    active = true;
    can_sleep = false;
    first_time_kinematic = false;
    first_integration = false;
    new_transform = new Transform2D;

    constraint_map: Map<Constraint2DSW, number> = new Map;

    areas: AreaCMP[] = [];

    contacts: Contact[] = [];
    contact_count = 0;

    fi_callback: ForceIntegrationCallback = null;

    island_step = 0;
    island_next: Body2DSW = null;
    island_list_next: Body2DSW = null;

    constructor() {
        super(CollisionObject2DSW$Type.BODY);

        this._set_static(false);
    }
    _free() {
        if (this.fi_callback) this.fi_callback = null;
        super._free();
    }

    add_area(p_area: Area2DSW) {
        let found = false;
        for (let a of this.areas) {
            if (a.area === p_area) {
                a.ref_count += 1;
                found = true;
                break;
            }
        }
        if (!found) {
            this.areas.push(new AreaCMP(p_area));
        }
    }
    remove_area(p_area: Area2DSW) {
        for (let i = 0; i < this.areas.length; i++) {
            let a = this.areas[i];

            if (a.area === p_area) {
                a.ref_count -= 1;

                if (a.ref_count < 1) {
                    remove_item(this.areas, i);
                }

                break;
            }
        }
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

    _compute_area_gravity_and_dampenings(p_area: Area2DSW) {
        if (p_area.gravity_is_point) {
            let origin = this.transform.get_origin();
            let v = p_area.transform.xform(p_area.gravity_vector).subtract(origin);
            let scale = p_area.gravity / Math.pow(v.length() * p_area.gravity_distance_scale + 1, 2);
            this.gravity.copy(v.normalize().scale(scale));
            Vector2.free(v);
            Vector2.free(origin);
        } else {
            let v = p_area.gravity_vector.clone().scale(p_area.gravity);
            this.gravity.add(v);
            Vector2.free(v);
        }

        this.area_linear_damp += p_area.linear_damp;
        this.area_angular_damp += p_area.angular_damp;
    }

    set_force_integration_callback(p_id: any, p_method: Function, p_udata: any) {
        if (this.fi_callback) {
            // @Incomplete: this.fi_callback._free();
            this.fi_callback = null;
        }

        if (p_id) {
            this.fi_callback = new ForceIntegrationCallback;
            this.fi_callback.id = p_id;
            this.fi_callback.method = p_method;
            this.fi_callback.callback_udata = p_udata;
        }
    }

    set_max_contacts_reported(p_size: number) {
        this.contacts.length = p_size;
        for (let i = 0; i < p_size; i++) {
            if (!this.contacts[i]) this.contacts[i] = new Contact;
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

    add_contact(p_local_pos: Vector2, p_local_normal: Vector2, p_depth: number, p_local_shape: number, p_collider_pos: Vector2, p_collider_shape: number, p_collider_instance: any, p_collider: any, p_collider_velocity_at_pos: Vector2) {
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
    add_exception(p_exception: CollisionObject2DSW) {
        this.exceptions.add(p_exception);
    }
    /**
     * @param {CollisionObject2DSW} p_exception
     */
    remove_exception(p_exception: CollisionObject2DSW) {
        this.exceptions.delete(p_exception);
    }
    /**
     * @param {CollisionObject2DSW} p_exception
     */
    has_exception(p_exception: CollisionObject2DSW) {
        return this.exceptions.has(p_exception);
    }

    add_constraint(p_constraint: Constraint2DSW, p_pos: number) {
        this.constraint_map.set(p_constraint, p_pos);
    }
    remove_constraint(p_constraint: Constraint2DSW) {
        this.constraint_map.delete(p_constraint);
    }
    get_constraint() {
        return this.constraint_map;
    }

    apply_central_impulse(p_impulse: Vector2) {
        this.linear_velocity.x += p_impulse.x * this._inv_mass;
        this.linear_velocity.y += p_impulse.y * this._inv_mass;
    }
    apply_impulse(p_offset: Vector2, p_impulse: Vector2) {
        this.linear_velocity.x += p_impulse.x * this._inv_mass;
        this.linear_velocity.y += p_impulse.y * this._inv_mass;

        this.angular_velocity += this._inv_inertia * p_offset.cross(p_impulse);
    }
    apply_torque_impulse(p_torque: number) {
        this.angular_velocity += this._inv_inertia * p_torque;
    }
    /**
     * @param {Vector2} p_pos
     * @param {Vector2} p_impulse
     */
    apply_bias_impulse(p_pos: Vector2, p_impulse: Vector2) {
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

    set_mode(p_mode: BodyMode) {
        const prev = this.mode;
        this.mode = p_mode;

        switch (p_mode) {
            case BodyMode.STATIC:
            case BodyMode.KINEMATIC: {
                let inv_xform = this.transform.clone().affine_inverse();
                this._set_inv_transform(inv_xform);
                this._inv_mass = 0;
                this._inv_inertia = 0;
                this._set_static(p_mode === BodyMode.STATIC);
                this.set_active(p_mode === BodyMode.KINEMATIC && this.contacts.length > 0);
                this.linear_velocity.set(0, 0);
                this.angular_velocity = 0;
                if (this.mode === BodyMode.KINEMATIC && prev !== this.mode) {
                    this.first_time_kinematic = true;
                }
                Transform2D.free(inv_xform);
            } break;
            case BodyMode.RIGID: {
                this._inv_mass = this.mass > 0 ? (1 / this.mass) : 0;
                this._inv_inertia = this.inertia > 0 ? (1 / this.inertia) : 0;
                this._set_static(false);
                this.set_active(true);
            } break;
            case BodyMode.CHARACTER: {
                this._inv_mass = this.mass > 0 ? (1 / this.mass) : 0;
                this._inv_inertia = 0;
                this._set_static(false);
                this.set_active(true);
                this.angular_velocity = 0;
            } break;
        }

        if (p_mode === BodyMode.RIGID && this._inv_inertia === 0) {
            this._update_inertia();
        }
    }
    get_mode() {
        return this.mode;
    }

    set_state(p_state: number, p_value: any) {
        switch (p_state) {
            case BodyState.TRANSFORM: {
                if (this.mode === BodyMode.KINEMATIC) {
                    this.new_transform.copy(p_value);
                    this.set_active(true);
                    if (this.first_time_kinematic) {
                        this._set_transform(p_value);
                        const inv_transform = this.transform.clone().affine_inverse();
                        this._set_inv_transform(inv_transform);
                        this.first_time_kinematic = false;
                        Transform2D.free(inv_transform);
                    }
                } else if (this.mode === BodyMode.STATIC) {
                    this._set_transform(p_value);
                    const inv_transform = this.transform.clone().affine_inverse();
                    this._set_inv_transform(inv_transform);
                    this.wakeup_neighbours();
                    Transform2D.free(inv_transform);
                } else {
                    const t: Transform2D = p_value;
                    t.orthonormalize();
                    this.new_transform.copy(this.transform);
                    if (t.equals(this.new_transform)) {
                        break;
                    }
                    this._set_transform(t);
                    const inv_transform = this.transform.inverse();
                    this._set_inv_transform(inv_transform);
                    Transform2D.free(inv_transform);
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
                let do_sleep: boolean = p_value;
                if (do_sleep) {
                    this.linear_velocity.set(0, 0);
                    this.angular_velocity = 0;
                    this.set_active(false);
                } else {
                    this.set_active(true);
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
    get_state(p_state: number) {
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

    add_central_force(p_force: Vector2) {
        this.applied_force.add(p_force);
    }
    add_force(p_offset: Vector2, p_force: Vector2) {
        this.applied_force.add(p_force);
        this.applied_torque += p_offset.cross(p_force);
    }

    add_torque(p_torque: number) {
        this.applied_torque += p_torque;
    }

    set_space(p_space: Space2DSW) {
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
            case BodyMode.RIGID: {
                if (this.user_inertia) {
                    this._inv_inertia = this.inertia > 0 ? (1 / this.inertia) : 0;
                    break;
                }
                let total_area = 0;

                for (let shape of this.shapes) {
                    total_area += shape.aabb_cache.get_area();
                }

                this.inertia = 0;

                for (let shape of this.shapes) {
                    if (shape.disabled) {
                        continue;
                    }

                    let area = shape.aabb_cache.get_area();

                    let mass = area * this.mass / total_area;

                    let origin = shape.xform.get_origin();
                    let scale = shape.xform.get_scale();
                    this.inertia += shape.shape.get_moment_of_inertia(mass, scale) + mass * origin.length_squared();
                    Vector2.free(scale);
                    Vector2.free(origin);
                }

                this._inv_inertia = this.inertia > 0 ? (1 / this.inertia) : 0;

                if (this.mass) {
                    this._inv_mass = 1 / this.mass;
                } else {
                    this._inv_mass = 0;
                }
            } break;
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

    integrate_forces(p_step: number) {
        if (this.mode === BodyMode.STATIC) {
            return;
        }

        let def_area = this.space.area;

        const ac = this.areas.length;
        let stopped = false;
        this.gravity.set(0, 0);
        this.area_angular_damp = 0;
        this.area_linear_damp = 0;
        if (ac) {
            this.areas.sort(sort_AreaCMP);
            const aa = this.areas;
            for (let i = ac - 1; i >= 0 && !stopped; i--) {
                let mode = aa[i].area.space_override_mode;
                switch (mode) {
                    case AreaSpaceOverrideMode.COMBINE:
                    case AreaSpaceOverrideMode.COMBINE_REPLACE: {
                        this._compute_area_gravity_and_dampenings(aa[i].area);
                        stopped = mode === AreaSpaceOverrideMode.COMBINE_REPLACE;
                    } break;
                    case AreaSpaceOverrideMode.REPLACE:
                    case AreaSpaceOverrideMode.REPLACE_COMBINE: {
                        this.gravity.set(0, 0);
                        this.area_angular_damp = 0;
                        this.area_linear_damp = 0;
                        this._compute_area_gravity_and_dampenings(aa[i].area);
                        stopped = mode === AreaSpaceOverrideMode.REPLACE;
                    } break;
                }
            }
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

        let motion = Vector2.new();
        let do_motion = false;

        if (this.mode === BodyMode.KINEMATIC) {
            let new_origin = this.new_transform.get_origin();
            let origin = this.transform.get_origin();

            // compute motion, angular and etc. velocities from prev transform
            motion.copy(new_origin).subtract(origin);
            this.linear_velocity.copy(motion).scale(1 / p_step);

            let rot = this.new_transform.get_rotation() - this.transform.get_rotation();
            this.angular_velocity = remainder(rot, Math_TAU) / p_step;

            do_motion = true;

            Vector2.free(origin);
            Vector2.free(new_origin);
        } else {
            if (!this.omit_force_integration && !this.first_integration) {
                // overridden by direct state query

                let force = this.gravity.clone().scale(this.mass);
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

                Vector2.free(force);
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

        def_area = null; // clear the area, so it is set in the next frame
        this.contact_count = 0;

        Vector2.free(motion);
    }

    integrate_velocities(p_step: number) {
        if (this.mode === BodyMode.STATIC) {
            return;
        }

        if (this.fi_callback) {
            this.space.body_add_to_state_query_list(this.direct_state_query_list);
        }

        if (this.mode === BodyMode.KINEMATIC) {
            this._set_transform(this.new_transform, false);
            const inv_transform = this.new_transform.clone().affine_inverse();
            this._set_inv_transform(inv_transform);
            if (this.contacts.length === 0 && this.linear_velocity.is_zero() && this.angular_velocity === 0) {
                this.set_active(false); // stopped moving, deactivate
            }
            Transform2D.free(inv_transform);
            return;
        }

        const total_angular_velocity = this.angular_velocity + this.biased_angular_velocity;
        const total_linear_velocity = this.linear_velocity.clone().add(this.biased_linear_velocity);

        const angle = this.transform.get_rotation() + total_angular_velocity * p_step;
        const pos = this.transform.get_origin().add(total_linear_velocity.scale(p_step));

        let t = Transform2D.new().set_rotation_and_pos(angle, pos);
        this._set_transform(t, this.continuous_cd_mode === CCDMode.DISABLED);
        let inv_transform = this.transform.clone().invert();
        this._set_inv_transform(inv_transform);

        if (this.continuous_cd_mode !== CCDMode.DISABLED) {
            this.new_transform.copy(this.transform);
        }

        Transform2D.free(inv_transform);
        Vector2.free(total_linear_velocity);
        Vector2.free(pos);
        Transform2D.free(t);
    }

    get_motion(r_out?: Vector2): Vector2 {
        if (!r_out) r_out = Vector2.new();
        else r_out.set(0, 0);

        if (this.mode > BodyMode.KINEMATIC) {
            const origin = this.transform.get_origin(_i_get_motion_vec2);
            return this.new_transform.get_origin(r_out).subtract(origin);
        } else if (this.mode === BodyMode.KINEMATIC) {
            const origin = this.new_transform.get_origin(_i_get_motion_vec2);
            return this.transform.get_origin(r_out).subtract(origin);
        }
        return r_out;
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
                    this.fi_callback.method.call(obj, vp[0], vp[1]);
                } else {
                    this.fi_callback.method.call(obj, vp[0]);
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

    sleep_test(p_step: number) {
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

export class Physics2DDirectBodyStateSW {
    get_total_gravity(): Vector2 {
        return this.body.gravity;
    }
    get_total_linear_damp(): number {
        return this.body.area_linear_damp;
    }
    get_total_angular_damp(): number {
        return this.body.area_angular_damp;
    }

    get_inverse_mass(): number {
        return this.body._inv_mass;
    }

    get_inverse_inertia(): number {
        return this.body._inv_inertia;
    }

    set_linear_velocity(velocity: Vector2) {
        return this.body.linear_velocity.copy(velocity);
    }

    get_linear_velocity(): Vector2 {
        return this.body.linear_velocity;
    }

    set_angular_velocity(velocity: number) {
        this.body.angular_velocity = velocity;
    }

    get_angular_velocity(): number {
        return this.body.angular_velocity;
    }

    set_transform(transform: Transform2D) {
        this.body.set_state(BodyState.TRANSFORM, transform);
    }
    get_transform(): Transform2D {
        return this.body.transform;
    }

    add_central_force(force: Vector2) {
        this.body.add_central_force(force);
    }
    add_force(offset: Vector2, force: Vector2) {
        this.body.add_force(offset, force);
    }
    add_torque(torque: number) {
        this.body.add_torque(torque);
    }
    apply_central_impulse(impulse: Vector2) {
        this.body.apply_central_impulse(impulse);
    }
    apply_torque_impulse(torque: number) {
        this.body.apply_torque_impulse(torque);
    }
    apply_impulse(offset: Vector2, impulse: Vector2) {
        this.body.apply_impulse(offset, impulse);
    }

    set_sleep_state(p_enable: boolean) {
        this.body.active = !p_enable;
    }
    is_sleeping(): boolean {
        return !this.body.active;
    }

    get_contact_count(): number {
        return this.body.contact_count;
    }

    get_contact_local_position(contact_idx: number): Vector2 {
        return this.body.contacts[contact_idx].local_pos;
    }
    get_contact_local_normal(contact_idx: number): Vector2 {
        return this.body.contacts[contact_idx].local_normal;
    }
    get_contact_local_shape(contact_idx: number): number {
        return this.body.contacts[contact_idx].local_shape;
    }

    get_contact_collider(contact_idx: number): Body2DSW {
        return this.body.contacts[contact_idx].collider;
    }
    get_contact_collider_id(contact_idx: number): Node2D {
        return this.body.contacts[contact_idx].collider_instance;
    }
    get_contact_collider_position(contact_idx: number): Vector2 {
        return this.body.contacts[contact_idx].collider_pos;
    }
    get_contact_collider_shape(contact_idx: number): number {
        return this.body.contacts[contact_idx].collider_shape;
    }
    get_contact_collider_shape_metadata(contact_idx: number): any {
        let other: Body2DSW = this.body.contacts[contact_idx].collider;

        let sidx = this.body.contacts[contact_idx].collider_shape;
        if (sidx < 0 || sidx >= other.shapes.length) {
            return null;
        }

        return other.get_shape_metadata(sidx);
    }
    get_contact_collider_velocity_at_position(contact_idx: number): Vector2 {
        return this.body.contacts[contact_idx].collider_velocity_at_pos;
    }

    get_step(): number {
        return this.step;
    }

    get_space_state() {
        return this.body.space.direct_access;
    }

    body: Body2DSW = null;
    step = 0;

    constructor() {
        Physics2DDirectBodyStateSW.singleton = this;
        this.body = null;
    }
    _predelete() {
        return true;
    }
    _free() { }

    integrate_forces() {
        let step = this.step;
        let gravity = this.get_total_gravity();
        let lv = this.get_linear_velocity().clone();
        lv.add(gravity.x * step, gravity.y * step);

        let av = this.get_angular_velocity();

        let damp = 1 - step * this.get_total_linear_damp();

        if (damp < 0) damp = 0;

        lv.scale(damp);

        damp = 1 - step * this.get_total_angular_damp();

        if (damp < 0) damp = 0;

        av *= damp;

        this.set_linear_velocity(lv);
        this.set_angular_velocity(av);

        Vector2.free(lv);
    }

    static singleton: Physics2DDirectBodyStateSW = null;
}

const _i_get_motion_vec2 = new Vector2;
