import { res_class_map } from "engine/registry";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";

import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server.js";

import { Shape2D } from "./shape_2d";


export class SegmentShape2D extends Shape2D {
    /**
     * @param {Vector2Like} value
     */
    set_a(value: Vector2Like) {
        this.a.copy(value);
        this._update_shape();
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_a_n(x: number, y: number) {
        this.a.set(x, y);
    }

    /**
     * @param {Vector2Like} value
     */
    set_b(value: Vector2Like) {
        this.b.copy(value);
        this._update_shape();
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_b_n(x: number, y: number) {
        this.b.set(x, y);
    }

    a = new Vector2;
    b = new Vector2;

    constructor() {
        super(Physics2DServer.get_singleton().segment_shape_create());

        this._update_shape();
    }
    _load_data(p_data: any) {
        if (p_data.a !== undefined) {
            this.set_a(p_data.a);
        }
        if (p_data.b !== undefined) {
            this.set_b(p_data.b);
        }
        return this;
    }

    get_rect() {
        return Rect2.create(this.a.x, this.a.y).expand_to(this.b);
    }
    _update_shape() {
        const r = Rect2.create(this.a.x, this.a.y, this.b.x, this.b.y);
        this.get_rid().set_data(r);
        Rect2.free(r);
    }
}
res_class_map['SegmentShape2D'] = SegmentShape2D

export class RayShape2D extends Shape2D {
    set_length(value: number) {
        this.length = value;
        this._update_shape();
    }

    /**
     * @param {boolean} value
     */
    set_slips_on_slope(value: boolean) {
        this.slips_on_slope = value;
        this._update_shape();
    }

    length = 20;
    slips_on_slope = false;

    constructor() {
        super(Physics2DServer.get_singleton().ray_shape_create());

        this._update_shape();
    }
    _load_data(p_data: any) {
        if (p_data.length !== undefined) {
            this.set_length(p_data.length);
        }
        if (p_data.slips_on_slope !== undefined) {
            this.set_slips_on_slope(p_data.slips_on_slope);
        }
        return this;
    }

    get_rect() {
        const rect = Rect2.create();
        const vec = Vector2.create(0, this.length);
        rect.expand_to(vec).grow_by(0.707 * 4);
        Vector2.free(vec);
        return rect;
    }
    _update_shape() {
        this.get_rid().set_data({
            length: this.length,
            slips_on_slope: this.slips_on_slope,
        })
    }
}
res_class_map['RayShape2D'] = RayShape2D
