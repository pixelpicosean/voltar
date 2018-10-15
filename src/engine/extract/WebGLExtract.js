import Rectangle from "engine/math/shapes/Rectangle";
import WebGLRenderer from "engine/renderers/WebGLRenderer";
import Node2D from "engine/scene/Node2D";
import RenderTexture from "engine/textures/RenderTexture";
import CanvasRenderTarget from "engine/renderers/canvas/utils/CanvasRenderTarget";

const TEMP_RECT = new Rectangle();
const BYTES_PER_PIXEL = 4;

/**
 * The extract manager provides functionality to export content from the renderers.
 *
 * An instance of this class is automatically created by default, and can be found at renderer.plugins.extract
 */
export default class WebGLExtract {
    /**
     * @param {WebGLRenderer} renderer - A reference to the current renderer
     */
    constructor(renderer) {
        this.renderer = renderer;
        /**
         * Collection of methods for extracting data (image, pixels, etc.) from a display object or render texture
         *
         * @member {extract.WebGLExtract} extract
         * @memberof WebGLRenderer#
         * @see extract.WebGLExtract
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
     *  `WebGLExtract.getCanvas` and then running toDataURL on that.
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
        let textureBuffer;
        let resolution;
        let frame;
        let flipY = false;
        let render_texture;
        let generated = false;

        if (target) {
            if (target instanceof RenderTexture) {
                render_texture = target;
            }
            else {
                // TODO: parameters are not enough
                render_texture = this.renderer.generate_texture(target);
                generated = true;
            }
        }

        if (render_texture) {
            textureBuffer = render_texture.base_texture._gl_render_targets[this.renderer.CONTEXT_UID];
            resolution = textureBuffer.resolution;
            frame = render_texture.frame;
            flipY = false;
        }
        else {
            textureBuffer = this.renderer.rootRenderTarget;
            resolution = textureBuffer.resolution;
            flipY = true;

            frame = TEMP_RECT;
            frame.width = textureBuffer.size.width;
            frame.height = textureBuffer.size.height;
        }

        const width = frame.width * resolution;
        const height = frame.height * resolution;

        const canvasBuffer = new CanvasRenderTarget(width, height, 1);

        if (textureBuffer) {
            // bind the buffer
            renderer.bindRenderTarget(textureBuffer);

            // set up an array of pixels
            const webglPixels = new Uint8Array(BYTES_PER_PIXEL * width * height);

            // read pixels to the array
            const gl = renderer.gl;

            gl.readPixels(
                frame.x * resolution,
                frame.y * resolution,
                width,
                height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                webglPixels
            );

            // add the pixels to the canvas
            const canvasData = canvasBuffer.context.getImageData(0, 0, width, height);

            canvasData.data.set(webglPixels);

            canvasBuffer.context.putImageData(canvasData, 0, 0);

            // pulling pixels
            if (flipY) {
                canvasBuffer.context.scale(1, -1);
                canvasBuffer.context.drawImage(canvasBuffer.canvas, 0, -height);
            }
        }

        if (generated) {
            render_texture.destroy(true);
        }

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
        let textureBuffer;
        let resolution;
        let frame;
        let render_texture;
        let generated = false;

        if (target) {
            if (target instanceof RenderTexture) {
                render_texture = target;
            }
            else {
                // TODO: parameters are not enough
                render_texture = this.renderer.generate_texture(target);
                generated = true;
            }
        }

        if (render_texture) {
            textureBuffer = render_texture.base_texture._gl_render_targets[this.renderer.CONTEXT_UID];
            resolution = textureBuffer.resolution;
            frame = render_texture.frame;
        }
        else {
            textureBuffer = this.renderer.rootRenderTarget;
            resolution = textureBuffer.resolution;

            frame = TEMP_RECT;
            frame.width = textureBuffer.size.width;
            frame.height = textureBuffer.size.height;
        }

        const width = frame.width * resolution;
        const height = frame.height * resolution;

        const webglPixels = new Uint8Array(BYTES_PER_PIXEL * width * height);

        if (textureBuffer) {
            // bind the buffer
            renderer.bindRenderTarget(textureBuffer);
            // read pixels to the array
            const gl = renderer.gl;

            gl.readPixels(
                frame.x * resolution,
                frame.y * resolution,
                width,
                height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                webglPixels
            );
        }

        if (generated) {
            render_texture.destroy(true);
        }

        return webglPixels;
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

WebGLRenderer.register_plugin('extract', WebGLExtract);
