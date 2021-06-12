import { res_class_map } from "engine/registry";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
import {
    is_polygon_clockwise,
    convex_hull_2d,
} from "engine/core/math/geometry";

import { Physics2DServer } from "engine/servers/physics_2d";

import { Shape2D } from "./shape_2d";


export class ConvexPolygonShape2D extends Shape2D {
    points: Vector2[] = [];

    constructor() {
        super(Physics2DServer.get_singleton().convex_polygon_shape_create());

        let pcount = 3;
        for (let i = pcount - 1; i >= 0; i--) {
            this.points.push(Vector2.new(Math.sin(i * Math.PI * 2 / pcount), -Math.cos(i * Math.PI * 2 / pcount)).scale(10));
        }

        this._update_shape();
    }

    _load_data(data: any) {
        if (data.points) this.set_points_in_pool_vec2(data.points);
        return this;
    }

    /* public */

    set_points(p_points: Vector2Like[]) {
        const self_len = this.points.length;
        const new_len = p_points.length;
        if (self_len > new_len) {
            for (let i = 0; i < self_len - new_len; i++) {
                Vector2.free(this.points.pop());
            }
        } else if (self_len < new_len) {
            for (let i = 0; i < new_len - self_len; i++) {
                this.points.push(Vector2.new());
            }
        }
        for (let i = 0; i < new_len; i++) {
            this.points[i].copy(p_points[i]);
        }
        this._update_shape();
    }

    get_rect(p_rect: Rect2 = Rect2.new()): Rect2 {
        p_rect.set(0, 0, 0, 0);
        for (let i = 0, len = this.points.length; i < len; i++) {
            if (i === 0) {
                p_rect.x = this.points[i].x;
                p_rect.y = this.points[i].y;
            } else {
                p_rect.expand_to(this.points[i]);
            }
        }
        return p_rect;
    }

    /**
     * Load points from Godot PoolVector2Array data (array of numbers)
     */
    set_points_in_pool_vec2(p_points: number[]) {
        let p_len = Math.floor(p_points.length / 2);
        let points = this.points;
        points.length = 0;

        for (let i = 0; i < p_len; i++) {
            points.push(new Vector2(p_points[i * 2], p_points[i * 2 + 1]));
        }
        this.points = points;
        this._update_shape();
        return this;
    }

    set_point_cloud(p_points: Vector2[]) {
        const hull = convex_hull_2d(p_points);
        this.points = hull;
        return this;
    }

    /* private */

    _update_shape() {
        let final_points = this.points;
        // needs to be counter clockwise
        if (is_polygon_clockwise(final_points)) {
            final_points = final_points.reverse();
        }
        this.shape.set_data(final_points);
    }
}
res_class_map['ConvexPolygonShape2D'] = ConvexPolygonShape2D
