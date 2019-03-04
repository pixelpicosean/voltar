const EMPTY_ARRAY_BUFFER = new ArrayBuffer(0);

export default class GLBuffer {
    /**
     * Helper class to create a webGL buffer
     * @param gl {WebGLRenderingContext} The current WebGL rendering context
     * @param [type] {number} gl.ARRAY_BUFFER | gl.ELEMENT_ARRAY_BUFFER
     * @param [data] {ArrayBuffer|SharedArrayBuffer|ArrayBufferView} an array of data
     * @param [draw_type] {number} gl.STATIC_DRAW | gl.DYNAMIC_DRAW | gl.STREAM_DRAW
     */
    constructor(gl, type, data, draw_type) {
        /**
         * The current WebGL rendering context
         *
         * @type {WebGLRenderingContext}
         */
        this.gl = gl;

        /**
         * The WebGL buffer, created upon instantiation
         *
         * @type {WebGLBuffer}
         */
        this.buffer = gl.createBuffer();

        /**
         * The type of the buffer
         *
         * @type {typeof gl.ARRAY_BUFFER|typeof gl.ELEMENT_ARRAY_BUFFER}
         */
        this.type = type || gl.ARRAY_BUFFER;

        /**
         * The draw type of the buffer
         *
         * @type {number} gl.STATIC_DRAW | gl.DYNAMIC_DRAW | gl.STREAM_DRAW
         */
        this.draw_type = draw_type || gl.STATIC_DRAW;

        /**
         * The data in the buffer, as a typed array
         *
         * @type {ArrayBuffer|SharedArrayBuffer|ArrayBufferView}
         */
        this.data = EMPTY_ARRAY_BUFFER;

        if (data) {
            this.upload(data);
        }

        this._update_id = 0;
    }

    /**
     * Uploads the buffer to the GPU
     * @param [data] {ArrayBuffer|SharedArrayBuffer|ArrayBufferView} an array of data to upload
     * @param [offset] {number} if only a subset of the data should be uploaded, this is the amount of data to subtract
     * @param [dont_bind] {boolean} whether to bind the buffer before uploading it
     */
    upload(data, offset = 0, dont_bind = false) {
        // todo - needed?
        if (!dont_bind) this.bind();

        var gl = this.gl;

        data = data || this.data;

        if (this.data.byteLength >= data.byteLength) {
            gl.bufferSubData(this.type, offset, data);
        } else {
            gl.bufferData(this.type, data, this.draw_type);
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
     * @param {number} [draw_type]
     */
    static create_vertex_buffer(gl, data, draw_type) {
        return new GLBuffer(gl, gl.ARRAY_BUFFER, data, draw_type);
    }

    /**
     * @param {WebGLRenderingContext} gl
     * @param {ArrayBuffer} [data]
     * @param {number} [draw_type]
     */
    static create_index_buffer(gl, data, draw_type) {
        return new GLBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, data, draw_type);
    }

    /**
     * @param {WebGLRenderingContext} gl
     * @param {number} [type]
     * @param {ArrayBuffer} [data]
     * @param {number} [draw_type]
     */
    static create(gl, type, data, draw_type) {
        return new GLBuffer(gl, type, data, draw_type);
    }
}
