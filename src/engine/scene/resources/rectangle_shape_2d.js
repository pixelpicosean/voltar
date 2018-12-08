import { Rectangle, Vector2 } from "engine/math/index";
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
     * @param {Vector2} value
     * @returns {this}
     */
    set_extents(value) {
        this.extents = value;
        return this;
    }

    constructor() {
        super(PhysicsServer.singleton.rectangle_shape_create());

        this._extents = new Vector2(10, 10);
        this._update_shape();
    }
    /**
     * @param {Rectangle} [p_rect]
     * @returns {Rectangle}
     */
    get_rect(p_rect = Rectangle.create()) {
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
