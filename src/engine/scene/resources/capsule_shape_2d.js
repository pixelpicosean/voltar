import { res_class_map } from "engine/registry";
import { Rect2 } from "engine/core/math/rect2.js";

import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server.js";

import { Shape2D } from "./shape_2d.js";


export class CapsuleShape2D extends Shape2D {
    get type() { return 2 }

    constructor() {
        super(Physics2DServer.get_singleton().capsule_shape_create());

        this.radius = 10;
        this.height = 20;
        this._update_shape();
    }

    /* virtual */

    _load_data(p_data) {
        if (p_data.radius !== undefined) {
            this.set_radius(p_data.radius);
        }
        if (p_data.height !== undefined) {
            this.set_height(p_data.height);
        }
        return this;
    }

    /**
     * @param {number} value
     */
    set_radius(value) {
        this.radius = value;
        this._update_shape();
    }
    /**
     * @param {number} value
     */
    set_height(value) {
        this.height = value < 0 ? 0 : value;
        this._update_shape();
    }

    /**
     * @param {Rect2} [p_rect]
     * @returns {Rect2}
     */
    get_rect(p_rect = new Rect2()) {
        p_rect.x = -this.radius;
        p_rect.y = -this.height * 0.5;
        p_rect.width = this.radius * 2;
        p_rect.height = this.height;
        return p_rect;
    }

    /* private */

    _update_shape() {
        this.shape.set_data(this.radius);
    }
}
res_class_map['CapsuleShape2D'] = CapsuleShape2D
