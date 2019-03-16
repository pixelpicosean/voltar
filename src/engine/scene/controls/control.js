import {
    Vector2,
    Rectangle,
    rad2deg,
    deg2rad,
    clamp,
    Matrix,
} from 'engine/core/math/index';
import MessageQueue from 'engine/core/message_queue';
import { BLEND_MODES } from 'engine/const';
import Node2D from '../node_2d';
import { node_class_map } from 'engine/registry';

import {
    Margin,
    Anchor,
    SizeFlag,
    GrowDirection,
} from './const';
import Theme from '../resources/theme';
import Font from '../resources/font';
import Color from 'engine/core/color';

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
const tmp_vec11 = new Vector2();

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
        this._size_changed();

        return this;
    }
    /**
     * @param {Margin} margin
     * @param {number} value
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
     */
    set_margin_right(value) {
        this.set_margin(Margin.Right, value);
        return this;
    }

    /**
     * @type {string}
     */
    get mouse_default_cursor_shape() {
        return this.cursor;
    }
    set mouse_default_cursor_shape(value) {
        this.cursor = value;
    }
    /**
     * @param {string} value
     */
    set_mouse_default_cursor_shape(value) {
        this.cursor = value;
        return this;
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
     * @param {number|import('engine/core/math/vector2').Vector2Like} x
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
        tmp_rect4.width = 0;
        tmp_rect4.height = 0;
        this._compute_margins(tmp_rect4, this.data.anchor, this.data.margin);
        this._size_changed();
    }
    /**
     * @param {number|import('engine/core/math/vector2').Vector2Like} x
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
        if (this.data.custom_minimum_size.equals(value)) {
            return;
        }

        this.data.custom_minimum_size.copy(value);
        this.minimum_size_changed();

        this.set_rect_min_size(value);
    }
    /**
     * @param {number|import('engine/core/math/vector2').Vector2Like} x
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
    }
    /**
     * @param {number|import('engine/core/math/vector2').Vector2Like} x
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
            this.data.parent_canvas_item.transform.world_transform.xform_inv(this._world_position, this.position);
        }
    }
    /**
     * @param {number|import('engine/core/math/vector2').Vector2Like} x
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
     * @param {number|import('engine/core/math/vector2').Vector2Like} x
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
        this.emit_signal('size_flags_changed');
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
        this.emit_signal('size_flags_changed');
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
        this.emit_signal('size_flags_changed');
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

    get_parent_control() {
        return this.data.parent;
    }

    constructor() {
        super();
        const self = this;

        this.type = 'Control';

        this.is_control = true;

        this.data = {
            pos_cache: new Vector2(),
            size_cache: new Vector2(),
            minimum_size_cache: new Vector2(),
            minimum_size_valid: false,

            last_minimum_size: new Vector2(),
            updating_last_minimum_size: false,

            margin: [0, 0, 0, 0],
            anchor: [0, 0, 0, 0],
            h_grow: GrowDirection.END,
            v_grow: GrowDirection.END,

            rotation: 0,
            scale: new Vector2(1, 1),
            pivot_offset: new Vector2(0, 0),

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

        this.hit_area = new Rectangle();
    }
    _load_data(data) {
        super._load_data(data);

        if (data.anchor_bottom !== undefined) {
            this.anchor_bottom = data.anchor_bottom;
        }
        if (data.anchor_left !== undefined) {
            this.anchor_left = data.anchor_left;
        }
        if (data.anchor_right !== undefined) {
            this.anchor_right = data.anchor_right;
        }
        if (data.anchor_top !== undefined) {
            this.anchor_top = data.anchor_top;
        }

        if (data.margin_bottom !== undefined) {
            this.margin_bottom = data.margin_bottom;
        }
        if (data.margin_left !== undefined) {
            this.margin_left = data.margin_left;
        }
        if (data.margin_right !== undefined) {
            this.margin_right = data.margin_right;
        }
        if (data.margin_top !== undefined) {
            this.margin_top = data.margin_top;
        }

        if (data.rect_min_size !== undefined) {
            this.rect_min_size = data.rect_min_size;
        }
        if (data.rect_rotation !== undefined) {
            this.rect_rotation = data.rect_rotation;
        }
        if (data.rect_scale !== undefined) {
            this.rect_scale = data.rect_scale;
        }
        if (data.rect_pivot_offset !== undefined) {
            this.rect_pivot_offset = data.rect_pivot_offset;
        }
        if (data.rect_clip_content !== undefined) {
            this.rect_clip_content = data.rect_clip_content;
        }

        if (data.grow_horizontal !== undefined) {
            this.grow_horizontal = data.grow_horizontal;
        }
        if (data.grow_vertical !== undefined) {
            this.grow_vertical = data.grow_vertical;
        }

        if (data.mouse_default_cursor_shape !== undefined) {
            this.mouse_default_cursor_shape = data.mouse_default_cursor_shape;
        }

        if (data.size_flags_horizontal !== undefined) {
            this.size_flags_horizontal = data.size_flags_horizontal;
        }
        if (data.size_flags_vertical !== undefined) {
            this.size_flags_vertical = data.size_flags_vertical;
        }
        if (data.size_flags_stretch_ratio !== undefined) {
            this.size_flags_stretch_ratio = data.size_flags_stretch_ratio;
        }

        return this;
    }
    _theme_changed() { }

    _propagate_enter_tree() {
        this.data.parent_canvas_item = this.get_parent_item();
        if (this.parent.is_control) {
            this.data.parent = /** @type {Control} */(this.parent);
        }

        this.data.minimum_size_valid = false;
        this._size_changed();

        super._propagate_enter_tree();
    }

    _get_minimum_size() { return Vector2.new(0, 0) }

    /**
     *
     * @param {Node2D} child
     */
    add_child_notify(child) {
        // TODO: change child's theme if we have any
    }
    /**
     *
     * @param {Node2D} child
     */
    remove_child_notify(child) {
        // TODO: unset child's theme owner
    }

    update_transform() {
        this.transform.position.copy(this.data.pos_cache).add(this.data.pivot_offset);
        this.transform.rotation = this.data.rotation;
        this.transform.scale.copy(this.data.scale);
        this.transform.pivot.copy(this.data.pivot_offset);

        super.update_transform();

        // Update hit area
        this.hit_area.x = -this.data.pivot_offset.x;
        this.hit_area.y = -this.data.pivot_offset.y;
        this.hit_area.width = this.data.size_cache.x;
        this.hit_area.height = this.data.size_cache.y;
    }

    /**
     * @param {Vector2} size
     */
    get_minimum_size(size) {
        const min_size = this._get_minimum_size();
        size.copy(min_size);
        if (min_size !== Vector2.ZERO) {
            Vector2.free(min_size);
        }
        return size;
    }
    /**
     * @param {Vector2} size
     */
    get_combined_minimum_size(size) {
        if (!this.data.minimum_size_valid) {
            this._update_minimum_size_cache();
        }
        return size.copy(this.data.minimum_size_cache);
    }

    /**
     * @param {Rectangle} rect
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
     */
    get_anchorable_rect(rect) {
        rect.x = 0;
        rect.y = 0;
        rect.width = this.data.size_cache.x;
        rect.height = this.data.size_cache.y;
        return rect;
    }

    /**
     * @param {string} name
     * @param {string} [type]
     */
    get_constant(name, type) {
        if (!type) {
            if (this.data.constant_override) {
                const c = this.data.constant_override[name];
                if (c !== undefined) {
                    return c;
                }
            }

            type = this.type;
        }

        // TODO: Loop through theme owners and find the value

        return Theme.get_default().get_constant(name, type);
    }
    /**
     * @param {string} name
     * @param {string} [type]
     */
    get_stylebox(name, type) {
        if (!type) {
            if (this.data.stylebox_override) {
                const stylebox = this.data.stylebox_override[name];
                if (stylebox !== undefined) {
                    return stylebox;
                }
            }

            type = this.type;
        }

        // TODO: try with custom themes

        return Theme.get_default().get_stylebox(name, type);
    }
    /**
     * @param {string} name
     * @param {string} [type]
     */
    get_font(name, type) {
        if (!type) {
            if (this.data.font_override) {
                const font = this.data.font_override[name];
                if (font !== undefined) {
                    return font;
                }
            }

            type = this.type;
        }

        // TODO: try with custom themes

        return Theme.get_default().get_font(name, type);
    }
    /**
     * @param {string} name
     * @param {string} [type]
     */
    get_color(name, type) {
        if (!type) {
            if (this.data.color_override) {
                const color = this.data.color_override[name];
                if (color !== undefined) {
                    return color;
                }
            }

            type = this.type;
        }

        // TODO: try with custom themes

        return Theme.get_default().get_color(name, type);
    }

    /**
     * @param {string} name
     * @param {Font} font
     */
    add_font_override(name, font) {
        this.data.font_override = this.data.font_override || {};
        this.data.font_override[name] = font;
        this._theme_changed();
        return this;
    }
    /**
     * @param {string} name
     * @param {Color} color
     */
    add_color_override(name, color) {
        this.data.color_override = this.data.color_override || {};
        this.data.color_override[name] = color;
        this._theme_changed();
        return this;
    }
    /**
     * @param {string} name
     * @param {number} p_constant
     */
    add_constant_override(name, p_constant) {
        this.data.constant_override = this.data.constant_override || {};
        this.data.constant_override[name] = p_constant;
        this._theme_changed();
        return this;
    }

    /**
     * @param {Rectangle} rect
     * @param {number[]} anchors
     * @param {number[]} margins
     */
    _compute_margins(rect, anchors, margins) {
        const parent_rect = this.get_parent_anchorable_rect(tmp_rect2);
        margins[0] = Math.floor(rect.x - (anchors[0] * parent_rect.width));
        margins[1] = Math.floor(rect.y - (anchors[1] * parent_rect.height));
        margins[2] = Math.floor(rect.x + rect.width - (anchors[2] * parent_rect.width));
        margins[3] = Math.floor(rect.y + rect.height - (anchors[3] * parent_rect.height));
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
        new_size_cache.set(margin_pos[2], margin_pos[3]).subtract(new_pos_cache);

        const minimum_size = this.get_combined_minimum_size(tmp_vec4);

        if (minimum_size.x > new_size_cache.x) {
            if (this.data.h_grow === GrowDirection.BEGIN) {
                new_pos_cache.x += (new_size_cache.x - minimum_size.x);
            } else if (this.data.h_grow === GrowDirection.BOTH) {
                new_pos_cache.x += 0.5 * (new_size_cache.x - minimum_size.x);
            }

            new_size_cache.x = minimum_size.x;
        }

        if (minimum_size.y > new_size_cache.y) {
            if (this.data.v_grow === GrowDirection.BEGIN) {
                new_pos_cache.y += (new_size_cache.y - minimum_size.y);
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
            if (pos_changed && !size_changed) {
                this._update_transform();
            }
        }
    }

    _update_minimum_size() {
        if (!this.is_inside_tree) {
            return;
        }

        const minsize = this.get_combined_minimum_size(tmp_vec11);
        if (
            minsize.x > this.data.size_cache.x
            ||
            minsize.y > this.data.size_cache.y
        ) {
            this._size_changed();
        }

        this.data.updating_last_minimum_size = false;

        if (!minsize.equals(this.data.last_minimum_size)) {
            this.data.last_minimum_size.copy(minsize);
            this.emit_signal('minimum_size_changed');
        }
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
