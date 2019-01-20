import { BLEND_MODES } from 'engine/const';
import { Vector2, ObservableVector2, Rectangle } from 'engine/math/index';
import { sign, TextureCache } from 'engine/utils/index';
import WebGLRenderer from 'engine/renderers/WebGLRenderer';

import Texture from 'engine/textures/Texture';
import BaseTexture from 'engine/textures/BaseTexture';

import Node2D from '../Node2D';

const temp_point = new Vector2();

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
         *  @private
         */
        this._anchor = new ObservableVector2(this._on_anchor_update, this, 0.5, 0.5);

        this._offset = new ObservableVector2(this._on_anchor_update, this, 0, 0);

        /**
         * The texture that the sprite is using
         *
         * @private
         * @type {Texture}
         */
        this._texture = null;

        /**
         * The key of the texture that the sprite is using
         *
         * @private
         * @type {string|null}
         */
        this._texture_key = null;

        /**
         * The width of the sprite (this is initially set by the texture)
         *
         * @private
         * @type {number}
         */
        this._width = 0;

        /**
         * The height of the sprite (this is initially set by the texture)
         *
         * @private
         * @type {number}
         */
        this._height = 0;

        /**
         * The tint applied to the sprite. This is a hex value. A value of 0xFFFFFF will remove any tint effect.
         *
         * @private
         * @type {number}
         * @default 0xFFFFFF
         */
        this._tint = null;
        this._tint_rgb = null;
        this.tint = 0xFFFFFF;

        /**
         * The blend mode to be applied to the sprite. Apply a value of `BLEND_MODES.NORMAL` to reset the blend mode.
         *
         * @type {number}
         * @default BLEND_MODES.NORMAL
         * @see BLEND_MODES
         */
        this.blend_mode = BLEND_MODES.NORMAL;

        /**
         * The shader that will be used to render the sprite. Set to null to remove a current shader.
         *
         * @type {import('engine/renderers/filters/Filter')}
         */
        this.shader = null;

        /**
         * An internal cached value of the tint.
         *
         * @private
         * @type {number}
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
            // @ts-ignore
            if (texture.default_anchor) {
                // @ts-ignore
                this._anchor.set(texture.default_anchor.x, texture.default_anchor.y);
            }
        } else {
            this.texture = Texture.EMPTY;
        }

        /**
         * this is used to store the vertex data of the sprite (basically a quad)
         *
         * @private
         * @type {Float32Array}
         */
        this.vertex_data = new Float32Array(8);

        /**
         * This is used to calculate the bounds of the object IF it is a trimmed sprite
         *
         * @private
         * @type {Float32Array}
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
         * @type {string}
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
                case 'tint': {
                    this[k] = data[k];
                } break;

                // Set vector
                // - Sprite
                case 'anchor':
                case 'offset': {
                    this[k].copy(data[k]);
                } break;

                // Blend modes
                case 'blend_mode': {
                    this.blend_mode = BLEND_MODES[data[k]];
                } break;
            }
        }

        this._on_anchor_update();

        return this;
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
        const offset = this._offset;

        let w0 = 0;
        let w1 = 0;
        let h0 = 0;
        let h1 = 0;

        if (trim) {
            // if the sprite is trimmed and is not a tilingsprite then we need to add the extra
            // space before transforming the sprite coords.
            w1 = trim.x - (anchor._x * orig.width) + offset.x;
            w0 = w1 + trim.width;

            h1 = trim.y - (anchor._y * orig.height) + offset.y;
            h0 = h1 + trim.height;
        } else {
            w1 = -anchor._x * orig.width + offset.x;
            w0 = w1 + orig.width;

            h1 = -anchor._y * orig.height + offset.y;
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
        const offset = this._offset;

        // lets calculate the new untrimmed bounds..
        const wt = this.transform.world_transform;
        const a = wt.a;
        const b = wt.b;
        const c = wt.c;
        const d = wt.d;
        const tx = wt.tx;
        const ty = wt.ty;

        const w1 = -anchor._x * orig.width + offset.x;
        const w0 = w1 + orig.width;

        const h1 = -anchor._y * orig.height + offset.y;
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
     * @param {Vector2} point - the point to test
     * @return {boolean} the result of the test
     */
    contains_point(point) {
        this.world_transform.xform_inv(point, temp_point);

        const width = this._texture.orig.width;
        const height = this._texture.orig.height;
        const x1 = -width * this.anchor.x;
        let y1 = 0;

        if (temp_point.x >= x1 && temp_point.x < x1 + width) {
            y1 = -height * this.anchor.y;

            if (temp_point.y >= y1 && temp_point.y < y1 + height) {
                return true;
            }
        }

        return false;
    }

    /**
     * Destroys this sprite and optionally its texture and children
     * @param {import('../Node2D').DestroyOption|boolean} [options] - Options parameter. A boolean will act as if all options
     *  have been set to that value
     */
    destroy(options) {
        super.destroy();

        this._texture.disconnect('update', this._on_texture_update, this);

        this._anchor = null;

        const destroy_texture = typeof options === 'boolean' ? options : options && options.texture;

        if (destroy_texture) {
            const destroyBaseTexture = typeof options === 'boolean' ? options : options && options.base_texture;

            this._texture.destroy(!!destroyBaseTexture);
        }

        this._texture = null;
        this.shader = null;
    }

    /**
     * The width of the sprite, setting this will actually modify the scale to achieve the value set
     *
     * @type {number}
     */
    set width(value) {
        const s = sign(this.scale.x) || 1;

        this.scale.x = s * value / this._texture.orig.width;
        this._width = value;
    }
    get width() {
        return Math.abs(this.scale.x) * this._texture.orig.width;
    }
    /**
     * @param {number} value
     */
    set_width(value) {
        this.width = value;
        return this;
    }

    /**
     * The height of the sprite, setting this will actually modify the scale to achieve the value set
     *
     * @type {number}
     */
    set height(value) {
        const s = sign(this.scale.y) || 1;

        this.scale.y = s * value / this._texture.orig.height;
        this._height = value;
    }
    get height() {
        return Math.abs(this.scale.y) * this._texture.orig.height;
    }
    /**
     * @param {number} value
     */
    set_height(value) {
        this.height = value;
        return this;
    }

    /**
     * The anchor sets the origin point of the texture.
     * The default is 0,0 or taken from the {@link Texture} passed to the constructor.
     * Setting the texture at a later point of time does not change the anchor.
     *
     * 0,0 means the texture's origin is the top left, 0.5,0.5 is the center, 1,1 the bottom right corner.
     *
     * @type {ObservableVector2}
     */
    set anchor(value) {
        this._anchor.copy(value);
    }
    get anchor() {
        return this._anchor;
    }
    /**
     * @param {import('engine/math/Vector2').Vector2Like} value
     */
    set_anchor(value) {
        this._anchor.copy(value);
        return this;
    }

    /**
     * @type {ObservableVector2}
     */
    set offset(value) {
        this._offset.copy(value);
    }
    get offset() {
        return this._offset;
    }
    /**
     * @param {import('engine/math/Vector2').Vector2Like} value
     */
    set_offset(value) {
        this._offset.copy(value);
        return this;
    }

    /**
     * The tint applied to the sprite. This is a hex value.
     * A value of 0xFFFFFF will remove any tint effect.
     *
     * @type {number}
     * @default 0xFFFFFF
     */
    set tint(value) {
        this._tint = value;
        this._tint_rgb = (value >> 16) + (value & 0xff00) + ((value & 0xff) << 16);
    }
    get tint() {
        return this._tint;
    }
    /**
     * @param {number} value
     */
    set_tint(value) {
        this.tint = value;
        return this;
    }

    /**
     * The texture that the sprite is using
     *
     * @type {Texture}
     */
    set texture(p_value) {
        if (this._texture === p_value) {
            return;
        }

        /** @type {Texture} */
        let value;

        if (typeof (p_value) === 'string') {
            value = TextureCache[p_value];
        } else {
            value = p_value;
        }

        if (!value) {
            console.log(`Texture "${p_value}" is not found!`);
            value = Texture.EMPTY;
        }

        this.cached_tint = 0xFFFFFF;

        this._texture = value;
        this._texture_id = -1;
        this._texture_trimmed_id = -1;

        // wait for the texture to load
        if (value.base_texture.has_loaded) {
            this._on_texture_update();
        } else {
            value.connect_once('update', this._on_texture_update, this);
        }
    }
    get texture() {
        return this._texture;
    }
    /**
     * @param {string|Texture} value
     */
    set_texture(value) {
        // @ts-ignore
        this.texture = value;
        return this;
    }
}
