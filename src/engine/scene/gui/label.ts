import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import {
    MARGIN_RIGHT,
    HALIGN_LEFT,
    HALIGN_CENTER,
    HALIGN_RIGHT,
    HALIGN_FILL,
    VALIGN_TOP,
    VALIGN_CENTER,
    VALIGN_BOTTOM,
    VALIGN_FILL,
} from "engine/core/math/math_defs";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
import { Color } from "engine/core/color";

import { VSG } from "engine/servers/visual/visual_server_globals";
import { CommandRect } from "engine/servers/visual/commands";

import { NOTIFICATION_DRAW } from "../2d/canvas_item";
import { SIZE_SHRINK_CENTER, MOUSE_FILTER_IGNORE } from "./const";
import {
    Control,
    NOTIFICATION_THEME_CHANGED,
    NOTIFICATION_RESIZED,
} from "./control";
import { DynamicFont, BitmapFont } from "../resources/font";

let pos = new Vector2;

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

const CHAR_NEWLINE = -1;
const CHAR_WRAPLINE = -2;

class WordCache {
    char_pos = 0;
    word_len = 0;
    pixel_width = 0;
    space_count = 0;
    next: WordCache = null;
}

export class Label extends Control {
    get class() { return 'Label' }

    align = HALIGN_LEFT;
    autowrap = false;
    line_count = 0;
    clip_text = false;
    minsize = new Vector2;
    lines_skipped = 0;
    max_lines_visible = -1;
    percent_visible = 1;
    text = '';
    uppercase = false;
    valign = VALIGN_TOP;
    visible_characters = -1;

    word_cache_dirty = false;
    word_cache: WordCache = null;
    total_char_cache = 0;

    constructor() {
        super();

        this.set_mouse_filter(MOUSE_FILTER_IGNORE);
        this.set_size_flags_vertical(SIZE_SHRINK_CENTER);
    }

    /* virtual */

    _load_data(data: any) {
        if (data.font) {
            this.add_font_override('font', data.font);
        }
        if (data.text !== undefined) {
            this.set_text(data.text);
        }

        super._load_data(data);

        if (data.align !== undefined) {
            this.set_align(data.align);
        }
        if (data.autowrap !== undefined) {
            this.set_autowrap(data.autowrap);
        }
        if (data.clip_text !== undefined) {
            this.set_clip_text(data.clip_text);
        }
        if (data.lines_skipped !== undefined) {
            this.set_lines_skipped(data.lines_skipped);
        }
        if (data.max_lines_visible !== undefined) {
            this.set_max_lines_visible(data.max_lines_visible);
        }
        if (data.percent_visible !== undefined) {
            this.set_percent_visible(data.percent_visible);
        }
        if (data.uppercase !== undefined) {
            this.set_uppercase(data.uppercase);
        }
        if (data.valign !== undefined) {
            this.set_valign(data.valign);
        }
        if (data.visible_characters !== undefined) {
            this.set_visible_characters(data.visible_characters);
        }
        if (data.custom_colors) {
            for (let k in data.custom_colors) {
                const c = data.custom_colors[k];
                this.add_color_override(k, new Color(c.r, c.g, c.b, c.a));
            }
        }

        return this;
    }

    get_minimum_size() {
        const size = Vector2.create();
        const min_style = this.get_stylebox('normal').get_minimum_size(tmp_vec);

        const f = this.get_font('font');
        if (f.type === 'DynamicFont') {
            if (this.autowrap) {
                return size.copy(min_style).add(1, this.clip_text ? 1 : this.minsize.y);
            } else {
                const font: DynamicFont = f as DynamicFont;
                const width = this.autowrap ? (this.rect_size.x - min_style.x) : this.get_longest_line_width();
                const s = font.get_text_size(this.text, width, this.get_constant('line_spacing'));
                return size.set(
                    s.width,
                    s.height
                );
            }
        }

        if (this.word_cache_dirty) {
            this.regenerate_word_cache();
        }

        if (this.autowrap) {
            return size.copy(min_style).add(1, this.clip_text ? 1 : this.minsize.y);
        } else {
            size.copy(this.minsize);
            if (this.clip_text) {
                size.x = 1;
            }
            return size.add(min_style);
        }
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
        // TODO: translation support

        if (p_what === NOTIFICATION_DRAW) {
            if (this.clip_text) {
                VSG.canvas.canvas_item_set_clip(this.canvas_item, true);
            }

            if (this.word_cache_dirty) {
                this.regenerate_word_cache();
            }

            /** @type {string} */
            const text: string = this.text;
            const size = this.rect_size;
            const style = this.get_stylebox('normal');
            const font_color = this.get_color('font_color');
            const line_spacing = this.get_constant('line_spacing');
            let font = this.get_font('font');

            // TODO: draw stylebox

            const font_h = font.height + line_spacing;

            let lines_visible = Math.floor((size.y + line_spacing) / font_h);

            const space_w = Math.ceil(font.get_char_size(tmp_vec7, ' ').x);
            let chars_total = 0;

            let vbegin = 0, vsep = 0;

            if (lines_visible > this.line_count) {
                lines_visible = this.line_count;
            }

            if (this.max_lines_visible >= 0 && lines_visible > this.max_lines_visible) {
                lines_visible = this.max_lines_visible;
            }

            if (font.type === 'DynamicFont') {
                let dfont = font as DynamicFont;
                dfont.add_load_listener(this.update, this);
                let texture = dfont.draw_to_texture(
                    this.canvas_item,
                    text,
                    size,
                    this.align,
                    this.valign,
                    line_spacing,
                    lines_visible,
                    this.autowrap ? (size.x - style.get_minimum_size(tmp_vec).x) : this.get_longest_line_width()
                );
                texture.draw(this.canvas_item, Vector2.ZERO);
                return;
            }

            if (lines_visible > 0) {
                switch (this.valign) {
                    case VALIGN_TOP: {
                        // nothing
                    } break;
                    case VALIGN_CENTER: {
                        vbegin = Math.floor((size.y - (lines_visible * font_h - line_spacing)) / 2);
                        vsep = 0;
                    } break;
                    case VALIGN_BOTTOM: {
                        vbegin = Math.floor(size.y - (lines_visible * font_h - line_spacing));
                        vsep = 0;
                    } break;
                    case VALIGN_FILL: {
                        vbegin = 0;
                        if (lines_visible > 1) {
                            vsep = Math.floor((size.y - (lines_visible * font_h - line_spacing)) / (lines_visible - 1));
                        } else {
                            vsep = 0;
                        }
                    } break;
                }
            }

            let wc = this.word_cache;
            if (!wc) {
                return;
            }

            let line = 0;
            let line_to = this.lines_skipped + (lines_visible > 0 ? lines_visible : 1);
            while (wc) {
                if (line >= line_to) {
                    break;
                }
                if (line < this.lines_skipped) {
                    while (wc && wc.char_pos >= 0) {
                        wc = wc.next;
                    }
                    if (wc) {
                        wc = wc.next;
                    }
                    line++;
                    continue;
                }

                if (wc.char_pos < 0) {
                    // empty line
                    wc = wc.next;
                    line++;
                    continue;
                }

                let from = wc;
                let to = wc;

                let taken = 0;
                let spaces = 0;
                while (to && to.char_pos >= 0) {
                    taken += to.pixel_width;
                    if (to !== from && to.space_count) {
                        spaces += to.space_count;
                    }
                    to = to.next;
                }

                let can_fill = to && (to.char_pos === CHAR_WRAPLINE);

                let x_ofs = 0;

                switch (this.align) {
                    case HALIGN_FILL:
                    case HALIGN_LEFT: {
                        x_ofs = style.get_offset(tmp_vec8).x;
                    } break;
                    case HALIGN_CENTER: {
                        x_ofs = Math.floor((size.x - (taken + spaces * space_w)) * 0.5);
                    } break;
                    case HALIGN_RIGHT: {
                        x_ofs = Math.floor(size.x - style.get_margin(MARGIN_RIGHT) - (taken + spaces * space_w));
                    } break;
                }

                let y_ofs = style.get_offset(tmp_vec9).y;
                y_ofs += (line - this.lines_skipped) * font_h + font.ascent;
                y_ofs += vbegin + line * vsep;

                let bfont = font as BitmapFont;
                while (from !== to) {
                    // draw a word
                    let pos = from.char_pos;
                    if (from.char_pos < 0) {
                        return;
                    }
                    if (from.space_count) {
                        // spacing
                        x_ofs += space_w * from.space_count;
                        if (can_fill && this.align === HALIGN_FILL && spaces) {
                            x_ofs += Math.floor((size.x - (taken + space_w * spaces)) / spaces);
                        }
                    }

                    for (let i = 0; i < from.word_len; i++) {
                        if (this.visible_characters < 0 || chars_total < this.visible_characters) {
                            let c = text[i + pos];
                            let n = text[i + pos + 1];
                            if (this.uppercase) {
                                c = c.toUpperCase();
                                n = n.toUpperCase();
                            }

                            const char = bfont.char_map[c.charCodeAt(0)];

                            // Update char sprite info
                            const g = CommandRect.instance();
                            g.texture = char.texture;
                            g.rect.set(x_ofs + char.h_align, y_ofs - font.ascent + char.v_align, g.texture.get_width(), g.texture.get_height());
                            g.modulate.copy(font_color);

                            this.canvas_item.commands.push(g);

                            // Prepare for next char
                            x_ofs += font.get_char_size(tmp_vec10, c, n).x;
                            chars_total++;
                        }
                    }
                    from = from.next;
                }

                wc = to ? to.next : null;
                line++;
            }
        }

        if (p_what === NOTIFICATION_THEME_CHANGED) {
            this.word_cache_dirty = true;
            this.update();
        }
        if (p_what === NOTIFICATION_RESIZED) {
            this.word_cache_dirty = true;
        }
    }

    /* public */

    get_longest_line_width() {
        const f = this.get_font('font');
        if (f.type === 'DynamicFont') {
            let font: DynamicFont = f as DynamicFont;
            return font.get_text_size(this.text, -1, this.get_constant('line_spacing')).width;
        }

        const font: BitmapFont = f as BitmapFont;

        let max_line_width = 0;
        let line_width = 0;

        for (let i = 0; i < this.text.length; i++) {
            /** @type {string} */
            let current: string = this.text[i];
            if (this.uppercase) {
                current = current.toUpperCase();
            }

            if (current.charCodeAt(0) < 32) {
                if (current === '\n') {
                    if (line_width > max_line_width) {
                        max_line_width = line_width;
                    }
                    line_width = 0;
                }
            } else {
                let char_width = Math.ceil(font.get_char_size(tmp_vec5, current, this.text[i + 1]).x);
                line_width += char_width;
            }
        }

        if (line_width > max_line_width) {
            max_line_width = line_width;
        }

        return max_line_width;
    }

    get_line_count() {
        if (!this.is_inside_tree()) {
            return 1;
        }
        if (this.word_cache_dirty) {
            this.regenerate_word_cache();
        }

        return this.line_count;
    }

    get_line_height() {
        return this.get_font('font').get_height();
    }

    get_total_character_count() {
        if (this.word_cache_dirty) {
            this.regenerate_word_cache();
        }
        return this.total_char_cache;
    }

    get_visible_line_count() {
        const line_spacing = this.get_constant('line_spacing');
        const font_h = this.get_font('font').height + line_spacing;
        let lines_visible = Math.floor((this.rect_size.y - this.get_stylebox('normal').get_minimum_size(tmp_vec2).y + line_spacing) / font_h);

        if (lines_visible > this.line_count) {
            lines_visible = this.line_count;
        }

        if (this.max_lines_visible >= 0 && lines_visible > this.max_lines_visible) {
            lines_visible = this.max_lines_visible;
        }

        return lines_visible;
    }

    regenerate_word_cache() {
        if (!this.is_inside_tree()) {
            return;
        }

        this.word_cache = null;

        /** @type {string} */
        const text: string = this.text;

        const style = this.get_stylebox('normal');
        const width = this.autowrap ? (this.rect_size.x - style.get_minimum_size(tmp_vec3).x) : this.get_longest_line_width();
        const f = this.get_font('font');

        if (f.type === "DynamicFont") {
            let font: DynamicFont = f as DynamicFont;
            this.line_count = font.wrap_lines(text, width).length;
            return;
        }

        const font: BitmapFont = f as BitmapFont;

        let current_word_size = 0;
        let word_pos = 0;
        let line_width = 0;
        let space_count = 0;
        let space_width = Math.ceil(font.get_char_size(tmp_vec4, ' ').x);
        let line_spacing = this.get_constant('line_spacing');
        this.line_count = 1;
        this.total_char_cache = 0;

        /** @type {WordCache} */
        let last: WordCache = null;

        for (let i = 0; i < text.length + 1; i++) {
            // always a space at the end, so the algorithm works
            let current = i < text.length ? text[i] : ' ';

            if (this.uppercase) {
                current = current.toUpperCase();
            }

            const char_code = current.charCodeAt(0);
            const separatable = char_code >= 33 && (char_code < 65 || char_code > 90) && (char_code < 97 || char_code > 122) && (char_code < 48 || char_code > 57);
            let insert_newline = false;
            let char_width = 0;

            if (char_code < 33) {
                if (current_word_size > 0) {
                    const wc = new WordCache();
                    if (this.word_cache) {
                        last.next = wc;
                    } else {
                        this.word_cache = wc;
                    }
                    last = wc;

                    wc.pixel_width = current_word_size;
                    wc.char_pos = word_pos;
                    wc.word_len = i - word_pos;
                    wc.space_count = space_count;
                    current_word_size = 0;
                    space_count = 0;
                }

                if (current === '\n') {
                    insert_newline = true;
                } else {
                    this.total_char_cache++;
                }

                if (i < text.length && text[i] === ' ') {
                    this.total_char_cache--;
                    if (line_width > 0 || !last || last.char_pos !== CHAR_WRAPLINE) {
                        space_count++;
                        line_width += space_width;
                    } else {
                        space_count = 0;
                    }
                }
            } else {
                if (current_word_size === 0) {
                    word_pos = i;
                }
                char_width = Math.ceil(font.get_char_size(tmp_vec6, current, text[i + 1]).x);
                current_word_size += char_width;
                line_width += char_width;
                this.total_char_cache++;
            }

            if ((this.autowrap && (line_width >= width) && ((last && last.char_pos >= 0) || separatable)) || insert_newline) {
                if (separatable) {
                    if (current_word_size > 0) {
                        const wc = new WordCache();
                        if (this.word_cache) {
                            last.next = wc;
                        } else {
                            this.word_cache = wc;
                        }
                        last = wc;

                        wc.pixel_width = current_word_size - char_width;
                        wc.char_pos = word_pos;
                        wc.word_len = i - word_pos;
                        wc.space_count = space_count;
                        current_word_size = char_width;
                        space_count = 0;
                        word_pos = i;
                    }
                }

                const wc = new WordCache();
                if (this.word_cache) {
                    last.next = wc;
                } else {
                    this.word_cache = wc;
                }
                last = wc;

                wc.pixel_width = 0;
                wc.char_pos = insert_newline ? CHAR_NEWLINE : CHAR_WRAPLINE;

                line_width = current_word_size;
                this.line_count++;
                space_count = 0;
            }
        }

        if (!this.autowrap) {
            this.minsize.x = width;
        }

        if (this.max_lines_visible > 0 && this.line_count > this.max_lines_visible) {
            this.minsize.y = (font.height * this.max_lines_visible) + (line_spacing * (this.max_lines_visible - 1));
        } else {
            this.minsize.y = (font.height * this.line_count) + (line_spacing * (this.line_count - 1));
        }

        if (!this.autowrap || !this.clip_text) {
            this.minimum_size_changed();
        }
        this.word_cache_dirty = false;
    }

    /**
     * @param {boolean} value
     */
    set_autowrap(value: boolean) {
        this.autowrap = value;
        this.word_cache_dirty = true;
        this.update();
    }

    /**
     * @param {boolean} value
     */
    set_uppercase(value: boolean) {
        this.uppercase = value;
        this.word_cache_dirty = true;
        this.update();
    }

    /**
     * @param {string} value
     */
    set_text(value: string) {
        if (this.text === value) {
            return;
        }
        this.text = value;
        this.word_cache_dirty = true;
        if (this.percent_visible < 1) {
            this.visible_characters = this.get_total_character_count() * this.percent_visible;
        }
        this.update();
    }

    /**
     * @param {boolean} value
     */
    set_clip_text(value: boolean) {
        this.clip_text = value;
        this.update();
        this.minimum_size_changed();
    }

    /**
     * @param {number} value
     */
    set_visible_characters(value: number) {
        this.visible_characters = value;
        if (this.get_total_character_count() > 0) {
            this.percent_visible = value / this.total_char_cache;
        }
        this.update();
    }

    /**
     * @param {number} value
     */
    set_percent_visible(value: number) {
        if (value < 0 || value >= 1) {
            this.percent_visible = 1;
            this.visible_characters = -1;
        } else {
            this.percent_visible = value;
            this.visible_characters = this.get_total_character_count() * this.percent_visible;
        }
        this.update();
    }

    /**
     * @param {number} p_align
     */
    set_align(p_align: number) {
        this.align = p_align;
        this.update();
    }

    /**
     * @param {number} p_align
     */
    set_valign(p_align: number) {
        this.valign = p_align;
        this.update();
    }

    /**
     * @param {number} p_lines
     */
    set_lines_skipped(p_lines: number) {
        this.lines_skipped = p_lines;
        this.update();
    }

    /**
     * @param {number} p_lines
     */
    set_max_lines_visible(p_lines: number) {
        this.max_lines_visible = p_lines;
        this.update();
    }
}
node_class_map['Label'] = GDCLASS(Label, Control)
