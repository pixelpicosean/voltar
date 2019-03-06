import settings from 'engine/settings';
import { Rectangle } from 'engine/core/math/index';
import BaseRenderTexture from './base_render_texture';
import Texture from './texture';

/**
 * A RenderTexture is a special texture that allows any Pixi display object to be rendered to it.
 *
 * __Hint__: All Node2Ds (i.e. Sprites) that render to a RenderTexture should be preloaded
 * otherwise black rectangles will be drawn instead.
 *
 * A RenderTexture takes a snapshot of any Display Object given to its render method. For example:
 *
 * ```js
 * let render_texture = RenderTexture.create(800, 600);
 * let sprite = Sprite.from_image("spinObj_01.png");
 *
 * sprite.position.x = 800/2;
 * sprite.position.y = 600/2;
 * sprite.anchor.x = 0.5;
 * sprite.anchor.y = 0.5;
 *
 * renderer.render(sprite, render_texture);
 * ```
 *
 * The Sprite in this case will be rendered using its local transform. To render this sprite at 0,0
 * you can clear the transform
 *
 * ```js
 *
 * sprite.set_transform()
 *
 * let render_texture = RenderTexture.create(100, 100);
 *
 * renderer.render(sprite, render_texture);  // Renders to center of RenderTexture
 * ```
 */
export default class RenderTexture extends Texture {
    /**
     * @param {BaseRenderTexture} base_render_texture - The renderer used for this RenderTexture
     * @param {Rectangle} [frame] - The rectangle frame of the texture to show
     */
    constructor(base_render_texture, frame) {
        // support for legacy..
        let _legacy_renderer = null;

        if (!(base_render_texture instanceof BaseRenderTexture)) {
            /* eslint-disable prefer-rest-params, no-console */
            const width = arguments[1];
            const height = arguments[2];
            const scale_mode = arguments[3];
            const resolution = arguments[4];

            // we have an old render texture..
            console.warn(`Please use RenderTexture.create(${width}, ${height}) instead of the ctor directly.`);
            _legacy_renderer = arguments[0];

            frame = null;
            base_render_texture = new BaseRenderTexture(width, height, scale_mode, resolution);
        }

        super(
            base_render_texture,
            frame
        );

        this.legacy_renderer = _legacy_renderer;

        /**
         * This will let the renderer know if the texture is valid. If it's not then it cannot be rendered.
         */
        this.valid = true;

        this._update_uvs();
    }

    /**
     * Resizes the RenderTexture.
     *
     * @param {number} width - The width to resize to.
     * @param {number} height - The height to resize to.
     * @param {boolean} do_not_resize_base_texture - Should the base_texture.width and height values be resized as well?
     */
    resize(width, height, do_not_resize_base_texture) {
        width = Math.ceil(width);
        height = Math.ceil(height);

        // TODO - could be not required..
        this.valid = (width > 0 && height > 0);

        this._frame.width = this.orig.width = width;
        this._frame.height = this.orig.height = height;

        // TODO: do we have `resize` method in `BaseTexture`?
        if (!do_not_resize_base_texture) {
            // this.base_texture.resize(width, height);
        }

        this._update_uvs();
    }

    /**
     * A short hand way of creating a render texture.
     *
     * @param {number} [width] - The width of the render texture
     * @param {number} [height] - The height of the render texture
     * @param {number} [scale_mode]
     * @param {number} [resolution] - The resolution / device pixel ratio of the texture being generated
     * @return {RenderTexture} The new render texture
     */
    static create(width = 100, height = 100, scale_mode, resolution) {
        return new RenderTexture(new BaseRenderTexture(width, height, scale_mode || settings.SCALE_MODE, resolution || settings.RESOLUTION));
    }
}
