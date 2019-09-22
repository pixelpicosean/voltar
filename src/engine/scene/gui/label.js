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
import { Vector2 } from "engine/core/math/vector2";
import { Color } from "engine/core/color";

import { VSG } from "engine/servers/visual/visual_server_globals";
import { CommandRect } from "engine/servers/visual/commands";

import { registered_bitmap_fonts } from "../resources/font";
import { NOTIFICATION_DRAW } from "../2d/canvas_item";
import { SIZE_SHRINK_CENTER } from "./const";
import {
    Control,
    NOTIFICATION_THEME_CHANGED,
    NOTIFICATION_RESIZED,
} from "./control";


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
    constructor() {
        this.char_pos = 0;
        this.word_len = 0;
        this.pixel_width = 0;
        this.space_count = 0;
        /** @type {WordCache} */
        this.next = null;
    }
}

export class Label extends Control {
    get class() { return 'Label' }

    get align() { return this._align }
    set align(value) { this.set_align(value) }

    get autowrap() { return this._autowrap }
    set autowrap(value) { this.set_autowrap(value) }

    get clip_text() { return this._clip_text }
    set clip_text(value) { this.set_clip_text(value) }

    get lines_skipped() { return this._lines_skipped }
    set lines_skipped(value) { this.set_lines_skipped(value) }

    get max_lines_visible() { return this._max_lines_visible }
    set max_lines_visible(value) { this.set_max_lines_visible(value) }

    get percent_visible() { return this._percent_visible }
    set percent_visible(value) { this.set_percent_visible(value) }

    get text() { return this._text }
    set text(value) { this.set_text(value) }

    get uppercase() { return this._uppercase }
    set uppercase(value) { this.set_uppercase(value) }

    get valign() { return this._valign }
    set valign(value) { this.set_valign(value) }

    get visible_characters() { return this._visible_characters }
    set visible_characters(value) { this.set_visible_characters(value) }

    constructor() {
        super();

        this._align = HALIGN_LEFT;
        this._autowrap = false;
        this.line_count = 0;
        this._clip_text = false;
        this.minsize = new Vector2();
        this._lines_skipped = 0;
        this._max_lines_visible = -1;
        this._percent_visible = 1;
        /**
         * @type {string}
         */
        this._text = '';
        this._uppercase = false;
        this._valign = VALIGN_TOP;
        this._visible_characters = -1;

        this.word_cache_dirty = false;
        this.word_cache = null;
        this.total_char_cache = 0;

        this.set_size_flags_vertical(SIZE_SHRINK_CENTER);

        // FIXME: should we use commands directly?
        /** @type {CommandRect[]} */
        this._glyphs = [];
    }

    /* virtual */

    _load_data(data) {
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
        if (data.text !== undefined) {
            this.set_text(data.text);
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
        if (data.font) {
            this.add_font_override('font', registered_bitmap_fonts[data.font]);
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
        const size = Vector2.new();
        const min_style = this.get_stylebox('normal').get_minimum_size(tmp_vec);

        if (this.word_cache_dirty) {
            this.regenerate_word_cache();
        }

        if (this._autowrap) {
            return size.copy(min_style).add(1, this._clip_text ? 1 : this.minsize.y);
        } else {
            size.copy(this.minsize);
            if (this._clip_text) {
                size.x = 1;
            }
            return size.add(min_style);
        }
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        // TODO: translation support

        if (p_what === NOTIFICATION_DRAW) {
            if (this._clip_text) {
                VSG.canvas.canvas_item_set_clip(this.canvas_item, true);
            }

            if (this.word_cache_dirty) {
                this.regenerate_word_cache();
            }

            /** @type {string} */
            const text = this._text;
            const size = this.rect_size;
            const style = this.get_stylebox('normal');
            const font = this.get_font('font');
            const font_color = this.get_color('font_color');
            const line_spacing = this.get_constant('line_spacing');

            // TODO: draw stylebox

            const font_h = font.height + line_spacing;

            let lines_visible = Math.floor((size.y + line_spacing) / font_h);

            const space_w = Math.ceil(font.get_char_size(tmp_vec7, ' ').x);
            let chars_total = 0;

            let vbegin = 0, vsep = 0;

            if (lines_visible > this.line_count) {
                lines_visible = this.line_count;
            }

            if (this._max_lines_visible >= 0 && lines_visible > this._max_lines_visible) {
                lines_visible = this._max_lines_visible;
            }

            if (lines_visible > 0) {
                switch (this._valign) {
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
            let line_to = this._lines_skipped + (lines_visible > 0 ? lines_visible : 1);
            let glyph_idx = 0;
            while (wc) {
                if (line >= line_to) {
                    break;
                }
                if (line < this._lines_skipped) {
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

                switch (this._align) {
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
                y_ofs += (line - this._lines_skipped) * font_h + font.ascent;
                y_ofs += vbegin + line * vsep;

                while (from !== to) {
                    // draw a word
                    let pos = from.char_pos;
                    if (from.char_pos < 0) {
                        return;
                    }
                    if (from.space_count) {
                        // spacing
                        x_ofs += space_w * from.space_count;
                        if (can_fill && this._align === HALIGN_FILL && spaces) {
                            x_ofs += Math.floor((size.x - (taken + space_w * spaces)) / spaces);
                        }
                    }

                    for (let i = 0; i < from.word_len; i++) {
                        if (this._visible_characters < 0 || chars_total < this._visible_characters) {
                            let c = text[i + pos];
                            let n = text[i + pos + 1];
                            if (this._uppercase) {
                                c = c.toUpperCase();
                                n = n.toUpperCase();
                            }

                            glyph_idx++;

                            const char = font.char_map[c.charCodeAt(0)];

                            let g = this._glyphs[glyph_idx];
                            if (!g) {
                                this._glyphs[glyph_idx] = g = CommandRect.instance();
                            }

                            // Update char sprite info
                            g.texture = char.texture;
                            g.rect.set(x_ofs + char.h_align, y_ofs - font.ascent + char.v_align, g.texture.width, g.texture.height);
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
        const font = this.get_font('font');
        let max_line_width = 0;
        let line_width = 0;

        for (let i = 0; i < this._text.length; i++) {
            /** @type {string} */
            let current = this._text[i];
            if (this._uppercase) {
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
                let char_width = Math.ceil(font.get_char_size(tmp_vec5, current, this._text[i + 1]).x);
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

        if (this._max_lines_visible >= 0 && lines_visible > this._max_lines_visible) {
            lines_visible = this._max_lines_visible;
        }

        return lines_visible;
    }

    regenerate_word_cache() {
        if (!this.is_inside_tree()) {
            return;
        }

        this.word_cache = null;

        /** @type {string} */
        const text = this._text;

        const style = this.get_stylebox('normal');
        const width = this._autowrap ? (this.rect_size.x - style.get_minimum_size(tmp_vec3).x) : this.get_longest_line_width();
        const font = this.get_font('font');

        let current_word_size = 0;
        let word_pos = 0;
        let line_width = 0;
        let space_count = 0;
        let space_width = Math.ceil(font.get_char_size(tmp_vec4, ' ').x);
        let line_spacing = this.get_constant('line_spacing');
        this.line_count = 1;
        this.total_char_cache = 0;

        /** @type {WordCache} */
        let last = null;

        for (let i = 0; i < text.length + 1; i++) {
            // always a space at the end, so the algorithm works
            let current = i < text.length ? text[i] : ' ';

            if (this._uppercase) {
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

            if ((this._autowrap && (line_width >= width) && ((last && last.char_pos >= 0) || separatable)) || insert_newline) {
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

        if (!this._autowrap) {
            this.minsize.x = width;
        }

        if (this._max_lines_visible > 0 && this.line_count > this._max_lines_visible) {
            this.minsize.y = (font.height * this._max_lines_visible) + (line_spacing * (this._max_lines_visible - 1));
        } else {
            this.minsize.y = (font.height * this.line_count) + (line_spacing * (this.line_count - 1));
        }

        if (!this._autowrap || !this._clip_text) {
            this.minimum_size_changed();
        }
        this.word_cache_dirty = false;
    }

    /**
     * @param {boolean} value
     */
    set_autowrap(value) {
        this._autowrap = value;
        this.word_cache_dirty = true;
        this.update();
    }

    /**
     * @param {boolean} value
     */
    set_uppercase(value) {
        this._uppercase = value;
        this.word_cache_dirty = true;
        this.update();
    }

    /**
     * @param {string} value
     */
    set_text(value) {
        if (this._text === value) {
            return;
        }
        this._text = value;
        this.word_cache_dirty = true;
        if (this._percent_visible < 1) {
            this._visible_characters = this.get_total_character_count() * this._percent_visible;
        }
        this.update();
    }

    /**
     * @param {boolean} value
     */
    set_clip_text(value) {
        this._clip_text = value;
        this.update();
        this.minimum_size_changed();
    }

    /**
     * @param {number} value
     */
    set_visible_characters(value) {
        this._visible_characters = value;
        if (this.get_total_character_count() > 0) {
            this._percent_visible = value / this.total_char_cache;
        }
        this.update();
    }

    /**
     * @param {number} value
     */
    set_percent_visible(value) {
        if (value < 0 || value >= 1) {
            this._percent_visible = 1;
            this._visible_characters = -1;
        } else {
            this._percent_visible = value;
            this._visible_characters = this.get_total_character_count() * this._percent_visible;
        }
        this.update();
    }

    /**
     * @param {number} p_align
     */
    set_align(p_align) {
        this._align = p_align;
        this.update();
    }

    /**
     * @param {number} p_align
     */
    set_valign(p_align) {
        this._valign = p_align;
        this.update();
    }

    /**
     * @param {number} p_lines
     */
    set_lines_skipped(p_lines) {
        this._lines_skipped = p_lines;
        this.update();
    }

    /**
     * @param {number} p_lines
     */
    set_max_lines_visible(p_lines) {
        this._max_lines_visible = p_lines;
        this.update();
    }
}
node_class_map['Label'] = GDCLASS(Label, Control)
