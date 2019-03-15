import Container from "./container";
import Control from "./control";
import { SizeFlag } from "./const";
import { Vector2, Rectangle } from "engine/core/math/index";
import { node_class_map } from "engine/registry";

/**
 * @enum {number}
 */
export const AlignMode = {
    BEGIN: 0,
    CENTER: 1,
    END: 2,
}

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

const tmp_vec = new Vector2();
const tmp_vec2 = new Vector2();
const tmp_vec3 = new Vector2();

export default class BoxContainer extends Container {
    get alignment() {
        return this.align;
    }
    /**
     * @param {AlignMode} value
     */
    set alignment(value) {
        this.align = value;
        this._resort();
    }
    /**
     * @param {AlignMode} value
     */
    set_alignment(value) {
        this.align = value;
        return this;
    }

    constructor(vertical = false) {
        super();

        this.type = 'BoxContainer';

        this.vertical = vertical;
        this.align = AlignMode.BEGIN;
    }

    _load_data(data) {
        super._load_data(data);

        if (data.alignment !== undefined) {
            this.alignment = data.alignment;
        }
        if (data.separation !== undefined) {
            this.add_constant_override('separation', data.separation);
        }

        return this;
    }

    _children_sorted() {
        this._resort();
    }

    add_spacer(begin = false) {
        const c = new Control();

        if (this.vertical) {
            c.size_flags_vertical = SizeFlag.EXPAND_FILL;
        } else {
            c.size_flags_horizontal = SizeFlag.EXPAND_FILL;
        }

        this.add_child(c);
        if (begin) {
            this.move_child(c, 0);
        }
    }

    /**
     * @param {Vector2} size
     */
    get_minimum_size(size) {
        const minimum = size.set(0, 0);
        const sep = this.get_constant('separation');

        let first = true;

        for (const node of this.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || !c.world_visible) {
                continue;
            }
            if (c.toplevel) {
                continue;
            }

            const size = c.get_combined_minimum_size(tmp_vec3);

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
        }

        return minimum;
    }

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

        for (const node of this.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || !c.world_visible) {
                continue;
            }
            if (c.toplevel) {
                continue;
            }

            const size = c.get_combined_minimum_size(tmp_vec);
            const msc = new MinSizeCache();

            if (this.vertical) {
                stretch_min += size.height;
                msc.min_size = size.height;
                msc.will_stretch = !!(c.size_flags_vertical & SizeFlag.EXPAND);
            } else {
                stretch_min += size.width;
                msc.min_size = size.width;
                msc.will_stretch = !!(c.size_flags_horizontal & SizeFlag.EXPAND);
            }

            if (msc.will_stretch) {
                stretch_avail += msc.min_size;
                stretch_ratio_total += c.size_flags_stretch_ratio;
            }
            msc.final_size = msc.min_size;
            min_size_cache[c.id] = msc;
            children_count++;
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

            for (let c of this.children) {
                if (!(c instanceof Control) || !c.world_visible) {
                    continue;
                }
                if (c.toplevel) {
                    continue;
                }

                let msc = min_size_cache[c.id];

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
            switch (this.align) {
                case AlignMode.BEGIN: {
                } break;
                case AlignMode.CENTER: {
                    ofs = stretch_diff * 0.5;
                } break;
                case AlignMode.END: {
                    ofs = stretch_diff;
                } break;
            }
        }

        first = true;
        let idx = 0;

        for (const node of this.children) {
            const c = /** @type {Container} */(node);

            if (!c.is_control || !c.world_visible) {
                continue;
            }
            if (c.toplevel) {
                continue;
            }

            let msc = min_size_cache[c.id];

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

            const rect = Rectangle.new();

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

            Rectangle.free(rect);

            ofs = to;
            idx++;
        }
    }
}

export class HBoxContainer extends BoxContainer {
    constructor() {
        super(false);

        this.type = 'HBoxContainer';
    }
}

export class VBoxContainer extends BoxContainer {
    constructor() {
        super(true);

        this.type = 'VBoxContainer';
    }
}

node_class_map['VBoxContainer'] = VBoxContainer;
node_class_map['HBoxContainer'] = HBoxContainer;
