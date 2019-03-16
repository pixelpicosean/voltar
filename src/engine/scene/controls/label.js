import Control from "./control";
import Sprite from "../sprites/sprite";

import { Vector2, Rectangle } from "engine/core/math/index";
import Color from "engine/core/color";
import { SizeFlag, Margin } from "./const";

import { node_class_map } from "engine/registry";
import { registered_bitmap_fonts } from "../text/res";

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

const tmp_color = new Color();

/**
 * @enum {number}
 */
const Align = {
    LEFT: 0,
    CENTER: 1,
    RIGHT: 2,
    FILL: 3,
}

/**
 * @enum {number}
 */
const VAlign = {
    TOP: 0,
    CENTER: 1,
    BOTTON: 2,
    FILL: 3,
}

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

export default class Label extends Control {
    get autowrap() {
        return this._autowrap;
    }
    /**
     * @param {boolean} value
     */
    set autowrap(value) {
        this._autowrap = value;
        this.word_cache_dirty = true;
    }
    /**
     * @param {boolean} value
     */
    set_autowrap(value) {
        this.autowrap = value;
        return this;
    }

    get uppercase() {
        return this._uppercase;
    }
    /**
     * @param {boolean} value
     */
    set uppercase(value) {
        this._uppercase = value;
        this.word_cache_dirty = true;
    }
    /**
     * @param {boolean} value
     */
    set_uppercase(value) {
        this.uppercase = value;
        return this;
    }

    get text() {
        return this._text;
    }
    /**
     * @param {string} value
     */
    set text(value) {
        if (this._text === value) {
            return;
        }
        this._text = value;
        this.word_cache_dirty = true;
        if (this._percent_visible < 1) {
            this._visible_characters = this.get_total_character_count() * this._percent_visible;
        }
    }
    /**
     * @param {string} value
     */
    set_text(value) {
        this.text = value;
        return this;
    }

    get clip_text() {
        return this._clip_text;
    }
    /**
     * @param {boolean} value
     */
    set clip_text(value) {
        this._clip_text = value;
        this.minimum_size_changed();
    }
    /**
     * @param {boolean} value
     */
    set_clip_text(value) {
        this.clip_text = value;
        return this;
    }

    get visible_characters() {
        return this._visible_characters;
    }
    /**
     * @param {number} value
     */
    set visible_characters(value) {
        this._visible_characters = value;
        if (this.get_total_character_count() > 0) {
            this.percent_visible = value / this.total_char_cache;
        }
    }
    /**
     * @param {number} value
     */
    set_visible_characters(value) {
        this.visible_characters = value;
        return this;
    }

    get percent_visible() {
        return this._percent_visible;
    }
    /**
     * @param {number} value
     */
    set percent_visible(value) {
        if (value < 0 || value >= 1) {
            this._percent_visible = 1;
            this._visible_characters = -1;
        } else {
            this._percent_visible = value;
            this._visible_characters = this.get_total_character_count() * this._percent_visible;
        }
    }
    /**
     * @param {number} value
     */
    set_percent_visible(value) {
        this.percent_visible = value;
        return this;
    }

    /**
     * @param {Align} align
     */
    set_align(align) {
        this.align = align;
        return this;
    }
    /**
     * @param {VAlign} valign
     */
    set_valign(valign) {
        this.valign = valign;
        return this;
    }

    constructor() {
        super();

        this.type = 'Label';

        this.align = Align.LEFT;
        this._autowrap = false;
        this.line_count = 0;
        this._clip_text = false;
        this.minsize = new Vector2();
        this.lines_skipped = 0;
        this.max_lines_visible = -1;
        this._percent_visible = 1;
        /**
         * @type {string}
         */
        this._text = '';
        this._uppercase = false;
        this.valign = VAlign.TOP;
        this._visible_characters = -1;

        this.word_cache_dirty = false;
        this.word_cache = null;
        this.total_char_cache = 0;

        this.size_flags_vertical = SizeFlag.SHRINK_CENTER;

        /** @type {Sprite[]} */
        this._glyphs = [];
    }
    _load_data(data) {
        super._load_data(data);

        if (data.align !== undefined) {
            this.align = data.align;
        }
        if (data.autowrap !== undefined) {
            this.autowrap = data.autowrap;
        }
        if (data.clip_text !== undefined) {
            this.clip_text = data.clip_text;
        }
        if (data.lines_skipped !== undefined) {
            this.lines_skipped = data.lines_skipped;
        }
        if (data.max_lines_visible !== undefined) {
            this.max_lines_visible = data.max_lines_visible;
        }
        if (data.percent_visible !== undefined) {
            this.percent_visible = data.percent_visible;
        }
        if (data.text !== undefined) {
            this.text = data.text;
        }
        if (data.uppercase !== undefined) {
            this.uppercase = data.uppercase;
        }
        if (data.valign !== undefined) {
            this.valign = data.valign;
        }
        if (data.visible_characters !== undefined) {
            this.visible_characters = data.visible_characters;
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

    _resized() {
        this.word_cache_dirty = true;
    }

    _theme_changed() {
        this.word_cache_dirty = true;
    }

    /**
     * @param {Vector2} size
     */
    get_minimum_size(size) {
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
        if (!this.is_inside_tree) {
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
        if (!this.is_inside_tree) {
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

        if (this.max_lines_visible > 0 && this.line_count > this.max_lines_visible) {
            this.minsize.y = (font.height * this.max_lines_visible) + (line_spacing * (this.max_lines_visible - 1));
        } else {
            this.minsize.y = (font.height * this.line_count) + (line_spacing * (this.line_count - 1));
        }

        if (!this._autowrap || !this._clip_text) {
            this.minimum_size_changed();
        }
        this.word_cache_dirty = false;
    }

    /**
     * @param {import('engine/servers/visual/webgl_renderer').default} renderer - The renderer
     */
    _render_webgl(renderer) {
        this._update_transform();

        if (this._clip_text) {
            // TODO: use mask to clip
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

        const color_hex = tmp_color
            .copy(font_color)
            .multiply(this.modulate)
            .multiply(this.self_modulate)
            .as_hex();

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

        if (lines_visible > 0) {
            switch (this.valign) {
                case VAlign.TOP: {
                    // nothing
                } break;
                case VAlign.CENTER: {
                    vbegin = Math.floor((size.y - (lines_visible * font_h - line_spacing)) / 2);
                    vsep = 0;
                } break;
                case VAlign.BOTTON: {
                    vbegin = Math.floor(size.y - (lines_visible * font_h - line_spacing));
                    vsep = 0;
                } break;
                case VAlign.FILL: {
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
        let glyph_idx = 0;
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
                case Align.FILL:
                case Align.LEFT: {
                    x_ofs = style.get_offset(tmp_vec8).x;
                } break;
                case Align.CENTER: {
                    x_ofs = Math.floor((size.x - (taken + spaces * space_w)) * 0.5);
                } break;
                case Align.RIGHT: {
                    x_ofs = Math.floor(size.x - style.get_margin(Margin.Right) - (taken + spaces * space_w));
                } break;
            }

            let y_ofs = style.get_offset(tmp_vec9).y;
            y_ofs += (line - this.lines_skipped) * font_h + font.ascent;
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
                    if (can_fill && this.align === Align.FILL && spaces) {
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
                            this._glyphs[glyph_idx] = g = new Sprite();
                            g.anchor.set(0, 0);
                            g.interactive = false;
                            g.interactive_children = false;
                        }

                        // Update char sprite info
                        g.texture = char.texture;
                        g.position.set(x_ofs + char.h_align, y_ofs - font.ascent + char.v_align);
                        g.tint = color_hex;

                        // Update transform
                        g.parent = this;
                        g._update_transform();
                        g.parent = null;

                        g._render_webgl(renderer);

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
}

Label.Align = Align;
Label.VAlign = VAlign;

node_class_map['Label'] = Label;
