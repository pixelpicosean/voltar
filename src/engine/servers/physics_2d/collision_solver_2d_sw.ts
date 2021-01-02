import { Vector2 } from "engine/core/math/vector2";
import { Transform2D } from "engine/core/math/transform_2d";
import { ShapeType } from "engine/scene/2d/const";

import { Shape2DSW } from "./shape_2d_sw";
import { sat_2d_calculate_penetration as collision_solver } from './collision_solver_2d_sat';


export type CallbackResult = (p_point_A: Vector2, p_point_B: Vector2, p_userdata: any) => void;

export class CollisionSolver2DSW {
    static solve(p_shape_A: Shape2DSW, p_transform_A: Transform2D, p_motion_A: Vector2, p_shape_B: Shape2DSW, p_transform_B: Transform2D, p_motion_B: Vector2, p_result_callback: CallbackResult, p_userdata: any, sep_axis: Vector2[] = null, p_margin_A: number = 0, p_margin_B: number = 0): boolean {
        let type_A = p_shape_A.type;
        let type_B = p_shape_B.type;
        let margin_A = p_margin_A, margin_B = p_margin_B;

        let swap = false;

        if (type_A > type_B) {
            let tmp;
            tmp = type_B; type_B = type_A; type_A = tmp;
            tmp = margin_B; margin_B = margin_A; margin_A = tmp;
            swap = true;
        }

        if (type_A === ShapeType.LINE) {
            if (type_B === ShapeType.LINE || type_B === ShapeType.RAY) {
                return false;
            }

            if (!swap) {
                return CollisionSolver2DSW.solve_static_line(p_shape_B, p_transform_B, p_shape_A, p_transform_A, p_result_callback, p_userdata, true);
            } else {
                return CollisionSolver2DSW.solve_static_line(p_shape_A, p_transform_A, p_shape_B, p_transform_B, p_result_callback, p_userdata, false);
            }
        } else if (type_A === ShapeType.RAY) {
            if (type_B === ShapeType.RAY) {
                return false;
            }

            if (!swap) {
                return CollisionSolver2DSW.solve_raycast(p_shape_B, p_motion_B, p_transform_B, p_shape_A, p_transform_A, p_result_callback, p_userdata, true, sep_axis);
            } else {
                return CollisionSolver2DSW.solve_raycast(p_shape_A, p_motion_A, p_transform_A, p_shape_B, p_transform_B, p_result_callback, p_userdata, false, sep_axis);
            }
        } else {
            return collision_solver(p_shape_A, p_transform_A, p_motion_A, p_shape_B, p_transform_B, p_motion_B, p_result_callback, p_userdata, false, sep_axis, margin_A, margin_B);
        }

        return false;
    }

    static solve_static_line(p_shape_A: Shape2DSW, p_transform_A: Transform2D, p_shape_B: Shape2DSW, p_transform_B: Transform2D, p_result_callback: CallbackResult, p_userdata: any, p_swap_result: boolean): boolean {
        // @Incomplete
        return false;
    }

    static solve_raycast(p_shape_A: Shape2DSW, p_motion_A: Vector2, p_transform_A: Transform2D, p_shape_B: Shape2DSW, p_transform_B: Transform2D, p_result_callback: CallbackResult, p_userdata: any, p_swap_result: boolean, sep_axis: Vector2[] = null): boolean {
        // @Incomplete
        return false;
    }
}
