import { res_class_map } from "engine/registry";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";

import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server";

import { Shape2D } from "./shape_2d";

export class RectangleShape2D extends Shape2D {
    get type() { return 0 }

    extents = new Vector2(10, 10);

    constructor() {
        super(Physics2DServer.get_singleton().rectangle_shape_create());

        this._update_shape();
    }

    /* virtual */

    _load_data(p_data: any) {
        if (p_data.extents !== undefined) {
            this.set_extents(p_data.extents);
        }
        return this;
    }

    /* public */

    set_extents(extents: Vector2Like) {
        this.set_extents_n(extents.x, extents.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_extents_n(x: number, y: number) {
        this.extents.set(x, y);
        this._update_shape();
    }

    /**
     * @param {Rect2} [p_rect]
     * @returns {Rect2}
     */
    get_rect(p_rect: Rect2 = Rect2.new()): Rect2 {
        p_rect.x = -this.extents.width;
        p_rect.y = -this.extents.height;
        p_rect.width = this.extents.width * 2;
        p_rect.height = this.extents.height * 2;
        return p_rect;
    }

    /* private */

    _update_shape() {
        this.shape.set_data(this.extents);
    }
}
res_class_map['RectangleShape2D'] = RectangleShape2D
