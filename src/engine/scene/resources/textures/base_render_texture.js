import settings from 'engine/settings';
import RenderTarget from 'engine/servers/visual/utils/render_target';

import BaseTexture from './base_texture';

/**
 * A BaseRenderTexture is a special texture that allows any Pixi display object to be rendered to it.
 *
 * __Hint__: All Node2Ds (i.e. Sprites) that render to a BaseRenderTexture should be preloaded
 * otherwise black rectangles will be drawn instead.
 *
 * A BaseRenderTexture takes a snapshot of any Display Object given to its render method. The position
 * and rotation of the given Display Objects is ignored. For example:
 *
 * ```js
 * let baseRenderTexture = new BaseRenderTexture(renderer, 800, 600);
 * let sprite = Sprite.from_image("spinObj_01.png");
 *
 * sprite.position.x = 800/2;
 * sprite.position.y = 600/2;
 * sprite.anchor.x = 0.5;
 * sprite.anchor.y = 0.5;
 *
 * baseRenderTexture.render(sprite);
 * ```
 *
 * The Sprite in this case will be rendered using its local transform. To render this sprite at 0,0
 * you can clear the transform
 *
 * ```js
 *
 * sprite.set_transform()
 *
 * let baseRenderTexture = new BaseRenderTexture(100, 100);
 * let render_texture = new RenderTexture(baseRenderTexture);
 *
 * renderer.render(sprite, render_texture);  // Renders to center of RenderTexture
 * ```
 */
export default class BaseRenderTexture extends BaseTexture {
    /**
     * @param {number} [width] - The width of the base render texture
     * @param {number} [height] - The height of the base render texture
     * @param {number} [scale_mode]
     * @param {number} [resolution] - The resolution / device pixel ratio of the texture being generated
     */
    constructor(width = 100, height = 100, scale_mode, resolution) {
        super(null, scale_mode);

        this.resolution = resolution || settings.RESOLUTION;

        this.width = Math.ceil(width);
        this.height = Math.ceil(height);

        this.real_width = this.width * this.resolution;
        this.real_height = this.height * this.resolution;

        this.scale_mode = scale_mode !== undefined ? scale_mode : settings.SCALE_MODE;
        this.has_loaded = true;

        /**
         * A map of renderer IDs to webgl renderTargets
         *
         * @type {Object<number, RenderTarget>}
         * @private
         */
        this._gl_render_targets = {};

        /**
         * A reference to the canvas render target (we only need one as this can be shared across renderers)
         *
         * @type {Object<number, WebGLTexture>}
         * @private
         */
        this._canvas_render_target = null;

        /**
         * This will let the renderer know if the texture is valid. If it's not then it cannot be rendered.
         *
         * @type {boolean}
         */
        this.valid = false;
    }

    /**
     * Resizes the BaseRenderTexture.
     *
     * @param {number} width - The width to resize to.
     * @param {number} height - The height to resize to.
     */
    resize(width, height) {
        width = Math.ceil(width);
        height = Math.ceil(height);

        if (width === this.width && height === this.height) {
            return;
        }

        this.valid = (width > 0 && height > 0);

        this.width = width;
        this.height = height;

        this.real_width = this.width * this.resolution;
        this.real_height = this.height * this.resolution;

        if (!this.valid) {
            return;
        }

        this.emit_signal('update', this);
    }

    /**
     * Destroys this texture
     */
    destroy() {
        super.destroy();
        this.renderer = null;
    }
}
