import TilemapShader from './TilemapShader';

import { GLBuffer, VertexArrayObject } from 'pixi-gl-core';

import { generateFragmentSrc, fillSamplers } from './shader_gen';

import squareShaderVert from './square.vert';
import squareShaderFrag from './square.frag';


export default class SquareTileShader extends TilemapShader {
    constructor(gl, maxTextures) {
        super(gl,
            maxTextures,
            squareShaderVert,
            generateFragmentSrc(maxTextures, squareShaderFrag)
        );

        this.vertSize = 8;
        this.vertPerQuad = 1;
        this.stride = this.vertSize * 4;

        this.indexBuffer = null;

        this.maxTextures = maxTextures;
        fillSamplers(this, this.maxTextures);
    }

    createVao(renderer, vb) {
        var gl = renderer.gl;
        return renderer.createVao()
            .addIndex(this.indexBuffer)
            .addAttribute(vb, this.attributes.aVertexPosition, gl.FLOAT, false, this.stride, 0)
            .addAttribute(vb, this.attributes.aTextureCoord, gl.FLOAT, false, this.stride, 2 * 4)
            .addAttribute(vb, this.attributes.aSize, gl.FLOAT, false, this.stride, 4 * 4)
            .addAttribute(vb, this.attributes.aAnim, gl.FLOAT, false, this.stride, 5 * 4)
            .addAttribute(vb, this.attributes.aTextureId, gl.FLOAT, false, this.stride, 7 * 4);
    };
}
