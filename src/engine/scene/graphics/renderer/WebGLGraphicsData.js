import GLBuffer from 'engine/drivers/webgl/gl_buffer';
import VertexArrayObject from 'engine/drivers/webgl/vao';

import Shader from 'engine/Shader';

/**
 * An object containing WebGL specific properties to be used by the WebGL renderer
 */
export default class WebGLGraphicsData {
    /**
     * @param {WebGLRenderingContext} gl - The current WebGL drawing context
     * @param {Shader} shader - The shader
     * @param {import('engine/drivers/webgl/vao').VertexArrayObjectDesc} attribs_state - The state for the VAO
     */
    constructor(gl, shader, attribs_state) {
        /**
         * The current WebGL drawing context
         */
        this.gl = gl;

        // TODO does this need to be split before uploading??
        /**
         * An array of color components (r, g, b)
         * @type {number[]}
         */
        this.color = [0, 0, 0];

        /**
         * An array of points to draw
         * @type {number[]}
         */
        this.points = [];

        /**
         * The indices of the vertices
         * @type {number[]}
         */
        this.indices = [];
        /**
         * The main buffer
         */
        this.buffer = GLBuffer.create_vertex_buffer(gl);

        /**
         * The index buffer
         */
        this.index_buffer = GLBuffer.create_index_buffer(gl);

        /**
         * Whether this graphics is dirty or not
         */
        this.dirty = true;

        /**
         * Whether this graphics is native_lines or not
         */
        this.native_lines = false;

        /**
         * @type {Float32Array}
         */
        this.gl_vertices = null;

        /**
         * @type {Uint16Array}
         */
        this.gl_indices = null;

        /**
         * @type {Shader}
         */
        this.shader = shader;

        this.vao = new VertexArrayObject(gl, attribs_state)
            .add_index(this.index_buffer)
            .add_attribute(this.buffer, shader.attributes.a_vertex_position, gl.FLOAT, false, 4 * 6, 0)
            .add_attribute(this.buffer, shader.attributes.a_color, gl.FLOAT, false, 4 * 6, 2 * 4);
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
        this.gl_vertices = new Float32Array(this.points);
        this.buffer.upload(this.gl_vertices);

        this.gl_indices = new Uint16Array(this.indices);
        this.index_buffer.upload(this.gl_indices);

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

        this.gl_vertices = null;
        this.gl_indices = null;
    }
}
