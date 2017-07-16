import CanvasTinter from './canvas/CanvasTinter';
import { default as TextureTransform } from '../../textures/TextureTransform';
import Texture from '../../textures/Texture';
import { Point, TransformStatic, Rectangle } from '../../math';
import Sprite from './Sprite';
import CanvasRenderTarget from '../../renderers/canvas/utils/CanvasRenderTarget';
import * as utils from '../../utils';

const tempPoint = new Point();

/**
 * A tiling sprite is a fast way of rendering a tiling image
 *
 * @class
 * @extends V.Sprite
 * @memberof V.extras
 */
export default class TilingSprite extends Sprite
{
    /**
     * @param {V.Texture} texture - the texture of the tiling sprite
     * @param {number} [width=100] - the width of the tiling sprite
     * @param {number} [height=100] - the height of the tiling sprite
     */
    constructor(texture, width = 100, height = 100)
    {
        super(texture);

        /**
         * Tile transform
         *
         * @member {V.TransformStatic}
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
        this._canvasPattern = null;

        /**
         * transform that is applied to UV to get the texture coords
         *
         * @member {V.extras.TextureTransform}
         */
        this.uv_transform = texture.transform || new TextureTransform(texture);

        /**
         * Plugin that is responsible for rendering this element.
         * Allows to customize the rendering process without overriding '_render_webGL' method.
         *
         * @member {string}
         * @default 'tilingSprite'
         */
        this.plugin_name = 'tilingSprite';

        /**
         * Whether or not anchor affects uvs
         *
         * @member {boolean}
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
    get clamp_margin()
    {
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
     * @member {V.ObservablePoint}
     */
    get tile_scale()
    {
        return this.tile_transform.scale;
    }

    set tile_scale(value) // eslint-disable-line require-jsdoc
    {
        this.tile_transform.scale.copy(value);
    }

    /**
     * The offset of the image that is being tiled
     *
     * @member {V.ObservablePoint}
     */
    get tile_position()
    {
        return this.tile_transform.position;
    }

    set tile_position(value) // eslint-disable-line require-jsdoc
    {
        this.tile_transform.position.copy(value);
    }

    /**
     * @private
     */
    _onTextureUpdate()
    {
        if (this.uv_transform)
        {
            this.uv_transform.texture = this._texture;
        }
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @private
     * @param {V.WebGLRenderer} renderer - The renderer
     */
    _render_webGL(renderer)
    {
        // tweak our texture temporarily..
        const texture = this._texture;

        if (!texture || !texture.valid)
        {
            return;
        }

        this.tile_transform.updateLocalTransform();
        this.uv_transform.update();

        renderer.setObjectRenderer(renderer.plugins[this.plugin_name]);
        renderer.plugins[this.plugin_name].render(this);
    }

    /**
     * Renders the object using the Canvas renderer
     *
     * @private
     * @param {V.CanvasRenderer} renderer - a reference to the canvas renderer
     */
    _render_canvas(renderer)
    {
        const texture = this._texture;

        if (!texture.base_texture.hasLoaded)
        {
            return;
        }

        const context = renderer.context;
        const transform = this.world_transform;
        const resolution = renderer.resolution;
        const base_texture = texture.base_texture;
        const base_textureResolution = base_texture.resolution;
        const modX = ((this.tile_position.x / this.tile_scale.x) % texture._frame.width) * base_textureResolution;
        const modY = ((this.tile_position.y / this.tile_scale.y) % texture._frame.height) * base_textureResolution;

        // create a nice shiny pattern!
        // TODO this needs to be refreshed if texture changes..
        if (!this._canvasPattern)
        {
            // cut an object from a spritesheet..
            const tempCanvas = new CanvasRenderTarget(texture._frame.width,
                                                        texture._frame.height,
                                                        base_textureResolution);

            // Tint the tiling sprite
            if (this.tint !== 0xFFFFFF)
            {
                if (this.cached_tint !== this.tint)
                {
                    this.cached_tint = this.tint;

                    this.tintedTexture = CanvasTinter.getTintedTexture(this, this.tint);
                }
                tempCanvas.context.drawImage(this.tintedTexture, 0, 0);
            }
            else
            {
                tempCanvas.context.drawImage(base_texture.source,
                    -texture._frame.x * base_textureResolution, -texture._frame.y * base_textureResolution);
            }
            this._canvasPattern = tempCanvas.context.createPattern(tempCanvas.canvas, 'repeat');
        }

        // set context state..
        context.globalAlpha = this.world_alpha;
        context.set_transform(transform.a * resolution,
                           transform.b * resolution,
                           transform.c * resolution,
                           transform.d * resolution,
                           transform.tx * resolution,
                           transform.ty * resolution);

        renderer.setBlendMode(this.blend_mode);

        // fill the pattern!
        context.fillStyle = this._canvasPattern;

        // TODO - this should be rolled into the set_transform above..
        context.scale(this.tile_scale.x / base_textureResolution, this.tile_scale.y / base_textureResolution);

        const anchorX = this.anchor.x * -this._width;
        const anchorY = this.anchor.y * -this._height;

        if (this.uv_respect_anchor)
        {
            context.translate(modX, modY);

            context.fillRect(-modX + anchorX, -modY + anchorY,
                this._width / this.tile_scale.x * base_textureResolution,
                this._height / this.tile_scale.y * base_textureResolution);
        }
        else
        {
            context.translate(modX + anchorX, modY + anchorY);

            context.fillRect(-modX, -modY,
                this._width / this.tile_scale.x * base_textureResolution,
                this._height / this.tile_scale.y * base_textureResolution);
        }
    }

    /**
     * Updates the bounds of the tiling sprite.
     *
     * @private
     */
    _calculate_bounds()
    {
        const minX = this._width * -this._anchor._x;
        const minY = this._height * -this._anchor._y;
        const maxX = this._width * (1 - this._anchor._x);
        const maxY = this._height * (1 - this._anchor._y);

        this._bounds.addFrame(this.transform, minX, minY, maxX, maxY);
    }

    /**
     * Gets the local bounds of the sprite object.
     *
     * @param {V.Rectangle} rect - The output rectangle.
     * @return {V.Rectangle} The bounds.
     */
    get_local_Bounds(rect)
    {
        // we can do a fast local bounds if the sprite has no children!
        if (this.children.length === 0)
        {
            this._bounds.minX = this._width * -this._anchor._x;
            this._bounds.minY = this._height * -this._anchor._y;
            this._bounds.maxX = this._width * (1 - this._anchor._x);
            this._bounds.maxY = this._height * (1 - this._anchor._x);

            if (!rect)
            {
                if (!this._localBoundsRect)
                {
                    this._localBoundsRect = new Rectangle();
                }

                rect = this._localBoundsRect;
            }

            return this._bounds.getRectangle(rect);
        }

        return super.get_local_Bounds.call(this, rect);
    }

    /**
     * Checks if a point is inside this tiling sprite.
     *
     * @param {V.Point} point - the point to check
     * @return {boolean} Whether or not the sprite contains the point.
     */
    contains_point(point)
    {
        this.world_transform.applyInverse(point, tempPoint);

        const width = this._width;
        const height = this._height;
        const x1 = -width * this.anchor._x;

        if (tempPoint.x >= x1 && tempPoint.x < x1 + width)
        {
            const y1 = -height * this.anchor._y;

            if (tempPoint.y >= y1 && tempPoint.y < y1 + height)
            {
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
    destroy(options)
    {
        super.destroy(options);

        this.tile_transform = null;
        this.uv_transform = null;
    }

    /**
     * Helper function that creates a new tiling sprite based on the source you provide.
     * The source can be - frame id, image url, video url, canvas element, video element, base texture
     *
     * @static
     * @param {number|string|V.BaseTexture|HTMLCanvasElement|HTMLVideoElement} source - Source to create texture from
     * @param {number} width - the width of the tiling sprite
     * @param {number} height - the height of the tiling sprite
     * @return {V.Texture} The newly created texture
     */
    static from(source, width, height)
    {
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
     * @return {V.extras.TilingSprite} A new TilingSprite using a texture from the texture cache matching the frameId
     */
    static from_frame(frameId, width, height)
    {
        const texture = utils.TextureCache[frameId];

        if (!texture)
        {
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
     * @param {number} [scaleMode=V.settings.SCALE_MODE] - if you want to specify the scale mode,
     *  see {@link V.SCALE_MODES} for possible values
     * @return {V.extras.TilingSprite} A new TilingSprite using a texture from the texture cache matching the image id
     */
    static from_image(imageId, width, height, crossorigin, scaleMode)
    {
        return new TilingSprite(Texture.from_image(imageId, crossorigin, scaleMode), width, height);
    }

    /**
     * The width of the sprite, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     */
    get width()
    {
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
    get height()
    {
        return this._height;
    }

    set height(value) // eslint-disable-line require-jsdoc
    {
        this._height = value;
    }
}
