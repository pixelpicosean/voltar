import GLBuffer from 'engine/drivers/webgl/gl_buffer';
import VertexArrayObject from 'engine/drivers/webgl/vao';

import Shader from 'engine/Shader';
import Vector2 from 'engine/math/Vector2';

/**
 * An object containing WebGL specific properties to be used by the WebGL renderer
 */
export default class WebGLGraphicsData {
    /**
     * @param {WebGLRenderingContext} gl - The current WebGL drawing context
     * @param {Shader} shader - The shader
     * @param {object} attribsState - The state for the VAO
     */
    constructor(gl, shader, attribsState) {
        /**
         * The current WebGL drawing context
         *
         * @type {WebGLRenderingContext}
         */
        this.gl = gl;

        // TODO does this need to be split before uploading??
        /**
         * An array of color components (r,g,b)
         * @type {number[]}
         */
        this.color = [0, 0, 0]; // color split!

        /**
         * An array of points to draw
         * @type {Vector2[]}
         */
        this.points = [];

        /**
         * The indices of the vertices
         * @type {number[]}
         */
        this.indices = [];
        /**
         * The main buffer
         * @type {GLBuffer}
         */
        this.buffer = GLBuffer.create_vertex_buffer(gl);

        /**
         * The index buffer
         * @type {GLBuffer}
         */
        this.index_buffer = GLBuffer.create_index_buffer(gl);

        /**
         * Whether this graphics is dirty or not
         * @type {boolean}
         */
        this.dirty = true;

        /**
         * Whether this graphics is native_lines or not
         * @type {boolean}
         */
        this.native_lines = false;

        this.glPoints = null;
        this.glIndices = null;

        /**
         *
         * @type {Shader}
         */
        this.shader = shader;

        this.vao = new VertexArrayObject(gl, attribsState)
            .addIndex(this.index_buffer)
            .addAttribute(this.buffer, shader.attributes.aVertexPosition, gl.FLOAT, false, 4 * 6, 0)
            .addAttribute(this.buffer, shader.attributes.aColor, gl.FLOAT, false, 4 * 6, 2 * 4);
    }

    /**
     * Resets the vertices and the indices
     */
    reset() {
        this.points.length = 0;
        this.indices.length = 0;
    }

    /**
     * Binds the buffers and uploads the data
     */
    upload() {
        this.glPoints = new Float32Array(this.points);
        this.buffer.upload(this.glPoints);

        this.glIndices = new Uint16Array(this.indices);
        this.index_buffer.upload(this.glIndices);

        this.dirty = false;
    }

    /**
     * Empties all the data
     */
    destroy() {
        this.color = null;
        this.points = null;
        this.indices = null;

        this.vao.destroy();
        this.buffer.destroy();
        this.index_buffer.destroy();

        this.gl = null;

        this.buffer = null;
        this.index_buffer = null;

        this.glPoints = null;
        this.glIndices = null;
    }
}
