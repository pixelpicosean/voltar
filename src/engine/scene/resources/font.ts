import { VObject } from "engine/core/v_object";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2.js";
import {
    res_class_map,
    get_resource_map,
} from "engine/registry";
import {
    HALIGN_LEFT,
    HALIGN_FILL,
    HALIGN_CENTER,
    HALIGN_RIGHT,
    VALIGN_TOP,
    VALIGN_CENTER,
    VALIGN_BOTTOM,
    VALIGN_FILL,
} from "engine/core/math/math_defs.js";

import { ImageTexture } from "./texture";
import { FontFaceObserver } from "engine/dep/fontfaceobserver.js";

class DynamicFontRenderContext {
    canvas = document.createElement('canvas');
    context = this.canvas.getContext('2d');
    texture = new ImageTexture;
}
const DynamicFontRenderContext_pool: DynamicFontRenderContext[] = [];
function DynamicFontRenderContext_new() {
    let ctx = DynamicFontRenderContext_pool.pop();
    if (!ctx) ctx = new DynamicFontRenderContext;
    return ctx;
}
function DynamicFontRenderContext_free(ctx: DynamicFontRenderContext) {
    DynamicFontRenderContext_pool.push(ctx);
}

const measure_ctx: CanvasRenderingContext2D = (() => {
    let c = document.createElement('canvas');
    return c.getContext('2d');
})();

export class DynamicFontData extends VObject {
    get type() { return 'DynamicFontData' }

    ascender = 0;
    descender = 0;
    family = '';

    loaded = false;

    _load_data(data: any) {
        this.ascender = data.ascender;
        this.descender = data.descender;
        this.family = data.family;

        let observer = new FontFaceObserver(this.family);
        observer.load().then(() => {
            this.loaded = true;
            this.emit_signal('loaded', this);
        }, () => {
            this.loaded = false;
            console.warn(`Fail to load DynamicFont "${this.family}"!`);
        })

        return this;
    }
}
res_class_map['DynamicFontData'] = DynamicFontData;

export class DynamicFont extends VObject {
    get type() { return 'DynamicFont' }

    get family() { return this.font ? this.font.family : '' }

    name = '';

    font: DynamicFontData = null;
    size = 0;

    height = 0;
    ascent = 0;
    descent = 0;

    ctx_table: Map<number, DynamicFontRenderContext> = new Map;

    _load_data(data: any) {
        this.size = data.size || 16;
        this.set_font_data(data.font);
        return this;
    }

    /**
     * @param {string | DynamicFontData} font_data
     */
    set_font_data(font_data: string | DynamicFontData) {
        /** @type {DynamicFontData} */
        let data: DynamicFontData = null;
        if (typeof (font_data) === 'string') {
            data = get_resource_map()[font_data];
        } else {
            data = font_data;
        }

        this.font = data;

        this.update_font_info();
    }

    /**
     * @param {Function} callback
     * @param {any} scope
     */
    add_load_listener(callback: Function, scope: any) {
        if (!this.font) return;
        if (this.font.loaded) return;

        this.font.connect_once('loaded', callback, scope);
    }

    update_font_info() {
        // The calculation is based on Godot behavior, which
        // is basically how FreeType works. These data generated
        // from opentype.js during importing.
        this.ascent = Math.ceil(this.size * this.font.ascender / 1000);
        this.descent = Math.ceil(Math.abs(this.size * this.font.descender / 1000));
        this.height = this.ascent + this.descent;
    }

    /**
     * @param {string} text
     * @param {number} max_width
     */
    wrap_lines(text: string, max_width: number) {
        if (max_width < 0) {
            return text.split('\n');
        }
        max_width = Math.ceil(max_width);

        measure_ctx.font = `${this.size}px ${this.family}`;

        var words = text.split(" ");
        var lines = [];
        var current_line = words[0];

        for (var i = 1; i < words.length; i++) {
            var word = words[i];
            var width = measure_ctx.measureText(current_line + " " + word).width;
            if (Math.ceil(width) <= max_width) {
                current_line += " " + word;
            } else {
                lines.push(current_line);
                current_line = word;
            }
        }
        if (current_line.indexOf('\n') >= 0) {
            lines.push(...current_line.split('\n'));
        } else {
            lines.push(current_line);
        }
        return lines;
    }

    get_height() {
        return this.height;
    }

    /**
     * @param {Vector2} size
     * @param {string} char
     * @param {string} [next]
     */
    get_char_size(size: Vector2, char: string, next: string = '') {
        measure_ctx.font = `${this.size}px ${this.family}`;
        const m = measure_ctx.measureText(char);
        return size.set(
            m.width,
            m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
        );
    }

    /**
     * @param {string} text
     * @param {number} max_width
     * @param {number} line_spacing
     */
    get_text_size(text: string, max_width: number, line_spacing: number) {
        measure_ctx.font = `${this.size}px ${this.family}`;

        const lines = this.wrap_lines(text, max_width);

        let total_height = lines.length * (this.height + line_spacing);
        let width = 0;
        for (let i = 0; i < lines.length; i++) {
            let m = measure_ctx.measureText(lines[i]);
            let w = m.width;
            width = Math.max(width, w);
        }

        return {
            width: width,
            height: total_height,
        }
    }

    /**
     * @param {import('engine/servers/visual/visual_server_canvas').Item} canvas_item
     * @param {string} text
     * @param {Vector2Like} size
     * @param {number} h_align
     * @param {number} v_align
     * @param {number} line_spacing
     * @param {number} line_count
     * @param {number} max_width
     */
    draw_to_texture(canvas_item: import('engine/servers/visual/visual_server_canvas').Item, text: string, size: Vector2Like, h_align: number, v_align: number, line_spacing: number, line_count: number, max_width: number) {
        // fetch context for drawing
        // FIXME: do we need a new canvas for drawing?
        let ctx = this.ctx_table.get(canvas_item._id);
        if (!ctx) {
            ctx = DynamicFontRenderContext_new();
            canvas_item.free_listeners.push((item) => {
                let ctx = this.ctx_table.get(item._id);
                if (ctx) {
                    DynamicFontRenderContext_free(ctx);
                    this.ctx_table.delete(item._id);
                }
            })
            this.ctx_table.set(canvas_item._id, ctx);
        }

        const font_h = this.height + line_spacing;

        let vbegin = 0, vsep = 0;

        let lines_visible = Math.floor((size.y + line_spacing) / font_h);
        if (lines_visible > line_count) {
            lines_visible = line_count;
        }

        if (lines_visible > 0) {
            switch (v_align) {
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

        ctx.canvas.width = size.x;
        ctx.canvas.height = size.y;
        ctx.context.clearRect(0, 0, size.x, size.y);

        ctx.context.font = `${this.size}px ${this.family}`;
        ctx.context.fillStyle = 'white';

        const lines = this.wrap_lines(text, max_width);

        let line_to = lines_visible > 0 ? lines_visible : 1;
        for (let i = 0; i < line_to; i++) {
            let m = ctx.context.measureText(lines[i]);
            let width = m.width;
            let x_ofs = 0;
            switch (h_align) {
                case HALIGN_LEFT:
                case HALIGN_FILL: {
                    // TODO: stylebox
                    x_ofs = Math.floor(m.actualBoundingBoxLeft);
                } break;
                case HALIGN_CENTER: {
                    x_ofs = Math.floor((size.x - width) / 2 - m.actualBoundingBoxLeft);
                } break;
                case HALIGN_RIGHT: {
                    x_ofs = Math.floor(size.x - m.actualBoundingBoxRight);
                } break;
            }
            let y_ofs = 0; // TODO: stylebox
            y_ofs += (i * font_h + this.ascent);
            y_ofs += (vbegin + i * vsep);
            ctx.context.fillText(lines[i], x_ofs, y_ofs);
        }

        ctx.texture.create_from_image(ctx.canvas, {
            FILTER: true,
            REPEAT: false,
            MIPMAP: false,
        });

        return ctx.texture;
    }
}
res_class_map['DynamicFont'] = DynamicFont;


const ZeroVector = Object.freeze(new Vector2(0, 0));

const tmp_vec = new Vector2();

export class Character {
    h_align = 0;
    v_align = 0;
    advance = 0;
    rect = new Rect2();
    texture: ImageTexture = null;
    kerning: { [s: string]: number; } = Object.create(null);
}

export class BitmapFont {
    get type() { return 'BitmapFont' }

    name = '';

    size = 0;
    height = 1;
    ascent = 0;
    char_map: { [s: string]: Character; } = Object.create(null);

    get_height() {
        return this.height;
    }

    get_ascent() {
        return this.ascent;
    }

    get_descent() {
        return this.height - this.ascent;
    }

    /**
     * @param {Vector2} size
     * @param {string} char
     * @param {string} [next]
     */
    get_char_size(size: Vector2, char: string, next: string = '') {
        const c = this.char_map[char.charCodeAt(0)];
        if (!c) {
            return ZeroVector;
        }

        size.set(c.advance, c.rect.height);

        if (next) {
            const n = this.char_map[next.charCodeAt(0)];
            if (n) {
                const amount = n.kerning[char];
                if (amount !== undefined) {
                    size.x -= amount;
                }
            }
        }

        return size;
    }

    /**
     * @param {Vector2} size
     * @param {string} string
     */
    get_string_size(size: Vector2, string: string) {
        let w = 0;

        if (string.length === 0) {
            return size.set(0, this.height);
        }
        for (let i = 0; i < string.length; i++) {
            w += this.get_char_size(tmp_vec.set(0, 0), string[i], string[i + 1]).x;
        }

        return size.set(w, this.height);
    }
}

/**
 * @type {Object<string, BitmapFont>}
 */
export const registered_bitmap_fonts: { [s: string]: BitmapFont; } = {};

/**
 * Register a bitmap font with data and a texture.
 *
 * @static
 * @param {XMLDocument} xml - The XML document data.
 * @param {Object<string, ImageTexture>} textures - List of textures for each page.
 *  If providing an object, the key is the `<page>` element's `file` attribute in the FNT file.
 */
export function register_bitmap_font(xml: XMLDocument, textures: { [s: string]: ImageTexture; }) {
    const font = new BitmapFont();

    const info = xml.getElementsByTagName('info')[0];
    const common = xml.getElementsByTagName('common')[0];
    const pages = xml.getElementsByTagName('page');
    const res = 1;
    const pages_textures: { [id: string]: ImageTexture } = Object.create(null);

    font.name = info.getAttribute('face');
    font.size = parseInt(info.getAttribute('size'), 10) / res;
    font.height = parseInt(common.getAttribute('lineHeight'), 10) / res;
    font.ascent = parseInt(common.getAttribute('base'), 10) / res;

    // Convert the input Texture, Textures or object
    // into a page Texture lookup by "id"
    for (let i = 0; i < pages.length; i++) {
        const id = pages[i].getAttribute('id');
        const file = pages[i].getAttribute('file');

        pages_textures[id] = textures[file];
    }

    // parse letters
    const letters = xml.getElementsByTagName('char');

    for (let i = 0; i < letters.length; i++) {
        const letter = letters[i];
        const char_code = parseInt(letter.getAttribute('id'), 10);
        const page = letter.getAttribute('page') || 0;
        const texture = pages_textures[page];
        const texture_rect = new Rect2(
            (parseInt(letter.getAttribute('x'), 10) / res) + (pages_textures[page].x / res),
            (parseInt(letter.getAttribute('y'), 10) / res) + (pages_textures[page].y / res),
            parseInt(letter.getAttribute('width'), 10) / res,
            parseInt(letter.getAttribute('height'), 10) / res
        );

        const char = font.char_map[char_code] = new Character();
        char.h_align = parseInt(letter.getAttribute('xoffset'), 10) / res;
        char.v_align = parseInt(letter.getAttribute('yoffset'), 10) / res;
        char.advance = parseInt(letter.getAttribute('xadvance'), 10) / res;
        char.rect.copy(texture_rect);
        char.texture = new ImageTexture;
        char.texture.create_from_region(texture, texture_rect.x, texture_rect.y, texture_rect.width, texture_rect.height);
    }

    // parse kernings
    const kernings = xml.getElementsByTagName('kerning');

    for (let i = 0; i < kernings.length; i++) {
        const kerning = kernings[i];
        const first = parseInt(kerning.getAttribute('first'), 10) / res;
        const second = parseInt(kerning.getAttribute('second'), 10) / res;
        const amount = parseInt(kerning.getAttribute('amount'), 10) / res;

        if (font.char_map[second]) {
            font.char_map[second].kerning[first] = amount;
        }
    }

    // I'm leaving this as a temporary fix so we can test the bitmap fonts in v3
    // but it's very likely to change
    registered_bitmap_fonts[font.name] = font;

    return font;
}
