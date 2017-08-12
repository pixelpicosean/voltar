import TilemapShader from './TilemapShader';

import { GLBuffer, VertexArrayObject } from 'pixi-gl-core';

import { generateFragmentSrc, fillSamplers } from './shader_gen';

import rectShaderVert from './rect.vert';
import rectShaderFrag from './rect.frag';


export default class RectTileShader extends TilemapShader {
    constructor(gl, maxTextures) {
        super(gl,
            maxTextures,
            rectShaderVert,
            generateFragmentSrc(maxTextures, rectShaderFrag)
        );

        this.vertSize = 11;
        this.vertPerQuad = 4;
        this.stride = this.vertSize * 4;

        fillSamplers(this, this.maxTextures);
    }

    createVao(renderer, vb) {
        var gl = renderer.gl;
        return renderer.createVao()
            .addIndex(this.indexBuffer)
            .addAttribute(vb, this.attributes.aVertexPosition, gl.FLOAT, false, this.stride, 0)
            .addAttribute(vb, this.attributes.aTextureCoord, gl.FLOAT, false, this.stride, 2 * 4)
            .addAttribute(vb, this.attributes.aFrame, gl.FLOAT, false, this.stride, 4 * 4)
            .addAttribute(vb, this.attributes.aAnim, gl.FLOAT, false, this.stride, 8 * 4)
            .addAttribute(vb, this.attributes.aTextureId, gl.FLOAT, false, this.stride, 10 * 4);
    }
}
