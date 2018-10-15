import { Point, ObservablePoint, Rectangle } from '../../math/index';
import { sign, TextureCache } from '../../utils/index';
import { BLEND_MODES } from '../../const';
import Texture from '../../textures/Texture';
import Node2D from '../Node2D';

import WebGLRenderer from 'engine/renderers/WebGLRenderer';

const tempPoint = new Point();

/**
 * The Sprite object is the base for all textured objects that are rendered to the screen
 *
 * A sprite can be created directly from an image like this:
 *
 * ```js
 * let sprite = new Sprite.from_image('assets/image.png');
 * ```
 */
export default class Sprite extends Node2D {
    /**
     * @param {Texture|string} [texture] - The texture for this sprite
     */
    constructor(texture) {
        super();

        this.type = 'Sprite';

        /**
         * The anchor sets the origin point of the texture.
         * The default is 0,0 or taken from the {@link Texture#default_anchor|Texture}
         * passed to the constructor. A value of 0,0 means the texture's origin is the top left.
         * Setting the anchor to 0.5,0.5 means the texture's origin is centered.
         * Setting the anchor to 1,1 would mean the texture's origin point will be the bottom right corner.
         * Note: Updating the {@link Texture#default_anchor} after a Texture is
         * created does _not_ update the Sprite's anchor values.
         *
         * @member {ObservablePoint}
         * @private
         */
        this._anchor = new ObservablePoint(this._on_anchor_update, this);

        /**
         * The texture that the sprite is using
         *
         * @private
         * @member {Texture}
         */
        this._texture = null;

        /**
         * The key of the texture that the sprite is using
         *
         * @private
         * @member {string|null}
         */
        this._texture_key = null;

        /**
         * The width of the sprite (this is initially set by the texture)
         *
         * @private
         * @member {number}
         */
        this._width = 0;

        /**
         * The height of the sprite (this is initially set by the texture)
         *
         * @private
         * @member {number}
         */
        this._height = 0;

        /**
         * The tint applied to the sprite. This is a hex value. A value of 0xFFFFFF will remove any tint effect.
         *
         * @private
         * @member {number}
         * @default 0xFFFFFF
         */
        this._tint = null;
        this._tint_rgb = null;
        this.tint = 0xFFFFFF;

        /**
         * The blend mode to be applied to the sprite. Apply a value of `BLEND_MODES.NORMAL` to reset the blend mode.
         *
         * @member {number}
         * @default BLEND_MODES.NORMAL
         * @see BLEND_MODES
         */
        this.blend_mode = BLEND_MODES.NORMAL;

        /**
         * The shader that will be used to render the sprite. Set to null to remove a current shader.
         *
         * @member {Filter|Shader}
         */
        this.shader = null;

        /**
         * An internal cached value of the tint.
         *
         * @private
         * @member {number}
         * @default 0xFFFFFF
         */
        this.cached_tint = 0xFFFFFF;

        // call texture setter
        if (texture) {
            if (typeof (texture) === 'string') {
                this._texture_key = texture;
                this.texture = Texture.EMPTY;
            } else {
                this.texture = texture;
            }
            if (texture.default_anchor) {
                this._anchor.set(texture.default_anchor.x, texture.default_anchor.y);
            }
        } else {
            this.texture = Texture.EMPTY;
        }

        /**
         * this is used to store the vertex data of the sprite (basically a quad)
         *
         * @private
         * @member {Float32Array}
         */
        this.vertex_data = new Float32Array(8);

        /**
         * This is used to calculate the bounds of the object IF it is a trimmed sprite
         *
         * @private
         * @member {Float32Array}
         */
        this.vertex_trimmed_data = null;

        this._transform_id = -1;
        this._texture_id = -1;

        this._transform_trimmed_id = -1;
        this._texture_trimmed_id = -1;

        /**
         * Plugin that is responsible for rendering this element.
         * Allows to customize the rendering process without overriding '_render_webgl' & '_render_canvas' methods.
         *
         * @member {string}
         * @default 'sprite'
         */
        this.renderer_plugin = 'sprite';
    }

    _load_data(data) {
        super._load_data(data);

        for (let k in data) {
            switch (k) {
                // Directly set
                // - Sprite
                case 'texture':
                case 'tint':
                    this[k] = data[k];
                    break;

                // Set vector
                // - Sprite
                case 'anchor':
                    this[k].x = data[k].x || 0;
                    this[k].y = data[k].y || 0;
                    break;

                // Blend modes
                case 'blend_mode':
                    this.blend_mode = BLEND_MODES[data[k]];
                    break;
            }
        }
    }

    _propagate_enter_tree() {
        if (this._texture_key) {
            this.texture = TextureCache[this._texture_key];
            this._texture_key = null;
        }

        super._propagate_enter_tree();
    }

    /**
     * When the texture is updated, this event will fire to update the scale and frame
     *
     * @private
     */
    _on_texture_update() {
        this._texture_id = -1;
        this._texture_trimmed_id = -1;
        this.cached_tint = 0xFFFFFF;

        // so if _width is 0 then width was not set..
        if (this._width) {
            this.scale.x = sign(this.scale.x) * this._width / this._texture.orig.width;
        }

        if (this._height) {
            this.scale.y = sign(this.scale.y) * this._height / this._texture.orig.height;
        }
    }

    /**
     * Called when the anchor position updates.
     *
     * @private
     */
    _on_anchor_update() {
        this._transform_id = -1;
        this._transform_trimmed_id = -1;
    }

    /**
     * calculates world_transform * vertices, store it in vertex_data
     */
    calculate_vertices() {
        if (this._transform_id === this.transform._world_id && this._texture_id === this._texture._update_id) {
            return;
        }

        this._transform_id = this.transform._world_id;
        this._texture_id = this._texture._update_id;

        // set the vertex data

        const texture = this._texture;
        const wt = this.transform.world_transform;
        const a = wt.a;
        const b = wt.b;
        const c = wt.c;
        const d = wt.d;
        const tx = wt.tx;
        const ty = wt.ty;
        const vertex_data = this.vertex_data;
        const trim = texture.trim;
        const orig = texture.orig;
        const anchor = this._anchor;

        let w0 = 0;
        let w1 = 0;
        let h0 = 0;
        let h1 = 0;

        if (trim) {
            // if the sprite is trimmed and is not a tilingsprite then we need to add the extra
            // space before transforming the sprite coords.
            w1 = trim.x - (anchor._x * orig.width);
            w0 = w1 + trim.width;

            h1 = trim.y - (anchor._y * orig.height);
            h0 = h1 + trim.height;
        }
        else {
            w1 = -anchor._x * orig.width;
            w0 = w1 + orig.width;

            h1 = -anchor._y * orig.height;
            h0 = h1 + orig.height;
        }

        // xy
        vertex_data[0] = (a * w1) + (c * h1) + tx;
        vertex_data[1] = (d * h1) + (b * w1) + ty;

        // xy
        vertex_data[2] = (a * w0) + (c * h1) + tx;
        vertex_data[3] = (d * h1) + (b * w0) + ty;

        // xy
        vertex_data[4] = (a * w0) + (c * h0) + tx;
        vertex_data[5] = (d * h0) + (b * w0) + ty;

        // xy
        vertex_data[6] = (a * w1) + (c * h0) + tx;
        vertex_data[7] = (d * h0) + (b * w1) + ty;
    }

    /**
     * calculates world_transform * vertices for a non texture with a trim. store it in vertex_trimmed_data
     * This is used to ensure that the true width and height of a trimmed texture is respected
     */
    calculate_trimmed_vertices() {
        if (!this.vertex_trimmed_data) {
            this.vertex_trimmed_data = new Float32Array(8);
        }
        else if (this._transform_trimmed_id === this.transform._world_id && this._texture_trimmed_id === this._texture._update_id) {
            return;
        }

        this._transform_trimmed_id = this.transform._world_id;
        this._texture_trimmed_id = this._texture._update_id;

        // lets do some special trim code!
        const texture = this._texture;
        const vertex_data = this.vertex_trimmed_data;
        const orig = texture.orig;
        const anchor = this._anchor;

        // lets calculate the new untrimmed bounds..
        const wt = this.transform.world_transform;
        const a = wt.a;
        const b = wt.b;
        const c = wt.c;
        const d = wt.d;
        const tx = wt.tx;
        const ty = wt.ty;

        const w1 = -anchor._x * orig.width;
        const w0 = w1 + orig.width;

        const h1 = -anchor._y * orig.height;
        const h0 = h1 + orig.height;

        // xy
        vertex_data[0] = (a * w1) + (c * h1) + tx;
        vertex_data[1] = (d * h1) + (b * w1) + ty;

        // xy
        vertex_data[2] = (a * w0) + (c * h1) + tx;
        vertex_data[3] = (d * h1) + (b * w0) + ty;

        // xy
        vertex_data[4] = (a * w0) + (c * h0) + tx;
        vertex_data[5] = (d * h0) + (b * w0) + ty;

        // xy
        vertex_data[6] = (a * w1) + (c * h0) + tx;
        vertex_data[7] = (d * h0) + (b * w1) + ty;
    }

    /**
    *
    * Renders the object using the WebGL renderer
    *
    * @private
    * @param {WebGLRenderer} renderer - The webgl renderer to use.
    */
    _render_webgl(renderer) {
        this.calculate_vertices();

        renderer.set_object_renderer(renderer.plugins[this.renderer_plugin]);
        renderer.plugins[this.renderer_plugin].render(this);
    }

    /**
     * Updates the bounds of the sprite.
     *
     * @private
     */
    _calculate_bounds() {
        const trim = this._texture.trim;
        const orig = this._texture.orig;

        // First lets check to see if the current texture has a trim..
        if (!trim || (trim.width === orig.width && trim.height === orig.height)) {
            // no trim! lets use the usual calculations..
            this.calculate_vertices();
            this._bounds.add_quad(this.vertex_data);
        }
        else {
            // lets calculate a special trimmed bounds...
            this.calculate_trimmed_vertices();
            this._bounds.add_quad(this.vertex_trimmed_data);
        }
    }

    /**
     * Gets the local bounds of the sprite object.
     *
     * @param {Rectangle} rect - The output rectangle.
     * @return {Rectangle} The bounds.
     */
    get_local_bounds(rect) {
        // we can do a fast local bounds if the sprite has no children!
        if (this.children.length === 0) {
            this._bounds.min_x = this._texture.orig.width * -this._anchor._x;
            this._bounds.min_y = this._texture.orig.height * -this._anchor._y;
            this._bounds.max_x = this._texture.orig.width * (1 - this._anchor._x);
            this._bounds.max_y = this._texture.orig.height * (1 - this._anchor._y);

            if (!rect) {
                if (!this._local_bounds_rect) {
                    this._local_bounds_rect = new Rectangle();
                }

                rect = this._local_bounds_rect;
            }

            return this._bounds.get_rectangle(rect);
        }

        return super.get_local_bounds.call(this, rect);
    }

    /**
     * Tests if a point is inside this sprite
     *
     * @param {Point} point - the point to test
     * @return {boolean} the result of the test
     */
    contains_point(point) {
        this.world_transform.apply_inverse(point, tempPoint);

        const width = this._texture.orig.width;
        const height = this._texture.orig.height;
        const x1 = -width * this.anchor.x;
        let y1 = 0;

        if (tempPoint.x >= x1 && tempPoint.x < x1 + width) {
            y1 = -height * this.anchor.y;

            if (tempPoint.y >= y1 && tempPoint.y < y1 + height) {
                return true;
            }
        }

        return false;
    }

    /**
     * Destroys this sprite and optionally its texture and children
     *
     * @param {object|boolean} [options] - Options parameter. A boolean will act as if all options
     *  have been set to that value
     * @param {boolean} [options.children=false] - if set to true, all the children will have their destroy
     *      method called as well. 'options' will be passed on to those calls.
     * @param {boolean} [options.texture=false] - Should it destroy the current texture of the sprite as well
     * @param {boolean} [options.base_texture=false] - Should it destroy the base texture of the sprite as well
     */
    destroy(options) {
        super.destroy(options);

        this._texture.off('update', this._on_texture_update, this);

        this._anchor = null;

        const destroy_texture = typeof options === 'boolean' ? options : options && options.texture;

        if (destroy_texture) {
            const destroyBaseTexture = typeof options === 'boolean' ? options : options && options.base_texture;

            this._texture.destroy(!!destroyBaseTexture);
        }

        this._texture = null;
        this.shader = null;
    }

    // some helper functions..

    /**
     * Helper function that creates a new sprite based on the source you provide.
     * The source can be - frame id, image url, video url, canvas element, video element, base texture
     *
     * @static
     * @param {number|string|BaseTexture|HTMLCanvasElement|HTMLVideoElement} source Source to create texture from
     * @return {Sprite} The newly created sprite
     */
    static from(source) {
        return new Sprite(Texture.from(source));
    }

    /**
     * Helper function that creates a sprite that will contain a texture from the TextureCache based on the frameId
     * The frame ids are created when a Texture packer file has been loaded
     *
     * @static
     * @param {string} frameId - The frame Id of the texture in the cache
     * @return {Sprite} A new Sprite using a texture from the texture cache matching the frameId
     */
    static from_frame(frameId) {
        const texture = TextureCache[frameId];

        if (!texture) {
            throw new Error(`The frameId "${frameId}" does not exist in the texture cache`);
        }

        return new Sprite(texture);
    }

    /**
     * Helper function that creates a sprite that will contain a texture based on an image url
     * If the image is not in the texture cache it will be loaded
     *
     * @static
     * @param {string} imageId - The image url of the texture
     * @param {boolean} [crossorigin=(auto)] - if you want to specify the cross-origin parameter
     * @param {number} [scale_mode=settings.SCALE_MODE] - if you want to specify the scale mode,
     *  see {@link SCALE_MODES} for possible values
     * @return {Sprite} A new Sprite using a texture from the texture cache matching the image id
     */
    static from_image(imageId, crossorigin, scale_mode) {
        return new Sprite(Texture.from_image(imageId, crossorigin, scale_mode));
    }

    /**
     * The width of the sprite, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     */
    get width() {
        return Math.abs(this.scale.x) * this._texture.orig.width;
    }

    set width(value) // eslint-disable-line require-jsdoc
    {
        const s = sign(this.scale.x) || 1;

        this.scale.x = s * value / this._texture.orig.width;
        this._width = value;
    }

    /**
     * The height of the sprite, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     */
    get height() {
        return Math.abs(this.scale.y) * this._texture.orig.height;
    }

    set height(value) // eslint-disable-line require-jsdoc
    {
        const s = sign(this.scale.y) || 1;

        this.scale.y = s * value / this._texture.orig.height;
        this._height = value;
    }

    /**
     * The anchor sets the origin point of the texture.
     * The default is 0,0 or taken from the {@link Texture} passed to the constructor.
     * Setting the texture at a later point of time does not change the anchor.
     *
     * 0,0 means the texture's origin is the top left, 0.5,0.5 is the center, 1,1 the bottom right corner.
     *
     * @member {ObservablePoint}
     */
    get anchor() {
        return this._anchor;
    }

    set anchor(value) // eslint-disable-line require-jsdoc
    {
        this._anchor.copy(value);
    }

    /**
     * The tint applied to the sprite. This is a hex value.
     * A value of 0xFFFFFF will remove any tint effect.
     *
     * @member {number}
     * @default 0xFFFFFF
     */
    get tint() {
        return this._tint;
    }

    set tint(value) // eslint-disable-line require-jsdoc
    {
        this._tint = value;
        this._tint_rgb = (value >> 16) + (value & 0xff00) + ((value & 0xff) << 16);
    }

    /**
     * The texture that the sprite is using
     *
     * @member {Texture}
     */
    get texture() {
        return this._texture;
    }

    set texture(p_value) // eslint-disable-line require-jsdoc
    {
        let value = p_value;

        if (this._texture === value) {
            return;
        }

        if (typeof (p_value) === 'string') {
            value = TextureCache[p_value];
        }

        this._texture = value || Texture.EMPTY;
        this.cached_tint = 0xFFFFFF;

        this._texture_id = -1;
        this._texture_trimmed_id = -1;

        if (!value) {
            console.log(`Texture "${p_value}" is not found!`);
            value = TextureCache['_empty_'];
        }

        // wait for the texture to load
        if (value.base_texture.has_loaded) {
            this._on_texture_update();
        } else {
            value.once('update', this._on_texture_update, this);
        }
    }
}
