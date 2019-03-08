import GLBuffer from 'engine/drivers/webgl/gl_buffer';
import GLShader from 'engine/drivers/webgl/gl_shader';
import VertexArrayObject from 'engine/drivers/webgl/vao';
import WebGLRenderer from 'engine/servers/visual/webgl_renderer';

import { fill_samplers } from './shader_gen';

export default class TilemapShader extends GLShader {
    /**
     * @param {WebGLRenderingContext} gl
     * @param {number} max_textures
     * @param {string} shader_vert
     * @param {string} shader_frag
     */
    constructor(gl, max_textures, shader_vert, shader_frag) {
        super(gl, shader_vert, shader_frag);

        this.max_textures = max_textures;
        this.index_buffer = null;

        fill_samplers(this, this.max_textures);
    }

    /**
     * @param {WebGLRenderer} renderer
     * @param {GLBuffer} vb
     * @returns {VertexArrayObject}
     */
    create_vao(renderer, vb) { return null }
}
