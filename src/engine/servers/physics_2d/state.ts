import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
import { Transform2D } from "engine/core/math/transform_2d";

import {
    INTERSECTION_QUERY_MAX,
    CollisionObject2DSW$Type,
    BodyState,
} from "engine/scene/2d/const";
import { Node2D } from "engine/scene/2d/node_2d";

type Space2DSW = import("./space_2d_sw").Space2DSW;
type Body2DSW = import("./body_2d_sw").Body2DSW;
type CollisionObject2DSW = import("./collision_object_2d_sw").CollisionObject2DSW;
type Shape2DSW = import("./shape_2d_sw").Shape2DSW;

export class MotionResult {
    motion = new Vector2;
    remainder = new Vector2;

    collision_point = new Vector2;
    collision_normal = new Vector2;
    collider_velocity = new Vector2;
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

function _can_collide_with(p_object: CollisionObject2DSW, p_collision_mask: number, p_collide_with_bodies: boolean, p_collide_with_areas: boolean) {
    if (!(p_object.collision_layer & p_collision_mask)) {
        return false;
    }

    if (p_object.type === CollisionObject2DSW$Type.AREA && !p_collide_with_areas) {
        return false;
    }
    if (p_object.type === CollisionObject2DSW$Type.BODY && !p_collide_with_bodies) {
        return false;
    }

    return true;
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

    if (!cbk.valid_dir.is_zero()) {
        if (p_point_A.distance_squared_to(p_point_B) > cbk.valid_depth * cbk.valid_depth) {
            cbk.invalid_by_dir++;
            return;
        }
        const rel_dir = p_point_A.clone().subtract(p_point_B).normalize();

        if (cbk.valid_dir.dot(rel_dir) < 0.7071) { // sqrt(2) / 2 - 45 degrees
            cbk.invalid_by_dir++;
            return;
        }
    }

    if (cbk.amount === cbk.max) {
        let min_depth = Number.MAX_VALUE;
        let min_depth_idx = 0;
        for (let i = 0; i < cbk.amount; i++) {
            const d = cbk.ptr[i * 2 + 0].distance_squared_to(cbk.ptr[i * 2 + 1]);
            if (d < min_depth) {
                min_depth = d;
                min_depth_idx = i;
            }
        }

        let d = p_point_A.distance_squared_to(p_point_B);
        if (d < min_depth) {
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
