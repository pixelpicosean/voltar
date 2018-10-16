import Rectangle from "engine/math/shapes/Rectangle";
import WebGLRenderer from "engine/renderers/WebGLRenderer";
import RenderTexture from "engine/textures/RenderTexture";
import Node2D from "engine/scene/Node2D";
import CanvasRenderTarget from "engine/renderers/utils/CanvasRenderTarget";

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
        let texture_buffer;
        let resolution;
        let frame;
        let flip_y = false;
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
            texture_buffer = render_texture.base_texture._gl_render_targets[this.renderer.CONTEXT_UID];
            resolution = texture_buffer.resolution;
            frame = render_texture.frame;
            flip_y = false;
        }
        else {
            texture_buffer = this.renderer.root_render_target;
            resolution = texture_buffer.resolution;
            flip_y = true;

            frame = TEMP_RECT;
            frame.width = texture_buffer.size.width;
            frame.height = texture_buffer.size.height;
        }

        const width = frame.width * resolution;
        const height = frame.height * resolution;

        const canvas_buffer = new CanvasRenderTarget(width, height, 1);

        if (texture_buffer) {
            // bind the buffer
            renderer.bind_render_target(texture_buffer);

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
            const canvas_data = canvas_buffer.context.getImageData(0, 0, width, height);

            canvas_data.data.set(webglPixels);

            canvas_buffer.context.putImageData(canvas_data, 0, 0);

            // pulling pixels
            if (flip_y) {
                canvas_buffer.context.scale(1, -1);
                canvas_buffer.context.drawImage(canvas_buffer.canvas, 0, -height);
            }
        }

        if (generated) {
            render_texture.destroy(true);
        }

        // send the canvas back..
        return canvas_buffer.canvas;
    }

    /**
     * Will return a one-dimensional array containing the pixel data of the entire texture in RGBA
     * order, with integer values between 0 and 255 (included).
     *
     * @param {Node2D|RenderTexture} target - A node or render_texture
     *  to convert. If left empty will use use the main renderer
     * @return {Uint8Array} One-dimensional array containing the pixel data of the entire texture
     */
    pixels(target) {
        const renderer = this.renderer;
        let texture_buffer;
        let resolution;
        let frame;
        let render_texture;
        let generated = false;

        if (target) {
            if (target instanceof RenderTexture) {
                render_texture = target;
            } else {
                render_texture = this.renderer.generate_texture(target);
                generated = true;
            }
        }

        if (render_texture) {
            texture_buffer = render_texture.base_texture._gl_render_targets[this.renderer.CONTEXT_UID];
            resolution = texture_buffer.resolution;
            frame = render_texture.frame;
        } else {
            texture_buffer = this.renderer.root_render_target;
            resolution = texture_buffer.resolution;

            frame = TEMP_RECT;
            frame.width = texture_buffer.size.width;
            frame.height = texture_buffer.size.height;
        }

        const width = frame.width * resolution;
        const height = frame.height * resolution;

        const webgl_pixels = new Uint8Array(BYTES_PER_PIXEL * width * height);

        if (texture_buffer) {
            // bind the buffer
            renderer.bind_render_target(texture_buffer);
            // read pixels to the array
            const gl = renderer.gl;

            gl.readPixels(
                frame.x * resolution,
                frame.y * resolution,
                width,
                height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                webgl_pixels
            );
        }

        if (generated) {
            render_texture.destroy(true);
        }

        return webgl_pixels;
    }

    /**
     * Destroys the extract
     *
     */
    destroy() {
        this.renderer = null;
    }
}
