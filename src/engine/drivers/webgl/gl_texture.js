let FLOATING_POINT_AVAILABLE = false;

export default class GLTexture {
    /**
     * Helper class to create a WebGL Texture
     *
     * @param gl {WebGLRenderingContext} The current WebGL context
     * @param [width] {number} the width of the texture
     * @param [height] {number} the height of the texture
     * @param [format] {number} the pixel format of the texture. defaults to gl.RGBA
     * @param [type] {number} the gl type of the texture. defaults to gl.UNSIGNED_BYTE
     */
    constructor(gl, width = -1, height = -1, format = undefined, type = undefined) {
        /**
         * The current WebGL rendering context
         *
         * @type {WebGLRenderingContext}
         */
        this.gl = gl;

        /**
         * The WebGL texture
         *
         * @type {WebGLTexture}
         */
        this.texture = gl.createTexture();

        /**
         * If mipmapping was used for this texture, enable and disable with enableMipmap()
         *
         * @type {boolean}
         */
        this.mipmap = false;

        /**
         * Set to true to enable pre-multiplied alpha
         *
         * @type {boolean}
         */
        this.premultiply_alpha = false;

        /**
         * The width of texture
         *
         * @type {number}
         */
        this.width = width;
        /**
         * The height of texture
         *
         * @type {number}
         */
        this.height = height;

        /**
         * The pixel format of the texture. defaults to gl.RGBA
         *
         * @type {number}
         */
        this.format = format || gl.RGBA;

        /**
         * The gl type of the texture. defaults to gl.UNSIGNED_BYTE
         *
         * @type {number}
         */
        this.type = type || gl.UNSIGNED_BYTE;
    }

    /**
     * Uploads this texture to the GPU
     * @param source {HTMLImageElement|ImageData|HTMLCanvasElement|HTMLVideoElement} the source image of the texture
     */
    upload(source) {
        this.bind();

        const gl = this.gl;

        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiply_alpha ? 1 : 0);

        const new_width = /** @type {HTMLVideoElement} */(source).videoWidth || source.width;
        const new_height = /** @type {HTMLVideoElement} */(source).videoHeight || source.height;

        if (new_height !== this.height || new_width !== this.width) {
            gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.format, this.type, source);
        } else {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.format, this.type, source);
        }

        // if the source is a video, we need to use the videoWidth / videoHeight properties as width / height will be incorrect.
        this.width = new_width;
        this.height = new_height;
    }

    /**
     * Use a data source and uploads this texture to the GPU
     * @param data {Float32Array} the data to upload to the texture
     * @param width {number} the new width of the texture
     * @param height {number} the new height of the texture
     */
    upload_data(data, width, height) {
        this.bind();

        const gl = this.gl;

        if (data instanceof Float32Array) {
            if (!FLOATING_POINT_AVAILABLE) {
                const ext = gl.getExtension("OES_texture_float");

                if (ext) {
                    FLOATING_POINT_AVAILABLE = true;
                } else {
                    throw new Error('floating point textures not available');
                }
            }

            this.type = gl.FLOAT;
        } else {
            this.type = this.type || gl.UNSIGNED_BYTE;

            // TODO support for other types
        }

        // what type of data?
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiply_alpha ? 1 : 0);

        if (width !== this.width || height !== this.height) {
            gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, data || null);
        } else {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, this.format, this.type, data || null);
        }

        this.width = width;
        this.height = height;

        //	texSubImage2D
    }

    /**
     * Binds the texture
     * @param {number} [location]
     */
    bind(location) {
        const gl = this.gl;

        if (location !== undefined) {
            gl.activeTexture(gl.TEXTURE0 + location);
        }

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }

    /**
     * Unbinds the texture
     */
    unbind() {
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    /**
     * @param {boolean} linear if we want to use linear filtering or nearest neighbour interpolation
     */
    min_filter(linear) {
        const gl = this.gl;

        this.bind();

        if (this.mipmap) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_NEAREST);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
        }
    }

    /**
     * @param {boolean} linear if we want to use linear filtering or nearest neighbour interpolation
     */
    mag_filter(linear) {
        const gl = this.gl;

        this.bind();

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
    }

    /**
     * Enables mipmapping
     */
    enable_mipmap() {
        const gl = this.gl;

        this.bind();

        this.mipmap = true;

        gl.generateMipmap(gl.TEXTURE_2D);
    }

    /**
     * Enables linear filtering
     */
    enable_linear_scaling() {
        this.min_filter(true);
        this.mag_filter(true);
    }

    /**
     * Enables nearest neighbour interpolation
     */
    enable_nearest_scaling() {
        this.min_filter(false);
        this.mag_filter(false);
    }

    /**
     * Enables clamping on the texture so WebGL will not repeat it
     */
    enable_wrap_clamp() {
        const gl = this.gl;

        this.bind();

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    /**
     * Enable tiling on the texture
     */
    enable_wrap_repeat() {
        const gl = this.gl;

        this.bind();

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    }

    enable_wrap_mirror_repeat() {
        const gl = this.gl;

        this.bind();

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    }

    /**
     * Destroys this texture
     */
    destroy() {
        const gl = this.gl;
        gl.deleteTexture(this.texture);

        // TODO
    }

    /**
    * @param gl {WebGLRenderingContext} The current WebGL context
    * @param source {HTMLImageElement|ImageData} the source image of the texture
    * @param premultiply_alpha {boolean} If we want to use pre-multiplied alpha
    */
    static from_source(gl, source, premultiply_alpha = false) {
        const texture = new GLTexture(gl);
        texture.premultiply_alpha = premultiply_alpha;
        texture.upload(source);

        return texture;
    }

    /**
     * @param gl {WebGLRenderingContext} The current WebGL context
     * @param data {Float32Array} the data to upload to the texture
     * @param width {number} the new width of the texture
     * @param height {number} the new height of the texture
     */
    static from_data(gl, data, width, height) {
        const texture = new GLTexture(gl);
        texture.upload_data(data, width, height);

        return texture;
    }
}
