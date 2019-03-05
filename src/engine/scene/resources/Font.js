import { Vector2, Rectangle } from "engine/math/index";

const ZeroVector = Object.freeze(new Vector2(0, 0));

const tmp_vec = new Vector2();

export class Character {
    constructor() {
        this.h_align = 0;
        this.v_align = 0;
        this.advance = 0;
        this.rect = new Rectangle();
        this.texture = null;
        /**
         * @type {Object<string, number>}
         */
        this.kerning = {};
    }
}

export default class Font {
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
