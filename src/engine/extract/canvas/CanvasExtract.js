import CanvasRenderer from "engine/renderers/canvas/CanvasRenderer";
import Rectangle from "engine/math/shapes/Rectangle";
import Node2D from "engine/scene/Node2D";
import RenderTexture from "engine/textures/RenderTexture";
import CanvasRenderTarget from "engine/renderers/canvas/utils/CanvasRenderTarget";

const TEMP_RECT = new Rectangle();

/**
 * The extract manager provides functionality to export content from the renderers.
 *
 * An instance of this class is automatically created by default, and can be found at renderer.plugins.extract
 */
export default class CanvasExtract {
    /**
     * @param {CanvasRenderer} renderer - A reference to the current renderer
     */
    constructor(renderer) {
        this.renderer = renderer;
        /**
         * Collection of methods for extracting data (image, pixels, etc.) from a display object or render texture
         *
         * @member {CanvasExtract} extract
         * @memberof CanvasRenderer#
         * @see CanvasExtract
         */
        renderer.extract = this;
    }

    /**
     * Will return a HTML Image of the target
     *
     * @param {Node2D|RenderTexture} target - A node or render_texture
     *  to convert. If left empty will use use the main renderer
     * @return {HTMLImageElement} HTML Image of the target
     */
    image(target) {
        const image = new Image();

        image.src = this.base64(target);

        return image;
    }

    /**
     * Will return a a base64 encoded string of this target. It works by calling
     *  `CanvasgetCanvas` and then running toDataURL on that.
     *
     * @param {Node2D|RenderTexture} target - A node or render_texture
     *  to convert. If left empty will use use the main renderer
     * @return {string} A base64 encoded string of the texture.
     */
    base64(target) {
        return this.canvas(target).toDataURL();
    }

    /**
     * Creates a Canvas element, renders this target to it and then returns it.
     *
     * @param {Node2D|RenderTexture} target - A node or render_texture
     *  to convert. If left empty will use use the main renderer
     * @return {HTMLCanvasElement} A Canvas element with the texture rendered on.
     */
    canvas(target) {
        const renderer = this.renderer;
        let context;
        let resolution;
        let frame;
        let render_texture;

        if (target) {
            if (target instanceof RenderTexture) {
                render_texture = target;
            }
            else {
                render_texture = renderer.generate_texture(target);
            }
        }

        if (render_texture) {
            context = render_texture.base_texture._canvas_render_target.context;
            resolution = render_texture.base_texture._canvas_render_target.resolution;
            frame = render_texture.frame;
        }
        else {
            context = renderer.rootContext;

            frame = TEMP_RECT;
            frame.width = this.renderer.width;
            frame.height = this.renderer.height;
        }

        const width = frame.width * resolution;
        const height = frame.height * resolution;

        const canvasBuffer = new CanvasRenderTarget(width, height, 1);
        const canvasData = context.getImageData(frame.x * resolution, frame.y * resolution, width, height);

        canvasBuffer.context.putImageData(canvasData, 0, 0);

        // send the canvas back..
        return canvasBuffer.canvas;
    }

    /**
     * Will return a one-dimensional array containing the pixel data of the entire texture in RGBA
     * order, with integer values between 0 and 255 (included).
     *
     * @param {Node2D|RenderTexture} target - A node or render_texture
     *  to convert. If left empty will use use the main renderer
     * @return {Uint8ClampedArray} One-dimensional array containing the pixel data of the entire texture
     */
    pixels(target) {
        const renderer = this.renderer;
        let context;
        let resolution;
        let frame;
        let render_texture;

        if (target) {
            if (target instanceof RenderTexture) {
                render_texture = target;
            }
            else {
                render_texture = renderer.generate_texture(target);
            }
        }

        if (render_texture) {
            context = render_texture.base_texture._canvas_render_target.context;
            resolution = render_texture.base_texture._canvas_render_target.resolution;
            frame = render_texture.frame;
        }
        else {
            context = renderer.rootContext;

            frame = TEMP_RECT;
            frame.width = renderer.width;
            frame.height = renderer.height;
        }

        return context.getImageData(0, 0, frame.width * resolution, frame.height * resolution).data;
    }

    /**
     * Destroys the extract
     *
     */
    destroy() {
        this.renderer.extract = null;
        this.renderer = null;
    }
}

CanvasRenderer.register_plugin('extract', CanvasExtract);
