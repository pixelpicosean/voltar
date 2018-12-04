import { Rectangle } from "engine/math/index";
import PhysicsServer from "engine/servers/physics_2d/physics_server";
import Shape2D from "./shape_2d";

export default class CircleShape2D extends Shape2D {
    get radius() {
        return this._radius;
    }
    /**
     * @param {Number} value
     */
    set radius(value) {
        this._radius = value;
        this._update_shape();
    }
    /**
     * @param {Number} value
     * @returns {this}
     */
    set_radius(value) {
        this.radius = value;
        return this;
    }

    constructor() {
        super(PhysicsServer.singleton.circle_shape_create());

        this._radius = 10;
        this._update_shape();
    }
    /**
     * @param {Rectangle} [p_rect]
     * @returns {Rectangle}
     */
    get_rect(p_rect = new Rectangle()) {
        p_rect.x = -this._radius;
        p_rect.y = -this._radius;
        p_rect.width = p_rect.height = this._radius * 2;
        return p_rect;
    }
    _update_shape() {
        this.shape.set_data(this._radius);
    }
}
