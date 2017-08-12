import Shader from '../../../Shader';

import { fillSamplers } from './shader_gen';


export default class TilemapShader extends Shader {
    constructor(gl, maxTextures, shaderVert, shaderFrag) {
        super(gl,
            shaderVert,
            shaderFrag
        );

        this.maxTextures = maxTextures;
        this.indexBuffer = null;

        fillSamplers(this, this.maxTextures);
    }

    createVao(renderer, vb) {}
}
