import { VSG } from "engine/servers/visual/visual_server_globals";

export class Shader {
    /**
     * @param {string} vs
     * @param {string} fs
     * @param {string[]} attribs
     * @param {{ name: string, type: UniformTypes }[]} uniforms
     * @param {string[]} textures
     * @param {{ [condition: string]: number }} defines
     */
    constructor(vs, fs, attribs, uniforms, textures, defines) {
        this.conditional = 0;

        this.base = VSG.storage.shader_create(vs, fs, attribs, uniforms)

        /** @type {string[]} */
        this.textures = textures;

        /** @type {{ [condition: string]: number }} */
        this.defines = defines;

        this.current = this.base;
    }

    bind() {
        const gl = VSG.storage.gl;

        this.current = VSG.storage.shader_get_instance_with_defines(this.base, this.conditional, this.get_def_code(this.conditional));
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
     * @param {number} x
     * @param {number} y
     */
    set_uniform2i(name, x, y) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform2i(u.gl_loc, x, y);
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
