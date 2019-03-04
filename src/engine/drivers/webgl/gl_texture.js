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
        // some settings..
        this.mipmap = false;


        /**
         * Set to true to enable pre-multiplied alpha
         *
         * @type {boolean}
         */
        this.premultiplyAlpha = false;

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

        var gl = this.gl;

        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha ? 1 : 0);

        var newWidth = /** @type {HTMLVideoElement} */(source).videoWidth || source.width;
        var newHeight = /** @type {HTMLVideoElement} */(source).videoHeight || source.height;

        if (newHeight !== this.height || newWidth !== this.width) {
            gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.format, this.type, source);
        }
        else {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.format, this.type, source);
        }

        // if the source is a video, we need to use the videoWidth / videoHeight properties as width / height will be incorrect.
        this.width = newWidth;
        this.height = newHeight;
    }

    /**
     * Use a data source and uploads this texture to the GPU
     * @param data {Float32Array} the data to upload to the texture
     * @param width {number} the new width of the texture
     * @param height {number} the new height of the texture
     */
    uploadData(data, width, height) {
        this.bind();

        var gl = this.gl;

        if (data instanceof Float32Array) {
            if (!FLOATING_POINT_AVAILABLE) {
                var ext = gl.getExtension("OES_texture_float");

                if (ext) {
                    FLOATING_POINT_AVAILABLE = true;
                }
                else {
                    throw new Error('floating point textures not available');
                }
            }

            this.type = gl.FLOAT;
        } else {
            // TODO support for other types
            this.type = this.type || gl.UNSIGNED_BYTE;
        }

        // what type of data?
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha ? 1 : 0);


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
    bind(location = undefined) {
        var gl = this.gl;

        if (location !== undefined) {
            gl.activeTexture(gl.TEXTURE0 + location);
        }

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }

    /**
     * Unbinds the texture
     */
    unbind() {
        var gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    /**
     * @param {boolean} linear if we want to use linear filtering or nearest neighbour interpolation
     */
    minFilter(linear) {
        var gl = this.gl;

        this.bind();

        if (this.mipmap) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_NEAREST);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
        }
    }

    /**
     * @param linear {boolean} if we want to use linear filtering or nearest neighbour interpolation
     */
    magFilter(linear) {
        var gl = this.gl;

        this.bind();

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
    }

    /**
     * Enables mipmapping
     */
    enableMipmap() {
        var gl = this.gl;

        this.bind();

        this.mipmap = true;

        gl.generateMipmap(gl.TEXTURE_2D);
    }

    /**
     * Enables linear filtering
     */
    enableLinearScaling() {
        this.minFilter(true);
        this.magFilter(true);
    }

    /**
     * Enables nearest neighbour interpolation
     */
    enableNearestScaling() {
        this.minFilter(false);
        this.magFilter(false);
    }

    /**
     * Enables clamping on the texture so WebGL will not repeat it
     */
    enableWrapClamp() {
        var gl = this.gl;

        this.bind();

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    /**
     * Enable tiling on the texture
     */
    enableWrapRepeat() {
        var gl = this.gl;

        this.bind();

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    }

    enableWrapMirrorRepeat() {
        var gl = this.gl;

        this.bind();

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    }


    /**
     * Destroys this texture
     */
    destroy() {
        var gl = this.gl;
        //TODO
        gl.deleteTexture(this.texture);
    }

    /**
    * @param gl {WebGLRenderingContext} The current WebGL context
    * @param source {HTMLImageElement|ImageData} the source image of the texture
    * @param premultiplyAlpha {boolean} If we want to use pre-multiplied alpha
    */
    static fromSource(gl, source, premultiplyAlpha) {
        var texture = new GLTexture(gl);
        texture.premultiplyAlpha = premultiplyAlpha || false;
        texture.upload(source);

        return texture;
    }

    /**
     * @param gl {WebGLRenderingContext} The current WebGL context
     * @param data {Float32Array} the data to upload to the texture
     * @param width {number} the new width of the texture
     * @param height {number} the new height of the texture
     */
    static fromData(gl, data, width, height) {
        //console.log(data, width, height);
        var texture = new GLTexture(gl);
        texture.uploadData(data, width, height);

        return texture;
    }
}
