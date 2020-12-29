import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2.js";

import { NOTIFICATION_THEME_CHANGED } from "./control.js";
import { Container, NOTIFICATION_SORT_CHILDREN } from "./container.js";


export class MarginContainer extends Container {
    get class() { return 'MarginContainer' }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data['custom_constants/margin_bottom'] !== undefined) {
            this.add_constant_override('margin_bottom', data['custom_constants/margin_bottom']);
        }
        if (data['custom_constants/margin_left'] !== undefined) {
            this.add_constant_override('margin_left', data['custom_constants/margin_left']);
        }
        if (data['custom_constants/margin_right'] !== undefined) {
            this.add_constant_override('margin_right', data['custom_constants/margin_right']);
        }
        if (data['custom_constants/margin_top'] !== undefined) {
            this.add_constant_override('margin_top', data['custom_constants/margin_top']);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_SORT_CHILDREN: {
                const margin_left = this.get_constant('margin_left');
                const margin_top = this.get_constant('margin_top');
                const margin_right = this.get_constant('margin_right');
                const margin_bottom = this.get_constant('margin_bottom');

                const s = this.rect_size.clone();

                const rect = Rect2.create();
                for (const node of this.data.children) {
                    const c = /** @type {Container} */(node);

                    if (!c.is_control || c.is_set_as_toplevel()) {
                        continue;
                    }

                    const w = s.x - margin_left - margin_right;
                    const h = s.y - margin_top - margin_bottom;

                    rect.set(margin_left, margin_top, w, h);
                    this.fit_child_in_rect(c, rect);
                }
                Rect2.free(rect);

                Vector2.free(s);
            } break;
            case NOTIFICATION_THEME_CHANGED: {
                this.minimum_size_changed();
            } break;
        }
    }

    /**
     * returns new Vector2
     */
    get_minimum_size() {
        const margin_left = this.get_constant('margin_left');
        const margin_top = this.get_constant('margin_top');
        const margin_right = this.get_constant('margin_right');
        const margin_bottom = this.get_constant('margin_bottom');

        const max = Vector2.create();

        for (const node of this.data.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || c.is_set_as_toplevel() || !c.visible) {
                continue;
            }

            const s = c.get_combined_minimum_size();
            if (s.x > max.x) {
                max.x = s.x;
            }
            if (s.y > max.y) {
                max.y = s.y;
            }
            Vector2.free(s);
        }

        max.add(margin_left + margin_right, margin_top + margin_bottom);

        return max;
    }
}
node_class_map['MarginContainer'] = GDCLASS(MarginContainer, Container)
