import Container from "./container";
import { Vector2, Rectangle } from "engine/core/math/index";
import { node_class_map } from "engine/registry";
import { SizeFlag } from "./const";
import { remove_items } from "engine/dep/index";

const tmp_vec = new Vector2();
const tmp_vec2 = new Vector2();
const tmp_rect = new Rectangle();

export default class GridContainer extends Container {
    get columns() {
        return this._columns;
    }
    /**
     * @param {number} value
     */
    set columns(value) {
        this._columns = value;
        this.queue_sort();
        this.minimum_size_changed();
    }
    /**
     * @param {number} value
     */
    set_columns(value) {
        this.columns = value;
        return this;
    }

    constructor() {
        super();

        this.type = 'GridContainer';

        this._columns = 1;
    }
    _load_data(data) {
        super._load_data(data);

        if (data.columns !== undefined) {
            this.columns = data.columns;
        }
        if (data.hseparation !== undefined) {
            this.add_constant_override('hseparation', data.hseparation);
        }
        if (data.vseparation !== undefined) {
            this.add_constant_override('vseparation', data.vseparation);
        }

        return this;
    }

    _children_sorted() {
        let valid_controls_index = 0;

        const col_minw = [];
        const row_minh = [];
        const col_expanded = [];
        const row_expanded = [];

        const hsep = this.get_constant('hseparation');
        const vsep = this.get_constant('vseparation');
        const max_col = Math.min(this.children.length, this._columns);
        const max_row = Math.floor(this.children.length / this._columns);

        for (const node of this.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || !c.world_visible) {
                continue;
            }

            const row = Math.floor(valid_controls_index / this._columns);
            const col = Math.floor(valid_controls_index % this._columns);
            valid_controls_index++;

            const ms = c.get_combined_minimum_size(tmp_vec);

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

            if (c.size_flags_horizontal & SizeFlag.EXPAND) {
                if (col_expanded.indexOf(col) < 0) {
                    col_expanded.push(col);
                }
            }
            if (c.size_flags_vertical & SizeFlag.EXPAND) {
                if (row_expanded.indexOf(row) < 0) {
                    row_expanded.push(row);
                }
            }
        }

        // Evaluate the remaining space for expanded columns/rows
        const remaining_space = tmp_vec2.copy(this.rect_size);
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

        for (const node of this.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || !c.world_visible) {
                continue;
            }
            const row = Math.floor(valid_controls_index / this._columns);
            const col = Math.floor(valid_controls_index % this._columns);
            valid_controls_index++;

            if (col === 0) {
                col_ofs = 0;
                if (row > 0) {
                    row_ofs += ((row_expanded.indexOf(row - 1) >= 0) ? row_expand : row_minh[row - 1]) + vsep;
                }
            }

            tmp_rect.x = col_ofs;
            tmp_rect.y = row_ofs;
            tmp_rect.width = (col_expanded.indexOf(col) >= 0) ? col_expand : col_minw[col];
            tmp_rect.height = (row_expanded.indexOf(row) >= 0) ? row_expand : row_minh[row];

            this.fit_child_in_rect(c, tmp_rect);

            col_ofs += (tmp_rect.width + hsep);
        }
    }

    /**
     * @param {Vector2} size
     */
    get_minimum_size(size) {
        const col_minw = [];
        const row_minh = [];

        const hsep = this.get_constant('hseparation');
        const vsep = this.get_constant('vseparation');

        let max_row = 0;
        let max_col = 0;

        let valid_controls_index = 0;

        for (const node of this.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || !c.world_visible) {
                continue;
            }

            const row = Math.floor(valid_controls_index / this._columns);
            const col = Math.floor(valid_controls_index % this._columns);
            valid_controls_index++;

            const ms = c.get_combined_minimum_size(tmp_vec);

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
        }

        const ms = size.set(0, 0);

        for (let k of col_minw) {
            if (k !== undefined) {
                ms.x += col_minw[k];
            }
        }

        for (let k of row_minh) {
            if (k !== undefined) {
                ms.y += row_minh[k];
            }
        }

        ms.y += vsep * max_row;
        ms.x += hsep * max_col;

        return ms;
    }
}

node_class_map['GridContainer'] = GridContainer;
