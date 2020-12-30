import { VSG } from "engine/servers/visual/visual_server_globals";

export class Shader {
    /**
     * @param {string} vs
     * @param {string} fs
     * @param {AttribDesc[]} attribs
     * @param {UniformDesc[]} uniforms
     * @param {string[]} textures
     * @param {string[]} defines
     */
    constructor(vs, fs, attribs, uniforms, textures, defines) {
        this.conditional = 0;

        this.base = VSG.storage.shader_create(vs, fs, attribs, uniforms)

        /** @type {string[]} */
        this.textures = textures;

        /** @type {{ [condition: string]: number }} */
        this.defines = defines.reduce((map, def, idx) => {
            map[def] = 1 << idx;
            return map;
        }, { });

        this.current = this.base;
    }

    bind() {
        const gl = VSG.storage.gl;

        this.current = VSG.storage.shader_get_instance_with_defines(this.base, this.conditional, this.get_def_code(this.conditional));
        let gl_prog = this.current.gl_prog;

        gl.useProgram(gl_prog);

        // bind texture locations
        for (let i = 0, idx = 0; i < this.textures.length; i++) {
            let u = this.current.uniforms[this.textures[i]];
            if (!u) continue;

            if (!u.gl_loc) {
                u.gl_loc = gl.getUniformLocation(gl_prog, this.textures[i]);
            }
            gl.uniform1i(u.gl_loc, idx++);
        }
    }

    /**
     * @param {string} name
     * @param {number[] | Float32Array} values
     */
    set_uniform(name, values) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            switch (u.type) {
                case "1i": VSG.storage.gl.uniform1iv(u.gl_loc, values); break;
                case "2i": VSG.storage.gl.uniform2iv(u.gl_loc, values); break;

                case "1f": VSG.storage.gl.uniform1fv(u.gl_loc, values); break;
                case "2f": VSG.storage.gl.uniform2fv(u.gl_loc, values); break;
                case "3f": VSG.storage.gl.uniform3fv(u.gl_loc, values); break;
                case "4f": VSG.storage.gl.uniform4fv(u.gl_loc, values); break;

                case "mat3": VSG.storage.gl.uniformMatrix3fv(u.gl_loc, false, values); break;
                case "mat4": VSG.storage.gl.uniformMatrix4fv(u.gl_loc, false, values); break;
            }
        }
    }

    /**
     * @param {string} name
     * @param {number} value
     */
    set_uniform_int(name, value) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform1i(u.gl_loc, value);
        }
    }
    /**
     * @param {string} name
     * @param {number} x
     * @param {number} y
     */
    set_uniform_ivec2(name, x, y) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform2i(u.gl_loc, x, y);
        }
    }
    /**
     * @param {string} name
     * @param {number} value
     */
    set_uniform_float(name, value) {
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
    set_uniform_vec2(name, x, y) {
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
    set_uniform_vec3(name, x, y, z) {
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
    set_uniform_vec4(name, x, y, z, w) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform4f(u.gl_loc, x, y, z, w);
        }
    }

    /**
     * @param {string} name
     * @param {number[] | Float32Array} values
     */
    set_uniform_mat3(name, values) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniformMatrix3fv(u.gl_loc, false, values);
        }
    }

    /**
     * @param {string} name
     * @param {number[] | Float32Array} values
     */
    set_uniform_mat4(name, values) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniformMatrix4fv(u.gl_loc, false, values);
        }
    }

    /**
     * @param {string} p_conditional
     * @param {boolean} p_enabled
     */
    set_conditional(p_conditional, p_enabled) {
        if (p_enabled) {
            this.conditional |= this.defines[p_conditional];
        } else {
            this.conditional &= ~this.defines[p_conditional];
        }
    }

    /**
     * @param {number} condition
     */
    get_def_code(condition) {
        let code = '';
        for (let k in this.defines) {
            if ((condition & this.defines[k]) === this.defines[k]) {
                code += `#define ${k}\n`;
            }
        }
        return code;
    }
}
