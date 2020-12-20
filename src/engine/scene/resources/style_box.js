import {
    MARGIN_LEFT,
    MARGIN_RIGHT,
    MARGIN_TOP,
    MARGIN_BOTTOM,
} from "engine/core/math/math_defs.js";
import { Vector2 } from "engine/core/math/vector2.js";
import { Item } from "engine/servers/visual/visual_server_canvas.js";
import { Rect2 } from "engine/core/math/rect2.js";


export class StyleBox {
    constructor() {
        this.margin = [-1, -1, -1, -1];
    }
    /**
     * @param {number} margin
     * @param {number} value
     */
    set_default_margin(margin, value) {
        this.margin[margin] = value;
        return this;
    }
    /**
     * @param {number} margin
     */
    get_default_margin(margin) {
        return this.margin[margin];
    }
    /**
     * @param {number} margin
     */
    get_margin(margin) {
        if (this.margin[margin] < 0) {
            return this.get_style_margin(margin);
        } else {
            return this.margin[margin];
        }
    }
    /**
     * @param {number} margin
     */
    get_style_margin(margin) {
        return 0;
    }
    /**
     * @param {Vector2} size
     */
    get_center_size(size) {
        return size.set(0, 0);
    }

    /**
     * @param {Vector2} size
     */
    get_minimum_size(size) {
        return size.set(
            this.get_margin(MARGIN_LEFT) + this.get_margin(MARGIN_RIGHT),
            this.get_margin(MARGIN_TOP) + this.get_margin(MARGIN_BOTTOM)
        );
    }
    /**
     * @param {Vector2} size
     */
    get_offset(size) {
        return size.set(this.get_margin(MARGIN_LEFT), this.get_margin(MARGIN_TOP));
    }

    /**
     * @param {Item} p_item
     * @param {Rect2} p_rect
     */
    draw(p_item, p_rect) { }
}
