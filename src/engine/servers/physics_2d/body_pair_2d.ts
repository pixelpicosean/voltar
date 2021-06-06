import { clamp } from "engine/core/math/math_funcs";
import { CMP_EPSILON } from "engine/core/math/math_defs";
import { Vector2 } from "engine/core/math/vector2";
import { Transform2D } from "engine/core/math/transform_2d";

import { BodyMode, CCDMode } from "engine/scene/2d/const";

import { CollisionSolver2DSW } from "./collision_solver_2d_sw";

import { Body2DSW } from "./body_2d_sw";
import { Space2DSW } from "./space_2d_sw";
import { Constraint2DSW } from "./constraint_2d_sw";


const vec_arr_2: [Vector2, Vector2] = [new Vector2, new Vector2];
function get_vec_arr_2(): [Vector2, Vector2] {
    vec_arr_2[0].set(0, 0);
    vec_arr_2[1].set(0, 0);
    return vec_arr_2;
}

const MAX_CONTACTS = 2;

class Contact {
    position = new Vector2;
    normal = new Vector2;
    local_A = new Vector2;
    local_B = new Vector2;
    acc_normal_impulse = 0;
    acc_tangent_impulse = 0;
    acc_bias_impulse = 0;
    mass_normal = 0;
    mass_tangent = 0;
    bias = 0;

    depth = 0;
    active = false;
    rA = new Vector2;
    rB = new Vector2;
    reused = false;
    bounce = 0;
}

function _add_contact(p_point_A: Vector2, p_point_B: Vector2, p_self: BodyPair2DSW) {
    p_self._contact_added_callback(p_point_A, p_point_B);
}

function combine_bounce(A: Body2DSW, B: Body2DSW) {
    return clamp(A.bounce + B.bounce, 0, 1);
}

function combine_friction(A: Body2DSW, B: Body2DSW) {
    return Math.abs(Math.min(A.friction, B.friction));
}

export class BodyPair2DSW extends Constraint2DSW {
    get A() { return this._arr[0] }
    get B() { return this._arr[1] }

    _arr: [Body2DSW, Body2DSW] = [null, null];

    shape_A: number;
    shape_B: number;

    space: Space2DSW;

    offset_B = new Vector2;

    sep_axis = new Vector2;
    contacts: Contact[] = Array(MAX_CONTACTS);
    contact_count = 0;
    collided = false;
    oneway_disabled = false;
    cc = 0;

    constructor(p_A: Body2DSW, p_shape_A: number, p_B: Body2DSW, p_shape_B: number) {
        super([p_A, p_B], 2);

        this._arr[0] = p_A;
        this._arr[1] = p_B;

        this.shape_A = p_shape_A;
        this.shape_B = p_shape_B;

        this.space = p_A.space;

        p_A.add_constraint(this, 0);
        p_B.add_constraint(this, 1);

        for (let i = 0; i < MAX_CONTACTS; i++) this.contacts[i] = new Contact;
    }

    _free() {
        this._arr[0].remove_constraint(this);
        this._arr[1].remove_constraint(this);

        this._arr[0] = this._arr[1] = null;

        super._free();
    }

    setup(p_step: number) {
        let A = this._arr[0];
        let B = this._arr[1];

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
        let origin_A = A.transform.get_origin();
        let origin_B = B.transform.get_origin();
        this.offset_B.copy(origin_B).subtract(origin_A);
        Vector2.free(origin_B);
        Vector2.free(origin_A);

        this._validate_contacts();

        let offset_A = A.transform.get_origin();
        let xform_Au = A.transform.untranslated();
        let xform_A = xform_Au.clone().append(A.get_shape_transform(this.shape_A));

        let xform_Bu = B.transform.clone();
        origin_A = A.transform.get_origin();
        xform_Bu.tx -= origin_A.x;
        xform_Bu.ty -= origin_A.y;
        Vector2.free(origin_A);
        let xform_B = xform_Bu.clone().append(B.get_shape_transform(this.shape_B));

        let shape_A_ptr = A.get_shape(this.shape_A);
        let shape_B_ptr = B.get_shape(this.shape_B);

        let motion_A: Vector2 = null;
        let motion_B: Vector2 = null;

        if (A.continuous_cd_mode === CCDMode.CAST_SHAPE) {
            motion_A = A.get_motion();
        }
        if (B.continuous_cd_mode === CCDMode.CAST_SHAPE) {
            motion_B = B.get_motion();
        }
        if (!motion_A) motion_A = Vector2.new();
        if (!motion_B) motion_B = Vector2.new();

        let prev_collided = this.collided;

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

                Vector2.free(motion_B);
                Vector2.free(motion_A);
                Transform2D.free(xform_B);
                Transform2D.free(xform_Bu);
                Transform2D.free(xform_A);
                Transform2D.free(xform_Au);
                Vector2.free(offset_A);
                return false;
            }
        }

        if (this.oneway_disabled) {
            Vector2.free(motion_B);
            Vector2.free(motion_A);
            Transform2D.free(xform_B);
            Transform2D.free(xform_Bu);
            Transform2D.free(xform_A);
            Transform2D.free(xform_Au);
            Vector2.free(offset_A);
            return false;
        }

        if (!prev_collided) {
            if (A.is_shape_one_way_collision(this.shape_A)) {
                let direction = xform_A.get_axis(1).normalize();
                let valid = false;
                if (B.linear_velocity.dot(direction) >= 0) {
                    for (let i = 0; i < this.contact_count; i++) {
                        let c = this.contacts[i];
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

                    Vector2.free(motion_B);
                    Vector2.free(motion_A);
                    Transform2D.free(xform_B);
                    Transform2D.free(xform_Bu);
                    Transform2D.free(xform_A);
                    Transform2D.free(xform_Au);
                    Vector2.free(offset_A);
                    return false;
                }

                Vector2.free(direction);
            }

            if (B.is_shape_one_way_collision(this.shape_B)) {
                let direction = xform_B.get_axis(1).normalize();
                let valid = false;
                if (A.linear_velocity.dot(direction) >= 0) {
                    for (let i = 0; i < this.contact_count; i++) {
                        let c = this.contacts[i];
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

                    Vector2.free(motion_B);
                    Vector2.free(motion_A);
                    Transform2D.free(xform_B);
                    Transform2D.free(xform_Bu);
                    Transform2D.free(xform_A);
                    Transform2D.free(xform_Au);
                    Vector2.free(offset_A);
                    return false;
                }

                Vector2.free(direction);
            }
        }

        let max_peneration = this.space.contact_max_allowed_penetration;

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

        let inv_dt = 1 / p_step;

        let do_process = false;

        let global_A = Vector2.new();
        let global_B = Vector2.new();
        let a_minus_b = Vector2.new();
        for (let i = 0; i < this.contact_count; i++) {
            let c = this.contacts[i];

            xform_Au.xform(c.local_A, global_A);
            xform_Bu.xform(c.local_B, global_B);

            a_minus_b.copy(global_A).subtract(global_B);
            let depth = c.normal.dot(a_minus_b);

            if (depth <= 0 || !c.reused) {
                c.active = false;
                continue;
            }

            c.active = true;

            let gather_A = A.can_report_contacts();
            let gather_B = B.can_report_contacts();

            c.rA.copy(global_A);
            c.rB.copy(global_B).subtract(this.offset_B);

            if (gather_A || gather_B) {
                global_A.add(offset_A);
                global_B.add(offset_A);

                if (gather_A) {
                    let crB = Vector2.new(-B.angular_velocity * c.rB.y, B.angular_velocity * c.rB.x);
                    let nn = c.normal.clone().negate();
                    A.add_contact(global_A, nn, depth, this.shape_A, global_B, this.shape_B, B.instance, B.self, crB.add(B.linear_velocity));
                    Vector2.free(nn);
                    Vector2.free(crB);
                }
                if (gather_B) {
                    let crA = Vector2.new(-A.angular_velocity * c.rA.y, A.angular_velocity * c.rA.x);
                    A.add_contact(global_B, c.normal, depth, this.shape_B, global_A, this.shape_A, A.instance, A.self, crA.add(A.linear_velocity));
                    Vector2.free(crA);
                }
            }

            if (A.mode <= BodyMode.KINEMATIC && B.mode <= BodyMode.KINEMATIC) {
                c.active = false;
                this.collided = false;
                continue;
            }

            // precompute normal mass, tangent mass and bias.
            let rnA = c.rA.dot(c.normal);
            let rnB = c.rB.dot(c.normal);
            let kNormal = A._inv_mass + B._inv_mass;
            kNormal += A._inv_inertia * (c.rA.dot(c.rA) - rnA * rnA) + B._inv_inertia * (c.rB.dot(c.rB) - rnB * rnB);
            c.mass_normal = 1 / kNormal;

            let tangent = c.normal.tangent();
            let rtA = c.rA.dot(tangent);
            let rtB = c.rB.dot(tangent);
            let kTangent = A._inv_mass + B._inv_mass;
            kTangent += A._inv_inertia * (c.rA.dot(c.rA) - rtA * rtA) + B._inv_inertia * (c.rB.dot(c.rB) - rtB * rtB);
            c.mass_tangent = 1 / kTangent;

            c.bias = -bias * inv_dt * Math.min(0, -depth + max_peneration);
            c.depth = depth;

            {
                // apply normal + friction impulse
                let scaled_tangent = tangent.clone().scale(c.acc_tangent_impulse);
                let P = c.normal.clone().scale(c.acc_normal_impulse).add(scaled_tangent);

                B.apply_impulse(c.rB, P);
                A.apply_impulse(c.rA, P.negate());

                Vector2.free(P);
                Vector2.free(scaled_tangent);
            }

            c.bounce = combine_bounce(A, B);
            if (c.bounce) {
                let crA = Vector2.new(-A.angular_velocity * c.rA.y, A.angular_velocity * c.rA.x);
                let crB = Vector2.new(-B.angular_velocity * c.rB.y, B.angular_velocity * c.rB.x);
                let dv = B.linear_velocity.clone().add(crB).subtract(A.linear_velocity).subtract(crA);
                c.bounce = c.bounce * dv.dot(c.normal);
                Vector2.free(dv);
                Vector2.free(crA);
                Vector2.free(crB);
            }

            do_process = true;

            Vector2.free(tangent);
        }
        Vector2.free(a_minus_b);
        Vector2.free(global_B);
        Vector2.free(global_A);

        Vector2.free(motion_B);
        Vector2.free(motion_A);
        Transform2D.free(xform_B);
        Transform2D.free(xform_Bu);
        Transform2D.free(xform_A);
        Transform2D.free(xform_Au);
        Vector2.free(offset_A);

        return do_process;
    }

    solve(p_step: number) {
        if (!this.collided) {
            return;
        }

        let A = this._arr[0];
        let B = this._arr[1];

        for (let i = 0; i < this.contact_count; ++i) {
            let c = this.contacts[i];
            this.cc++;

            if (!c.active) {
                continue;
            }

            // relative velocity at contact

            let crA = Vector2.new(-A.angular_velocity * c.rA.y, A.angular_velocity * c.rA.x);
            let crB = Vector2.new(-B.angular_velocity * c.rB.y, B.angular_velocity * c.rB.x);
            let dv = B.linear_velocity.clone().add(crB).subtract(A.linear_velocity).subtract(crA);

            let crbA = Vector2.new(-A.biased_angular_velocity * c.rA.y, A.biased_angular_velocity * c.rA.x);
            let crbB = Vector2.new(-B.biased_angular_velocity * c.rB.y, B.biased_angular_velocity * c.rB.x);
            let dbv = B.biased_linear_velocity.clone().add(crbB).subtract(A.biased_linear_velocity).subtract(crbA);

            let vn = dv.dot(c.normal);
            let vbn = dbv.dot(c.normal);
            let tangent = c.normal.tangent();
            let vt = dv.dot(tangent);

            let jbn = (c.bias - vbn) * c.mass_normal;
            let jbnOld = c.acc_bias_impulse;
            c.acc_bias_impulse = Math.max(jbnOld + jbn, 0);

            let jb = c.normal.clone().scale(c.acc_bias_impulse - jbnOld);

            B.apply_bias_impulse(c.rB, jb);
            A.apply_bias_impulse(c.rA, jb.negate());

            let jn = -(c.bounce + vn) * c.mass_normal;
            let jnOld = c.acc_normal_impulse;
            c.acc_normal_impulse = Math.max(jnOld + jn, 0);

            let friction = combine_friction(A, B);

            let jtMax = friction * c.acc_normal_impulse;
            let jt = -vt * c.mass_tangent;
            let jtOld = c.acc_tangent_impulse;
            c.acc_tangent_impulse = clamp(jtOld + jt, -jtMax, jtMax);

            let j = c.normal.clone().scale(c.acc_normal_impulse - jnOld).add(tangent.scale(c.acc_tangent_impulse - jtOld));

            B.apply_impulse(c.rB, j);
            A.apply_impulse(c.rA, j.negate());

            Vector2.free(j);
            Vector2.free(jb);
            Vector2.free(tangent);
            Vector2.free(dbv);
            Vector2.free(crbB);
            Vector2.free(crbA);
            Vector2.free(dv);
            Vector2.free(crB);
            Vector2.free(crA);
        }
    }

    _test_ccd(p_step: number, p_A: Body2DSW, p_shape_A: number, p_xform_A: Transform2D, p_B: Body2DSW, p_shape_B: number, p_xform_B: Transform2D, p_swap_result: boolean = false) {
        let motion = p_A.linear_velocity.clone().scale(p_step);
        let mlen = motion.length();
        if (mlen < CMP_EPSILON) {
            Vector2.free(motion);
            return false;
        }

        let mnormal = motion.clone().scale(1 / mlen);

        let res = { min: 0, max: 0 };
        p_A.get_shape(p_shape_A).project_rangev(mnormal, p_xform_A, res);
        let fast_object = mlen > (res.max - res.min) * 0.3; // going too fast in that direction

        if (!fast_object) {
            Vector2.free(mnormal);
            Vector2.free(motion);
            return false;
        }

        // cast a segment from support in motion normal, in the same direction of motion
        // by motion length support is the worst case collision point, so real collision
        // happened before
        let s = get_vec_arr_2();
        let xformed_mnormal = Vector2.new();
        p_A.get_shape(p_shape_A).get_supports(p_xform_A.basis_xform(mnormal, xformed_mnormal).normalize(), s, 0);
        let from = p_xform_A.xform(s[0], s[0]);
        let to = from.clone().add(motion);

        let from_inv = p_xform_B.clone().affine_inverse();

        // start from a little inside the bounding box
        let local_from = from.clone().subtract(mnormal.clone().scale(mlen * 0.1));
        from_inv.xform(local_from, local_from);
        let local_to = from_inv.xform(to);

        let rpos = Vector2.new();
        let rnorm = Vector2.new();
        if (!p_B.get_shape(p_shape_B).intersect_segment(local_from, local_to, rpos, rnorm)) {
            Vector2.free(rnorm);
            Vector2.free(rpos);
            Vector2.free(local_to);
            Vector2.free(local_from);
            Transform2D.free(from_inv);
            Vector2.free(to);
            Vector2.free(xformed_mnormal);
            Vector2.free(mnormal);
            Vector2.free(motion);
            return false;
        }

        // ray hit something

        let hitpos = p_xform_B.xform(rpos);

        let contact_A = to;
        let contact_B = hitpos;

        // create a contact

        if (p_swap_result) {
            this._contact_added_callback(contact_B, contact_A);
        } else {
            this._contact_added_callback(contact_A, contact_B);
        }

        Vector2.free(hitpos);
        Vector2.free(rnorm);
        Vector2.free(rpos);
        Vector2.free(local_to);
        Vector2.free(local_from);
        Transform2D.free(from_inv);
        Vector2.free(to);
        Vector2.free(xformed_mnormal);
        Vector2.free(mnormal);
        Vector2.free(motion);
        return true;
    }

    _validate_contacts() {
        // make sure to erase contacts that are no longer valid

        let A = this._arr[0];
        let B = this._arr[1];

        let max_separation = this.space.contact_max_separation;
        let max_separation2 = max_separation * max_separation;

        let global_A = Vector2.new();
        let global_B = Vector2.new();
        let axis = Vector2.new();
        let diff = Vector2.new();
        for (let i = 0; i < this.contact_count; i++) {
            let c = this.contacts[i];

            let erase = false;
            if (!c.reused) {
                // was left behind in previous frame
                erase = true;
            } else {
                c.reused = false;

                A.transform.basis_xform(c.local_A, global_A);
                B.transform.basis_xform(c.local_B, global_B).add(this.offset_B);
                axis.copy(global_A).subtract(global_B);
                let depth = axis.dot(c.normal);

                diff.copy(c.normal).scale(depth).add(global_B).subtract(global_A);
                if (depth < -max_separation || diff.length_squared() > max_separation2) {
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
        Vector2.free(diff);
        Vector2.free(axis);
        Vector2.free(global_B);
        Vector2.free(global_A);
    }

    _contact_added_callback(p_point_A: Vector2, p_point_B: Vector2) {
        // check if we already have the contact

        let A = this._arr[0];
        let B = this._arr[1];

        let local_A = A.inv_transform.basis_xform(p_point_A);
        let b_minus_offset = p_point_B.clone().subtract(this.offset_B);
        let local_B = B.inv_transform.basis_xform(b_minus_offset);
        Vector2.free(b_minus_offset);

        let new_index = this.contact_count;

        let contact = new Contact;

        contact.acc_normal_impulse = 0;
        contact.acc_bias_impulse = 0;
        contact.acc_tangent_impulse = 0;
        contact.local_A.copy(local_A);
        contact.local_B.copy(local_B);
        contact.reused = true;
        contact.normal.copy(p_point_A).subtract(p_point_B).normalize();
        contact.mass_normal = 0; // will be computed in setup()

        // attempt to determine if the contact will be reused

        let recycle_radius_2 = this.space.contact_recycle_radius * this.space.contact_recycle_radius;

        for (let i = 0; i < this.contact_count; i++) {
            let c = this.contacts[i];
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

            let global_A = Vector2.new();
            let global_B = Vector2.new();
            let axis = Vector2.new();
            for (let i = 0; i <= this.contact_count; i++) {
                let c = (i === this.contact_count) ? contact : this.contacts[i];
                A.transform.basis_xform(c.local_A, global_A);
                B.transform.basis_xform(c.local_B, global_B).add(this.offset_B);

                axis.copy(global_A).subtract(global_B);
                let depth = axis.dot(c.normal);

                if (depth < min_depth) {
                    min_depth = depth;
                    least_deep = i;
                }
            }
            Vector2.free(axis);
            Vector2.free(global_B);
            Vector2.free(global_A);

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
