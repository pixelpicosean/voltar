import { Shape2DSW } from "./shape_2d_sw";
import { Matrix, Vector2 } from "engine/math/index";

/**
 * @param {Shape2DSW} p_shape_A
 * @param {Matrix} p_transform_A
 * @param {Vector2} p_motion_A
 * @param {Shape2DSW} p_shape_B
 * @param {Matrix} p_transform_B
 * @param {Vector2} p_motion_B
 * @param {import("./collision_solver_2d_sw").CallbackResult} p_result_callback
 * @param {any} p_userdata
 * @param {boolean} [p_swap]
 * @param {Vector2[]} [sep_axis]
 * @param {number} [p_margin_A]
 * @param {number} [p_margin_B]
 * @returns {boolean}
 */
export function sat_2d_calculate_penetration(p_shape_A, p_transform_A, p_motion_A, p_shape_B, p_transform_B, p_motion_B, p_result_callback, p_userdata, p_swap = false, sep_axis = null, p_margin_A = 0, p_margin_B = 0) {
    return false;
}
