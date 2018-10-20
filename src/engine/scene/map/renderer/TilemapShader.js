import Shader from 'engine/Shader';

import { fill_samplers } from './shader_gen';

export default class TilemapShader extends Shader {
    constructor(gl, max_textures, shader_vert, shader_frag) {
        super(gl,
            shader_vert,
            shader_frag
        );

        this.max_textures = max_textures;
        this.index_buffer = null;

        fill_samplers(this, this.max_textures);
    }
}
