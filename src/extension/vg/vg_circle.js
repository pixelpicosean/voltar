import * as v from 'engine/index';

export class VGCircle extends v.Node2D {
    static instance() { return new VGCircle }

    constructor() {
        super();

        this.radius = 32;

        this.color = new v.Color(1, 1, 1, 1);
    }

    /* public */

    /**
     * @param {number} radius
     */
    set_radius(radius) {
        this.radius = radius;
        this.update();
    }
    /**
     * @param {v.ColorLike} color
     */
    set_color(color) {
        this.color.copy(color);
        this.update();
    }
    /**
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} a
     */
    set_color_n(r, g, b, a) {
        this.color.set(r, g, b, a);
        this.update();
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.radius !== undefined) this.set_radius(data.radius);
        if (data.color !== undefined) this.set_color_n(data.color.r, data.color.g, data.color.b, data.color.a);

        return this;
    }
    _draw() {
        this.draw_circle(v.Vector2.ZERO, this.radius, this.color);
    }
}
v.GDCLASS(VGCircle, v.Node2D)

v.attach_script('res://scene/vg/vg_circle.tscn', VGCircle);
