import PhysicsServer from "engine/servers/physics_2d/physics_server";
import Shape2D from "./shape_2d";
import {
    Rectangle,
    Vector2,
} from "engine/core/math/index";
import {
    is_polygon_clockwise,
    convex_hull_2d,
} from "engine/core/math/geometry";

export default class ConvexPolygonShape2D extends Shape2D {
    get points() {
        return this._points;
    }
    /**
     * @param {Vector2[]} p_points
     */
    set points(p_points) {
        this._points = p_points;
        this._update_shape();
    }
    /**
     * @param {Vector2[]} p_points
     */
    set_points(p_points) {
        this.points = p_points;
        return this;
    }

    constructor() {
        super(PhysicsServer.singleton.convex_polygon_shape_create());

        /**
         * @type {Vector2[]}
         */
        this._points = [];
        const pcount = 3;
        for (let i = pcount - 1; i >= 0; i--) {
            this._points.push(new Vector2(Math.sin(i * Math.PI * 2 / pcount), -Math.cos(i * Math.PI * 2 / pcount)).scale(10));
        }

        this._update_shape();
    }

    /**
     * @param {Rectangle} [p_rect]
     * @returns {Rectangle}
     */
    get_rect(p_rect = Rectangle.new()) {
        p_rect.set(0, 0, 0, 0);
        for (let i = 0, len = this._points.length; i < len; i++) {
            if (i === 0) {
                p_rect.x = this._points[i].x;
                p_rect.y = this._points[i].y;
            } else {
                p_rect.expand_to(this._points[i]);
            }
        }
        return p_rect;
    }
    _update_shape() {
        let final_points = this._points;
        // needs to be counter clockwise
        if (is_polygon_clockwise(final_points)) {
            final_points = final_points.reverse();
        }
        this.shape.set_data(final_points);
    }

    /**
     * Load points from Godot PoolVector2Array data (array of numbers)
     * @param {number[]} p_points
     */
    set_points_in_pool_vec2(p_points) {
        const p_len = Math.floor(p_points.length / 2);
        const points = this._points;
        points.length = 0;

        for (let i = 0; i < p_len; i++) {
            points.push(new Vector2(p_points[i * 2], p_points[i * 2 + 1]));
        }
        this.points = points;

        return this;
    }

    /**
     * @param {Vector2[]} p_points
     */
    set_point_cloud(p_points) {
        const hull = convex_hull_2d(p_points);
        this.points = hull;
        return this;
    }
}
