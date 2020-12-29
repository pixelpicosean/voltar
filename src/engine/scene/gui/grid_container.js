import { remove_items } from "engine/dep/index.ts";
import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2.js";

import { SIZE_EXPAND } from "./const";
import { NOTIFICATION_THEME_CHANGED } from "./control.js";
import {
    Container,
    NOTIFICATION_SORT_CHILDREN,
} from "./container.js";


export class GridContainer extends Container {
    get class() { return 'GridContainer' }

    constructor() {
        super();

        this.columns = 1;
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.columns !== undefined) {
            this.set_columns(data.columns);
        }
        if (data['custom_constants/hseparation'] !== undefined) {
            this.add_constant_override('hseparation', data['custom_constants/hseparation']);
        }
        if (data['custom_constants/vseparation'] !== undefined) {
            this.add_constant_override('vseparation', data['custom_constants/vseparation']);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_SORT_CHILDREN: {
                let valid_controls_index = 0;

                const col_minw = [];
                const row_minh = [];
                const col_expanded = [];
                const row_expanded = [];

                const hsep = this.get_constant('hseparation');
                const vsep = this.get_constant('vseparation');
                const max_col = Math.min(this.data.children.length, this.columns);
                const max_row = Math.floor(this.data.children.length / this.columns);

                for (const node of this.data.children) {
                    const c = /** @type {Container} */(node);

                    if (!c.is_control || !c.is_visible_in_tree()) {
                        continue;
                    }

                    const row = Math.floor(valid_controls_index / this.columns);
                    const col = Math.floor(valid_controls_index % this.columns);
                    valid_controls_index++;

                    const ms = c.get_combined_minimum_size();

                    if (col_minw[col] !== undefined) {
                        col_minw[col] = Math.max(col_minw[col], ms.x);
                    } else {
                        col_minw[col] = ms.x;
                    }

                    if (row_minh[row] !== undefined) {
                        row_minh[row] = Math.max(row_minh[row], ms.y);
                    } else {
                        row_minh[row] = ms.y;
                    }

                    if (c.size_flags_horizontal & SIZE_EXPAND) {
                        if (col_expanded.indexOf(col) < 0) {
                            col_expanded.push(col);
                        }
                    }
                    if (c.size_flags_vertical & SIZE_EXPAND) {
                        if (row_expanded.indexOf(row) < 0) {
                            row_expanded.push(row);
                        }
                    }

                    Vector2.free(ms);
                }

                // Evaluate the remaining space for expanded columns/rows
                const remaining_space = this.rect_size.clone();
                for (let i = 0; i < col_minw.length; i++) {
                    if ((col_minw[i] !== undefined) && (col_expanded.indexOf(i) < 0)) {
                        remaining_space.x -= col_minw[i];
                    }
                }

                for (let i = 0; i < row_minh.length; i++) {
                    if ((row_minh[i] !== undefined) && (row_expanded.indexOf(i) < 0)) {
                        remaining_space.y -= row_minh[i];
                    }
                }
                remaining_space.y -= vsep * Math.max(max_row - 1, 0);
                remaining_space.x -= hsep * Math.max(max_col - 1, 0);

                let can_fit = false;
                while (!can_fit && col_expanded.length > 0) {
                    can_fit = true;
                    let max_index = col_expanded[0];
                    for (let e of col_expanded) {
                        if (col_minw[e] > col_minw[max_index]) {
                            max_index = e;
                        }
                        if (can_fit && (remaining_space.x / col_expanded.length) < col_minw[e]) {
                            can_fit = false;
                        }
                    }

                    if (!can_fit) {
                        remove_items(col_expanded, col_expanded.indexOf(max_index), 1);
                        remaining_space.x -= col_minw[max_index];
                    }
                }

                can_fit = false;
                while (!can_fit && row_expanded.length > 0) {
                    can_fit = true;
                    let max_index = row_expanded[0];
                    for (let e of row_expanded) {
                        if (row_minh[e] > row_minh[max_index]) {
                            max_index = e;
                        }
                        if (can_fit && (remaining_space.y / row_expanded.length) < row_minh[e]) {
                            can_fit = false;
                        }
                    }

                    if (!can_fit) {
                        remove_items(row_expanded, row_expanded.indexOf(max_index), 1);
                        remaining_space.y -= row_minh[max_index];
                    }
                }

                // Finally, fit the nodes
                const col_expand = col_expanded.length > 0 ? Math.floor(remaining_space.x / col_expanded.length) : 0;
                const row_expand = row_expanded.length > 0 ? Math.floor(remaining_space.y / row_expanded.length) : 0;

                let col_ofs = 0;
                let row_ofs = 0;

                valid_controls_index = 0;

                const rect = Rect2.create();
                for (const node of this.data.children) {
                    const c = /** @type {Container} */(node);

                    if (!c.is_control || !c.is_visible_in_tree()) {
                        continue;
                    }
                    const row = Math.floor(valid_controls_index / this.columns);
                    const col = Math.floor(valid_controls_index % this.columns);
                    valid_controls_index++;

                    if (col === 0) {
                        col_ofs = 0;
                        if (row > 0) {
                            row_ofs += ((row_expanded.indexOf(row - 1) >= 0) ? row_expand : row_minh[row - 1]) + vsep;
                        }
                    }

                    rect.set(
                        col_ofs,
                        row_ofs,
                        (col_expanded.indexOf(col) >= 0) ? col_expand : col_minw[col],
                        (row_expanded.indexOf(row) >= 0) ? row_expand : row_minh[row]
                    )

                    this.fit_child_in_rect(c, rect);

                    col_ofs += (rect.width + hsep);
                }
                Rect2.free(rect);

                Vector2.free(remaining_space);
            } break;
            case NOTIFICATION_THEME_CHANGED: {
                this.minimum_size_changed();
            } break;
        }
    }

    get_minimum_size() {
        const col_minw = [];
        const row_minh = [];

        const hsep = this.get_constant('hseparation');
        const vsep = this.get_constant('vseparation');

        let max_row = 0;
        let max_col = 0;

        let valid_controls_index = 0;

        for (let node of this.data.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || c.is_visible_in_tree()) {
                continue;
            }

            const row = Math.floor(valid_controls_index / this.columns);
            const col = Math.floor(valid_controls_index % this.columns);
            valid_controls_index++;

            const ms = c.get_combined_minimum_size();

            if (col_minw[col] !== undefined) {
                col_minw[col] = Math.max(col_minw[col], ms.x);
            } else {
                col_minw[col] = ms.x;
            }

            if (row_minh[col] !== undefined) {
                row_minh[col] = Math.max(row_minh[col], ms.y);
            } else {
                row_minh[col] = ms.y;
            }

            max_col = Math.max(col, max_col);
            max_row = Math.max(row, max_row);

            Vector2.free(ms);
        }

        const ms = Vector2.create(0, 0);

        for (let k of col_minw) {
            if (k !== undefined) {
                ms.x += k;
            }
        }

        for (let k of row_minh) {
            if (k !== undefined) {
                ms.y += k;
            }
        }

        ms.y += vsep * max_row;
        ms.x += hsep * max_col;

        return ms;
    }

    /* public */

    /**
     * @param {number} value
     */
    set_columns(value) {
        this.columns = value;
        this.queue_sort();
        this.minimum_size_changed();
    }
}
node_class_map['GridContainer'] = GDCLASS(GridContainer, Container)
