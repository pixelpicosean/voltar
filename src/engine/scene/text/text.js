import settings from 'engine/settings';
import { TEXT_GRADIENT } from 'engine/const';
import { Rectangle } from 'engine/core/math/index';
import { sign, rgb2hex, hex2string } from 'engine/utils/index';
import trim_canvas from 'engine/utils/trim_canvas';
import Texture from 'engine/scene/resources/textures/texture';
import Sprite from 'engine/scene/sprites/sprite';

import TextStyle from './text_style';
import TextMetrics from './text_metrics';

const defaultDestroyOptions = {
    texture: true,
    children: false,
    base_texture: true,
};

/**
 * A Text Object will create a line or multiple lines of text. To split a line you can use '\n' in your text string,
 * or add a wordWrap property set to true and and wordWrapWidth property with a value in the style object.
 *
 * A Text can be created directly from a string and a style object
 *
 * ```js
 * let text = new Text('This is a text',{fontFamily : 'Arial', fontSize: 24, fill : 0xff1010, align : 'center'});
 * ```
 */
export default class Text extends Sprite {
    /**
     * @param {string} text - The string that you would like the text to display
     * @param {object|TextStyle} [style] - The style parameters
     * @param {HTMLCanvasElement} [canvas] - The canvas element for drawing text
     */
    constructor(text, style, canvas) {
        canvas = canvas || document.createElement('canvas');

        canvas.width = 3;
        canvas.height = 3;

        const texture = Texture.from_canvas(canvas, settings.SCALE_MODE, 'text');

        texture.orig = new Rectangle();
        texture.trim = new Rectangle();

        super(texture);
        const self = this;

        this.type = 'Text';

        // base texture is already automatically added to the cache, now adding the actual texture
        Texture.add_to_cache(this._texture, this._texture.base_texture.texture_cache_ids[0]);

        /**
         * The canvas element that everything is drawn to
         *
         * @member {HTMLCanvasElement}
         */
        this.canvas = canvas;

        /**
         * The canvas 2d context that everything is drawn with
         * @member {CanvasRenderingContext2D}
         */
        this.context = this.canvas.getContext('2d');

        /**
         * The resolution / device pixel ratio of the canvas. This is set automatically by the renderer.
         * @member {number}
         * @default 1
         */
        this.resolution = settings.RESOLUTION;

        /**
         * Private tracker for the current text.
         *
         * @member {string}
         * @private
         */
        this._text = null;

        /**
         * Private tracker for the current style.
         *
         * @member {object}
         * @private
         */
        this._style = null;
        /**
         * Private listener to track style changes.
         *
         * @member {Function}
         * @private
         */
        this._styleListener = null;

        /**
         * Private tracker for the current font.
         *
         * @member {string}
         * @private
         */
        this._font = '';

        this.text = text;
        this.style = style;

        this.local_style_id = -1;

        this.fill = {
            _rgb: [0, 0, 0],

            get r() {
                return this._rgb[0];
            },
            set r(value) {
                this._rgb[0] = value;
                self._style.fill = hex2string(rgb2hex(this._rgb));
            },

            get g() {
                return this._rgb[1];
            },
            set g(value) {
                this._rgb[1] = value;
                self._style.fill = hex2string(rgb2hex(this._rgb));
            },

            get b() {
                return this._rgb[2];
            },
            set b(value) {
                this._rgb[2] = value;
                self._style.fill = hex2string(rgb2hex(this._rgb));
            },

            get a() {
                return 1;
            },
            set a(value) {
                // Fill does not support alpha
            },
        };
    }

    _load_data(data) {
        super._load_data(data);

        for (let k in data) {
            switch (k) {
                // Directly set
                // - Text
                case 'text':
                    this[k] = data[k];
                    break;
                case 'style':
                    this.style = data.style;
                    this.local_style_id = -1;
                    break;
                case '_style':
                    Object.assign(this._style, data._style);
                    this.local_style_id = -1;
                    break;
            }
        }

        return this;
    }

    /**
     * Renders text and updates it when needed.
     *
     * @private
     * @param {boolean} respectDirty - Whether to abort updating the text if the Text isn't dirty and the function is called.
     */
    update_text(respectDirty) {
        const style = this._style;

        // check if style has changed..
        if (this.local_style_id !== style.styleID) {
            this.dirty = true;
            this.local_style_id = style.styleID;
        }

        if (!this.dirty && respectDirty) {
            return;
        }

        this._font = this._style.toFontString();

        const context = this.context;
        const measured = TextMetrics.measureText(this._text, this._style, this._style.wordWrap, this.canvas);
        const width = measured.width;
        const height = measured.height;
        const lines = measured.lines;
        const lineHeight = measured.lineHeight;
        const lineWidths = measured.lineWidths;
        const maxLineWidth = measured.maxLineWidth;
        const fontProperties = measured.fontProperties;

        this.canvas.width = Math.ceil((Math.max(1, width) + (style.padding * 2)) * this.resolution);
        this.canvas.height = Math.ceil((Math.max(1, height) + (style.padding * 2)) * this.resolution);

        context.scale(this.resolution, this.resolution);

        context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        context.font = this._font;
        context.strokeStyle = style.stroke;
        context.lineWidth = style.strokeThickness;
        context.textBaseline = style.textBaseline;
        context.lineJoin = style.lineJoin;
        context.miterLimit = style.miterLimit;

        let linePositionX;
        let linePositionY;

        if (style.dropShadow) {
            context.fillStyle = style.dropShadowColor;
            context.globalAlpha = style.dropShadowAlpha;
            context.shadowBlur = style.dropShadowBlur;

            if (style.dropShadowBlur > 0) {
                context.shadowColor = style.dropShadowColor;
            }

            const xShadowOffset = Math.cos(style.dropShadowAngle) * style.dropShadowDistance;
            const yShadowOffset = Math.sin(style.dropShadowAngle) * style.dropShadowDistance;

            for (let i = 0; i < lines.length; i++) {
                linePositionX = style.strokeThickness / 2;
                linePositionY = ((style.strokeThickness / 2) + (i * lineHeight)) + fontProperties.ascent;

                if (style.align === 'right') {
                    linePositionX += maxLineWidth - lineWidths[i];
                }
                else if (style.align === 'center') {
                    linePositionX += (maxLineWidth - lineWidths[i]) / 2;
                }

                if (style.fill) {
                    this.draw_letter_spacing(
                        lines[i],
                        linePositionX + xShadowOffset + style.padding, linePositionY + yShadowOffset + style.padding
                    );

                    if (style.stroke && style.strokeThickness) {
                        context.strokeStyle = style.dropShadowColor;
                        this.draw_letter_spacing(
                            lines[i],
                            linePositionX + xShadowOffset + style.padding, linePositionY + yShadowOffset + style.padding,
                            true
                        );
                        context.strokeStyle = style.stroke;
                    }
                }
            }
        }

        // reset the shadow blur and alpha that was set by the drop shadow, for the regular text
        context.shadowBlur = 0;
        context.globalAlpha = 1;

        // set canvas text styles
        context.fillStyle = this._generate_fill_style(style, lines);

        // draw lines line by line
        for (let i = 0; i < lines.length; i++) {
            linePositionX = style.strokeThickness / 2;
            linePositionY = ((style.strokeThickness / 2) + (i * lineHeight)) + fontProperties.ascent;

            if (style.align === 'right') {
                linePositionX += maxLineWidth - lineWidths[i];
            }
            else if (style.align === 'center') {
                linePositionX += (maxLineWidth - lineWidths[i]) / 2;
            }

            if (style.stroke && style.strokeThickness) {
                this.draw_letter_spacing(
                    lines[i],
                    linePositionX + style.padding,
                    linePositionY + style.padding,
                    true
                );
            }

            if (style.fill) {
                this.draw_letter_spacing(
                    lines[i],
                    linePositionX + style.padding,
                    linePositionY + style.padding
                );
            }
        }

        this.update_texture();
    }

    /**
     * Render the text with letter-spacing.
     * @param {string} text - The text to draw
     * @param {number} x - Horizontal position to draw the text
     * @param {number} y - Vertical position to draw the text
     * @param {boolean} [isStroke=false] - Is this drawing for the outside stroke of the
     *  text? If not, it's for the inside fill
     * @private
     */
    draw_letter_spacing(text, x, y, isStroke = false) {
        const style = this._style;

        // letterSpacing of 0 means normal
        const letterSpacing = style.letterSpacing;

        if (letterSpacing === 0) {
            if (isStroke) {
                this.context.strokeText(text, x, y);
            }
            else {
                this.context.fillText(text, x, y);
            }

            return;
        }

        const characters = String.prototype.split.call(text, '');
        let currentPosition = x;
        let index = 0;
        let current = '';

        while (index < text.length) {
            current = characters[index++];
            if (isStroke) {
                this.context.strokeText(current, currentPosition, y);
            }
            else {
                this.context.fillText(current, currentPosition, y);
            }
            currentPosition += this.context.measureText(current).width + letterSpacing;
        }
    }

    /**
     * Updates texture size based on canvas size
     *
     * @private
     */
    update_texture() {
        const canvas = this.canvas;

        if (this._style.trim) {
            const trimmed = trim_canvas(canvas);

            if (trimmed.data) {
                canvas.width = trimmed.width;
                canvas.height = trimmed.height;
                this.context.putImageData(trimmed.data, 0, 0);
            }
        }

        const texture = this._texture;
        const style = this._style;
        const padding = style.trim ? 0 : style.padding;
        const base_texture = texture.base_texture;

        base_texture.has_loaded = true;
        base_texture.resolution = this.resolution;

        base_texture.real_width = canvas.width;
        base_texture.real_height = canvas.height;
        base_texture.width = canvas.width / this.resolution;
        base_texture.height = canvas.height / this.resolution;

        texture.trim.width = texture._frame.width = canvas.width / this.resolution;
        texture.trim.height = texture._frame.height = canvas.height / this.resolution;
        texture.trim.x = -padding;
        texture.trim.y = -padding;

        texture.orig.width = texture._frame.width - (padding * 2);
        texture.orig.height = texture._frame.height - (padding * 2);

        // call sprite onTextureUpdate to update scale if _width or _height were set
        this._on_texture_update();

        base_texture.emit_signal('update', base_texture);

        this.dirty = false;
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @param {import('engine/servers/visual/webgl_renderer').default} renderer - The renderer
     */
    render_webgl(renderer) {
        if (this.resolution !== renderer.resolution) {
            this.resolution = renderer.resolution;
            this.dirty = true;
        }

        this.update_text(true);

        super.render_webgl(renderer);
    }

    /**
     * Gets the local bounds of the text object.
     *
     * @param {Rectangle} rect - The output rectangle.
     * @return {Rectangle} The bounds.
     */
    get_local_bounds(rect) {
        this.update_text(true);

        return super.get_local_bounds(rect);
    }

    /**
     * calculates the bounds of the Text as a rectangle. The bounds calculation takes the world_transform into account.
     */
    _calculate_bounds() {
        this.update_text(true);
        this.calculate_vertices();
        // if we have already done this on THIS frame.
        this._bounds.add_quad(this.vertex_data);
    }

    /**
     * Method to be called upon a TextStyle change.
     * @private
     */
    _on_style_change() {
        this.dirty = true;
    }

    /**
     * Generates the fill style. Can automatically generate a gradient based on the fill style being an array
     *
     * @private
     * @param {object} style - The style.
     * @param {string[]} lines - The lines of text.
     * @return {string|CanvasGradient} The fill style
     */
    _generate_fill_style(style, lines) {
        if (!Array.isArray(style.fill)) {
            return style.fill;
        }

        // the gradient will be evenly spaced out according to how large the array is.
        // ['#FF0000', '#00FF00', '#0000FF'] would created stops at 0.25, 0.5 and 0.75
        let gradient;
        let totalIterations;
        let currentIteration;
        let stop;

        const width = this.canvas.width / this.resolution;
        const height = this.canvas.height / this.resolution;

        // make a copy of the style settings, so we can manipulate them later
        const fill = style.fill.slice();
        const fillGradientStops = style.fillGradientStops.slice();

        // wanting to evenly distribute the fills. So an array of 4 colours should give fills of 0.25, 0.5 and 0.75
        if (!fillGradientStops.length) {
            const lengthPlus1 = fill.length + 1;

            for (let i = 1; i < lengthPlus1; ++i) {
                fillGradientStops.push(i / lengthPlus1);
            }
        }

        // stop the bleeding of the last gradient on the line above to the top gradient of the this line
        // by hard defining the first gradient colour at point 0, and last gradient colour at point 1
        fill.unshift(style.fill[0]);
        fillGradientStops.unshift(0);

        fill.push(style.fill[style.fill.length - 1]);
        fillGradientStops.push(1);

        if (style.fillGradientType === TEXT_GRADIENT.LINEAR_VERTICAL) {
            // start the gradient at the top center of the canvas, and end at the bottom middle of the canvas
            gradient = this.context.createLinearGradient(width / 2, 0, width / 2, height);

            // we need to repeat the gradient so that each individual line of text has the same vertical gradient effect
            // ['#FF0000', '#00FF00', '#0000FF'] over 2 lines would create stops at 0.125, 0.25, 0.375, 0.625, 0.75, 0.875
            totalIterations = (fill.length + 1) * lines.length;
            currentIteration = 0;
            for (let i = 0; i < lines.length; i++) {
                currentIteration += 1;
                for (let j = 0; j < fill.length; j++) {
                    if (typeof fillGradientStops[j] === 'number') {
                        stop = (fillGradientStops[j] / lines.length) + (i / lines.length);
                    }
                    else {
                        stop = currentIteration / totalIterations;
                    }
                    gradient.addColorStop(stop, fill[j]);
                    currentIteration++;
                }
            }
        }
        else {
            // start the gradient at the center left of the canvas, and end at the center right of the canvas
            gradient = this.context.createLinearGradient(0, height / 2, width, height / 2);

            // can just evenly space out the gradients in this case, as multiple lines makes no difference
            // to an even left to right gradient
            totalIterations = fill.length + 1;
            currentIteration = 1;

            for (let i = 0; i < fill.length; i++) {
                if (typeof fillGradientStops[i] === 'number') {
                    stop = fillGradientStops[i];
                }
                else {
                    stop = currentIteration / totalIterations;
                }
                gradient.addColorStop(stop, fill[i]);
                currentIteration++;
            }
        }

        return gradient;
    }

    /**
     * Destroys this text object.
     * Note* Unlike a Sprite, a Text object will automatically destroy its base_texture and texture as
     * the majority of the time the texture will not be shared with any other Sprites.
     *
     * @param {import('../node_2d').DestroyOption|boolean} [options] - Options parameter. A boolean will act as if all options
     *  have been set to that value
     */
    free(options) {
        if (typeof options === 'boolean') {
            options = { children: options };
        }

        options = Object.assign({}, defaultDestroyOptions, options);

        super.free(options);

        // make sure to reset the the context and canvas.. dont want this hanging around in memory!
        this.context = null;
        this.canvas = null;

        this._style = null;
    }

    /**
     * The width of the Text, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     */
    get width() {
        this.update_text(true);

        return Math.abs(this.scale.x) * this._texture.orig.width;
    }

    set width(value) // eslint-disable-line require-jsdoc
    {
        this.update_text(true);

        const s = sign(this.scale.x) || 1;

        this.scale.x = s * value / this._texture.orig.width;
        this._width = value;
    }

    /**
     * The height of the Text, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     */
    get height() {
        this.update_text(true);

        return Math.abs(this.scale.y) * this._texture.orig.height;
    }

    set height(value) // eslint-disable-line require-jsdoc
    {
        this.update_text(true);

        const s = sign(this.scale.y) || 1;

        this.scale.y = s * value / this._texture.orig.height;
        this._height = value;
    }

    /**
     * Set the style of the text. Set up an event listener to listen for changes on the style
     * object and mark the text as dirty.
     *
     * @member {object|TextStyle}
     */
    get style() {
        return this._style;
    }

    set style(style) // eslint-disable-line require-jsdoc
    {
        style = style || {};

        if (style instanceof TextStyle) {
            this._style = style;
        }
        else {
            this._style = new TextStyle(style);
        }

        this.local_style_id = -1;
        this.dirty = true;
    }

    /**
     * Set the copy for the text object. To split a line you can use '\n'.
     *
     * @member {string}
     */
    get text() {
        return this._text;
    }

    set text(text) // eslint-disable-line require-jsdoc
    {
        text = String(text === '' || text === null || text === undefined ? ' ' : text);

        if (this._text === text) {
            return;
        }
        this._text = text;
        this.dirty = true;
    }
}
