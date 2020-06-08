import { Shader } from '../shader';

import vs from './blur.vert';
import fs from './blur.frag';

export class EffectBlurShader extends Shader {
    constructor() {
        super(
            vs, fs,
            [
                'vertex_attrib',
                'uv_attrib',
            ],
            [
                { name: 'blur_section', type: '4f' },
                { name: 'source_color', type: '1i' },
                { name: 'lod', type: '1f' },
                { name: 'pixel_size', type: '2f' },
                { name: 'glow_strength', type: '1f' },
                { name: 'dof_source_depth', type: '1i' },
                { name: 'dof_begin', type: '1f' },
                { name: 'dof_end', type: '1f' },
                { name: 'dof_dir', type: '2f' },
                { name: 'dof_radius', type: '1f' },
                { name: 'luminance_cap', type: '1f' },
                { name: 'glow_bloom', type: '1f' },
                { name: 'glow_hdr_threshold', type: '1f' },
                { name: 'glow_hdr_scale', type: '1f' },
                { name: 'camera_z_far', type: '1f' },
                { name: 'camera_z_near', type: '1f' },
            ],
            [
                'source_color',
                'dof_source_depth',
            ],
            {
                USE_BLUR_SECTION:           1 << 0,
                DOF_QUALITY_LOW:            1 << 1,
                DOF_QUALITY_MEDIUM:         1 << 2,
                DOF_QUALITY_HIGH:           1 << 3,
                GLOW_FIRST_PASS:            1 << 4,
                GLOW_GAUSSIAN_HORIZONTAL:   1 << 5,
                GLOW_GAUSSIAN_VERTICAL:     1 << 6,
                DOF_FAR_BLUR:               1 << 7,
                USE_ORTHOGONAL_PROJECTION:  1 << 8,
                DOF_NEAR_BLUR:              1 << 9,
                DOF_NEAR_FIRST_TAP:         1 << 10,
            }
        );
    }
}
