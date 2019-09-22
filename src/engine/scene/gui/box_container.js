import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";

import { SIZE_EXPAND_FILL, SIZE_EXPAND } from "./const";
import { Control, NOTIFICATION_THEME_CHANGED } from "./control";
import { Container, NOTIFICATION_SORT_CHILDREN } from "./container";


export const ALIGN_BEGIN = 0;
export const ALIGN_CENTER = 1;
export const ALIGN_END = 2;

class MinSizeCache {
    constructor() {
        this.min_size = 0;
        this.will_stretch = false;
        this.final_size = 0;
    }
    reset() {
        this.min_size = 0;
        this.will_stretch = false;
        this.final_size = 0;
    }
}

export class BoxContainer extends Container {
    get class() { return 'BoxContainer' }

    /**
     * @param {number} value
     */
    set_alignment(value) {
        this.alignment = value;
        this._resort();
    }

    constructor(vertical = false) {
        super();

        this.vertical = vertical;
        this.alignment = ALIGN_BEGIN;
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.alignment !== undefined) {
            this.set_alignment(data.alignment);
        }
        if (data.separation !== undefined) {
            this.add_constant_override('separation', data.separation);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_SORT_CHILDREN: {
                this._resort();
            } break;
            case NOTIFICATION_THEME_CHANGED: {
                this.minimum_size_changed();
            } break;
        }
    }

    get_minimum_size() {
        const minimum = Vector2.new(0, 0);
        const sep = this.get_constant('separation');

        let first = true;

        for (const node of this.data.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || c.is_toplevel_control() || !c._visible) {
                continue;
            }

            const size = c.get_combined_minimum_size();

            if (this.vertical) {
                if (size.width > minimum.width) {
                    minimum.width = size.width;
                }

                minimum.height += size.height + (first ? 0 : sep);
            } else {
                if (size.height > minimum.height) {
                    minimum.height = size.height;
                }

                minimum.width += size.width + (first ? 0 : sep);
            }

            first = false;

            Vector2.free(size);
        }

        return minimum;
    }

    /* public */

    add_spacer(begin = false) {
        const c = new Control();

        if (this.vertical) {
            c.set_size_flags_vertical(SIZE_EXPAND_FILL);
        } else {
            c.set_size_flags_horizontal(SIZE_EXPAND_FILL);
        }

        this.add_child(c);
        if (begin) {
            this.move_child(c, 0);
        }
    }

    /* private */

    _resort() {
        if (!this.is_inside_tree) {
            return;
        }

        /** First pass, determine minimum size AND amount of stretchable elements */

        const new_size = this.rect_size;
        const sep = this.get_constant('separation');

        let first = true;
        let children_count = 0;
        let stretch_min = 0;
        let stretch_avail = 0;
        let stretch_ratio_total = 0;
        /**
         * @type {Object<number, MinSizeCache>}
         */
        const min_size_cache = {};

        for (const node of this.data.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || c.is_set_as_toplevel() || !c.is_visible_in_tree()) {
                continue;
            }

            const size = c.get_combined_minimum_size();
            const msc = new MinSizeCache();

            if (this.vertical) {
                stretch_min += size.height;
                msc.min_size = size.height;
                msc.will_stretch = !!(c.size_flags_vertical & SIZE_EXPAND);
            } else {
                stretch_min += size.width;
                msc.min_size = size.width;
                msc.will_stretch = !!(c.size_flags_horizontal & SIZE_EXPAND);
            }

            if (msc.will_stretch) {
                stretch_avail += msc.min_size;
                stretch_ratio_total += c.size_flags_stretch_ratio;
            }
            msc.final_size = msc.min_size;
            min_size_cache[c.instance_id] = msc;
            children_count++;

            Vector2.free(size);
        }

        if (children_count === 0) {
            return;
        }

        let stretch_max = (this.vertical ? new_size.height : new_size.width) - (children_count - 1) * sep;
        let stretch_diff = stretch_max - stretch_min;
        if (stretch_diff < 0) {
            // Avoid negative stretch space
            stretch_max = stretch_min;
            stretch_diff = 0;
        }

        stretch_avail += stretch_diff;

        /** Second, pass sucessively to discard elements that can't be stretched, this will run while stretchable
            elements exist */

        let has_stretched = false;
        while (stretch_ratio_total > 0) {
            has_stretched = true;
            let refit_successful = true;

            for (let node of this.data.children) {
                const c = /** @type {Container} */(node);

                if (!c.is_control || c.is_set_as_toplevel() || !c.is_visible_in_tree()) {
                    continue;
                }

                let msc = min_size_cache[c.instance_id];

                if (msc.will_stretch) {
                    let final_pixel_size = stretch_avail * c.size_flags_stretch_ratio / stretch_ratio_total;
                    if (final_pixel_size < msc.min_size) {
                        msc.will_stretch = false;
                        stretch_ratio_total -= c.size_flags_stretch_ratio;
                        refit_successful = false;
                        stretch_avail -= msc.min_size;
                        msc.final_size = msc.min_size;
                        break;
                    } else {
                        msc.final_size = final_pixel_size;
                    }
                }
            }

            if (refit_successful) {
                break;
            }
        }

        /** Final pass, draw and stretch elements **/

        let ofs = 0;
        if (!has_stretched) {
            switch (this.alignment) {
                case ALIGN_BEGIN: {
                } break;
                case ALIGN_CENTER: {
                    ofs = stretch_diff * 0.5;
                } break;
                case ALIGN_END: {
                    ofs = stretch_diff;
                } break;
            }
        }

        first = true;
        let idx = 0;

        for (const node of this.data.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || c.is_set_as_toplevel() || !c.is_visible_in_tree()) {
                continue;
            }

            let msc = min_size_cache[c.instance_id];

            if (first) {
                first = false;
            } else {
                ofs += sep;
            }

            let from = ofs;
            let to = ofs + msc.final_size;

            if (msc.will_stretch && idx === children_count - 1) {
                to = this.vertical ? new_size.height : new_size.width;
            }

            let size = to - from;

            const rect = Rect2.new();

            if (this.vertical) {
                rect.x = 0;
                rect.y = from;
                rect.width = new_size.width;
                rect.height = size;
            } else {
                rect.x = from;
                rect.y = 0;
                rect.width = size;
                rect.height = new_size.height;
            }

            this.fit_child_in_rect(c, rect);

            Rect2.free(rect);

            ofs = to;
            idx++;
        }
    }
}
GDCLASS(BoxContainer, Container)

export class HBoxContainer extends BoxContainer {
    get class() { return 'HBoxContainer' }
    constructor() {
        super(false);
    }
}
node_class_map['HBoxContainer'] = GDCLASS(HBoxContainer, BoxContainer)

export class VBoxContainer extends BoxContainer {
    get class() { return 'VBoxContainer' }
    constructor() {
        super(true);
    }

    /**
     * @param {string} p_label
     * @param {Control} p_control
     * @param {boolean} p_expand
     */
    add_margin_child(p_label, p_control, p_expand = false) {
        // TODO: add label and margin container here
    }
}
node_class_map['VBoxContainer'] = GDCLASS(VBoxContainer, BoxContainer)
