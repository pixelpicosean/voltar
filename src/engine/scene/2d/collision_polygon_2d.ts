import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { decompose_in_convex } from "engine/core/math/convex";
import { is_polygon_clockwise } from "engine/core/math/geometry";
import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";

import {
    NOTIFICATION_PARENTED,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_UNPARENTED,
} from "../main/node";
import { ConvexPolygonShape2D } from "../resources/convex_polygon_shape_2d";
import { Node2D } from "./node_2d";

function num_arr_2_vec2_arr(arr: number[]) {
    const res: Vector2[] = Array(Math.floor(arr.length / 2));
    for (let i = 0, len = res.length; i < len; i++) {
        res[i] = new Vector2(arr[i * 2 + 0], arr[i * 2 + 1]);
    }
    return res;
}

export enum BuildMode {
    SOLIDS,
    SEGMENTS,
}

export class CollisionPolygon2D extends Node2D {
    get class() { return 'CollisionPolygon2D' }

    disabled = false;
    one_way_collision = false;
    one_way_collision_margin = 1.0;
    parent: import('./collision_object_2d').CollisionObject2D = null;
    aabb = new Rect2(-10, -10, 20, 20);
    build_mode = BuildMode.SOLIDS;
    polygon: Vector2[] = [];

    shape_owner: Node2D = null;

    /* virtual */

    _load_data(p_data: any) {
        super._load_data(p_data);

        if (p_data.polygon !== undefined) {
            this.set_polygon(num_arr_2_vec2_arr(p_data.polygon));
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_PARENTED: {
                this.parent = this.get_parent() as import('./collision_object_2d').CollisionObject2D;
                if (this.parent.is_collision_object) {
                    this.shape_owner = this.parent.create_shape_owner(this);
                    this._build_polygon();
                    this._update_in_shape_owner();
                }
            } break;
            case NOTIFICATION_ENTER_TREE: {
                if (this.parent) {
                    this._update_in_shape_owner();
                }
            } break;
            case NOTIFICATION_UNPARENTED: {
                if (this.parent) {
                    this.parent.remove_shape_owner(this.shape_owner);
                }
                this.shape_owner = null;
                this.parent = null;
            } break;
        }
    }

    /* public */

    /**
     * @param {boolean} p_disabled
     */
    set_disabled(p_disabled: boolean) {
        this.disabled = p_disabled;
        if (this.parent) {
            this.parent.shape_owner_set_disabled(this.shape_owner, p_disabled);
        }
    }

    /**
     * @param {boolean} p_one_way_collision
     */
    set_one_way_collision(p_one_way_collision: boolean) {
        this.one_way_collision = p_one_way_collision;
        if (this.parent) {
            this.parent.shape_owner_set_one_way_collision(this.shape_owner, p_one_way_collision);
        }
    }

    /**
     * @param {number} p_one_way_collision_margin
     */
    set_one_way_collision_margin(p_one_way_collision_margin: number) {
        this.one_way_collision_margin = p_one_way_collision_margin;
        if (this.parent) {
            this.parent.shape_owner_set_one_way_collision_margin(this.shape_owner, p_one_way_collision_margin);
        }
    }

    /**
     * @param {Vector2[]} p_polygon
     */
    set_polygon(p_polygon: Vector2[]) {
        this.polygon = p_polygon;

        {
            for (let i = 0; i < p_polygon.length; i++) {
                if (i === 0) {
                    this.aabb.set(p_polygon[i].x, p_polygon[i].y, 0, 0);
                } else {
                    this.aabb.expand_to(p_polygon[i]);
                }
            }
            if (this.aabb.is_zero()) {
                this.aabb.set(-10, -10, 20, 20);
            } else {
                this.aabb.x -= this.aabb.width * 0.3;
                this.aabb.y -= this.aabb.height * 0.3;
                this.aabb.width += this.aabb.width * 0.6;
                this.aabb.height += this.aabb.height * 0.6;
            }
        }

        if (is_polygon_clockwise(this.polygon)) {
            this.polygon.reverse();
        }

        if (this.parent) {
            this._build_polygon();
        }
    }

    /**
     * @param {BuildMode} p_build_mode
     */
    set_build_mode(p_build_mode: BuildMode) {
        this.build_mode = p_build_mode;
        if (this.parent) {
            this._build_polygon();
        }
    }

    /* private */

    /**
     * @param {boolean} [p_xform_only]
     */
    _update_in_shape_owner(p_xform_only: boolean = false) {
        this.parent.shape_owner_set_transform(this, this.get_transform());
        if (p_xform_only) {
            return;
        }
        this.parent.shape_owner_set_disabled(this, this.disabled);
        this.parent.shape_owner_set_one_way_collision(this, this.one_way_collision);
        this.parent.shape_owner_set_one_way_collision_margin(this, this.one_way_collision_margin);
    }

    _build_polygon() {
        this.parent.shape_owner_clear_shapes(this);

        if (this.polygon.length === 0) {
            return;
        }

        const solids = (this.build_mode === BuildMode.SOLIDS);

        if (solids) {
            // decompose concave into multiple convex polygons and add them
            const decomp = this._decompose_in_convex();
            for (let i = 0; i < decomp.length; i++) {
                const convex = new ConvexPolygonShape2D();
                convex.set_points(decomp[i]);
                this.parent.shape_owner_add_shape(this, convex);
            }
        } else {
            // TODO: segment support
        }
    }

    _decompose_in_convex() {
        return decompose_in_convex(this.polygon).map(arr => arr.reverse());
    }
}
node_class_map['CollisionPolygon2D'] = GDCLASS(CollisionPolygon2D, Node2D)
