import { VSG } from 'engine/servers/visual/visual_server_globals';

import vs from './blur.vert';
import fs from './blur.frag';

export const BLUR_SHADER_DEF = {
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

/**
 * @param {number} condition
 */
function get_shader_def_code(condition) {
    let code = '';
    for (let k in BLUR_SHADER_DEF) {
        if ((condition & BLUR_SHADER_DEF[k]) === BLUR_SHADER_DEF[k]) {
            code += `#define ${k}\n`;
        }
    }
    return code;
}

export class EffectBlurShader {
    constructor() {
        this.conditional = 0;

        this.base = VSG.storage.shader_create(vs, fs, [
            'vertex_attrib',
            'uv_attrib',
        ], [
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
        ])

        /** @type {string[]} */
        this.textures = [
            'source_color',
            'dof_source_depth',
        ];

        this.current = this.base;
    }

    bind() {
        const gl = VSG.storage.gl;

        this.current = VSG.storage.shader_get_instance_with_defines(this.base, this.conditional, get_shader_def_code(this.conditional));
        let gl_prog = this.current.gl_prog;

        gl.useProgram(gl_prog);

        // bind texture locations
        for (let i = 0; i < this.textures.length; i++) {
            let u = this.current.uniforms[this.textures[i]];
            if (!u.gl_loc) {
                u.gl_loc = gl.getUniformLocation(gl_prog, this.textures[i]);
            }
            gl.uniform1i(u.gl_loc, i);
        }
    }

    /**
     * @param {string} name
     * @param {number} value
     */
    set_uniform1i(name, value) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform1i(u.gl_loc, value);
        }
    }
    /**
     * @param {string} name
     * @param {number} value
     */
    set_uniform1f(name, value) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform1f(u.gl_loc, value);
        }
    }
    /**
     * @param {string} name
     * @param {number} x
     * @param {number} y
     */
    set_uniform2f(name, x, y) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform2f(u.gl_loc, x, y);
        }
    }
    /**
     * @param {string} name
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set_uniform3f(name, x, y, z) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform3f(u.gl_loc, x, y, z);
        }
    }
    /**
     * @param {string} name
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} w
     */
    set_uniform4f(name, x, y, z, w) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform4f(u.gl_loc, x, y, z, w);
        }
    }

    /**
     * @param {number} p_conditional
     * @param {boolean} p_enabled
     */
    set_conditional(p_conditional, p_enabled) {
        if (p_enabled) {
            this.conditional |= p_conditional;
        } else {
            this.conditional &= ~p_conditional;
        }
    }
}
