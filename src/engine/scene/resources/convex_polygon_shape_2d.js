import { Rectangle, Vector2 } from "engine/math/index";
import PhysicsServer from "engine/servers/physics_2d/physics_server";
import Shape2D from "./shape_2d";
import { is_polygon_clockwise, convex_hull_2d } from "engine/math/geometry";

export default class ConvexPolygonShape2D extends Shape2D {
    get points() {
        return this._points;
    }
    /**
     * @param {Vector2[]} p_points
     */
    set points(p_points) {
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
        super(PhysicsServer.singleton.rectangle_shape_create());

        /**
         * @type {Vector2[]}
         */
        this._points = [];
        this._update_shape();
    }
    _load_data(p_data) {
        return this;
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
            final_points = final_points.slice(0).reverse();
        }
        this.shape.set_data(final_points);
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
