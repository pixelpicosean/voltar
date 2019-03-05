import Container from "./container";
import { Vector2, Rectangle } from "engine/math/index";
import { node_class_map } from "engine/registry";

const tmp_vec = new Vector2();
const tmp_vec2 = new Vector2();
const tmp_rect = new Rectangle();

export default class MarginContainer extends Container {
    constructor() {
        super();

        this.type = 'MarginContainer';
    }

    _children_sorted() {
        const margin_left = this.get_constant('margin_left');
        const margin_top = this.get_constant('margin_top');
        const margin_right = this.get_constant('margin_right');
        const margin_bottom = this.get_constant('margin_bottom');

        const s = tmp_vec2.set(0, 0);

        for (const node of this.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || !c.world_visible) {
                continue;
            }
            if (c.toplevel) {
                continue;
            }

            const w = s.x - margin_left - margin_right;
            const h = s.y - margin_top - margin_bottom;

            tmp_rect.x = margin_left;
            tmp_rect.y = margin_top;
            tmp_rect.width = w;
            tmp_rect.height = h;

            this.fit_child_in_rect(c, tmp_rect);
        }
    }

    /**
     * @param {Vector2} size
     */
    get_minimum_size(size) {
        const margin_left = this.get_constant('margin_left');
        const margin_top = this.get_constant('margin_top');
        const margin_right = this.get_constant('margin_right');
        const margin_bottom = this.get_constant('margin_bottom');

        const max = size.set(0, 0);

        for (const node of this.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || !c.world_visible) {
                continue;
            }
            if (c.toplevel) {
                continue;
            }

            const s = c.get_combined_minimum_size(tmp_vec);
            if (s.x > max.x) {
                max.x = s.x;
            }
            if (s.y > max.y) {
                max.y = s.y;
            }
        }

        max.add(margin_left + margin_right, margin_top + margin_bottom);

        return max;
    }
}

node_class_map['MarginContainer'] = MarginContainer;
