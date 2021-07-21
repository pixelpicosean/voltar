import { Vector2 } from "engine/core/math/vector2";

import {
    CollisionObject2DSW$Type,
} from "engine/scene/2d/const";
import { Node2D } from "engine/scene/2d/node_2d";
import { CMP_EPSILON } from "engine/core/math/math_defs";

type CollisionObject2DSW = import("./collision_object_2d_sw").CollisionObject2DSW;

export class MotionResult {
    motion = new Vector2;
    remainder = new Vector2;

    collision_point = new Vector2;
    collision_normal = new Vector2;
    collider_velocity = new Vector2;
    collision_depth = 0;
    collision_safe_fraction = 0;
    collision_unsafe_fraction = 0;
    collision_local_shape = 0;
    collider_id: Node2D = null;
    collider: CollisionObject2DSW = null;
    collider_shape = 0;
    collider_metadata: any = null;

    reset() {
        this.motion.set(0, 0);
        this.remainder.set(0, 0);

        this.collision_point.set(0, 0);
        this.collision_normal.set(0, 0);
        this.collider_velocity.set(0, 0);
        this.collision_depth = 0;
        this.collision_safe_fraction = 0;
        this.collision_unsafe_fraction = 0;
        this.collision_local_shape = 0;
        this.collider_id = null;
        this.collider = null;
        this.collider_shape = 0;
        this.collider_metadata = null;
        return this;
    }
}

export class CollCbkData {
    valid_dir = new Vector2;
    valid_depth = 0;
    max = 0;
    amount = 0;
    passed = 0;
    invalid_by_dir = 0;
    ptr: Vector2[] = null;

    reset() {
        this.valid_dir.set(0, 0);
        this.valid_depth = 0;
        this.max = 0;
        this.amount = 0;
        this.passed = 0;
        this.invalid_by_dir = 0;
        this.ptr = null;
        return this;
    }
}

export class SeparationResult {
    collision_depth = 0;
    collision_point = new Vector2;
    collision_normal = new Vector2;
    collider_velocity = new Vector2;
    collision_local_shape = 0;
    collider_id: Node2D = null;
    collider: CollisionObject2DSW = null;
    collider_shape = 0;
    collider_metadata: any = null;

    reset() {
        this.collision_depth = 0;
        this.collision_point.set(0, 0);
        this.collision_normal.set(0, 0);
        this.collider_velocity.set(0, 0);
        this.collision_local_shape = 0;
        this.collider_id = null;
        this.collider = null;
        this.collider_shape = 0;
        this.collider_metadata = null;
        return this;
    }
}

export class ShapeResult {
    rid: CollisionObject2DSW = null;
    collider: Node2D = null;
    shape = 0;
    metadata: any = null;
}

export function _shape_col_cbk(p_point_A: Vector2, p_point_B: Vector2, p_userdata: CollCbkData) {
    const cbk = p_userdata;

    if (cbk.max === 0) {
        return;
    }

    const rel_dir = _i_shape_col_cbk_Vector2_1.copy(p_point_A).subtract(p_point_B);
    const rel_dir_n = _i_shape_col_cbk_Vector2_2.copy(rel_dir).normalize();
    const rel_length2 = rel_dir.length_squared();

    if (!cbk.valid_dir.is_zero()) {
        if (cbk.valid_depth < 10e20) {
            if (
                rel_length2 > cbk.valid_depth * cbk.valid_depth
                ||
                (rel_length2 > CMP_EPSILON && cbk.valid_dir.dot(rel_dir_n) < CMP_EPSILON)
            ) {
                cbk.invalid_by_dir++;
                return;
            }
        } else {
            if (rel_length2 > 0 && cbk.valid_dir.dot(rel_dir_n) < CMP_EPSILON) {
                return;
            }
        }
    }

    if (cbk.amount === cbk.max) {
        let min_depth = 1e20;
        let min_depth_idx = 0;
        for (let i = 0; i < cbk.amount; i++) {
            const d = cbk.ptr[i * 2 + 0].distance_squared_to(cbk.ptr[i * 2 + 1]);
            if (d < min_depth) {
                min_depth = d;
                min_depth_idx = i;
            }
        }

        if (rel_length2 < min_depth) {
            return;
        }
        cbk.ptr[min_depth_idx * 2 + 0].copy(p_point_A);
        cbk.ptr[min_depth_idx * 2 + 1].copy(p_point_B);
        cbk.passed++;
    } else {
        cbk.ptr[cbk.amount * 2 + 0].copy(p_point_A);
        cbk.ptr[cbk.amount * 2 + 1].copy(p_point_B);
        cbk.amount++;
        cbk.passed++;
    }
}

const _i_shape_col_cbk_Vector2_1 = new Vector2;
const _i_shape_col_cbk_Vector2_2 = new Vector2;
