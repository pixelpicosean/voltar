import WebGLRenderer from 'engine/servers/visual/webgl_renderer';
import GLBuffer from 'engine/drivers/webgl/gl_buffer';

import TilemapShader from './tilemap_shader';

import { generate_fragment_src, fill_samplers } from './shader_gen';

import rect_shader_vert from './rect.vert';
import rect_shader_frag from './rect.frag';

export default class RectTileShader extends TilemapShader {
    /**
     * @param {WebGLRenderingContext} gl
     * @param {number} max_textures
     */
    constructor(gl, max_textures) {
        super(gl,
            max_textures,
            rect_shader_vert,
            generate_fragment_src(max_textures, rect_shader_frag)
        );

        this.vert_size = 9;
        this.vert_per_quad = 4;
        this.stride = this.vert_size * 4;

        fill_samplers(this, this.max_textures);
    }

    /**
     * @param {WebGLRenderer} renderer
     * @param {GLBuffer} vb
     */
    createVao(renderer, vb) {
        var gl = renderer.gl;
        return renderer.create_vao()
            .add_index(this.index_buffer)
            .add_attribute(vb, this.attributes.a_vertex_position, gl.FLOAT, false, this.stride, 0)
            .add_attribute(vb, this.attributes.a_texture_coord, gl.FLOAT, false, this.stride, 2 * 4)
            .add_attribute(vb, this.attributes.a_frame, gl.FLOAT, false, this.stride, 4 * 4)
            .add_attribute(vb, this.attributes.a_texture_id, gl.FLOAT, false, this.stride, 8 * 4)
    }
}
