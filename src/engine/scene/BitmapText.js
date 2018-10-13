import settings from '../settings';
import { get_resolution_of_url } from 'engine/utils/index';
import { remove_items } from 'engine/dep/index';
import { Point, ObservablePoint, Rectangle } from 'engine/math/index';
import Node2D from './Node2D';
import Sprite from './sprites/Sprite';
import Texture from 'engine/textures/Texture';

/**
 * A BitmapText object will create a line or multiple lines of text using bitmap font. To
 * split a line you can use '\n', '\r' or '\r\n' in your string. You can generate the fnt files using:
 *
 * A BitmapText can only be created when the font is loaded
 *
 * ```js
 * // in this case the font is in a file called 'desyrel.fnt'
 * let bitmapText = new extras.BitmapText("text using a fancy font!", {font: "35px Desyrel", align: "right"});
 * ```
 *
 * http://www.angelcode.com/products/bmfont/ for windows or
 * http://www.bmglyph.com/ for mac.
 */
export default class BitmapText extends Node2D {
    /**
     * @param {string} text - The copy that you would like the text to display
     * @param {object} style - The style parameters
     * @param {string|object} style.font - The font descriptor for the object, can be passed as a string of form
     *      "24px FontName" or "FontName" or as an object with explicit name/size properties.
     * @param {string} [style.font.name] - The bitmap font id
     * @param {number} [style.font.size] - The size of the font in pixels, e.g. 24
     * @param {string} [style.align='left'] - Alignment for multiline text ('left', 'center' or 'right'), does not affect
     *      single line text
     * @param {number} [style.tint=0xFFFFFF] - The tint color
     */
    constructor(text, style = { font: null }) {
        super();

        this.type = 'BitmapText';

        /**
         * Private tracker for the width of the overall text
         *
         * @member {number}
         * @private
         */
        this._text_width = 0;

        /**
         * Private tracker for the height of the overall text
         *
         * @member {number}
         * @private
         */
        this._text_height = 0;

        /**
         * Private tracker for the letter sprite pool.
         *
         * @member {Sprite[]}
         * @private
         */
        this._glyphs = [];

        /**
         * Private tracker for the current style.
         *
         * @member {object}
         * @private
         */
        this._font = {
            tint: style.tint !== undefined ? style.tint : 0xFFFFFF,
            align: style.align || 'left',
            name: null,
            size: 0,
        };

        /**
         * Private tracker for the current font.
         *
         * @member {object}
         * @private
         */
        this.font = style.font; // run font setter

        /**
         * Private tracker for the current text.
         *
         * @member {string}
         * @private
         */
        this._text = text;

        /**
         * The max width of this bitmap text in pixels. If the text provided is longer than the
         * value provided, line breaks will be automatically inserted in the last whitespace.
         * Disable by setting value to 0
         *
         * @member {number}
         * @private
         */
        this._max_width = 0;

        /**
         * The max line height. This is useful when trying to use the total height of the Text,
         * ie: when trying to vertically align.
         *
         * @member {number}
         * @private
         */
        this._max_line_height = 0;

        /**
         * Letter spacing. This is useful for setting the space between characters.
         * @member {number}
         * @private
         */
        this._letter_spacing = 0;

        /**
         * Text anchor. read-only
         *
         * @member {ObservablePoint}
         * @private
         */
        this._anchor = new ObservablePoint(() => { this.dirty = true; }, this, 0, 0);

        /**
         * The dirty state of this object.
         *
         * @member {boolean}
         */
        this.dirty = false;

        this.update_text();
    }

    _load_data(data) {
        super._load_data(data);

        for (let k in data) {
            switch (k) {
            case 'font':
            case 'text':
            case 'max_width':
            case 'max_line_height':
                this[k] = data[k];
                break;
            case 'font_style':
                this._font = data[k];
                break;
            }
        }
    }

    /**
     * Renders text and updates it when needed
     *
     * @private
     */
    update_text() {
        const data = BitmapText.fonts[this._font.name];
        const scale = this._font.size / data.size;
        const pos = new Point();
        const chars = [];
        const line_widths = [];
        const text = this.text.replace(/(?:\r\n|\r)/g, '\n');
        const text_length = text.length;
        const max_width = this._max_width * data.size / this._font.size;

        let prev_char_code = null;
        let last_line_width = 0;
        let max_line_width = 0;
        let line = 0;
        let last_break_pos = -1;
        let last_break_width = 0;
        let spaces_removed = 0;
        let max_line_height = 0;

        for (let i = 0; i < text_length; i++) {
            const char_code = text.charCodeAt(i);
            const char = text.charAt(i);

            if (/(?:\s)/.test(char)) {
                last_break_pos = i;
                last_break_width = last_line_width;
            }

            if (char === '\r' || char === '\n') {
                line_widths.push(last_line_width);
                max_line_width = Math.max(max_line_width, last_line_width);
                ++line;
                ++spaces_removed;

                pos.x = 0;
                pos.y += data.lineHeight;
                prev_char_code = null;
                continue;
            }

            const char_data = data.chars[char_code];

            if (!char_data) {
                continue;
            }

            if (prev_char_code && char_data.kerning[prev_char_code]) {
                pos.x += char_data.kerning[prev_char_code];
            }

            chars.push({
                texture: char_data.texture,
                line,
                char_code,
                position: new Point(pos.x + char_data.xOffset + (this._letter_spacing / 2), pos.y + char_data.yOffset),
            });
            pos.x += char_data.xAdvance + this._letter_spacing;
            last_line_width = pos.x;
            max_line_height = Math.max(max_line_height, (char_data.yOffset + char_data.texture.height));
            prev_char_code = char_code;

            if (last_break_pos !== -1 && max_width > 0 && pos.x > max_width) {
                ++spaces_removed;
                remove_items(chars, 1 + last_break_pos - spaces_removed, 1 + i - last_break_pos);
                i = last_break_pos;
                last_break_pos = -1;

                line_widths.push(last_break_width);
                max_line_width = Math.max(max_line_width, last_break_width);
                line++;

                pos.x = 0;
                pos.y += data.lineHeight;
                prev_char_code = null;
            }
        }

        const last_char = text.charAt(text.length - 1);

        if (last_char !== '\r' && last_char !== '\n') {
            if (/(?:\s)/.test(last_char)) {
                last_line_width = last_break_width;
            }

            line_widths.push(last_line_width);
            max_line_width = Math.max(max_line_width, last_line_width);
        }

        const line_align_offsets = [];

        for (let i = 0; i <= line; i++) {
            let alignOffset = 0;

            if (this._font.align === 'right') {
                alignOffset = max_line_width - line_widths[i];
            }
            else if (this._font.align === 'center') {
                alignOffset = (max_line_width - line_widths[i]) / 2;
            }

            line_align_offsets.push(alignOffset);
        }

        const len_chars = chars.length;
        const tint = this.tint;

        for (let i = 0; i < len_chars; i++) {
            let c = this._glyphs[i]; // get the next glyph sprite

            if (c) {
                c.texture = chars[i].texture;
            }
            else {
                c = new Sprite(chars[i].texture);
                this._glyphs.push(c);
            }

            c.position.x = (chars[i].position.x + line_align_offsets[chars[i].line]) * scale;
            c.position.y = chars[i].position.y * scale;
            c.scale.x = c.scale.y = scale;
            c.tint = tint;

            if (!c.parent) {
                this.add_child(c);
            }
        }

        // remove unnecessary children.
        for (let i = len_chars; i < this._glyphs.length; ++i) {
            this.remove_child(this._glyphs[i]);
        }

        this._text_width = max_line_width * scale;
        this._text_height = (pos.y + data.lineHeight) * scale;

        // apply anchor
        if (this.anchor.x !== 0 || this.anchor.y !== 0) {
            for (let i = 0; i < len_chars; i++) {
                this._glyphs[i].x -= this._text_width * this.anchor.x;
                this._glyphs[i].y -= this._text_height * this.anchor.y;
            }
        }
        this._max_line_height = max_line_height * scale;
    }

    /**
     * Updates the transform of this object
     *
     * @private
     */
    update_transform() {
        this.validate();
        this.node2d_update_transform();
    }

    /**
     * Validates text before calling parent's get_local_bounds
     *
     * @return {Rectangle} The rectangular bounding area
     */
    get_local_bounds() {
        this.validate();

        return super.get_local_bounds();
    }

    /**
     * Updates text when needed
     *
     * @private
     */
    validate() {
        if (this.dirty) {
            this.update_text();
            this.dirty = false;
        }
    }

    /**
     * The tint of the BitmapText object
     *
     * @member {number}
     */
    get tint() {
        return this._font.tint;
    }

    set tint(value) {
        this._font.tint = (typeof value === 'number' && value >= 0) ? value : 0xFFFFFF;

        this.dirty = true;
    }

    /**
     * The alignment of the BitmapText object
     *
     * @member {string}
     * @default 'left'
     */
    get align() {
        return this._font.align;
    }

    set align(value) {
        this._font.align = value || 'left';

        this.dirty = true;
    }

    /**
     * The anchor sets the origin point of the text.
     * The default is 0,0 this means the text's origin is the top left
     * Setting the anchor to 0.5,0.5 means the text's origin is centered
     * Setting the anchor to 1,1 would mean the text's origin point will be the bottom right corner
     *
     * @member {Point | number}
     */
    get anchor() {
        return this._anchor;
    }

    set anchor(value) {
        if (typeof value === 'number') {
            this._anchor.set(value);
        } else {
            this._anchor.copy(value);
        }
    }

    /**
     * The font descriptor of the BitmapText object
     *
     * @member {string|object}
     */
    get font() {
        return this._font;
    }

    set font(value) {
        if (!value) {
            return;
        }

        if (typeof value === 'string') {
            value = value.split(' ');

            this._font.name = value.length === 1 ? value[0] : value.slice(1).join(' ');
            this._font.size = value.length >= 2 ? parseInt(value[0], 10) : BitmapText.fonts[this._font.name].size;
        } else {
            this._font.name = value.name;
            this._font.size = typeof value.size === 'number' ? value.size : parseInt(value.size, 10);
        }

        this.dirty = true;
    }

    /**
     * The text of the BitmapText object
     *
     * @member {string}
     */
    get text() {
        return this._text;
    }

    /**
     * @param {string}
     */
    set text(value) {
        value = value.toString() || ' ';
        if (this._text === value) {
            return;
        }
        this._text = value;
        this.dirty = true;
    }

    /**
     * The max width of this bitmap text in pixels. If the text provided is longer than the
     * value provided, line breaks will be automatically inserted in the last whitespace.
     * Disable by setting value to 0
     *
     * @member {number}
     */
    get max_width() {
        return this._max_width;
    }

    set max_width(value) {
        if (this._max_width === value) {
            return;
        }
        this._max_width = value;
        this.dirty = true;
    }

    /**
     * The max line height. This is useful when trying to use the total height of the Text,
     * ie: when trying to vertically align.
     *
     * @member {number}
     * @readonly
     */
    get max_line_height() {
        this.validate();

        return this._max_line_height;
    }

    /**
     * The width of the overall text, different from fontSize,
     * which is defined in the style object
     *
     * @member {number}
     * @readonly
     */
    get text_width() {
        this.validate();

        return this._text_width;
    }

    /**
     * Additional space between characters.
     *
     * @member {number}
     */
    get letter_spacing() {
        return this._letter_spacing;
    }

    set letter_spacing(value) // eslint-disable-line require-jsdoc
    {
        if (this._letter_spacing !== value) {
            this._letter_spacing = value;
            this.dirty = true;
        }
    }

    /**
     * The height of the overall text, different from fontSize,
     * which is defined in the style object
     *
     * @member {number}
     * @readonly
     */
    get text_height() {
        this.validate();

        return this._text_height;
    }

    /**
     * Register a bitmap font with data and a texture.
     *
     * @static
     * @param {XMLDocument} xml - The XML document data.
     * @param {Object.<string, Texture>|Texture|Texture[]} textures - List of textures for each page.
     *  If providing an object, the key is the `<page>` element's `file` attribute in the FNT file.
     * @return {Object} Result font object with font, size, lineHeight and char fields.
     */
    static register_font(xml, textures) {
        const data = {};
        const info = xml.getElementsByTagName('info')[0];
        const common = xml.getElementsByTagName('common')[0];
        const pages = xml.getElementsByTagName('page');
        const res = get_resolution_of_url(pages[0].getAttribute('file'), settings.RESOLUTION);
        const pages_textures = {};

        data.font = info.getAttribute('face');
        data.size = parseInt(info.getAttribute('size'), 10);
        data.lineHeight = parseInt(common.getAttribute('lineHeight'), 10) / res;
        data.chars = {};

        // Single texture, convert to list
        if (textures instanceof Texture) {
            textures = [textures];
        }

        // Convert the input Texture, Textures or object
        // into a page Texture lookup by "id"
        for (let i = 0; i < pages.length; i++) {
            const id = pages[i].getAttribute('id');
            const file = pages[i].getAttribute('file');

            pages_textures[id] = textures instanceof Array ? textures[i] : textures[file];
        }

        // parse letters
        const letters = xml.getElementsByTagName('char');

        for (let i = 0; i < letters.length; i++) {
            const letter = letters[i];
            const char_code = parseInt(letter.getAttribute('id'), 10);
            const page = letter.getAttribute('page') || 0;
            const texture_rect = new Rectangle(
                (parseInt(letter.getAttribute('x'), 10) / res) + (pages_textures[page].frame.x / res),
                (parseInt(letter.getAttribute('y'), 10) / res) + (pages_textures[page].frame.y / res),
                parseInt(letter.getAttribute('width'), 10) / res,
                parseInt(letter.getAttribute('height'), 10) / res
            );

            data.chars[char_code] = {
                xOffset: parseInt(letter.getAttribute('xoffset'), 10) / res,
                yOffset: parseInt(letter.getAttribute('yoffset'), 10) / res,
                xAdvance: parseInt(letter.getAttribute('xadvance'), 10) / res,
                kerning: {},
                texture: new Texture(pages_textures[page].base_texture, texture_rect),
                page,
            };
        }

        // parse kernings
        const kernings = xml.getElementsByTagName('kerning');

        for (let i = 0; i < kernings.length; i++) {
            const kerning = kernings[i];
            const first = parseInt(kerning.getAttribute('first'), 10) / res;
            const second = parseInt(kerning.getAttribute('second'), 10) / res;
            const amount = parseInt(kerning.getAttribute('amount'), 10) / res;

            if (data.chars[second]) {
                data.chars[second].kerning[first] = amount;
            }
        }

        // I'm leaving this as a temporary fix so we can test the bitmap fonts in v3
        // but it's very likely to change
        BitmapText.fonts[data.font] = data;

        return data;
    }
}

BitmapText.fonts = {};
