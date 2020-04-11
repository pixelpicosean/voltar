import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
import { res_class_map } from "engine/registry";
import {
    HALIGN_LEFT,
    HALIGN_FILL,
    HALIGN_CENTER,
    HALIGN_RIGHT,
} from "engine/core/math/math_defs";

import { ImageTexture } from "./texture";

class DynamicFontRenderContext {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        this.texture = new ImageTexture;
    }
}
/** @type {DynamicFontRenderContext[]} */
const DynamicFontRenderContext_pool = [];
function DynamicFontRenderContext_new() {
    let ctx = DynamicFontRenderContext_pool.pop();
    if (!ctx) ctx = new DynamicFontRenderContext;
    return ctx;
}
/** @param {DynamicFontRenderContext} ctx */
function DynamicFontRenderContext_free(ctx) {
    DynamicFontRenderContext_pool.push(ctx);
}

/** @type {CanvasRenderingContext2D} */
const measure_ctx = (() => {
    let c = document.createElement('canvas');
    return c.getContext('2d');
})();

export class DynamicFont {
    get type() { return 'DynamicFont' }

    constructor() {
        this.name = '';

        this.family = '';
        this.size = 0;

        this.height = -1;
        this.ascent = 0;
        this.descent = 0;

        /** @type {Map<number, DynamicFontRenderContext>} */
        this.ctx_table = new Map;
    }

    _load_data(data) {
        this.family = data.font;
        this.size = data.size;

        return this;
    }

    get_height() {
        return this.height;
    }

    /**
     * @param {string} text
     */
    get_text_size(text) {
        measure_ctx.font = `${this.size}px ${this.family}`;

        // measure line height if not done yet
        if (this.height < 0) {
            const m = measure_ctx.measureText('M');
            this.height = m.width * 1.2;
        }

        const lines = text.split('\n');

        let total_height = lines.length * (this.height + 3) - 3;
        let max_width = 0;
        for (let i = 0; i < lines.length; i++) {
            let width = measure_ctx.measureText(lines[i]).width;
            max_width = Math.max(max_width, width);
        }

        return {
            width: max_width,
            height: total_height,
        }
    }

    /**
     * @param {import('engine/servers/visual/visual_server_canvas').Item} canvas_item
     * @param {string} text
     * @param {number} align
     */
    draw_to_texture(canvas_item, text, align) {
        const size = this.get_text_size(text);

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
        }

        ctx.canvas.width = size.width;
        ctx.canvas.height = size.height;

        ctx.context.font = `${this.size}px ${this.family}`;
        ctx.context.textBaseline = 'top';
        ctx.context.textAlign = 'left';
        ctx.context.fillStyle = 'white';

        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            let width = ctx.context.measureText(lines[i]).width;
            let x = 0;
            switch (align) {
                case HALIGN_LEFT:
                case HALIGN_FILL: {
                    x = 0;
                } break;
                case HALIGN_CENTER: {
                    x = (size.width - width) / 2;
                } break;
                case HALIGN_RIGHT: {
                    x = size.width - width;
                } break;
            }
            ctx.context.fillText(lines[i], x, 3 + i * (this.height + 3));
        }

        ctx.texture.create_from_image(ctx.canvas, {
            min_filter: WebGLRenderingContext.LINEAR,
            mag_filter: WebGLRenderingContext.LINEAR,
            wrap_u: WebGLRenderingContext.CLAMP_TO_EDGE,
            wrap_v: WebGLRenderingContext.CLAMP_TO_EDGE,
        });

        return ctx.texture;
    }
}
res_class_map['DynamicFont'] = DynamicFont;


const ZeroVector = Object.freeze(new Vector2(0, 0));

const tmp_vec = new Vector2();

export class Character {
    constructor() {
        this.h_align = 0;
        this.v_align = 0;
        this.advance = 0;
        this.rect = new Rect2();
        /** @type {ImageTexture} */
        this.texture = null;
        /**
         * @type {Object<string, number>}
         */
        this.kerning = {};
    }
}

export class BitmapFont {
    get type() { return 'BitmapFont' }

    constructor() {
        this.name = '';

        this.size = 0;
        this.height = 1;
        this.ascent = 0;
        /**
         * @type {Object<string, Character>}
         */
        this.char_map = {};
    }

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
    get_char_size(size, char, next = '') {
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
    get_string_size(size, string) {
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
export const registered_bitmap_fonts = {};

/**
 * Register a bitmap font with data and a texture.
 *
 * @static
 * @param {XMLDocument} xml - The XML document data.
 * @param {Object<string, ImageTexture>} textures - List of textures for each page.
 *  If providing an object, the key is the `<page>` element's `file` attribute in the FNT file.
 */
export function register_bitmap_font(xml, textures) {
    const font = new BitmapFont();

    const info = xml.getElementsByTagName('info')[0];
    const common = xml.getElementsByTagName('common')[0];
    const pages = xml.getElementsByTagName('page');
    const res = 1;
    const pages_textures = {};

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
