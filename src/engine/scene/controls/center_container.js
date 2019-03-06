import Container from "./container";
import { Vector2, Rectangle } from "engine/core/math/index";
import { node_class_map } from "engine/registry";

const tmp_vec = new Vector2();
const tmp_vec2 = new Vector2();
const tmp_rect = new Rectangle();

export default class CenterContainer extends Container {
    get use_top_left() {
        return this._use_top_left;
    }
    set use_top_left(value) {
        this._use_top_left = value;
        this.queue_sort();
    }
    /**
     * @param {number} value
     * @returns {this}
     */
    set_use_top_left(value) {
        this.use_top_left = value;
        return this;
    }

    constructor() {
        super();

        this.type = 'CenterContainer';

        this._use_top_left = false;
    }

    _children_sorted() {
        for (const node of this.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || !c.world_visible) {
                continue;
            }
            if (c.toplevel) {
                continue;
            }

            const minsize = c.get_combined_minimum_size(tmp_vec2);
            tmp_rect.x = Math.floor(this._use_top_left ? (-minsize.x * 0.5) : ((this.rect_size.x - minsize.x) * 0.5));
            tmp_rect.y = Math.floor(this._use_top_left ? (-minsize.y * 0.5) : ((this.rect_size.y - minsize.y) * 0.5));
            tmp_rect.width = minsize.x;
            tmp_rect.height = minsize.y;
            this.fit_child_in_rect(c, tmp_rect);
        }
    }

    /**
     * @param {Vector2} size
     */
    get_minimum_size(size) {
        const ms = size.set(0, 0);

        if (this._use_top_left) {
            return ms;
        }

        for (const node of this.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || !c.world_visible) {
                continue;
            }
            if (c.toplevel) {
                continue;
            }

            const minsize = c.get_combined_minimum_size(tmp_vec);
            ms.set(Math.max(ms.x, minsize.x), Math.max(ms.y, minsize.y));
        }

        return ms;
    }
}

node_class_map['CenterContainer'] = CenterContainer;
