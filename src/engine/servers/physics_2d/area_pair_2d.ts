import { Vector2 } from "engine/core/math/vector2";
import { Transform2D } from "engine/core/math/transform_2d";
import { BodyMode, AreaSpaceOverrideMode } from "engine/scene/2d/const";

import { CollisionSolver2DSW } from "./collision_solver_2d_sw";

import { Constraint2DSW } from "./constraint_2d_sw";
import { Area2DSW } from "./area_2d_sw";
import { Body2DSW } from "./body_2d_sw";


export class AreaPair2DSW extends Constraint2DSW {
    body: Body2DSW;
    area: Area2DSW;
    body_shape = 0;
    area_shape = 0;
    colliding = false;

    constructor(p_body: Body2DSW, p_body_shape: number, p_area: Area2DSW, p_area_shape: number) {
        super();

        this.body = p_body;
        this.area = p_area;
        this.body_shape = p_body_shape;
        this.area_shape = p_area_shape;
        this.colliding = false;
        this.body.add_constraint(this, 0);
        this.area.add_constraint(this);
        if (p_body.mode === BodyMode.KINEMATIC) {
            p_body.set_active(true);
        }
    }

    _free() {
        if (this.colliding) {
            if (this.area.space_override_mode !== AreaSpaceOverrideMode.DISABLED) {
                this.body.remove_area(this.area);
            }
            if (this.area.has_monitor_callback()) {
                this.area.remove_body_from_query(this.body, this.body_shape, this.area_shape);
            }
        }

        this.body.remove_constraint(this);
        this.area.remove_constraint(this);

        super._free();
    }

    setup(p_step: number): boolean {
        let result = false;

        if (this.body.is_shape_set_as_disabled(this.body_shape) || this.area.is_shape_set_as_disabled(this.area_shape)) {
            result = false;
        } else if (this.area.test_collision_mask(this.body)) {
            let body_shape_xform = this.body.transform.clone().append(this.body.get_shape_transform(this.body_shape));
            let area_shape_xform = this.area.transform.clone().append(this.area.get_shape_transform(this.area_shape));
            if (CollisionSolver2DSW.solve(this.body.get_shape(this.body_shape), body_shape_xform, Vector2.ZERO, this.area.get_shape(this.area_shape), area_shape_xform, Vector2.ZERO, null, this)) {
                result = true;
            }
            Transform2D.free(area_shape_xform);
            Transform2D.free(body_shape_xform);
        }

        if (result !== this.colliding) {
            if (result) {
                if (this.area.space_override_mode !== AreaSpaceOverrideMode.DISABLED) {
                    this.body.add_area(this.area);
                }
                if (this.area.has_monitor_callback()) {
                    this.area.add_body_to_query(this.body, this.body_shape, this.area_shape);
                }
            } else {
                if (this.area.space_override_mode !== AreaSpaceOverrideMode.DISABLED) {
                    this.body.remove_area(this.area);
                }
                if (this.area.has_monitor_callback()) {
                    this.area.remove_body_from_query(this.body, this.body_shape, this.area_shape);
                }
            }

            this.colliding = result;
        }

        // never do any post solving
        return false;
    }
}

export class Area2Pair2DSW extends Constraint2DSW {
    area_a: Area2DSW;
    area_b: Area2DSW;
    shape_a = 0;
    shape_b = 0;
    colliding = false;

    constructor(p_area_a: Area2DSW, p_shape_a: number, p_area_b: Area2DSW, p_shape_b: number) {
        super();

        this.area_a = p_area_a;
        this.area_b = p_area_b;
        this.shape_a = p_shape_a;
        this.shape_b = p_shape_b;
        this.colliding = false;
        this.area_a.add_constraint(this);
        this.area_b.add_constraint(this);
    }

    _free() {
        if (this.colliding) {
            if (this.area_b.has_area_monitor_callback()) {
                this.area_b.remove_area_from_query(this.area_a, this.shape_a, this.shape_b);
            }

            if (this.area_a.has_area_monitor_callback()) {
                this.area_a.remove_area_from_query(this.area_b, this.shape_b, this.shape_a);
            }
        }

        this.area_a.remove_constraint(this);
        this.area_b.remove_constraint(this);

        super._free();
    }

    setup(p_step: number): boolean {
        let result = false;
        if (this.area_a.is_shape_set_as_disabled(this.shape_a) || this.area_b.is_shape_set_as_disabled(this.shape_b)) {
            result = false;
        } else if (this.area_a.test_collision_mask(this.area_b)) {
            let a_shape_xform = this.area_a.transform.clone().append(this.area_a.get_shape_transform(this.shape_a));
            let b_shape_xform = this.area_b.transform.clone().append(this.area_b.get_shape_transform(this.shape_b));
            if (CollisionSolver2DSW.solve(this.area_a.get_shape(this.shape_a), a_shape_xform, Vector2.ZERO, this.area_b.get_shape(this.shape_b), b_shape_xform, Vector2.ZERO, null, this)) {
                result = true;
            }
            Transform2D.free(a_shape_xform);
            Transform2D.free(b_shape_xform);
        }

        if (result !== this.colliding) {
            if (result) {
                if (this.area_b.has_area_monitor_callback() && this.area_a.monitorable) {
                    this.area_b.add_area_to_query(this.area_a, this.shape_a, this.shape_b);
                }

                if (this.area_a.has_area_monitor_callback() && this.area_b.monitorable) {
                    this.area_a.add_area_to_query(this.area_b, this.shape_b, this.shape_a);
                }
            } else {
                if (this.area_b.has_area_monitor_callback() && this.area_a.monitorable) {
                    this.area_b.remove_area_from_query(this.area_a, this.shape_a, this.shape_b);
                }

                if (this.area_a.has_area_monitor_callback() && this.area_b.monitorable) {
                    this.area_a.remove_area_from_query(this.area_b, this.shape_b, this.shape_a);
                }
            }

            this.colliding = result;
        }

        // never do any post solving
        return false;
    }
}
