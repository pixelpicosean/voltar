import {
    MARGIN_LEFT,
    MARGIN_RIGHT,
    MARGIN_TOP,
    MARGIN_BOTTOM,
} from "engine/core/math/math_defs";
import { Vector2 } from "engine/core/math/vector2";
import { Item } from "engine/servers/visual/visual_server_canvas";
import { Rect2 } from "engine/core/math/rect2";


export class StyleBox {
    margin = [-1, -1, -1, -1];

    set_default_margin(margin: number, value: number) {
        this.margin[margin] = value;
        return this;
    }
    get_default_margin(margin: number) {
        return this.margin[margin];
    }
    get_margin(margin: number) {
        if (this.margin[margin] < 0) {
            return this.get_style_margin(margin);
        } else {
            return this.margin[margin];
        }
    }
    get_style_margin(margin: number) {
        return 0;
    }
    /**
     * @param {Vector2} size
     */
    get_center_size(size: Vector2) {
        return size.set(0, 0);
    }

    /**
     * @param {Vector2} size
     */
    get_minimum_size(size: Vector2) {
        return size.set(
            this.get_margin(MARGIN_LEFT) + this.get_margin(MARGIN_RIGHT),
            this.get_margin(MARGIN_TOP) + this.get_margin(MARGIN_BOTTOM)
        );
    }
    /**
     * @param {Vector2} size
     */
    get_offset(size: Vector2) {
        return size.set(this.get_margin(MARGIN_LEFT), this.get_margin(MARGIN_TOP));
    }

    /**
     * @param {Item} p_item
     * @param {Rect2} p_rect
     */
    draw(p_item: Item, p_rect: Rect2) { }
}
