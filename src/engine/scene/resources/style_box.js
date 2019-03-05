import { Vector2 } from 'engine/math/index';
import { Margin } from '../controls/const';

export default class StyleBox {
    constructor() {
        this.margin = [-1, -1, -1, -1];
    }
    /**
     * @param {Margin} margin
     * @param {number} value
     */
    set_default_margin(margin, value) {
        this.margin[margin] = value;
        return this;
    }
    /**
     * @param {Margin} margin
     */
    get_default_margin(margin) {
        return this.margin[margin];
    }
    /**
     * @param {Margin} margin
     */
    get_margin(margin) {
        if (this.margin[margin] < 0) {
            return this.get_style_margin(margin);
        } else {
            return this.margin[margin];
        }
    }
    /**
     * @param {Margin} margin
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
            this.get_margin(Margin.Left) + this.get_margin(Margin.Right),
            this.get_margin(Margin.Top) + this.get_margin(Margin.Bottom)
        );
    }
    /**
     * @param {Vector2} size
     */
    get_offset(size) {
        return size.set(this.get_margin(Margin.Left), this.get_margin(Margin.Top));
    }
}
