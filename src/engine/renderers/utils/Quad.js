import GLBuffer from 'engine/drivers/webgl/gl_buffer'
import GLShader from 'engine/drivers/webgl/gl_shader';
import VertexArrayObject from 'engine/drivers/webgl/vao'

import create_indices_for_quads from 'engine/utils/create_indices_for_quads';
import { Rectangle } from 'engine/math/index';

/**
 * Helper class to create a quad
 */
export default class Quad {
    /**
     * @param {WebGLRenderingContext} gl - The gl context for this quad to use.
     * @param {import('engine/drivers/webgl/vao').VertexArrayObjectDesc} state
     */
    constructor(gl, state) {
        /**
         * the current WebGL drawing context
         */
        this.gl = gl;

        /**
         * An array of vertices
         */
        this.vertices = new Float32Array([
            -1, -1,
            1, -1,
            1, 1,
            -1, 1,
        ]);

        /**
         * The Uvs of the quad
         */
        this.uvs = new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 1,
        ]);

        this.interleaved = new Float32Array(8 * 2);

        for (let i = 0; i < 4; i++) {
            this.interleaved[i * 4] = this.vertices[(i * 2)];
            this.interleaved[(i * 4) + 1] = this.vertices[(i * 2) + 1];
            this.interleaved[(i * 4) + 2] = this.uvs[i * 2];
            this.interleaved[(i * 4) + 3] = this.uvs[(i * 2) + 1];
        }

        /**
         * An array containing the indices of the vertices
         */
        this.indices = create_indices_for_quads(1);

        /**
         * The vertex buffer
         */
        this.vertex_buffer = GLBuffer.create_vertex_buffer(gl, this.interleaved, gl.STATIC_DRAW);

        /**
         * The index buffer
         */
        this.index_buffer = GLBuffer.create_index_buffer(gl, this.indices, gl.STATIC_DRAW);

        /**
         * The vertex array object
         */
        this.vao = new VertexArrayObject(gl, state);
    }

    /**
     * Initialises the vaos and uses the shader.
     *
     * @param {GLShader} shader - the shader to use
     */
    init_vao(shader) {
        this.vao.clear()
            .add_index(this.index_buffer)
            .add_attribute(this.vertex_buffer, shader.attributes.a_vertex_position, this.gl.FLOAT, false, 4 * 4, 0)
            .add_attribute(this.vertex_buffer, shader.attributes.a_texture_coord, this.gl.FLOAT, false, 4 * 4, 2 * 4)
    }

    /**
     * Maps two Rectangle to the quad.
     *
     * @param {Rectangle} target_texture_frame - the first rectangle
     * @param {Rectangle} destination_frame - the second rectangle
     */
    map(target_texture_frame, destination_frame) {
        let x = 0; // destinationFrame.x / targetTextureFrame.width;
        let y = 0; // destinationFrame.y / targetTextureFrame.height;

        this.uvs[0] = x;
        this.uvs[1] = y;

        this.uvs[2] = x + (destination_frame.width / target_texture_frame.width);
        this.uvs[3] = y;

        this.uvs[4] = x + (destination_frame.width / target_texture_frame.width);
        this.uvs[5] = y + (destination_frame.height / target_texture_frame.height);

        this.uvs[6] = x;
        this.uvs[7] = y + (destination_frame.height / target_texture_frame.height);

        x = destination_frame.x;
        y = destination_frame.y;

        this.vertices[0] = x;
        this.vertices[1] = y;

        this.vertices[2] = x + destination_frame.width;
        this.vertices[3] = y;

        this.vertices[4] = x + destination_frame.width;
        this.vertices[5] = y + destination_frame.height;

        this.vertices[6] = x;
        this.vertices[7] = y + destination_frame.height;

        return this;
    }

    /**
     * Binds the buffer and uploads the data
     */
    upload() {
        for (let i = 0; i < 4; i++) {
            this.interleaved[i * 4] = this.vertices[(i * 2)];
            this.interleaved[(i * 4) + 1] = this.vertices[(i * 2) + 1];
            this.interleaved[(i * 4) + 2] = this.uvs[i * 2];
            this.interleaved[(i * 4) + 3] = this.uvs[(i * 2) + 1];
        }

        this.vertex_buffer.upload(this.interleaved);

        return this;
    }

    /**
     * Removes this quad from WebGL
     */
    destroy() {
        const gl = this.gl;

        gl.deleteBuffer(this.vertex_buffer);
        gl.deleteBuffer(this.index_buffer);
    }
}
