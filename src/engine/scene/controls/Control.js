import Node2D from '../Node2D';
import { Vector2 } from 'engine/math/index';
import { node_class_map } from 'engine/registry';
import { BLEND_MODES } from 'engine/const';

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

export default class Control extends Node2D {
    get mouse_default_cursor_shape() {
        return this.cursor;
    }
    set mouse_default_cursor_shape(value) {
        this.cursor = value;
    }

    constructor() {
        super();

        this.type = 'Control';

        /**
         * @type {Anchor}
         */
        this.anchor_bottom = Anchor.BEGIN;
        /**
         * @type {Anchor}
         */
        this.anchor_left = Anchor.BEGIN;
        /**
         * @type {Anchor}
         */
        this.anchor_right = Anchor.BEGIN;
        /**
         * @type {Anchor}
         */
        this.anchor_top = Anchor.BEGIN;

        /**
         * @type {GrowDirection}
         */
        this.grow_horizontal = GrowDirection.BEGIN;
        /**
         * @type {GrowDirection}
         */
        this.grow_vertical = GrowDirection.BEGIN;

        /**
         * @type {number}
         */
        this.margin_bottom = 0;

        /**
         * @type {number}
         */
        this.margin_left = 0;

        /**
         * @type {number}
         */
        this.margin_right = 0;

        /**
         * @type {number}
         */
        this.margin_top = 0;

        this.rect_clip_content = false;
        this.rect_global_position = new Vector2();
        this.rect_min_size = new Vector2();
        this.pivot_offset = new Vector2();
        this.rect_position = new Vector2();
        this.rect_rotation = 0;
        this.rect_scale = new Vector2();
        this.rect_size = new Vector2();

        /**
         * @type {SizeFlag}
         */
        this.size_flags_horizontal = SizeFlag.FILL;
        /**
         * @type {number}
         */
        this.size_flags_stretch_ratio = 1;
        /**
         * @type {SizeFlag}
         */
        this.size_flags_vertical = SizeFlag.FILL;

        this.blend_mode = BLEND_MODES.NORMAL;
    }

    set_rect_size(x, y) {
        if (y !== undefined) {
            this.rect_size.set(x, y);
        } else {
            this.rect_size.set(x.x, x.y);
        }
        return this;
    }
}

node_class_map['Control'] = Control;
