import { Vector2 } from "engine/core/math/vector2";
import { Transform2D } from "engine/core/math/transform_2d";
import { ShapeType } from "engine/scene/2d/const";

import { Shape2DSW } from "./shape_2d_sw";
import { sat_2d_calculate_penetration as collision_solver } from './collision_solver_2d_sat';


/**
 * @typedef {(p_point_A: Vector2, p_point_B: Vector2, p_userdata: any) => void} CallbackResult
 */

export class CollisionSolver2DSW {
    /**
     * @param {Shape2DSW} p_shape_A
     * @param {Transform2D} p_transform_A
     * @param {Vector2} p_motion_A
     * @param {Shape2DSW} p_shape_B
     * @param {Transform2D} p_transform_B
     * @param {Vector2} p_motion_B
     * @param {CallbackResult} p_result_callback
     * @param {any} p_userdata
     * @param {Vector2[]} [sep_axis]
     * @param {number} [p_margin_A]
     * @param {number} [p_margin_B]
     * @returns {boolean}
     */
    static solve(p_shape_A, p_transform_A, p_motion_A, p_shape_B, p_transform_B, p_motion_B, p_result_callback, p_userdata, sep_axis = null, p_margin_A = 0, p_margin_B = 0) {
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
                return solve_static_line(p_shape_B, p_transform_B, p_shape_A, p_transform_A, p_result_callback, p_userdata, true);
            } else {
                return solve_static_line(p_shape_A, p_transform_A, p_shape_B, p_transform_B, p_result_callback, p_userdata, false);
            }
        } else if (type_A === ShapeType.RAY) {
            if (type_B === ShapeType.RAY) {
                return false;
            }

            if (!swap) {
                return solve_raycast(p_shape_B, p_motion_B, p_transform_B, p_shape_A, p_transform_A, p_result_callback, p_userdata, true, sep_axis);
            } else {
                return solve_raycast(p_shape_A, p_motion_A, p_transform_A, p_shape_B, p_transform_B, p_result_callback, p_userdata, false, sep_axis);
            }
        } else {
            return collision_solver(p_shape_A, p_transform_A, p_motion_A, p_shape_B, p_transform_B, p_motion_B, p_result_callback, p_userdata, false, sep_axis, margin_A, margin_B);
        }

        return false;
    }
}

/**
 * @param {Shape2DSW} p_shape_A
 * @param {Transform2D} p_transform_A
 * @param {Shape2DSW} p_shape_B
 * @param {Transform2D} p_transform_B
 * @param {CallbackResult} p_result_callback
 * @param {any} p_userdata
 * @returns {boolean}
 */
function solve_static_line(p_shape_A, p_transform_A, p_shape_B, p_transform_B, p_result_callback, p_userdata, p_swap_result) {
    // TODO: real "solve_static_line"
    return false;
}

function concave_callback() { }

function solve_concave() { }

/**
 * @param {Shape2DSW} p_shape_A
 * @param {Vector2} p_motion_A
 * @param {Transform2D} p_transform_A
 * @param {Shape2DSW} p_shape_B
 * @param {Transform2D} p_transform_B
 * @param {CallbackResult} p_result_callback
 * @param {any} p_userdata
 * @param {Vector2[]} [sep_axis]
 * @returns {boolean}
 */
function solve_raycast(p_shape_A, p_motion_A, p_transform_A, p_shape_B, p_transform_B, p_result_callback, p_userdata, p_swap_result, sep_axis = null) {
    // TODO: real "solve_raycast"
    return false;
}
