import { node_class_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import { Rect2 } from 'engine/core/math/rect2';
import { Color, ColorLike } from 'engine/core/color';

import { NOTIFICATION_DRAW } from '../2d/canvas_item';
import { Control } from './control';


export class ColorRect extends Control {
    get class() { return 'ColorRect' }

    color = new Color(1, 1, 1, 1);

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.color !== undefined) this.set_color(data.color);

        return this;
    }

    _notification(p_what: number) {
        if (p_what === NOTIFICATION_DRAW) {
            const rect = Rect2.new(0, 0, this.rect_size.x, this.rect_size.y)
            this.draw_rect(rect, this.color);
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
    set_color_n(r: number, g?: number, b?: number, a?: number) {
        if (g === undefined) {
            this.color.set_with_hex(r);
        } else {
            this.color.set(r, g, b, a);
        }
        this.update();
    }
    /**
     * @param {ColorLike} color
     */
    set_color(color: ColorLike) {
        this.color.copy(color);
        this.update();
    }
}
node_class_map['ColorRect'] = GDCLASS(ColorRect, Control)
