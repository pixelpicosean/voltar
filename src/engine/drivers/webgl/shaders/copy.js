import { Shader } from '../shader.js';

import vs from './copy.vert';
import fs from './copy.frag';

export class CopyShader extends Shader {
    constructor() {
        super(
            vs, fs,
            [
                { name: 'vertex_attrib',    loc: 0 },
                { name: 'cube_in',          loc: 4 },
                { name: 'uv_in',            loc: 4 },
            ],
            [
                { name: 'copy_section',         type: '4f' },
                { name: 'display_transform',    type: 'mat4' },
                { name: 'multiplier',           type: '1f' },
                { name: 'custom_alpha',         type: '1f' },
                { name: 'sky_transform',        type: 'mat4' },

                { name: 'source_cube',          type: '1i' },
                { name: 'source',               type: '1i' },
                { name: 'CbCr',                 type: '1i' },
            ],
            [
                'source_cube',
                'source',
                'CbCr',
            ],
            [
                'USE_CUBEMAP',
                'USE_PANORAMA',
                'USE_COPY_SECTION',
                'USE_DISPLAY_TRANSFORM',
                'SEP_CBCR_TEXTURE',
                'USE_MULTIPLIER',
                'USE_CUSTOM_ALPHA',
                'USE_NO_ALPHA',
                'YCBCR_TO_RGB',
            ]
        );
    }
}
