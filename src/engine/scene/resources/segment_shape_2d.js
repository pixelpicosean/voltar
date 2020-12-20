import { res_class_map } from "engine/registry.js";
import { Vector2, Vector2Like } from "engine/core/math/vector2.js";
import { Rect2 } from "engine/core/math/rect2.js";

import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server.js";

import { Shape2D } from "./shape_2d.js";


export class SegmentShape2D extends Shape2D {
    get a() {
        return this._a;
    }
    set a(value) {
        this._a.copy(value);
        this._update_shape();
    }
    /**
     * @param {Vector2Like|number} x
     * @param {number} y
     */
    set_a(x, y = undefined) {
        if (y !== undefined) {
            // @ts-ignore
            this._a.set(x, y);
        } else {
            // @ts-ignore
            this._a.copy(x);
        }
        return this;
    }

    get b() {
        return this._b;
    }
    set b(value) {
        this._b.copy(value);
        this._update_shape();
    }
    /**
     * @param {Vector2Like|number} x
     * @param {number} y
     */
    set_b(x, y = undefined) {
        if (y !== undefined) {
            // @ts-ignore
            this._b.set(x, y);
        } else {
            // @ts-ignore
            this._b.copy(x);
        }
        return this;
    }

    constructor() {
        super(Physics2DServer.get_singleton().segment_shape_create());

        this._a = new Vector2();
        this._b = new Vector2();
        this._update_shape();
    }
    _load_data(p_data) {
        if (p_data.a !== undefined) {
            this.set_a(p_data.a);
        }
        if (p_data.b !== undefined) {
            this.set_b(p_data.b);
        }
        return this;
    }

    get_rect() {
        return Rect2.new(this._a.x, this._a.y).expand_to(this._b);
    }
    _update_shape() {
        const r = Rect2.new(this._a.x, this._a.y, this._b.x, this._b.y);
        this.get_rid().set_data(r);
        Rect2.free(r);
    }
}
res_class_map['SegmentShape2D'] = SegmentShape2D

export class RayShape2D extends Shape2D {
    get length() {
        return this._length;
    }
    /**
     * @param {number} value
     */
    set length(value) {
        this._length = value;
        this._update_shape();
    }
    /**
     * @param {number} value
     */
    set_length(value) {
        this.length = value;
        return this;
    }

    get slips_on_slope() {
        return this._slips_on_slope;
    }
    /**
     * @param {boolean} value
     */
    set slips_on_slope(value) {
        this._slips_on_slope = value;
        this._update_shape();
    }
    /**
     * @param {boolean} value
     */
    set_slips_on_slope(value) {
        this.slips_on_slope = value;
        return this;
    }

    constructor() {
        super(Physics2DServer.get_singleton().ray_shape_create());

        this._length = 20;
        this._slips_on_slope = false;
        this._update_shape();
    }
    _load_data(p_data) {
        if (p_data.length !== undefined) {
            this.set_length(p_data.length);
        }
        if (p_data.slips_on_slope !== undefined) {
            this.set_slips_on_slope(p_data.slips_on_slope);
        }
        return this;
    }

    get_rect() {
        const rect = Rect2.new();
        const vec = Vector2.new(0, this._length);
        rect.expand_to(vec).grow_to(0.707 * 4);
        Vector2.free(vec);
        return rect;
    }
    _update_shape() {
        this.get_rid().set_data({
            length: this._length,
            slips_on_slope: this._slips_on_slope,
        })
    }
}
res_class_map['RayShape2D'] = RayShape2D
