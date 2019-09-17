import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2 } from "engine/core/math/vector2";

import { Container, NOTIFICATION_SORT_CHILDREN } from "./container";
import { Rect2 } from "engine/core/math/rect2";


export class CenterContainer extends Container {
    get class() { return 'CenterContainer' }

    /**
     * @param {boolean} value
     */
    set_use_top_left(value) {
        this.use_top_left = value;
        this.queue_sort();
    }

    constructor() {
        super();

        this.use_top_left = false;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        if (p_what === NOTIFICATION_SORT_CHILDREN) {
            const rect = Rect2.new();
            for (const node of this.data.children) {
                const c = /** @type {Container} */(node);

                if (!c.is_control || c.is_set_as_toplevel()) {
                    continue;
                }

                const minsize = c.get_combined_minimum_size();
                rect.set(
                    Math.floor(this.use_top_left ? (-minsize.x * 0.5) : ((this.rect_size.x - minsize.x) * 0.5)),
                    Math.floor(this.use_top_left ? (-minsize.y * 0.5) : ((this.rect_size.y - minsize.y) * 0.5)),
                    minsize.x,
                    minsize.y
                )
                this.fit_child_in_rect(c, rect);
                Vector2.free(minsize);
            }
            Rect2.free(rect);
        }
    }

    /**
     * returns new Vector2
     */
    get_minimum_size() {
        const ms = Vector2.new(0, 0);

        if (this.use_top_left) {
            return ms;
        }

        for (const node of this.data.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || c.is_set_as_toplevel() || !c.visible) {
                continue;
            }

            const minsize = c.get_combined_minimum_size();
            ms.set(Math.max(ms.x, minsize.x), Math.max(ms.y, minsize.y));
            Vector2.free(minsize);
        }

        return ms;
    }
}
node_class_map['CenterContainer'] = GDCLASS(CenterContainer, Container)
