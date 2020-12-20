import { node_class_map } from 'engine/registry.js';
import { GDCLASS } from 'engine/core/v_object.js';
import { Rect2 } from 'engine/core/math/rect2.js';
import { Color, ColorLike } from 'engine/core/color.js';

import { NOTIFICATION_DRAW } from '../2d/canvas_item.js';
import { Control } from './control.js';


export class ColorRect extends Control {
    get class() { return 'ColorRect' }

    get color() { return this._color }
    set color(value) { this.set_color(value) }

    constructor() {
        super();

        this._color = new Color(1, 1, 1);
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.color !== undefined) this.set_color(data.color);

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        if (p_what === NOTIFICATION_DRAW) {
            const rect = Rect2.new(0, 0, this.rect_size.x, this.rect_size.y)
            this.draw_rect(rect, this._color);
            Rect2.free(rect);
        }
    }

    /* public */

    /**
     * @param {number} r color hex or red channel
     * @param {number} [g] green channel
     * @param {number} [b] blue channel
     * @param {number} [a] alpha channel
     */
    set_color_n(r, g, b, a) {
        if (g === undefined) {
            this._color.set_with_hex(r);
        } else {
            this._color.set(r, g, b, a);
        }
        this.update();
    }
    /**
     * @param {ColorLike} color
     */
    set_color(color) {
        this._color.copy(color);
        this.update();
    }
}
node_class_map['ColorRect'] = GDCLASS(ColorRect, Control)
