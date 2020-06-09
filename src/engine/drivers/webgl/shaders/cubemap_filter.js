import { Shader } from '../shader';

import vs from './cubemap_filter.vert';
import fs from './cubemap_filter.frag';

export class CubemapFilterShader extends Shader {
    constructor() {
        super(
            vs, fs,
            [
                { name: 'vertex',   loc: 0 },
                { name: 'uv',       loc: 4 },
            ],
            [
                { name: 'face_id',                      type: '1i' },
                { name: 'roughness',                    type: '1f' },

                { name: 'source_panorama',              type: '1i' },
                { name: 'source_cube',                  type: '1i' },
                { name: 'radical_inverse_vdc_cache',    type: '1i' },
            ],
            [
                'source_panorama',
                'source_cube',
                'radical_inverse_vdc_cache',
            ],
            [
                'USE_SOURCE_PANORAMA',
                'LOW_QUALITY',
                'USE_DIRECT_WRITE',
            ]
        );
    }
}
