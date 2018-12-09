import Constraint2DSW from "./constraint_2d_sw";
import Area2DSW from "./area_2d_sw";
import CollisionSolver2DSW from "./collision_solver_2d_sw";
import { Vector2, Matrix } from "engine/math/index";

export class Area2Pair2DSW extends Constraint2DSW {
    /**
     * @param {Area2DSW} p_area_a
     * @param {number} p_shape_a
     * @param {Area2DSW} p_area_b
     * @param {number} p_shape_b
     */
    constructor(p_area_a, p_shape_a, p_area_b, p_shape_b) {
        super();

        this.area_a = p_area_a;
        this.area_b = p_area_b;
        this.shape_a = p_shape_a;
        this.shape_b = p_shape_b;
        this.colliding = false;
        this.area_a.add_constraint(this);
        this.area_b.add_constraint(this);
    }
    free() {
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
    }
    /**
     * @param {number} p_step
     */
    setup(p_step) {
        let result = false;
        if (this.area_a.is_shape_set_as_disabled(this.shape_a) || this.area_b.is_shape_set_as_disabled(this.shape_b)) {
            result = false;
        } else if (this.area_a.test_collision_mask(this.area_b)) {
            const xform_a = this.area_a.transform.clone().append(this.area_a.get_shape_transform(this.shape_a));
            const xform_b = this.area_b.transform.clone().append(this.area_b.get_shape_transform(this.shape_b));

            if (CollisionSolver2DSW.solve(this.area_a.get_shape(this.shape_a), xform_a, Vector2.Zero, this.area_b.get_shape(this.shape_b), xform_b, Vector2.Zero, null, this)) {
                result = true;
            }

            Matrix.delete(xform_a);
            Matrix.delete(xform_b);
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
    /**
     * @param {number} p_step
     */
    solve(p_step) { }
}