import { res_class_map } from "engine/registry";
import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";

import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server";

import { Shape2D } from "./shape_2d";


export class CapsuleShape2D extends Shape2D {
    get type() { return 2 }

    radius = 10;
    height = 20;

    constructor() {
        super(Physics2DServer.get_singleton().capsule_shape_create());

        this._update_shape();
    }

    /* virtual */

    _load_data(p_data: any) {
        if (p_data.radius !== undefined) {
            this.set_radius(p_data.radius);
        }
        if (p_data.height !== undefined) {
            this.set_height(p_data.height);
        }
        return this;
    }

    set_radius(value: number) {
        this.radius = value;
        this._update_shape();
    }
    set_height(value: number) {
        this.height = value < 0 ? 0 : value;
        this._update_shape();
    }

    get_rect(p_rect: Rect2 = new Rect2): Rect2 {
        p_rect.x = -this.radius;
        p_rect.y = -this.height * 0.5;
        p_rect.width = this.radius * 2;
        p_rect.height = this.height;
        return p_rect;
    }

    /* private */

    _update_shape() {
        let data = Vector2.new(this.radius, this.height);
        this.shape.set_data(data);
        Vector2.free(data);
    }
}
res_class_map['CapsuleShape2D'] = CapsuleShape2D
