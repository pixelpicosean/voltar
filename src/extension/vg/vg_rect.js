import * as v from 'engine/index';


const rect = new v.Rect2;

export class VGRect extends v.Node2D {
    static instance() { return new VGRect }

    constructor() {
        super();

        this.width = 32;
        this.height = 32;

        this.centered = true;

        this.color = new v.Color(1, 1, 1, 1);
    }

    /* public */

    /**
     * @param {number} width
     */
    set_width(width) {
        this.width = width;
        this.update();
    }
    /**
     * @param {number} height
     */
    set_height(height) {
        this.height = height;
        this.update();
    }
    /**
     * @param {boolean} centered
     */
    set_centered(centered) {
        this.centered = centered;
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

        if (data.width !== undefined) this.set_width(data.width);
        if (data.height !== undefined) this.set_height(data.height);
        if (data.color !== undefined) this.set_color_n(data.color.r, data.color.g, data.color.b, data.color.a);

        return this;
    }
    _draw() {
        if (this.centered) {
            this.draw_rect(rect.set(-this.width * 0.5, -this.height * 0.5, this.width, this.height), this.color, true);
        } else {
            this.draw_rect(rect.set(0, 0, this.width, this.height), this.color, true);
        }
    }
}
v.GDCLASS(VGRect, v.Node2D)

v.attach_script('res://scene/vg/vg_rect.tscn', VGRect);
