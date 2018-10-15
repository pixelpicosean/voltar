import TextureMatrix from 'engine/textures/TextureMatrix';
import BaseTexture from 'engine/textures/BaseTexture';
import Texture from 'engine/textures/Texture';
import { Point, TransformStatic, Rectangle } from 'engine/math/index';
import { TextureCache } from 'engine/utils/index';
import Sprite from './Sprite';

const temp_point = new Point();

/**
 * A tiling sprite is a fast way of rendering a tiling image
 */
export default class TilingSprite extends Sprite {
    /**
     * @param {Texture} [texture] - the texture of the tiling sprite
     * @param {number} [width=100] - the width of the tiling sprite
     * @param {number} [height=100] - the height of the tiling sprite
     */
    constructor(texture, width = 100, height = 100) {
        super(texture);

        this.type = 'TilingSprite';

        /**
         * Tile transform
         *
         * @member {TransformStatic}
         */
        this.tile_transform = new TransformStatic();

        // /// private

        /**
         * The with of the tiling sprite
         *
         * @member {number}
         * @private
         */
        this._width = width;

        /**
         * The height of the tiling sprite
         *
         * @member {number}
         * @private
         */
        this._height = height;

        /**
         * Canvas pattern
         *
         * @type {CanvasPattern}
         * @private
         */
        this._canvas_pattern = null;

        /**
         * transform that is applied to UV to get the texture coords
         *
         * @type {TextureMatrix}
         */
        this.uv_transform = this._texture.transform || new TextureMatrix(texture);

        /**
         * Plugin that is responsible for rendering this element.
         * Allows to customize the rendering process without overriding '_render_webgl' method.
         *
         * @type {string}
         * @default 'tiling_sprite'
         */
        this.renderer_plugin = 'tiling_sprite';

        /**
         * Whether or not anchor affects uvs
         *
         * @type {boolean}
         * @default false
         */
        this.uv_respect_anchor = false;
    }

    /**
     * Changes frame clamping in corresponding textureTransform, shortcut
     * Change to -0.5 to add a pixel to the edge, recommended for transparent trimmed textures in atlas
     *
     * @default 0.5
     * @member {number}
     */
    get clamp_margin() {
        return this.uv_transform.clamp_margin;
    }

    set clamp_margin(value) // eslint-disable-line require-jsdoc
    {
        this.uv_transform.clamp_margin = value;
        this.uv_transform.update(true);
    }

    /**
     * The scaling of the image that is being tiled
     *
     * @member {ObservablePoint}
     */
    get tile_scale() {
        return this.tile_transform.scale;
    }

    set tile_scale(value) // eslint-disable-line require-jsdoc
    {
        this.tile_transform.scale.copy(value);
    }

    /**
     * The offset of the image that is being tiled
     *
     * @member {ObservablePoint}
     */
    get tile_position() {
        return this.tile_transform.position;
    }

    set tile_position(value) // eslint-disable-line require-jsdoc
    {
        this.tile_transform.position.copy(value);
    }

    _load_data(data) {
        super._load_data(data);

        for (let k in data) {
            switch (k) {
                case 'clamp_margin':
                    this[k] = data[k];
                    break;
                case 'tile_position':
                case 'tile_scale':
                    this[k].copy(data[k]);
                    break;
            }
        }
    }

    /**
     * @private
     */
    _on_texture_update() {
        if (this.uv_transform) {
            this.uv_transform.texture = this._texture;
        }
        this.cached_tint = 0xFFFFFF;
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @private
     * @param {WebGLRenderer} renderer - The renderer
     */
    _render_webgl(renderer) {
        // tweak our texture temporarily..
        const texture = this._texture;

        if (!texture || !texture.valid) {
            return;
        }

        this.tile_transform.update_local_transform();
        this.uv_transform.update();

        renderer.set_object_renderer(renderer.plugins[this.renderer_plugin]);
        renderer.plugins[this.renderer_plugin].render(this);
    }

    /**
     * Updates the bounds of the tiling sprite.
     *
     * @private
     */
    _calculate_bounds() {
        const min_x = this._width * -this._anchor._x;
        const min_y = this._height * -this._anchor._y;
        const max_x = this._width * (1 - this._anchor._x);
        const max_y = this._height * (1 - this._anchor._y);

        this._bounds.add_frame(this.transform, min_x, min_y, max_x, max_y);
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
            this._bounds.min_x = this._width * -this._anchor._x;
            this._bounds.min_y = this._height * -this._anchor._y;
            this._bounds.max_x = this._width * (1 - this._anchor._x);
            this._bounds.max_y = this._height * (1 - this._anchor._y);

            if (!rect) {
                if (!this._local_bounds_rect) {
                    this._local_bounds_rect = new Rectangle();
                }

                rect = this._local_bounds_rect;
            }

            return this._bounds.get_rectangle(rect);
        }

        return super.get_local_bounds(rect);
    }

    /**
     * Checks if a point is inside this tiling sprite.
     *
     * @param {Point} point - the point to check
     * @return {boolean} Whether or not the sprite contains the point.
     */
    contains_point(point) {
        this.world_transform.apply_inverse(point, temp_point);

        const width = this._width;
        const height = this._height;
        const x1 = -width * this.anchor._x;

        if (temp_point.x >= x1 && temp_point.x < x1 + width) {
            const y1 = -height * this.anchor._y;

            if (temp_point.y >= y1 && temp_point.y < y1 + height) {
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

        this.tile_transform = null;
        this.uv_transform = null;
    }

    /**
     * Helper function that creates a new tiling sprite based on the source you provide.
     * The source can be - frame id, image url, video url, canvas element, video element, base texture
     *
     * @static
     * @param {number|string|BaseTexture|HTMLCanvasElement|HTMLVideoElement} source - Source to create texture from
     * @param {number} width - the width of the tiling sprite
     * @param {number} height - the height of the tiling sprite
     * @return {Texture} The newly created texture
     */
    static from(source, width, height) {
        return new TilingSprite(Texture.from(source), width, height);
    }

    /**
     * Helper function that creates a tiling sprite that will use a texture from the TextureCache based on the frameId
     * The frame ids are created when a Texture packer file has been loaded
     *
     * @static
     * @param {string} frameId - The frame Id of the texture in the cache
     * @param {number} width - the width of the tiling sprite
     * @param {number} height - the height of the tiling sprite
     * @return {TilingSprite} A new TilingSprite using a texture from the texture cache matching the frameId
     */
    static from_frame(frameId, width, height) {
        const texture = TextureCache[frameId];

        if (!texture) {
            throw new Error(`The frameId "${frameId}" does not exist in the texture cache ${this}`);
        }

        return new TilingSprite(texture, width, height);
    }

    /**
     * Helper function that creates a sprite that will contain a texture based on an image url
     * If the image is not in the texture cache it will be loaded
     *
     * @static
     * @param {string} imageId - The image url of the texture
     * @param {number} width - the width of the tiling sprite
     * @param {number} height - the height of the tiling sprite
     * @param {boolean} [crossorigin] - if you want to specify the cross-origin parameter
     * @param {number} [scale_mode=settings.SCALE_MODE] - if you want to specify the scale mode,
     *  see {@link SCALE_MODES} for possible values
     * @return {TilingSprite} A new TilingSprite using a texture from the texture cache matching the image id
     */
    static from_image(imageId, width, height, crossorigin, scale_mode) {
        return new TilingSprite(Texture.from_image(imageId, crossorigin, scale_mode), width, height);
    }

    /**
     * The width of the sprite, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     */
    get width() {
        return this._width;
    }

    set width(value) // eslint-disable-line require-jsdoc
    {
        this._width = value;
    }

    /**
     * The height of the TilingSprite, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     */
    get height() {
        return this._height;
    }

    set height(value) // eslint-disable-line require-jsdoc
    {
        this._height = value;
    }
}
