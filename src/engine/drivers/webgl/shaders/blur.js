import { Shader } from '../shader.js';

import vs from './blur.vert';
import fs from './blur.frag';

export class EffectBlurShader extends Shader {
    constructor() {
        super(
            vs, fs,
            [
                { name: 'vertex_attrib',    loc: 0 },
                { name: 'uv_attrib',        loc: 1 },
            ],
            [
                { name: 'blur_section',         type: '4f' },
                { name: 'source_color',         type: '1i' },
                { name: 'lod',                  type: '1f' },
                { name: 'pixel_size',           type: '2f' },
                { name: 'glow_strength',        type: '1f' },
                { name: 'dof_source_depth',     type: '1i' },
                { name: 'dof_begin',            type: '1f' },
                { name: 'dof_end',              type: '1f' },
                { name: 'dof_dir',              type: '2f' },
                { name: 'dof_radius',           type: '1f' },
                { name: 'luminance_cap',        type: '1f' },
                { name: 'glow_bloom',           type: '1f' },
                { name: 'glow_hdr_threshold',   type: '1f' },
                { name: 'glow_hdr_scale',       type: '1f' },
                { name: 'camera_z_far',         type: '1f' },
                { name: 'camera_z_near',        type: '1f' },
            ],
            [
                'source_color',
                'dof_source_depth',
            ],
            [
                'USE_BLUR_SECTION',
                'DOF_QUALITY_LOW',
                'DOF_QUALITY_MEDIUM',
                'DOF_QUALITY_HIGH',
                'GLOW_FIRST_PASS',
                'GLOW_GAUSSIAN_HORIZONTAL',
                'GLOW_GAUSSIAN_VERTICAL',
                'DOF_FAR_BLUR',
                'USE_ORTHOGONAL_PROJECTION',
                'DOF_NEAR_BLUR',
                'DOF_NEAR_FIRST_TAP',
            ]
        );
    }
}
