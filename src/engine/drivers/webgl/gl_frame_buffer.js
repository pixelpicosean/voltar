import GLTexture from './gl_texture';

export default class GLFramebuffer {
    /**
     * Helper class to create a webGL Framebuffer
     *
     * @param gl {WebGLRenderingContext} The current WebGL rendering context
     * @param width {number} the width of the drawing area of the frame buffer
     * @param height {number} the height of the drawing area of the frame buffer
     */
    constructor(gl, width, height) {
        /**
         * The current WebGL rendering context
         *
         * @type {WebGLRenderingContext}
         */
        this.gl = gl;

        /**
         * The frame buffer
         *
         * @type {WebGLFramebuffer}
         */
        this.framebuffer = gl.createFramebuffer();

        /**
         * The stencil buffer
         *
         * @type {WebGLRenderbuffer}
         */
        this.stencil = null;

        /**
         * The stencil buffer
         *
         * @type {GLTexture}
         */
        this.texture = null;

        /**
         * The width of the drawing area of the buffer
         *
         * @type {number}
         */
        this.width = width || 100;
        /**
         * The height of the drawing area of the buffer
         *
         * @type {number}
         */
        this.height = height || 100;
    }

    /**
     * Adds a texture to the frame buffer
     * @param texture {GLTexture}
     */
    enableTexture(texture) {
        var gl = this.gl;

        this.texture = texture || new GLTexture(gl);

        this.texture.bind();

        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,  this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        this.bind();

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture.texture, 0);
    }

    /**
     * Initialises the stencil buffer
     */
    enableStencil() {
        if (this.stencil) return;

        var gl = this.gl;

        this.stencil = gl.createRenderbuffer();

        gl.bindRenderbuffer(gl.RENDERBUFFER, this.stencil);

        // TODO.. this is depth AND stencil?
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.stencil);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, this.width, this.height);


    }

    /**
     * Erases the drawing area and fills it with a colour
     * @param  r {number} the red value of the clearing colour
     * @param  g {number} the green value of the clearing colour
     * @param  b {number} the blue value of the clearing colour
     * @param  a {number} the alpha value of the clearing colour
     */
    clear(r, g, b, a) {
        this.bind();

        var gl = this.gl;

        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    /**
     * Binds the frame buffer to the WebGL context
     */
    bind() {
        var gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    }

    /**
     * Unbinds the frame buffer to the WebGL context
     */
    unbind() {
        var gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    /**
     * Resizes the drawing area of the buffer to the given width and height
     * @param  width  {number} the new width
     * @param  height {number} the new height
     */
    resize(width, height) {
        var gl = this.gl;

        this.width = width;
        this.height = height;

        if (this.texture) {
            this.texture.uploadData(null, width, height);
        }

        if (this.stencil) {
            // update the stencil buffer width and height
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.stencil);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);
        }
    }

    /**
     * Destroys this buffer
     */
    destroy() {
        var gl = this.gl;

        //TODO
        if (this.texture) {
            this.texture.destroy();
        }

        gl.deleteFramebuffer(this.framebuffer);

        this.gl = null;

        this.stencil = null;
        this.texture = null;
    }

    /**
     * Creates a frame buffer with empty data
     * @param gl {WebGLRenderingContext} The current WebGL rendering context
     * @param width {number} the width of the drawing area of the frame buffer
     * @param height {number} the height of the drawing area of the frame buffer
     */
    static createRGBA(gl, width, height) {
        var texture = GLTexture.fromData(gl, null, width, height);
        texture.enableNearestScaling();
        texture.enableWrapClamp();

        //now create the framebuffer object and attach the texture to it.
        var fbo = new GLFramebuffer(gl, width, height);
        fbo.enableTexture(texture);
        //fbo.enableStencil(); // get this back on soon!

        //fbo.enableStencil(); // get this back on soon!

        fbo.unbind();

        return fbo;
    }

    /**
     * Creates a frame buffer with a texture containing the given data
     * @param gl {WebGLRenderingContext} The current WebGL rendering context
     * @param width {number} the width of the drawing area of the frame buffer
     * @param height {number} the height of the drawing area of the frame buffer
     * @param data {Float32Array} an array of data
     */
    static createFloat32(gl, width, height, data) {
        // create a new texture..
        var texture = GLTexture.fromData(gl, data, width, height);
        texture.enableNearestScaling();
        texture.enableWrapClamp();

        //now create the framebuffer object and attach the texture to it.
        var fbo = new GLFramebuffer(gl, width, height);
        fbo.enableTexture(texture);

        fbo.unbind();

        return fbo;
    }
}
