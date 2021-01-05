import { remove_item } from "engine/dep/index";
import { VSG } from "engine/servers/visual/visual_server_globals";

type Shader_t = import("engine/drivers/webgl/rasterizer_storage").Shader_t;

export class Shader {
    textures: string[];

    conditions = <number[]>[];
    defines: { [name: string]: number };
    define_names: { [value: number]: string };

    base: Shader_t;
    current: Shader_t;

    constructor(vs: string, fs: string, attribs: AttribDesc[], uniforms: UniformDesc[], textures: string[], defines: string[]) {
        this.base = VSG.storage.shader_create(vs, fs, attribs, uniforms)

        this.textures = textures;

        this.defines = Object.create(null);
        this.define_names = Object.create(null);
        for (let i = 0; i < defines.length; i++) {
            this.defines[defines[i]] = i;
            this.define_names[i] = defines[i];
        }

        this.current = this.base;
    }

    bind() {
        const gl = VSG.storage.gl;

        this.current = VSG.storage.shader_get_instance_with_defines(this.base, this.conditions, this.get_def_code(this.conditions));
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

    set_uniform(name: string, values: number[] | Float32Array) {
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

    set_uniform_int(name: string, value: number) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform1i(u.gl_loc, value);
        }
    }
    set_uniform_ivec2(name: string, x: number, y: number) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform2i(u.gl_loc, x, y);
        }
    }
    set_uniform_float(name: string, value: number) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform1f(u.gl_loc, value);
        }
    }
    set_uniform_vec2(name: string, x: number, y: number) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform2f(u.gl_loc, x, y);
        }
    }
    set_uniform_vec3(name: string, x: number, y: number, z: number) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform3f(u.gl_loc, x, y, z);
        }
    }
    set_uniform_vec4(name: string, x: number, y: number, z: number, w: number) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniform4f(u.gl_loc, x, y, z, w);
        }
    }

    set_uniform_mat3(name: string, values: number[] | Float32Array) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniformMatrix3fv(u.gl_loc, false, values);
        }
    }

    set_uniform_mat4(name: string, values: number[] | Float32Array) {
        let u = this.current.uniforms[name];
        if (u && u.gl_loc) {
            VSG.storage.gl.uniformMatrix4fv(u.gl_loc, false, values);
        }
    }

    set_conditional(p_condition: string, p_enabled: boolean) {
        if (p_enabled) {
            add_to_condition(this.conditions, p_condition, this.defines);
        } else {
            remove_from_condition(this.conditions, p_condition, this.defines);
        }
    }

    get_def_code(conditions: number[]) {
        let code = '';
        for (let c of conditions) {
            code += `#define ${this.define_names[c]}\n`;
        }
        return code;
    }
}

function add_to_condition(conditions: number[], name: keyof typeof defines, defines: { [name: string]: number }): number[] {
    let value = defines[name];

    // already enabled
    if (conditions.indexOf(value) >= 0) {
        return conditions;
    }

    if (conditions.length === 0) {
        conditions.push(value);
    } else {
        if (value < conditions[0]) {
            conditions.unshift(value);
        } else {
            for (let i = 0; i < conditions.length; i++) {
                if (value > conditions[i]) {
                    conditions.splice(i + 1, 0, value);
                    break;
                }
            }
        }
    }

    return conditions;
}

function remove_from_condition(conditions: number[], name: keyof typeof defines, defines: { [name: string]: number }): number[] {
    let value = defines[name];

    let idx = conditions.indexOf(value);
    if (idx >= 0) remove_item(conditions, idx);

    return conditions;
}
