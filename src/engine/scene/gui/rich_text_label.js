import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";

import { Control, NOTIFICATION_RESIZED, NOTIFICATION_THEME_CHANGED } from "./control.js";
import { Color } from "engine/core/color";
import { InputEvent } from "engine/core/os/input_event";
import { NOTIFICATION_ENTER_TREE, NOTIFICATION_INTERNAL_PROCESS } from "../main/node.js";
import { NOTIFICATION_DRAW } from "../2d/canvas_item.js";
import { Vector2 } from "engine/core/math/vector2";


export const ALIGN_LEFT = 0;
export const ALIGN_CENTER = 1;
export const ALIGN_RIGHT = 2;
export const ALIGN_FILL = 3;

export const LIST_NUMBERS = 0;
export const LIST_LETTERS = 1;
export const LIST_DOTS = 2;

export const ITEM_FRAME = 0;
export const ITEM_TEXT = 1;
export const ITEM_IMAGE = 2;
export const ITEM_NEWLINE = 3;
export const ITEM_FONT = 4;
export const ITEM_COLOR = 5;
export const ITEM_UNDERLINE = 6;
export const ITEM_STRIKETHROUGH = 7;
export const ITEM_ALIGN = 8;
export const ITEM_INDENT = 9;
export const ITEM_LIST = 10;
export const ITEM_TABLE = 11;
export const ITEM_FADE = 12;
export const ITEM_SHAKE = 13;
export const ITEM_WAVE = 14;
export const ITEM_TORNADO = 15;
export const ITEM_RAINBOW = 16;
export const ITEM_META = 17;
export const ITEM_CUSTOMFX = 18;

class RickTextEffect {}

class Line {
    constructor() {
        /** @type {Item} */
        this.from = null;
        /** @type {number[]} */
        this.offset_caches = [];
        /** @type {number[]} */
        this.height_caches = [];
        /** @type {number[]} */
        this.ascent_caches = [];
        /** @type {number[]} */
        this.descent_caches = [];
        /** @type {number[]} */
        this.space_caches = [];
        this.height_cache = 0;
        this.height_accum_cache = 0;
        this.char_count = 0;
        this.minimum_width = 0;
        this.maximum_width = 0;
    }
}

class Item {
    constructor() {
        this.index = 0;
        /** @type {Item} */
        this.parent = null;
        /** @type {number} */
        this.type = 0;
        /** @type {Item[]} */
        this.subitems = [];
        this.E = null;
        this.line = 0;
    }
    _clear_children() {
        // TODO: recycle
        this.subitems.length = 0;
    }
}

class ItemFrame extends Item {
    constructor() {
        super();

        this.type = ITEM_FRAME;

        this.parent_line = 0;
        this.cell = false;
        /** @type {Line[]} */
        this.lines = [];
        this.first_invalid_line = 0;
        /** @type {ItemFrame} */
        this.parent_frame = null;
    }
}

class ItemText extends Item {
    constructor() {
        super();

        this.type = ITEM_TEXT;

        this.text = '';
    }
}

class ItemImage extends Item {
    constructor() {
        super();

        this.type = ITEM_IMAGE;

        this.image = null;
    }
}

class ItemFont extends Item {
    constructor() {
        super();

        this.type = ITEM_FONT;

        this.color = new Color();
    }
}

class ItemUnderline extends Item {
    constructor() {
        super();

        this.type = ITEM_UNDERLINE;
    }
}

class ItemStrikethrough extends Item {
    constructor() {
        super();

        this.type = ITEM_STRIKETHROUGH;
    }
}

class ItemMeta extends Item {
    constructor() {
        super();

        this.type = ITEM_META;
        this.meta = null;
    }
}

class ItemAlign extends Item {
    constructor() {
        super();

        this.type = ITEM_ALIGN;
    }
}

class ItemIndent extends Item {
    constructor() {
        super();

        this.type = ITEM_INDENT;
    }
}

class ItemList extends Item {
    constructor() {
        super();

        this.type = ITEM_LIST;
    }
}

class ItemNewline extends Item {
    constructor() {
        super();

        this.type = ITEM_NEWLINE;
    }
}

class Column {
    constructor() {
        this.expand = false;
        this.expand_ratio = 0;
        this.min_width = 0;
        this.max_width = 0;
        this.width = 0;
    }
}
class ItemTable extends Item {
    constructor() {
        super();

        this.type = ITEM_TABLE;

        /** @type {Column[]} */
        this.columns = [];
        this.total_width = 0;
    }
}

class ItemFade extends Item {
    constructor() {
        super();

        this.type = ITEM_FADE;

        this.starting_index = 0;
        this.length = 0;
    }
}

class ItemFX extends Item {
    constructor() {
        super();

        this.elapsed_time = 0;
    }
}

class ItemShake extends ItemFX {
    constructor() {
        super();

        this.type = ITEM_SHAKE;

        this.strength = 0;
        this.rate = 0;
        this._current_rng = 0;
        this._previous_rng = 0;
    }
    reroll_random() {
        this._previous_rng = this._current_rng;
        this._current_rng = 0;
    }
    offset_random() { }
    offset_previous_random() { }
}

class ItemWave extends ItemFX {
    constructor() {
        super();

        this.type = ITEM_WAVE;

        this.frequency = 1;
        this.amplitude = 1;
    }
}

class ItemTornado extends ItemFX {
    constructor() {
        super();

        this.type = ITEM_TORNADO;

        this.radius = 1;
        this.frequency = 1;
    }
}

class ItemRainbow extends ItemFX {
    constructor() {
        super();

        this.type = ITEM_RAINBOW;

        this.saturation = 0.8;
        this.value = 0.8;
        this.frequency = 1;
    }
}

class ItemCustomFX extends ItemFX {
    constructor() {
        super();

        this.type = ITEM_CUSTOMFX;

        this.char_fx_transform = null;
        this.custom_effect = null;
    }
    free() {
        this._clear_children();

        this.char_fx_transform = null;
        this.custom_effect = null;
    }
}

export class RichTextLabel extends Control {
    get class() { return 'RichTextLabel' }

    constructor() {
        super();

        this.main = new ItemFrame();
        /** @type {Item} */
        this.current = null;
        /** @type {ItemFrame} */
        this.current_frame = this.main;

        this.vscroll = null;

        this.scroll_visible = false;
        this.scroll_follow = false;
        this.scroll_following = false;
        this.scroll_active = true;
        this.scroll_w = 0;
        this.scroll_updated = false;
        this.updating_scroll = false;
        this.current_idx = 1;
        this.visible_line_count = 0;

        this.tab_size = 4;
        this.underline_meta = true;
        this.override_selected_font_color = false;

        this.default_align = ALIGN_LEFT;

        /** @type {ItemMeta} */
        this.meta_hovering = null;
        this.current_meta = null;

        /** @type {RickTextEffect[]} */
        this.custom_effects = [];

        this.selection = {
            /** @type {Item} */
            click: null,
            click_char: 0,

            /** @type {Item} */
            from: null,
            from_char: 0,
            /** @type {Item} */
            to: null,
            to_char: 0,

            active: false,
            enabled: false,
        };

        this.visible_characters = -1;
        this.percent_visible = 1;

        this.use_bbcode = false;
        this.bbcode = '';

        this.fixed_width = -1;
        // this.set_clip_contents(true);
    }

    /* virtual */

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_RESIZED: {
                this.main.first_invalid_line = 0;
                this.update();
            } break;
            case NOTIFICATION_ENTER_TREE: {
                if (this.bbcode.length > 0) {
                    this.set_bbcode(this.bbcode);
                }

                this.main.first_invalid_line = 0;
                this.update();
            } break;
            case NOTIFICATION_THEME_CHANGED: {
                this.update();
            } break;
            case NOTIFICATION_DRAW: {
                this._validate_line_caches(this.main);
                this._update_scroll();

                const ci = this.canvas_item;

                const size = this.rect_size;
                const text_rect = this._get_text_rect();

                // TODO: draw normal style box

                if (this.has_focus()) {
                    // TODO: draw focus style box
                }

                const ofs = 0;

                let from_line = 0;
                let total_chars = 0;
                while (from_line < this.main.lines.length) {
                    if (this.main.lines[from_line].height_accum_cache + this._get_text_rect().y >= ofs) {
                        break;
                    }
                    total_chars += this.main.lines[from_line].char_count;
                    from_line++;
                }

                if (from_line >= this.main.lines.length) {
                    break;
                }
                const y = (this.main.lines[from_line].height_accum_cache - this.main.lines[from_line].height_cache) - ofs;
                const base_font = this.get_font('normal_font');
                const base_color = this.get_color('default_color');
                const font_color_shadow = this.get_color('font_color_shadow');
                const use_outline = this.get_constant('shadow_as_outline');
                const shadow_ofs = Vector2.new(this.get_constant('shadow_offset_x'), this.get_constant('shadow_offset_y'));

                this.visible_line_count = 0;
                while (y < size.y && from_line < this.main.lines.length) {
                    const text_pos = Vector2.new(text_rect.x, text_rect.y)
                    // this.visible_line_count += this._process_line(this.main, text_pos, y, text_rect.width - this.scroll_w, from_line, PROCESS_DRAW, base_font, base_color, font_color_shadow, use_outline, shadow_ofs, Vector2.ZERO, null, null, null, total_chars);
                    total_chars += this.main.lines[from_line].char_count;

                    from_line++;
                }
            } break;
            case NOTIFICATION_INTERNAL_PROCESS: {
                // this._update_fx(this.main, this.get_process_delta_time());
                this.update();
            } break;
        }
    }

    /* public */

    /**
     * @param {string} p_bbcode
     */
    set_bbcode(p_bbcode) {
        this.bbcode = p_bbcode;
        if (this.is_inside_tree() && this.use_bbcode) {
            this.parse_bbcode(p_bbcode);
        } else {
            this.clear();
            this.add_text(p_bbcode);
        }
    }

    parse_bbcode(p_bbcode) { }

    clear() {
        this.main._clear_children();
        this.current = this.main;
        this.current_frame = this.main;
        // TODO: cache `Line`
        this.main.lines.length = 0;
        this.main.lines.push(new Line());
        this.main.first_invalid_line = 0;
        this.update();
        this.selection.click = null;
        this.selection.active = false;
        this.current_idx = 1;
    }

    /**
     * @param {string} p_text
     */
    add_text(p_text) {
        if (this.current.type === ITEM_TABLE) {
            return;
        }

        let pos = 0;

        while (pos < p_text.length) {
            let end = p_text.indexOf('\n', pos)
            let line = '';
            let eol = false;
            if (end < 0) {
                end = p_text.length;
            } else {
                eol = true;
            }

            if (pos === 0 && end === p_text.length) {
                line = p_text;
            } else {
                line = p_text.substr(pos, end - pos);
            }

            if (line.length > 0) {
                if (this.current.subitems.length > 0 && this.current.subitems[this.current.subitems.length - 1].type === ITEM_TEXT) {
                    const ti = /** @type {ItemText} */(this.current.subitems[this.current.subitems.length - 1]);
                    ti.text += line;
                    this._invalidate_current_line(this.main);
                } else {
                    const item = new ItemText();
                    item.text = line;
                    this._add_item(item, false);
                }
            }

            if (eol) {
                const item = new ItemNewline();
                item.line = this.current_frame.lines.length;
                this._add_item(item, false);
                this.current_frame.lines.push(new Line());
                if (item.type !== ITEM_NEWLINE) {
                    this.current_frame.lines[this.current_frame.lines.length - 1].from = item;
                }
                this._invalidate_current_line(this.current_frame);
            }

            pos = end + 1;
        }
    }

    /* private */

    /**
     * @param {ItemFrame} p_frame
     */
    _invalidate_current_line(p_frame) { }
    /**
     * @param {ItemFrame} p_frame
     */
    _validate_line_caches(p_frame) { }

    /**
     * @param {Item} p_item
     * @param {boolean} [p_enter]
     * @param {boolean} [p_ensure_newline]
     */
    _add_item(p_item, p_enter = false, p_ensure_newline = false) {
        p_item.parent = this.current;
        p_item.E = p_item;
        this.current.subitems.push(p_item);

        if (p_enter) {
            this.current = p_item;
        }

        if (p_ensure_newline) {
            const from = this.current_frame.lines[this.current_frame.lines.length - 1].from;
            // if (this._find_layout_subitem(from, p_item)) {
            //     this._invalidate_current_line(this.current_frame);
            //     this.current_frame.lines.push(new Line());
            // }
        }

        if (!this.current_frame.lines[this.current_frame.lines.length - 1].from) {
            this.current_frame.lines[this.current_frame.lines.length - 1].from = p_item;
        }
        p_item.line = this.current_frame.lines.length - 1;

        this._invalidate_current_line(this.current_frame);
    }
    /**
     * @param {Item} p_item
     * @param {number} p_line
     * @param {number} p_subitem_line
     */
    _remove_item(p_item, p_line, p_subitem_line) { }

    _process_line(p_frame) { }
    _find_click(p_frame) { }

    _find_font() { }
    _find_margin() { }
    _find_align() { }
    _find_color() { }
    _find_underline() { }
    _find_strikethrough() { }
    _find_meta() { }
    _find_layout_subitem() { }
    _find_by_type() { }
    _fetch_item_fx_stack() { }

    _update_scroll() { }
    _update_fx() { }
    _scroll_changed() { }

    /**
     * @param {InputEvent} p_event
     */
    _gui_input_(p_event) {
        this._gui_input(p_event);
    }

    _get_text_rect() { return Vector2.ZERO }
    _get_custom_effect_by_code() { }
    parse_expressions_for_values() { }

    _update_all_lines() { }
}

node_class_map['RichTextLabel'] = GDCLASS(RichTextLabel, Control)
