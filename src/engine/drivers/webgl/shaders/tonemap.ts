import { Shader } from '../shader';

import vs from './tonemap.vert';
import fs from './tonemap.frag';

export class TonemapShader extends Shader {
    constructor() {
        super(
            vs, fs,
            [
                { name: 'vertex_attrib',    loc: 0 },
                { name: 'uv_in',            loc: 4 },
            ],
            [
                { name: 'pixel_size',       type: '2f' },

                { name: 'source',           type: '1i' },
            ],
            [
                'source',
            ],
            [
                'USE_FXAA',
            ]
        );
    }
}
