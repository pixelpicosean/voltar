import { res_class_map } from "engine/registry";
import { Rect2 } from "engine/core/math/rect2";

import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server.js";

import { Shape2D } from "./shape_2d";


export class CircleShape2D extends Shape2D {
    get type() { return 1 }

    radius = 10;

    constructor() {
        super(Physics2DServer.get_singleton().circle_shape_create());

        this._update_shape();
    }

    /* virtual */

    _load_data(p_data: any) {
        if (p_data.radius !== undefined) {
            this.set_radius(p_data.radius);
        }
        return this;
    }

    set_radius(value: number) {
        this.radius = value;
        this._update_shape();
    }

    /**
     * @param {Rect2} [p_rect]
     * @returns {Rect2}
     */
    get_rect(p_rect: Rect2 = new Rect2()): Rect2 {
        p_rect.x = -this.radius;
        p_rect.y = -this.radius;
        p_rect.width = p_rect.height = this.radius * 2;
        return p_rect;
    }

    /* private */

    _update_shape() {
        this.shape.set_data(this.radius);
    }
}
res_class_map['CircleShape2D'] = CircleShape2D
