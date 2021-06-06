import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";

import { Container, NOTIFICATION_SORT_CHILDREN } from "./container";


export class CenterContainer extends Container {
    get class() { return 'CenterContainer' }

    use_top_left = false;

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.use_top_left !== undefined) this.set_use_top_left(data.use_top_left);

        return this;
    }

    _notification(p_what: number) {
        if (p_what === NOTIFICATION_SORT_CHILDREN) {
            const rect = Rect2.new();
            for (const node of this.data.children) {
                const c: Container = node as Container;

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
            const c: Container = node as Container;

            if (!c.is_control || c.is_set_as_toplevel() || !c.visible) {
                continue;
            }

            const minsize = c.get_combined_minimum_size();
            ms.set(Math.max(ms.x, minsize.x), Math.max(ms.y, minsize.y));
            Vector2.free(minsize);
        }

        return ms;
    }

    /* public */

    /**
     * @param {boolean} value
     */
    set_use_top_left(value: boolean) {
        this.use_top_left = value;
        this.queue_sort();
    }
}
node_class_map['CenterContainer'] = GDCLASS(CenterContainer, Container)
