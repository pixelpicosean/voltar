const EMPTY_ARRAY_BUFFER = new ArrayBuffer(0);

export default class GLBuffer {
    /**
     * Helper class to create a webGL buffer
     * @param gl {WebGLRenderingContext} The current WebGL rendering context
     * @param [type] {number} gl.ARRAY_BUFFER | gl.ELEMENT_ARRAY_BUFFER
     * @param [data] {ArrayBuffer|SharedArrayBuffer|ArrayBufferView} an array of data
     * @param [drawType] {number} gl.STATIC_DRAW | gl.DYNAMIC_DRAW | gl.STREAM_DRAW
     */
    constructor(gl, type, data, drawType) {
        /**
         * The current WebGL rendering context
         *
         * @member {WebGLRenderingContext}
         */
        this.gl = gl;

        /**
         * The WebGL buffer, created upon instantiation
         *
         * @member {WebGLBuffer}
         */
        this.buffer = gl.createBuffer();

        /**
         * The type of the buffer
         *
         * @member {gl.ARRAY_BUFFER|gl.ELEMENT_ARRAY_BUFFER}
         */
        this.type = type || gl.ARRAY_BUFFER;

        /**
         * The draw type of the buffer
         *
         * @member {gl.STATIC_DRAW|gl.DYNAMIC_DRAW|gl.STREAM_DRAW}
         */
        this.drawType = drawType || gl.STATIC_DRAW;

        /**
         * The data in the buffer, as a typed array
         *
         * @member {ArrayBuffer| SharedArrayBuffer|ArrayBufferView}
         */
        this.data = EMPTY_ARRAY_BUFFER;

        if (data) {
            this.upload(data);
        }

        this._updateID = 0;
    }

    /**
     * Uploads the buffer to the GPU
     * @param [data] {ArrayBuffer| SharedArrayBuffer|ArrayBufferView} an array of data to upload
     * @param [offset] {number} if only a subset of the data should be uploaded, this is the amount of data to subtract
     * @param [dontBind] {boolean} whether to bind the buffer before uploading it
     */
    upload(data, offset = 0, dontBind = false) {
        // todo - needed?
        if (!dontBind) this.bind();

        var gl = this.gl;

        data = data || this.data;

        if (this.data.byteLength >= data.byteLength) {
            gl.bufferSubData(this.type, offset, data);
        } else {
            gl.bufferData(this.type, data, this.drawType);
        }

        this.data = data;
    }

    /**
     * Binds the buffer
     */
    bind() {
        var gl = this.gl;
        gl.bindBuffer(this.type, this.buffer);
    }

    /**
     * Destroys the buffer
     */
    destroy() {
        this.gl.deleteBuffer(this.buffer);
    }

    /**
     * @param {WebGLRenderingContext} gl
     * @param {ArrayBuffer} [data]
     * @param {number} [drawType]
     */
    static createVertexBuffer(gl, data, drawType) {
        return new GLBuffer(gl, gl.ARRAY_BUFFER, data, drawType);
    }

    /**
     * @param {WebGLRenderingContext} gl
     * @param {ArrayBuffer} [data]
     * @param {number} [drawType]
     */
    static createIndexBuffer(gl, data, drawType) {
        return new GLBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, data, drawType);
    }

    /**
     * @param {WebGLRenderingContext} gl
     * @param {number} [type]
     * @param {ArrayBuffer} [data]
     * @param {number} [drawType]
     */
    static create(gl, type, data, drawType) {
        return new GLBuffer(gl, type, data, drawType);
    }
}
