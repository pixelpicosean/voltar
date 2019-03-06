import { Rectangle, Vector2 } from "engine/core/math/index";
import PhysicsServer from "engine/servers/physics_2d/physics_server";
import Shape2D from "./shape_2d";

export default class RectangleShape2D extends Shape2D {
    get extents() {
        return this._extents;
    }
    /**
     * @param {Vector2} value
     */
    set extents(value) {
        this._extents.copy(value);
        this._update_shape();
    }
    /**
     * @param {import("engine/core/math/vector2").Vector2Like|number} x
     * @param {import("engine/core/math/vector2").Vector2Like|number} [y]
     * @returns {this}
     */
    set_extents(x, y = undefined) {
        if (y === undefined) {
            // @ts-ignore
            this._extents.copy(x);
        } else {
            // @ts-ignore
            this._extents.set(x, y);
        }
        this._update_shape();
        return this;
    }

    constructor() {
        super(PhysicsServer.singleton.rectangle_shape_create());

        this._extents = new Vector2(10, 10);
        this._update_shape();
    }
    _load_data(p_data) {
        if (p_data.extents !== undefined) {
            this.set_extents(p_data.extents);
        }
        return this;
    }

    /**
     * @param {Rectangle} [p_rect]
     * @returns {Rectangle}
     */
    get_rect(p_rect = Rectangle.new()) {
        p_rect.x = -this._extents.width;
        p_rect.y = -this._extents.height;
        p_rect.width = this._extents.width * 2;
        p_rect.height = this._extents.height * 2;
        return p_rect;
    }
    _update_shape() {
        this.shape.set_data(this._extents);
    }
}
