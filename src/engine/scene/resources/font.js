import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
import { ImageTexture } from "./texture";


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

export class Font {
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
 * @type {Object<string, Font>}
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
export function register_font(xml, textures) {
    const font = new Font();

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
