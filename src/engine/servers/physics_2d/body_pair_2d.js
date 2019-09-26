import { clamp } from "engine/core/math/math_funcs";
import { CMP_EPSILON } from "engine/core/math/math_defs";
import { Vector2 } from "engine/core/math/vector2";
import { Transform2D } from "engine/core/math/transform_2d";

import { BodyMode, CCDMode } from "engine/scene/2d/const";

import { Body2DSW } from "./body_2d_sw";
import { Space2DSW } from "./space_2d_sw";
import { CollisionSolver2DSW } from "./collision_solver_2d_sw";
import { Constraint2DSW } from "./constraint_2d_sw";


const MAX_CONTACTS = 2;

class Contact {
    constructor() {
        this.position = new Vector2();
        this.normal = new Vector2();
        this.local_A = new Vector2();
        this.local_B = new Vector2();
        this.acc_normal_impulse = 0;
        this.acc_tangent_impulse = 0;
        this.acc_bias_impulse = 0;
        this.mass_normal = 0;
        this.mass_tangent = 0;
        this.bias = 0;

        this.depth = 0;
        this.active = false;
        this.rA = new Vector2();
        this.rB = new Vector2();
        this.reused = false;
        this.bounce = 0;
    }
}

/**
 * @param {Vector2} p_point_A
 * @param {Vector2} p_point_B
 * @param {BodyPair2DSW} p_self
 */
function _add_contact(p_point_A, p_point_B, p_self) {
    p_self._contact_add_callback(p_point_A, p_point_B);
}

/**
 * @param {Body2DSW} A
 * @param {Body2DSW} B
 */
function combine_bounce(A, B) {
    return clamp(A.bounce + B.bounce, 0, 1);
}

/**
 * @param {Body2DSW} A
 * @param {Body2DSW} B
 */
function combine_friction(A, B) {
    return Math.abs(Math.min(A.friction, B.friction));
}

export class BodyPair2DSW extends Constraint2DSW {
    get A() { return this._arr[0] }
    get B() { return this._arr[1] }
    /**
     * @param {Body2DSW} p_A
     * @param {number} p_shape_A
     * @param {Body2DSW} p_B
     * @param {number} p_shape_B
     */
    constructor(p_A, p_shape_A, p_B, p_shape_B) {
        /** @type {Body2DSW[]} */
        const _arr = [p_A, p_B];
        super(_arr, 2);

        this._arr = _arr;

        this.shape_A = p_shape_A;
        this.shape_B = p_shape_B;

        /** @type {Space2DSW} */
        this.space = p_A.space;

        this.offset_B = new Vector2();

        this.sep_axis = new Vector2();
        /** @type {Contact[]} */
        this.contacts = new Array(MAX_CONTACTS); for (let i = 0; i < MAX_CONTACTS; i++) this.contacts[i] = new Contact();
        this.contact_count = 0;
        this.collided = false;
        this.oneway_disabled = false;
        this.cc = 0;

        p_A.add_constraint(this, 0);
        p_B.add_constraint(this, 1);
    }
    free() {
        this._arr[0].remove_constraint(this);
        this._arr[1].remove_constraint(this);
    }

    /**
     * @param {number} p_step
     */
    setup(p_step) {
        const A = this._arr[0];
        const B = this._arr[1];

        // cannot collide
        if (!A.test_collision_mask(B) || A.has_exception(B.self) || B.has_exception(A.self) || (A.mode <= BodyMode.KINEMATIC && B.mode <= BodyMode.KINEMATIC && A.get_max_contacts_reported() === 0 && B.get_max_contacts_reported() === 0)) {
            this.collided = false;
            return false;
        }

        if (A.is_shape_set_as_disabled(this.shape_A) || B.is_shape_set_as_disabled(this.shape_B)) {
            this.collided = false;
            return false;
        }

        // use local A coordinates to avoid numerical issues on collision detection
        const a_origin = A.transform.get_origin();
        const b_origin = B.transform.get_origin();
        this.offset_B.copy(b_origin).subtract(a_origin);
        Vector2.free(b_origin);
        Vector2.free(a_origin);

        this._validate_contacts();

        const offset_A = A.transform.get_origin();
        const xform_Au = A.transform.untranslated();
        const xform_A = xform_Au.clone().append(A.get_shape_transform(this.shape_A));

        const xform_Bu = B.transform.clone();
        const A_origin = A.transform.get_origin();
        xform_Bu.tx -= A_origin.x;
        xform_Bu.ty -= A_origin.y;
        Vector2.free(A_origin);
        const xform_B = xform_Bu.clone().append(B.get_shape_transform(this.shape_B));

        const shape_A_ptr = A.get_shape(this.shape_A);
        const shape_B_ptr = B.get_shape(this.shape_B);

        /** @type {Vector2} */
        let motion_A = null;
        /** @type {Vector2} */
        let motion_B = null;

        if (A.continuous_cd_mode === CCDMode.CAST_SHAPE) {
            motion_A = A.get_motion();
        }
        if (B.continuous_cd_mode === CCDMode.CAST_SHAPE) {
            motion_B = B.get_motion();
        }
        // faster to set than to check..

        this.collided = CollisionSolver2DSW.solve(shape_A_ptr, xform_A, motion_A, shape_B_ptr, xform_B, motion_B, _add_contact, this, [this.sep_axis]);
        if (!this.collided) {
            // test ccd (currently just a raycast)

            if (A.continuous_cd_mode === CCDMode.CAST_RAY && A.mode > BodyMode.KINEMATIC) {
                if (this._test_ccd(p_step, A, this.shape_A, xform_A, B, this.shape_B, xform_B)) {
                    this.collided = true;
                }
            }

            if (B.continuous_cd_mode === CCDMode.CAST_RAY && B.mode > BodyMode.KINEMATIC) {
                if (this._test_ccd(p_step, B, this.shape_B, xform_B, A, this.shape_A, xform_A, true)) {
                    this.collided = true;
                }
            }

            if (!this.collided) {
                this.oneway_disabled = false;

                Vector2.free(motion_A);
                Vector2.free(motion_B);

                Vector2.free(offset_A);
                Transform2D.free(xform_Au);
                Transform2D.free(xform_A);
                Transform2D.free(xform_Bu);
                Transform2D.free(xform_B);
                return false;
            }
        }

        if (this.oneway_disabled) {
            Vector2.free(motion_A);
            Vector2.free(motion_B);

            Vector2.free(offset_A);
            Transform2D.free(xform_Au);
            Transform2D.free(xform_A);
            Transform2D.free(xform_Bu);
            Transform2D.free(xform_B);
            return false;
        }

        {
            if (A.is_shape_one_way_collision(this.shape_A)) {
                const direction = xform_A.get_axis(1).normalize();
                let valid = false;
                if (B.linear_velocity.dot(direction) >= 0) {
                    for (let i = 0; i < this.contact_count; i++) {
                        const c = this.contacts[i];
                        if (!c.reused) {
                            continue;
                        }
                        if (c.normal.dot(direction) < 0) {
                            continue;
                        }

                        valid = true;
                        break;
                    }
                }

                if (!valid) {
                    this.collided = false;
                    this.oneway_disabled = true;

                    Vector2.free(direction);

                    Vector2.free(motion_A);
                    Vector2.free(motion_B);

                    Vector2.free(offset_A);
                    Transform2D.free(xform_Au);
                    Transform2D.free(xform_A);
                    Transform2D.free(xform_Bu);
                    Transform2D.free(xform_B);
                    return false;
                }

                Vector2.free(direction);
            }

            if (B.is_shape_one_way_collision(this.shape_B)) {
                const direction = xform_B.get_axis(1).normalize();
                let valid = false;
                if (A.linear_velocity.dot(direction) >= 0) {
                    for (let i = 0; i < this.contact_count; i++) {
                        const c = this.contacts[i];
                        if (!c.reused) {
                            continue;
                        }
                        if (c.normal.dot(direction) < 0) {
                            continue;
                        }

                        valid = true;
                        break;
                    }
                }

                if (!valid) {
                    this.collided = false;
                    this.oneway_disabled = true;

                    Vector2.free(direction);

                    Vector2.free(motion_A);
                    Vector2.free(motion_B);

                    Vector2.free(offset_A);
                    Transform2D.free(xform_Au);
                    Transform2D.free(xform_A);
                    Transform2D.free(xform_Bu);
                    Transform2D.free(xform_B);
                    return false;
                }

                Vector2.free(direction);
            }
        }

        const max_peneration = this.space.contact_max_allowed_penetration;

        let bias = 0.3;
        if (shape_A_ptr.custom_bias || shape_B_ptr.custom_bias) {
            if (shape_A_ptr.custom_bias === 0) {
                bias = shape_B_ptr.custom_bias;
            } else if (shape_B_ptr.custom_bias === 0) {
                bias = shape_A_ptr.custom_bias;
            } else {
                bias = (shape_B_ptr.custom_bias + shape_A_ptr.custom_bias) * 0.5;
            }
        }

        this.cc = 0;

        const inv_dt = 1 / p_step;

        let do_process = false;

        for (let i = 0; i < this.contact_count; i++) {
            const c = this.contacts[i];

            const global_A = xform_Au.xform(c.local_A);
            const global_B = xform_Bu.xform(c.local_B);

            const depth = c.normal.dot(global_A.clone().subtract(global_B));

            if (depth <= 0 || !c.reused) {
                c.active = false;
                continue;
            }

            c.active = true;

            const gather_A = A.can_report_contacts();
            const gather_B = B.can_report_contacts();

            c.rA.copy(global_A);
            c.rB.copy(global_B).subtract(this.offset_B);

            if (gather_A || gather_B) {
                global_A.add(offset_A);
                global_B.add(offset_A);

                if (gather_A) {
                    const crB = Vector2.new(-B.angular_velocity * c.rB.y, B.angular_velocity * c.rB.x);
                    A.add_contact(global_A, c.normal.clone().negate(), depth, this.shape_A, global_B, this.shape_B, B.instance, B.self, crB.add(B.linear_velocity));
                }
                if (gather_B) {
                    const crA = Vector2.new(-A.angular_velocity * c.rA.y, A.angular_velocity * c.rA.x);
                    A.add_contact(global_B, c.normal, depth, this.shape_B, global_A, this.shape_A, A.instance, A.self, crA.add(A.linear_velocity));
                }
            }

            if (A.mode <= BodyMode.KINEMATIC && B.mode <= BodyMode.KINEMATIC) {
                c.active = false;
                this.collided = false;
                continue;
            }

            // precompute normal mass, tangent mass and bias.
            const rnA = c.rA.dot(c.normal);
            const rnB = c.rB.dot(c.normal);
            let kNormal = A.inv_mass + B.inv_mass;
            kNormal += A.inv_inertia * (c.rA.dot(c.rA) - rnA * rnA) + B.inv_inertia * (c.rB.dot(c.rB) - rnB * rnB);
            c.mass_normal = 1 / kNormal;

            const tangent = c.normal.tangent();
            const rtA = c.rA.dot(tangent);
            const rtB = c.rB.dot(tangent);
            let kTangent = A.inv_mass + B.inv_mass;
            kTangent += A.inv_inertia * (c.rA.dot(c.rA) - rtA * rtA) + B.inv_inertia * (c.rB.dot(c.rB) - rtB * rtB);
            c.mass_tangent = 1 / kTangent;

            c.bias = bias * inv_dt * Math.min(0, -depth + max_peneration);
            c.depth = depth;

            {
                // apply normal + friction impulse
                const P = c.normal.clone().scale(c.acc_normal_impulse).add(tangent.clone().scale(c.acc_tangent_impulse));

                B.apply_impulse(c.rB, P);
                A.apply_impulse(c.rA, P.negate());
            }

            c.bounce = combine_bounce(A, B);
            if (c.bounce) {
                const crA = Vector2.new(-A.angular_velocity * c.rA.y, A.angular_velocity * c.rA.x);
                const crB = Vector2.new(-B.angular_velocity * c.rB.y, B.angular_velocity * c.rB.x);
                const dv = B.linear_velocity.clone().add(crB).subtract(A.linear_velocity).subtract(crA);
                c.bounce = c.bounce * dv.dot(c.normal);
            }

            do_process = true;
        }

        Vector2.free(motion_A);
        Vector2.free(motion_B);

        Vector2.free(offset_A);
        Transform2D.free(xform_Au);
        Transform2D.free(xform_A);
        Transform2D.free(xform_Bu);
        Transform2D.free(xform_B);
        return do_process;
    }
    /**
     * @param {number} p_step
     */
    solve(p_step) {
        if (!this.collided) {
            return;
        }

        const A = this._arr[0];
        const B = this._arr[1];

        for (let i = 0; i < this.contact_count; ++i) {
            const c = this.contacts[i];
            this.cc++;

            if (!c.active) {
                continue;
            }

            // relative velocity at contact

            const crA = Vector2.new(-A.angular_velocity * c.rA.y, A.angular_velocity * c.rA.x);
            const crB = Vector2.new(-B.angular_velocity * c.rB.y, B.angular_velocity * c.rB.x);
            const dv = B.linear_velocity.clone().add(crB).subtract(A.linear_velocity).subtract(crA);

            const crbA = Vector2.new(-A.biased_angular_velocity * c.rA.y, A.biased_angular_velocity * c.rA.x);
            const crbB = Vector2.new(-B.biased_angular_velocity * c.rB.y, B.biased_angular_velocity * c.rB.x);
            const dbv = B.biased_linear_velocity.clone().add(crbB).subtract(A.biased_linear_velocity).subtract(crbA);

            const vn = dv.dot(c.normal);
            const vbn = dbv.dot(c.normal);
            const tangent = c.normal.tangent();
            const vt = dv.dot(tangent);

            const jbn = (c.bias - vbn) * c.mass_normal;
            const jbnOld = c.acc_bias_impulse;
            c.acc_bias_impulse = Math.max(jbnOld + jbn, 0);

            const jb = c.normal.clone().scale(c.acc_bias_impulse - jbnOld);

            B.apply_bias_impulse(c.rB, jb);
            A.apply_bias_impulse(c.rA, jb.negate());

            const jn = -(c.bounce + vn) * c.mass_normal;
            const jnOld = c.acc_normal_impulse;
            c.acc_normal_impulse = Math.max(jnOld + jn, 0);

            const friction = combine_friction(A, B);

            const jtMax = friction * c.acc_normal_impulse;
            const jt = -vt * c.mass_tangent;
            const jtOld = c.acc_tangent_impulse;
            c.acc_tangent_impulse = clamp(jtOld + jt, -jtMax, jtMax);

            const j = c.normal.clone().scale(c.acc_normal_impulse - jnOld).add(tangent.clone().scale(c.acc_tangent_impulse - jtOld));

            B.apply_impulse(c.rB, j);
            A.apply_impulse(c.rA, j.negate());
        }
    }

    /**
     * @param {number} p_step
     * @param {Body2DSW} p_A
     * @param {number} p_shape_A
     * @param {Transform2D} p_xform_A
     * @param {Body2DSW} p_B
     * @param {number} p_shape_B
     * @param {Transform2D} p_xform_B
     * @param {boolean} p_swap_result
     */
    _test_ccd(p_step, p_A, p_shape_A, p_xform_A, p_B, p_shape_B, p_xform_B, p_swap_result = false) {
        const motion = p_A.linear_velocity.clone().scale(p_step);
        const mlen = motion.length();
        if (mlen < CMP_EPSILON) {
            return false;
        }

        const mnormal = motion.clone().scale(1 / mlen);

        let res = { min: 0, max: 0 };
        p_A.get_shape(p_shape_A).project_rangev(mnormal, p_xform_A, res);
        const fast_object = mlen > (res.max - res.min) * 0.3; // going too fast in that direction

        if (!fast_object) {
            return false;
        }

        // cast a segment from support in motion normal, in the same direction of motion
        // by motion length support is the worst case collision point, so real collision
        // happened before
        const s = [Vector2.new(), Vector2.new()];
        const a = p_A.get_shape(p_shape_A).get_supports(p_xform_A.basis_xform(mnormal).normalize(), s);
        const from = p_xform_A.xform(s[0], s[0]);
        const to = from.clone().add(motion);

        const from_inv = p_xform_B.clone().affine_inverse();

        // start from a little inside the bounding box
        const local_from = from_inv.xform(from.clone().subtract(mnormal.clone().scale(mlen * 0.1)));
        const local_to = from_inv.xform(to);

        const rpos = Vector2.new();
        const rnorm = Vector2.new();
        if (!p_B.get_shape(p_shape_B).intersect_segment(local_from, local_to, rpos, rnorm)) {
            return false;
        }

        // ray hit something

        const hitpos = p_xform_B.xform(rpos);

        const contact_A = to;
        const contact_B = hitpos;

        // create a contact

        if (p_swap_result) {
            this._contact_add_callback(contact_B, contact_A);
        } else {
            this._contact_add_callback(contact_A, contact_B);
        }

        return true;
    }
    _validate_contacts() {
        // make sure to erase contacts that are no longer valid

        const A = this._arr[0];
        const B = this._arr[1];

        const max_separation = this.space.contact_max_separation;
        const max_separation2 = max_separation * max_separation;

        for (let i = 0; i < this.contact_count; i++) {
            const c = this.contacts[i];

            let erase = false;
            if (!c.reused) {
                // was left behind in previous frame
                erase = true;
            } else {
                c.reused = false;

                const global_A = A.transform.basis_xform(c.local_A);
                const global_B = B.transform.basis_xform(c.local_B).add(this.offset_B);
                const axis = global_A.clone().subtract(global_B);
                const depth = axis.dot(c.normal);

                if (depth < -max_separation || (global_B.clone().add(c.normal.clone().scale(depth)).subtract(global_A)).length_squared() > max_separation2) {
                    erase = true;
                }
            }

            if (erase) {
                // contact no longer needed, remove

                if ((i + 1) < this.contact_count) {
                    let tmp = this.contacts[i]; this.contacts[i] = this.contacts[this.contact_count - 1]; this.contacts[this.contact_count - 1] = tmp;
                }

                i--;
                this.contact_count--;
            }
        }
    }
    /**
     * @param {Vector2} p_point_A
     * @param {Vector2} p_point_B
     */
    _contact_add_callback(p_point_A, p_point_B) {
        // check if we already have the contact

        const A = this._arr[0];
        const B = this._arr[1];

        const local_A = A.inv_transform.basis_xform(p_point_A);
        const local_B = B.inv_transform.basis_xform(p_point_B.clone().subtract(this.offset_B));

        let new_index = this.contact_count;

        const contact = new Contact();

        contact.acc_normal_impulse = 0;
        contact.acc_bias_impulse = 0;
        contact.acc_tangent_impulse = 0;
        contact.local_A.copy(local_A);
        contact.local_B.copy(local_B);
        contact.reused = true;
        contact.normal.copy(p_point_A).subtract(p_point_B).normalize();
        contact.mass_normal = 0; // will be computed in setup()

        // attempt to determine if the contact will be reused

        const recycle_radius_2 = this.space.contact_recycle_radius * this.space.contact_recycle_radius;

        for (let i = 0; i < this.contact_count; i++) {
            const c = this.contacts[i];
            if (
                c.local_A.distance_squared_to(local_A) < (recycle_radius_2)
                &&
                c.local_B.distance_squared_to(local_B) < (recycle_radius_2)
            ) {
                contact.acc_normal_impulse = c.acc_normal_impulse;
                contact.acc_tangent_impulse = c.acc_tangent_impulse;
                contact.acc_bias_impulse = c.acc_bias_impulse;
                new_index = i;
                break;
            }
        }

        // figure out if the contact amount must be reduced to fit the new contact

        if (new_index === MAX_CONTACTS) {
            // remove the contact with the minimum depth

            let least_deep = -1;
            let min_depth = 1e10;

            for (let i = 0; i <= this.contact_count; i++) {
                const c = (i === this.contact_count) ? contact : this.contacts[i];
                const global_A = A.transform.basis_xform(c.local_A);
                const global_B = B.transform.basis_xform(c.local_B).add(this.offset_B);

                const axis = global_A.clone().subtract(global_B);
                const depth = axis.dot(c.normal);

                if (depth < min_depth) {
                    min_depth = depth;
                    least_deep = i;
                }
            }

            if (least_deep < this.contact_count) {
                this.contacts[least_deep] = contact;
            }

            return;
        }

        this.contacts[new_index] = contact;

        if (new_index === this.contact_count) {
            this.contact_count++;
        }
    }
}
