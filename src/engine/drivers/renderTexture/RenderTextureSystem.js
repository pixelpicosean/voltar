import { Rect2 } from "engine/core/math/rect2";
import RenderTexture from "./RenderTexture";
import { OS } from "engine/core/os/os";


const tempRect = new Rect2();

/**
 * System plugin to the renderer to manage render textures.
 *
 * Should be added after FramebufferSystem
 */

export default class RenderTextureSystem
{
    /**
     * @param {import('../rasterizer_canvas').RasterizerCanvas} renderer - The renderer this System works for.
     */
    constructor(renderer)
    {
        this.renderer = renderer;

        /**
         * The clear background color as rgba
         * @member {number[]}
         */
        this.clearColor = renderer._backgroundColorRgba;

        // TODO move this property somewhere else!
        /**
         * List of masks for the StencilSystem
         * @member {Graphics[]}
         * @readonly
         */
        this.defaultMaskStack = [];

        // empty render texture?
        /**
         * Render texture
         * @member {RenderTexture}
         * @readonly
         */
        this.current = null;

        /**
         * Source frame
         * @member {Rect2}
         * @readonly
         */
        this.sourceFrame = new Rect2();

        /**
         * Destination frame
         * @member {Rect2}
         * @readonly
         */
        this.destinationFrame = new Rect2();
    }

    /**
     * Bind the current render texture
     * @param {RenderTexture} [renderTexture] - RenderTexture to bind, by default its `null`, the screen
     * @param {Rect2} [sourceFrame] - part of screen that is mapped to the renderTexture
     * @param {Rect2} [destinationFrame] - part of renderTexture, by default it has the same size as sourceFrame
     */
    bind(renderTexture = null, sourceFrame, destinationFrame)
    {
        this.current = renderTexture;

        const renderer = this.renderer;

        let resolution;

        if (renderTexture)
        {
            const baseTexture = renderTexture.baseTexture;

            resolution = baseTexture.resolution;

            if (!destinationFrame)
            {
                tempRect.width = baseTexture.realWidth;
                tempRect.height = baseTexture.realHeight;

                destinationFrame = tempRect;
            }

            if (!sourceFrame)
            {
                sourceFrame = destinationFrame;
            }

            this.renderer.framebuffer.bind(baseTexture.framebuffer, destinationFrame);

            this.renderer.projection.update(destinationFrame, sourceFrame, resolution, false);
            this.renderer.stencil.setMaskStack(baseTexture.stencilMaskStack);
        }
        else
        {
            resolution = this.renderer.resolution;

            // TODO these validation checks happen deeper down..
            // thing they can be avoided..
            if (!destinationFrame)
            {
                const size = OS.get_singleton().get_window_size();
                tempRect.width = size.width;
                tempRect.height = size.height;

                destinationFrame = tempRect;
            }

            if (!sourceFrame)
            {
                sourceFrame = destinationFrame;
            }

            renderer.framebuffer.bind(null, destinationFrame);

            // TODO store this..
            this.renderer.projection.update(destinationFrame, sourceFrame, resolution, true);
            this.renderer.stencil.setMaskStack(this.defaultMaskStack);
        }

        this.sourceFrame.copy(sourceFrame);

        this.destinationFrame.x = destinationFrame.x / resolution;
        this.destinationFrame.y = destinationFrame.y / resolution;

        this.destinationFrame.width = destinationFrame.width / resolution;
        this.destinationFrame.height = destinationFrame.height / resolution;

        if (sourceFrame === destinationFrame)
        {
            this.sourceFrame.copy(this.destinationFrame);
        }
    }

    /**
     * Erases the render texture and fills the drawing area with a colour
     *
     * @param {number[]} [clearColor] - The color as rgba, default to use the renderer backgroundColor
     */
    clear(clearColor)
    {
        if (this.current)
        {
            clearColor = clearColor || this.current.baseTexture.clearColor;
        }
        else
        {
            clearColor = clearColor || this.clearColor;
        }

        this.renderer.framebuffer.clear(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
    }

    resize()// screenWidth, screenHeight)
    {
        // resize the root only!
        this.bind(null);
    }

    /**
     * Resets renderTexture state
     */
    reset()
    {
        this.bind(null);
    }
}
