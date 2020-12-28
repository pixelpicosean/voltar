import { res_class_map } from "engine/registry";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2.js";

import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server.js";

import { Shape2D } from "./shape_2d.js";

export class RectangleShape2D extends Shape2D {
    get type() { return 0 }

    constructor() {
        super(Physics2DServer.get_singleton().rectangle_shape_create());

        this.extents = new Vector2(10, 10);
        this._update_shape();
    }

    /* virtual */

    _load_data(p_data) {
        if (p_data.extents !== undefined) {
            this.set_extents(p_data.extents);
        }
        return this;
    }

    /* public */

    /**
     * @param {Vector2Like} extents
     */
    set_extents(extents) {
        this.set_extents_n(extents.x, extents.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_extents_n(x, y) {
        this.extents.set(x, y);
        this._update_shape();
    }

    /**
     * @param {Rect2} [p_rect]
     * @returns {Rect2}
     */
    get_rect(p_rect = Rect2.create()) {
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
