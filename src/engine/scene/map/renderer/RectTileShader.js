import TilemapShader from './TilemapShader';

import { generate_fragment_src, fill_samplers } from './shader_gen';

import rect_shader_vert from './rect.vert';
import rect_shader_frag from './rect.frag';

export default class RectTileShader extends TilemapShader {
    constructor(gl, max_textures) {
        super(gl,
            max_textures,
            rect_shader_vert,
            generate_fragment_src(max_textures, rect_shader_frag)
        );

        this.vertSize = 9;
        this.vertPerQuad = 4;
        this.stride = this.vertSize * 4;

        fill_samplers(this, this.max_textures);
    }

    createVao(renderer, vb) {
        var gl = renderer.gl;
        return renderer.createVao()
            .addIndex(this.index_buffer)
            .addAttribute(vb, this.attributes.aVertexPosition, gl.FLOAT, false, this.stride, 0)
            .addAttribute(vb, this.attributes.aTextureCoord, gl.FLOAT, false, this.stride, 2 * 4)
            .addAttribute(vb, this.attributes.aFrame, gl.FLOAT, false, this.stride, 4 * 4)
            .addAttribute(vb, this.attributes.aTextureId, gl.FLOAT, false, this.stride, 8 * 4);
    }
}
