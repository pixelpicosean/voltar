import { Rectangle, Matrix } from 'engine/math/index';
import { SCALE_MODES } from 'engine/const';
import settings from 'engine/settings';
import GLFramebuffer from 'engine/drivers/webgl/gl_frame_buffer';
import GLTexture from 'engine/drivers/webgl/gl_texture';
import GLBuffer from 'engine/drivers/webgl/gl_buffer';

export default class RenderTarget {
    /**
     * @param {WebGLRenderingContext} gl - The current WebGL drawing context
     * @param {number} [width] - the horizontal range of the filter
     * @param {number} [height] - the vertical range of the filter
     * @param {number} [scale_mode]
     * @param {number} [resolution] - The current resolution / device pixel ratio
     * @param {boolean} [root] - Whether this object is the root element or not
     */
    constructor(gl, width = 0, height = 0, scale_mode, resolution = 1, root = false) {
        // TODO Resolution could go here ( eg low res blurs )

        /**
         * The current WebGL drawing context.
         */
        this.gl = gl;

        // next time to create a frame buffer and texture

        /**
         * A frame buffer
         *
         * @type {GLFramebuffer}
         */
        this.frame_buffer = null;

        /**
         * The texture
         *
         * @type {GLTexture}
         */
        this.texture = null;

        /**
         * The background colour of this render target, as an array of [r,g,b,a] values
         */
        this.clearColor = [0, 0, 0, 0];

        /**
         * The size of the object as a rectangle
         */
        this.size = new Rectangle(0, 0, 1, 1);

        /**
         * The current resolution / device pixel ratio
         */
        this.resolution = resolution || settings.RESOLUTION;

        /**
         * The projection matrix
         */
        this.projection_matrix = new Matrix();

        /**
         * The object's transform
         *
         * @type {Matrix}
         */
        this.transform = null;

        /**
         * The frame.
         *
         * @type {Rectangle}
         */
        this.frame = null;

        this.default_frame = new Rectangle();
        /**
         * @type {Rectangle}
         */
        this.destination_frame = null;
        /**
         * @type {Rectangle}
         */
        this.source_frame = null;

        /**
         * The stencil buffer stores masking data for the render target
         *
         * @type {GLBuffer}
         */
        this.stencil_buffer = null;

        /**
         * The data structure for the stencil masks
         *
         * @type {import('../../scene/graphics/Graphics').default[]}
         */
        this.stencil_mask_stack = [];

        /**
         * Stores filter data for the render target
         *
         * @type {{index: number, stack: import('../managers/FilterManager').FilterState[]}}
         */
        this.filter_data = null;

        /**
         * @type {{index: number, stack: import('../managers/FilterManager').FilterState[]}}
         */
        this.filter_stack = null;

        /**
         * @type {Rectangle}
         */
        this.filter_area = null;

        /**
         * The key for pooled texture of FilterSystem
         */
        this.filter_pool_key = '';

        /**
         * The scale mode.
         */
        this.scale_mode = scale_mode !== undefined ? scale_mode : settings.SCALE_MODE;

        /**
         * Whether this object is the root element or not
         */
        this.root = root;

        if (!this.root) {
            this.frame_buffer = GLFramebuffer.create_rgba(gl, 100, 100);

            if (this.scale_mode === SCALE_MODES.NEAREST) {
                this.frame_buffer.texture.enable_nearest_scaling();
            } else {
                this.frame_buffer.texture.enable_linear_scaling();
            }
            /*
                A frame buffer needs a target to render to..
                create a texture and bind it attach it to the framebuffer..
             */

            // this is used by the base texture
            this.texture = this.frame_buffer.texture;
        } else {
            // make it a null framebuffer..
            this.frame_buffer = new GLFramebuffer(gl, 100, 100);
            this.frame_buffer.framebuffer = null;
        }

        this.set_frame();

        this.resize(width, height);
    }

    /**
     * Clears the filter texture.
     *
     * @param {number[]} [clear_color] - Array of [r,g,b,a] to clear the framebuffer
     */
    clear(clear_color) {
        const cc = clear_color || this.clearColor;

        this.frame_buffer.clear(cc[0], cc[1], cc[2], cc[3]);// r,g,b,a);
    }

    /**
     * Binds the stencil buffer.
     *
     */
    attach_stencil_buffer() {
        // TODO check if stencil is done?
        /**
         * The stencil buffer is used for masking in pixi
         * lets create one and then add attach it to the framebuffer..
         */
        if (!this.root) {
            this.frame_buffer.enable_stencil();
        }
    }

    /**
     * Sets the frame of the render target.
     *
     * @param {Rectangle} [destination_frame] - The destination frame.
     * @param {Rectangle} [source_frame] - The source frame.
     */
    set_frame(destination_frame, source_frame) {
        this.destination_frame = destination_frame || this.destination_frame || this.default_frame;
        this.source_frame = source_frame || this.source_frame || this.destination_frame;
    }

    /**
     * Binds the buffers and initialises the viewport.
     *
     */
    activate() {
        // TODO: refactor usage of frame..
        const gl = this.gl;

        // make sure the texture is unbound!
        this.frame_buffer.bind();

        this.calculate_projection(this.destination_frame, this.source_frame);

        if (this.transform) {
            this.projection_matrix.append(this.transform);
        }

        if (!this.destination_frame.equals(this.source_frame)) {
            gl.enable(gl.SCISSOR_TEST);
            gl.scissor(
                this.destination_frame.x | 0,
                this.destination_frame.y | 0,
                (this.destination_frame.width * this.resolution) | 0,
                (this.destination_frame.height * this.resolution) | 0
            );
        } else {
            gl.disable(gl.SCISSOR_TEST);
        }

        // TODO: does not need to be updated all the time??
        gl.viewport(
            this.destination_frame.x | 0,
            this.destination_frame.y | 0,
            (this.destination_frame.width * this.resolution) | 0,
            (this.destination_frame.height * this.resolution) | 0
        );
    }

    /**
     * Updates the projection matrix based on a projection frame (which is a rectangle)
     *
     * @param {Rectangle} destination_frame - The destination frame.
     * @param {Rectangle} [source_frame] - The source frame.
     */
    calculate_projection(destination_frame, source_frame) {
        const pm = this.projection_matrix;

        source_frame = source_frame || destination_frame;

        pm.identity();

        // TODO: make dest scale source
        if (!this.root) {
            pm.a = 1 / destination_frame.width * 2;
            pm.d = 1 / destination_frame.height * 2;

            pm.tx = -1 - (source_frame.x * pm.a);
            pm.ty = -1 - (source_frame.y * pm.d);
        } else {
            pm.a = 1 / destination_frame.width * 2;
            pm.d = -1 / destination_frame.height * 2;

            pm.tx = -1 - (source_frame.x * pm.a);
            pm.ty = 1 - (source_frame.y * pm.d);
        }
    }

    /**
     * Resizes the texture to the specified width and height
     *
     * @param {number} width - the new width of the texture
     * @param {number} height - the new height of the texture
     */
    resize(width, height) {
        width = width | 0;
        height = height | 0;

        if (this.size.width === width && this.size.height === height) {
            return;
        }

        this.size.width = width;
        this.size.height = height;

        this.default_frame.width = width;
        this.default_frame.height = height;

        this.frame_buffer.resize(width * this.resolution, height * this.resolution);

        this.calculate_projection(this.frame || this.size);
    }

    /**
     * Destroys the render target.
     *
     */
    destroy() {
        this.frame_buffer.destroy();

        this.frame_buffer = null;
        this.texture = null;
    }
}
