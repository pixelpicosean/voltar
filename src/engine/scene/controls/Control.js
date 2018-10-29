import {
    Vector2,
    Rectangle,
    rad2deg,
    deg2rad,
    clamp,
} from 'engine/math/index';
import MessageQueue from 'engine/MessageQueue';
import { BLEND_MODES } from 'engine/const';
import Node2D from '../Node2D';

import { node_class_map } from 'engine/registry';

/**
 * @enum {number}
 */
export const Margin = {
    Left: 0,
    Top: 1,
    Right: 2,
    Bottom: 3,
}

/**
 * @enum {number}
 */
export const SizeFlag = {
    FILL: 1,
    EXPAND: 2,
    EXPAND_FILL: 3,
    SHRINK_CENTER: 4,
    SHRINK_END: 8,
}

/**
 * @enum {number}
 */
export const GrowDirection = {
    BEGIN: 0,
    END: 1,
    BOTH: 2,
}

/**
 * @enum {number}
 */
export const Anchor = {
    BEGIN: 0,
    END: 1,
}

/**
 * @enum {number}
 */
export const LayoutPresetMode = {
    MINSIZE: 0,
    KEEP_WIDTH: 1,
    KEEP_HEIGHT: 2,
    KEEP_SIZE: 3,
}

/**
 * @enum {number}
 */
export const LayoutPreset = {
    TOP_LEFT: 0,
    TOP_RIGHT: 1,
    BOTTOM_LEFT: 2,
    BOTTOM_RIGHT: 3,
    CENTER_LEFT: 4,
    CENTER_TOP: 5,
    CENTER_RIGHT: 6,
    CENTER_BOTTOM: 7,
    CENTER: 8,
    LEFT_WIDE: 9,
    TOP_WIDE: 10,
    RIGHT_WIDE: 11,
    BOTTOM_WIDE: 12,
    VCENTER_WIDE: 13,
    HCENTER_WIDE: 14,
    WIDE: 15,
}

const tmp_vec = new Vector2();
const tmp_vec2 = new Vector2();
const tmp_vec3 = new Vector2();
const tmp_vec4 = new Vector2();
const tmp_vec5 = new Vector2();
const tmp_vec6 = new Vector2();
const tmp_vec7 = new Vector2();
const tmp_vec8 = new Vector2();
const tmp_vec9 = new Vector2();
const tmp_vec10 = new Vector2();

const tmp_rect = new Rectangle();
const tmp_rect2 = new Rectangle();
const tmp_rect3 = new Rectangle();
const tmp_rect4 = new Rectangle();
const tmp_rect5 = new Rectangle();

const margin_pos = [0, 0, 0, 0];

const new_pos_cache = new Vector2();
const new_size_cache = new Vector2();

export default class Control extends Node2D {
    /**
     * @param {Margin} margin
     * @param {Anchor} anchor
     * @param {boolean} keep_margin
     * @param {boolean} push_opposite_anchor
     * @returns this
     */
    set_anchor(margin, anchor, keep_margin = true, push_opposite_anchor = true) {
        const parent_rect = this.get_parent_anchorable_rect(tmp_rect5);
        let parent_range = (margin === Margin.Left || margin === Margin.Right) ? parent_rect.width : parent_rect.height;
        let previous_margin_pos = this.data.margin[margin] + this.data.anchor[margin] * parent_range;
        let previous_opposite_margin_pos = this.data.margin[(margin + 2) % 4] + this.data.anchor[(margin + 2) % 4] * parent_range;

        this.data.anchor[margin] = clamp(anchor, 0.0, 1.0);

        if (
            ((margin === Margin.Left || margin === Margin.Top) && this.data.anchor[margin] > this.data.anchor[(margin + 2) % 4])
            ||
            ((margin === Margin.Right || margin === Margin.Bottom) && this.data.anchor[margin] < this.data.anchor[(margin + 2) % 4])
        ) {
            if (push_opposite_anchor) {
                this.data.anchor[(margin + 2) % 4] = this.data.anchor[margin];
            } else {
                this.data.anchor[margin] = this.data.anchor[(margin + 2) % 4];
            }
        }

        if (keep_margin) {
            this.data.margin[margin] = previous_margin_pos - this.data.anchor[margin] * parent_range;
            if (push_opposite_anchor) {
                this.data.margin[(margin + 2) % 4] = previous_opposite_margin_pos - this.data.anchor[(margin + 2) % 4] * parent_range;
            }
        }
        if (this.is_inside_tree) {
            this._size_changed();
        }

        return this;
    }
    /**
     * @param {Margin} margin
     * @param {number} value
     * @return this
     */
    set_margin(margin, value) {
        this.data.margin[margin] = value;
        this._size_changed();

        return this;
    }

    /**
     * @type {Anchor}
     */
    get anchor_bottom() {
        return this.data.anchor[Margin.Bottom];
    }
    set anchor_bottom(value) {
        this.set_anchor(Margin.Bottom, value);
    }
    /**
     * @param {Anchor} value
     * @return this
     */
    set_anchor_bottom(value) {
        this.set_anchor(Margin.Bottom, value);
        return this;
    }

    /**
     * @type {Anchor}
     */
    get anchor_left() {
        return this.data.anchor[Margin.Left];
    }
    set anchor_left(value) {
        this.set_anchor(Margin.Left, value);
    }
    /**
     * @param {Anchor} value
     * @return this
     */
    set_anchor_left(value) {
        this.set_anchor(Margin.Left, value);
        return this;
    }

    /**
     * @type {Anchor}
     */
    get anchor_top() {
        return this.data.anchor[Margin.Top];
    }
    set anchor_top(value) {
        this.set_anchor(Margin.Top, value);
    }
    /**
     * @param {Anchor} value
     * @return this
     */
    set_anchor_top(value) {
        this.set_anchor(Margin.Top, value);
        return this;
    }

    /**
     * @type {Anchor}
     */
    get anchor_right() {
        return this.data.anchor[Margin.Right];
    }
    set anchor_right(value) {
        this.set_anchor(Margin.Right, value);
    }
    /**
     * @param {Anchor} value
     * @return this
     */
    set_anchor_right(value) {
        this.set_anchor(Margin.Right, value);
        return this;
    }

    /**
     * @type {Anchor}
     */
    get margin_bottom() {
        return this.data.margin[Margin.Bottom];
    }
    set margin_bottom(value) {
        this.set_margin(Margin.Bottom, value);
    }
    /**
     * @param {Anchor} value
     * @return this
     */
    set_margin_bottom(value) {
        this.set_margin(Margin.Bottom, value);
        return this;
    }

    /**
     * @type {Anchor}
     */
    get margin_left() {
        return this.data.margin[Margin.Left];
    }
    set margin_left(value) {
        this.set_margin(Margin.Left, value);
    }
    /**
     * @param {Anchor} value
     * @return this
     */
    set_margin_left(value) {
        this.set_margin(Margin.Left, value);
        return this;
    }

    /**
     * @type {Anchor}
     */
    get margin_top() {
        return this.data.margin[Margin.Top];
    }
    set margin_top(value) {
        this.set_margin(Margin.Top, value);
    }
    /**
     * @param {Anchor} value
     * @return this
     */
    set_margin_top(value) {
        this.set_margin(Margin.Top, value);
        return this;
    }

    /**
     * @type {Anchor}
     */
    get margin_right() {
        return this.data.margin[Margin.Right];
    }
    set margin_right(value) {
        this.set_margin(Margin.Right, value);
    }
    /**
     * @param {Anchor} value
     * @return this
     */
    set_margin_right(value) {
        this.set_margin(Margin.Right, value);
        return this;
    }

    get mouse_default_cursor_shape() {
        return this.cursor;
    }
    set mouse_default_cursor_shape(value) {
        this.cursor = value;
    }
    set_mouse_default_cursor_shape(value) {
        this.cursor = value;
    }

    get rect_size() {
        return this.data.size_cache;
    }
    set rect_size(value) {
        const new_size = tmp_vec.copy(value);
        const min = this.get_combined_minimum_size(tmp_vec2);
        if (new_size.x < min.x) {
            new_size.x = min.x;
        }
        if (new_size.y < min.y) {
            new_size.y = min.y;
        }

        tmp_rect.x = this.data.pos_cache.x;
        tmp_rect.y = this.data.pos_cache.y;
        tmp_rect.width = new_size.x;
        tmp_rect.height = new_size.y;
        this._compute_margins(tmp_rect, this.data.anchor, this.data.margin);
        this._size_changed();
    }
    /**
     * @param {number|import('engine/math/Vector2').Vector2Like} x
     * @param {number} [y]
     */
    set_rect_size(x, y) {
        if (y !== undefined) {
            // @ts-ignore
            tmp_vec6.set(x, y);
        } else {
            // @ts-ignore
            tmp_vec6.copy(x);
        }
        this.rect_size = tmp_vec6;

        return this;
    }

    get rect_position() {
        return this.data.pos_cache;
    }
    set rect_position(value) {
        tmp_rect4.x = value.x;
        tmp_rect4.y = value.y;
        this._compute_margins(tmp_rect4, this.data.anchor, this.data.margin);
        this._size_changed();
    }
    /**
     * @param {number|import('engine/math/Vector2').Vector2Like} x
     * @param {number} [y]
     */
    set_rect_position(x, y) {
        if (y !== undefined) {
            // @ts-ignore
            tmp_vec7.set(x, y);
        } else {
            // @ts-ignore
            tmp_vec7.copy(x);
        }

        this.rect_position = tmp_vec7;

        return this;
    }

    get rect_min_size() {
        return this.data.custom_minimum_size;
    }
    set rect_min_size(value) {
        if (value.equals(this.data.custom_minimum_size)) {
            return;
        }

        this.data.custom_minimum_size.copy(value);
        this.minimum_size_changed();

        this.set_rect_min_size(value);
    }
    /**
     * @param {number|import('engine/math/Vector2').Vector2Like} x
     * @param {number} [y]
     */
    set_rect_min_size(x, y) {
        if (y !== undefined) {
            // @ts-ignore
            tmp_vec5.set(x, y);
        } else {
            // @ts-ignore
            tmp_vec5.copy(x);
        }

        this.rect_min_size = tmp_vec5;

        return this;
    }

    get rect_rotation() {
        return rad2deg(this.data.rotation);
    }
    set rect_rotation(value) {
        this.rotation = deg2rad(value);
    }
    set_rect_rotation(value) {
        this.rect_rotation = value;

        return this;
    }

    get rotation() {
        return this.data.rotation;
    }
    set rotation(value) {
        this.data.rotation = value;
        this.transform.rotation = value;
        this.update_transform();
    }
    set_rotation(value) {
        this.rotation = value;

        return this;
    }

    get rect_scale() {
        return this.data.scale;
    }
    set rect_scale(value) {
        this.data.scale.copy(value);
        this.transform.scale.copy(this.data.scale);
        this.update_transform();
    }
    /**
     * @param {number|import('engine/math/Vector2').Vector2Like} x
     * @param {number} [y]
     */
    set_rect_scale(x, y) {
        if (y !== undefined) {
            // @ts-ignore
            tmp_vec8.set(x, y);
        } else {
            // @ts-ignore
            tmp_vec8.copy(x);
        }

        this.rect_scale = tmp_vec8;

        return this;
    }

    get rect_global_position() {
        return this._world_position;
    }
    set rect_global_position(value) {
        this._world_position.copy(value);

        if (this.data.parent_canvas_item) {
            this.data.parent_canvas_item.transform.world_transform.apply_inverse(this._world_position, this.position);
        }
    }
    /**
     * @param {number|import('engine/math/Vector2').Vector2Like} x
     * @param {number} [y]
     */
    set_rect_global_position(x, y) {
        if (y !== undefined) {
            // @ts-ignore
            tmp_vec9.set(x, y);
        } else {
            // @ts-ignore
            tmp_vec9.copy(x);
        }

        this.rect_global_position = tmp_vec9;

        return this;
    }

    get rect_pivot_offset() {
        return this.data.pivot_offset;
    }
    set rect_pivot_offset(value) {
        this.data.pivot_offset.copy(value);
    }
    /**
     * @param {number|import('engine/math/Vector2').Vector2Like} x
     * @param {number} [y]
     */
    set_rect_pivot_offset(x, y) {
        if (y !== undefined) {
            // @ts-ignore
            tmp_vec10.set(x, y);
        } else {
            // @ts-ignore
            tmp_vec10.copy(x);
        }

        this.rect_pivot_offset = tmp_vec10;

        return this;
    }

    get rect_clip_content() {
        return this.data.clip_contents;
    }
    set rect_clip_content(value) {
        this.data.rect_clip_content = value;
    }
    set_rect_clip_content(value) {
        this.rect_clip_content = value;

        return this;
    }

    /**
     * @type {SizeFlag}
     */
    get size_flags_horizontal() {
        return this.data.h_size_flags;
    }
    set size_flags_horizontal(value) {
        if (this.data.h_size_flags === value) {
            return;
        }
        this.data.h_size_flags = value;
        // emit_signal('size_flags_changed)
    }
    set_size_flags_horizontal(value) {
        this.size_flags_horizontal = value;
        return this;
    }

    /**
     * @type {SizeFlag}
     */
    get size_flags_vertical() {
        return this.data.v_size_flags;
    }
    set size_flags_vertical(value) {
        if (this.data.v_size_flags === value) {
            return;
        }
        this.data.v_size_flags = value;
        // emit_signal('size_flags_changed)
    }
    set_size_flags_vertical(value) {
        this.size_flags_vertical = value;
        return this;
    }

    get size_flags_stretch_ratio() {
        return this.data.expand;
    }
    set size_flags_stretch_ratio(value) {
        if (this.data.expand === value) {
            return;
        }
        this.data.expand = value;
        // emit_signal('size_flags_changed)
    }
    set_size_flags_stretch_ratio(value) {
        this.size_flags_stretch_ratio = value;
        return this;
    }

    /**
     * @type {GrowDirection}
     */
    get grow_horizontal() {
        return this.data.h_grow;
    }
    set grow_horizontal(value) {
        this.data.h_grow = value;
        this._size_changed();
    }
    set_grow_horizontal(value) {
        this.grow_horizontal = value;
        return this;
    }
    /**
     * @type {GrowDirection}
     */
    get grow_vertical() {
        return this.data.v_grow;
    }
    set grow_vertical(value) {
        this.data.v_grow = value;
        this._size_changed();
    }
    set_grow_vertical(value) {
        this.grow_vertical = value;
        return this;
    }

    constructor() {
        super();

        this.type = 'Control';

        this.data = {
            pos_cache: new Vector2(),
            size_cache: new Vector2(),
            minimum_size_cache: new Vector2(),
            minimum_size_valid: false,

            last_minimum_size: new Vector2(),
            updating_last_minimum_size: false,

            margin: [0, 0, 0, 0],
            anchor: [0, 0, 0, 0],
            h_grow: GrowDirection.BEGIN,
            v_grow: GrowDirection.BEGIN,

            rotation: 0,
            scale: new Vector2(1, 1),
            pivot_offset: new Vector2(),

            pending_resize: false,

            h_size_flags: SizeFlag.FILL,
            v_size_flags: SizeFlag.FILL,
            expand: 1,
            custom_minimum_size: new Vector2(),

            pass_on_modal_close_click: false,

            clip_contents: false,

            block_minimum_size_adjust: false,
            disable_visibility_clip: false,

            /**
             * @type {Control}
             */
            parent: null,
            modal_exclusive: false,
            modal_frames: 0,
            theme: null,
            /**
             * @type {Node2D}
             */
            theme_owner: null,

            /**
             * @type {Node2D}
             */
            parent_canvas_item: null,

            icon_override: undefined,
            style_override: undefined,
            font_override: undefined,
            color_override: undefined,
            constant_override: undefined,
        };

        this.blend_mode = BLEND_MODES.NORMAL;
    }
    _load_data(data) {
        super._load_data(data);

        for (let k in data) {
            switch (k) {
                case 'anchor_bottom':
                case 'anchor_left':
                case 'anchor_right':
                case 'anchor_top':

                case 'margin_bottom':
                case 'margin_left':
                case 'margin_right':
                case 'margin_top':

                case 'rect_min_size':
                case 'rect_rotation':
                case 'rect_scale':
                case 'rect_pivot_offset':
                case 'rect_clip_content':

                case 'grow_horizontal':
                case 'grow_vertical':

                case 'mouse_default_cursor_shape':

                case 'size_flags_horizontal':
                case 'size_flags_vertical':
                case 'size_flags_stretch_ratio': {
                    this[`set_${k}`](data[k]);
                }
            }
        }

        return this;
    }

    _propagate_enter_tree() {
        this.data.parent_canvas_item = this.get_parent_item();
        if (this.parent instanceof Control) {
            this.data.parent = this.parent;
        }

        super._propagate_enter_tree();
    }

    /**
     * @param {Vector2} size
     * @return {Vector2}
     */
    get_minimum_size(size) {
        return size.copy(this.rect_min_size);
    }
    /**
     * @param {Vector2} size
     * @return {Vector2}
     */
    get_combined_minimum_size(size) {
        if (!this.data.minimum_size_valid) {
            this._update_minimum_size_cache();
        }
        return size.copy(this.data.minimum_size_cache);
    }

    /**
     * @param {Rectangle} rect
     * @returns {Rectangle}
     */
    get_parent_anchorable_rect(rect) {
        if (!this.is_inside_tree) {
            rect.x = 0;
            rect.y = 0;
            rect.width = 0;
            rect.height = 0;
            return rect;
        }

        if (this.data.parent_canvas_item) {
            return this.data.parent_canvas_item.get_anchorable_rect(rect);
        } else {
            const v_rect = this.scene_tree.viewport_rect;
            rect.x = v_rect.position.x;
            rect.y = v_rect.position.y;
            rect.width = v_rect.size.x;
            rect.height = v_rect.size.y;
            return rect;
        }
    }
    /**
     * @param {Rectangle} rect
     * @returns {Rectangle}
     */
    get_anchorable_rect(rect) {
        rect.x = 0;
        rect.y = 0;
        rect.width = this.data.size_cache.x;
        rect.height = this.data.size_cache.y;
        return rect;
    }

    _compute_margins(rect, anchors, margins) {
        const parent_rect = this.get_parent_anchorable_rect(tmp_rect2);
        margins[0] = Math.floor(rect.x - (anchors[0] * parent_rect.width));
        margins[1] = Math.floor(rect.y - (anchors[1] * parent_rect.height));
        margins[2] = Math.floor(rect.x + rect.width - (anchors[2] * parent_rect.width));
        margins[3] = Math.floor(rect.x + rect.height - (anchors[3] * parent_rect.height));
    }

    minimum_size_changed() {
        if (!this.is_inside_tree || this.data.block_minimum_size_adjust) {
            return;
        }

        let invalidate = this;

        while (invalidate && invalidate.data.minimum_size_valid) {
            invalidate.data.minimum_size_valid = false;
            if (invalidate.is_set_as_toplevel()) {
                break;
            }
            // @ts-ignore
            invalidate = invalidate.data.parent;
        }

        if (!this.world_visible) {
            return;
        }

        if (this.data.updating_last_minimum_size) {
            return;
        }

        this.data.updating_last_minimum_size = true;

        MessageQueue.get_singleton().push_call(this, '_update_minimum_size');
    }
    _size_changed() {
        const parent_rect = this.get_parent_anchorable_rect(tmp_rect3);
        margin_pos[0] = 0;
        margin_pos[1] = 0;
        margin_pos[2] = 0;
        margin_pos[3] = 0;

        for (let i = 0; i < 4; i++) {
            margin_pos[i] = this.data.margin[i] + (this.data.anchor[i] * ((i % 2 === 0) ? parent_rect.width : parent_rect.height));
        }

        new_pos_cache.set(margin_pos[0], margin_pos[1]);
        new_size_cache.set(margin_pos[2], margin_pos[3]);

        const minimum_size = this.get_combined_minimum_size(tmp_vec4);

        if (minimum_size.x > new_size_cache.x) {
            if (this.data.h_grow === GrowDirection.BEGIN) {
                new_pos_cache.x += new_size_cache.x - minimum_size.x;
            } else if (this.data.h_grow === GrowDirection.BOTH) {
                new_pos_cache.x += 0.5 * (new_size_cache.x - minimum_size.x);
            }

            new_size_cache.x = minimum_size.x;
        }

        if (minimum_size.y > new_size_cache.y) {
            if (this.data.v_grow === GrowDirection.BEGIN) {
                new_pos_cache.y += new_size_cache.y - minimum_size.y;
            } else if (this.data.v_grow === GrowDirection.BOTH) {
                new_pos_cache.y += 0.5 * (new_size_cache.y - minimum_size.y);
            }

            new_size_cache.y = minimum_size.y;
        }

        let pos_changed = !new_pos_cache.equals(this.data.pos_cache);
        let size_changed = !new_size_cache.equals(this.data.size_cache);

        this.data.pos_cache.copy(new_pos_cache);
        this.data.size_cache.copy(new_size_cache);

        if (this.is_inside_tree) {
            if (size_changed) {
                this._resized();
            }
            if (pos_changed || size_changed) {
                // FIXME: item_rect_changed not implemented yet
                // this.item_rect_changed(size_changed);

                // this._change_notify_margins(); // this is editor only

                // FIXME: do we need this?
                // this.position.copy(this.data.pos_cache);
                // this.scale.copy(this.data.scale);
                this.update_transform();
            }

            if (pos_changed && !size_changed) {
                // FIXME: do we need to update it here?
                // this.position.copy(this.data.pos_cache);
                // this.scale.copy(this.data.scale);
                this._update_transform();
            }
        }

        this.transform.position.copy(this.data.pos_cache);
        this.transform.rotation = this.data.rotation;
        this.transform.scale.copy(this.data.scale);
    }

    _update_minimum_size_cache() {
        const minsize = this.get_minimum_size(tmp_vec3);
        minsize.x = Math.max(minsize.x, this.data.custom_minimum_size.x);
        minsize.y = Math.max(minsize.y, this.data.custom_minimum_size.y);

        let size_changed = false;
        if (!this.data.minimum_size_cache.equals(minsize)) {
            size_changed = true;
        }

        this.data.minimum_size_cache.copy(minsize);
        this.data.minimum_size_valid = true;

        if (size_changed) {
            this.minimum_size_changed();
        }
    }
}

node_class_map['Control'] = Control;
