import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Color } from "engine/core/color";
import { Vector2 } from "engine/core/math/vector2";
import { Transform2D } from "engine/core/math/transform_2d";
import { InputEvent } from "engine/core/os/input_event";

import { ImageTexture } from "../resources/texture";
import { NOTIFICATION_ENTER_TREE, NOTIFICATION_INTERNAL_PROCESS } from "../main/node";
import { NOTIFICATION_DRAW } from "../2d/canvas_item";
import { Control, NOTIFICATION_RESIZED, NOTIFICATION_THEME_CHANGED } from "./control";


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
    from: Item = null;
    offset_caches: number[] = [];
    height_caches: number[] = [];
    ascent_caches: number[] = [];
    descent_caches: number[] = [];
    space_caches: number[] = [];
    height_cache = 0;
    height_accum_cache = 0;
    char_count = 0;
    minimum_width = 0;
    maximum_width = 0;
}

class Item {
    index = 0;
    parent: Item = null;
    type: number = 0;
    subitems: Item[] = [];
    E: any = null;
    line = 0;

    _clear_children() {
        // TODO: recycle
        this.subitems.length = 0;
    }

    _predelete() {
        return true;
    }
}

class ItemFrame extends Item {
    type = ITEM_FRAME;

    parent_line = 0;
    cell = false;
    lines: Line[] = [];
    first_invalid_line = 0;
    parent_frame: ItemFrame = null;
}

class ItemText extends Item {
    type = ITEM_TEXT;
    text = '';
}

class ItemImage extends Item {
    type = ITEM_IMAGE;
    image: ImageTexture = null;
}

class ItemFont extends Item {
    type = ITEM_FONT;
    color = new Color;
}

class ItemUnderline extends Item {
    type = ITEM_UNDERLINE;
}

class ItemStrikethrough extends Item {
    constructor() {
        super();

        this.type = ITEM_STRIKETHROUGH;
    }
}

class ItemMeta extends Item {
    type = ITEM_META;
    meta: any = null;
}

class ItemAlign extends Item {
    type = ITEM_ALIGN;
}

class ItemIndent extends Item {
    type = ITEM_INDENT;
}

class ItemList extends Item {
    type = ITEM_LIST;
}

class ItemNewline extends Item {
    type = ITEM_NEWLINE;
}

class Column {
    expand = false;
    expand_ratio = 0;
    min_width = 0;
    max_width = 0;
    width = 0;
}
class ItemTable extends Item {
    type = ITEM_TABLE;

    columns: Column[] = [];
    total_width = 0;
}

class ItemFade extends Item {
    type = ITEM_FADE;

    starting_index = 0;
    length = 0;
}

class ItemFX extends Item {
    elapsed_time = 0;
}

class ItemShake extends ItemFX {
    type = ITEM_SHAKE;

    strength = 0;
    rate = 0;
    _current_rng = 0;
    _previous_rng = 0;

    reroll_random() {
        this._previous_rng = this._current_rng;
        this._current_rng = 0;
    }
    offset_random() { }
    offset_previous_random() { }
}

class ItemWave extends ItemFX {
    type = ITEM_WAVE;

    frequency = 1;
    amplitude = 1;
}

class ItemTornado extends ItemFX {
    type = ITEM_TORNADO;

    radius = 1;
    frequency = 1;
}

class ItemRainbow extends ItemFX {
    type = ITEM_RAINBOW;

    saturation = 0.8;
    value = 0.8;
    frequency = 1;
}

class ItemCustomFX extends ItemFX {
    type = ITEM_CUSTOMFX;

    char_fx_transform: Transform2D = null;
    custom_effect: any = null;

    _free() {
        this._clear_children();

        this.char_fx_transform = null;
        this.custom_effect = null;
    }
}

export class RichTextLabel extends Control {
    get class() { return 'RichTextLabel' }

    main = new ItemFrame;
    current: Item = null;
    current_frame: ItemFrame;

    vscroll: any = null;

    scroll_visible = false;
    scroll_follow = false;
    scroll_following = false;
    scroll_active = true;
    scroll_w = 0;
    scroll_updated = false;
    updating_scroll = false;
    current_idx = 1;
    visible_line_count = 0;

    tab_size = 4;
    underline_meta = true;
    override_selected_font_color = false;

    default_align = ALIGN_LEFT;

    meta_hovering: ItemMeta = null;
    current_meta: any = null;

    /** @type {RickTextEffect[]} */
    custom_effects: RickTextEffect[] = [];

    selection = {
        click: null as Item,
        click_char: 0,

        from: null as Item,
        from_char: 0,
        to: null as Item,
        to_char: 0,

        active: false,
        enabled: false,
    };

    visible_characters = -1;
    percent_visible = 1;

    use_bbcode = false;
    bbcode = '';

    fixed_width = -1;

    constructor() {
        super();

        this.current_frame = this.main;
        // this.set_clip_contents(true);
    }

    /* virtual */

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
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
                const shadow_ofs = Vector2.create(this.get_constant('shadow_offset_x'), this.get_constant('shadow_offset_y'));

                this.visible_line_count = 0;
                while (y < size.y && from_line < this.main.lines.length) {
                    const text_pos = Vector2.create(text_rect.x, text_rect.y)
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
    set_bbcode(p_bbcode: string) {
        this.bbcode = p_bbcode;
        if (this.is_inside_tree() && this.use_bbcode) {
            this.parse_bbcode(p_bbcode);
        } else {
            this.clear();
            this.add_text(p_bbcode);
        }
    }

    parse_bbcode(p_bbcode: string) {
        // @Incomplete
    }

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
    add_text(p_text: string) {
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
                    const ti: ItemText = this.current.subitems[this.current.subitems.length - 1] as ItemText;
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
    _invalidate_current_line(p_frame: ItemFrame) { }
    /**
     * @param {ItemFrame} p_frame
     */
    _validate_line_caches(p_frame: ItemFrame) { }

    /**
     * @param {Item} p_item
     * @param {boolean} [p_enter]
     * @param {boolean} [p_ensure_newline]
     */
    _add_item(p_item: Item, p_enter: boolean = false, p_ensure_newline: boolean = false) {
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
    _remove_item(p_item: Item, p_line: number, p_subitem_line: number) { }

    _process_line(p_frame: any) { }
    _find_click(p_frame: any) { }

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
    _gui_input_(p_event: InputEvent) {
        this._gui_input(p_event);
    }

    _get_text_rect() { return Vector2.ZERO }
    _get_custom_effect_by_code() { }
    parse_expressions_for_values() { }

    _update_all_lines() { }
}

node_class_map['RichTextLabel'] = GDCLASS(RichTextLabel, Control)
