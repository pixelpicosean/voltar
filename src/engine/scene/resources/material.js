import { res_class_map } from "engine/registry";
import { VSG } from "engine/servers/visual/visual_server_globals";
import { parse_shader_code } from "engine/drivers/webgl/shader_parser";

/**
 * @typedef {import('engine/drivers/webgl/rasterizer_storage').Material_t} Material_t
 * @typedef {import('engine/drivers/webgl/rasterizer_storage').Texture_t} Texture_t
 * @typedef {import('engine/drivers/webgl/rasterizer_storage').UniformTypes} UniformTypes
 */

let mat_uid = 0;
export class Material {
    get class() { return "Material" }

    constructor() {
        this.id = mat_uid++;

        this.name = '';

        /** @type {Material_t} */
        this.material = null;
        /** @type {Material} */
        this.next_pass = null;
        this.render_priority = 0;
    }
}


let noname_uid = 0;
export class ShaderMaterial extends Material {
    get class() { return "ShaderMaterial" }

    /**
     * @param {string} [name]
     */
    constructor(name) {
        super();

        if (!name) {
            name = `noname[${noname_uid++}]`;
        }
        this.name = name;

        /** @type {string} */
        this.shader_type = "canvas_item";

        this.uses_screen_texture = false;
        this.uses_custom_light = false;

        /** @type {{ name: string, type: UniformTypes, value?: number[] | Texture_t }[]} */
        this.uniforms = [];
        /** @type {{ [name: string]: Texture_t }} */
        this.texture_hints = {};

        this.vs_code = "";
        this.vs_uniform_code = "";

        this.fs_code = "";
        this.fs_uniform_code = "";

        this.lt_code = "";
        this.global_code = "";
    }
    _load_data(data) {
        if (data.shader && data.shader.code) {
            this.set_shader(data.shader.code);
        }

        return this;
    }

    /**
     * @param {string} code
     */
    set_shader(code) {
        const parsed_code = parse_shader_code(code);

        this.shader_type = parsed_code.type;

        this.uses_screen_texture = parsed_code.uses_screen_texture;
        this.uses_custom_light = parsed_code.uses_custom_light;

        this.uniforms = parsed_code.uniforms;
        for (let u of this.uniforms) {
            if (!Array.isArray(u.value)) {
                this.texture_hints[u.name] = u.value;
            }
        }

        this.vs_code = parsed_code.vs_code;
        this.vs_uniform_code = parsed_code.vs_uniform_code;

        this.fs_code = parsed_code.fs_code;
        this.fs_uniform_code = parsed_code.fs_uniform_code;

        this.lt_code = parsed_code.lt_code;
        this.global_code = parsed_code.global_code;
    }
}
res_class_map['ShaderMaterial'] = ShaderMaterial;

export const CANVAS_ITEM_SHADER_UNIFORMS = [
    { name: 'projection_matrix', type: 'mat4' },

    { name: 'TIME', type: '1f' },
    { name: 'TEXTURE', type: '1i' },
    { name: 'SCREEN_TEXTURE', type: '1i' },
    { name: 'SCREEN_PIXEL_SIZE', type: '2f' },
]

export class SpatialMaterial extends Material {
    constructor() {
        super();

        this.material = VSG.scene_render.spatial_material.rid.clone();
    }
    /**
     * @param {any} data
     */
    _load_data(data) {
        for (let k in data) {
            let v = data[k];
            switch (k) {
                case 'albedo_color': {
                    this.material.params['albedo'] = [v.r, v.g, v.b, v.a];
                } break;
                case 'metallic_specular': {
                    this.material.params['specular'] = [v];
                } break;
                case 'metallic': {
                    this.material.params['metallic'] = [v];
                } break;
                case 'roughness': {
                    this.material.params['roughness'] = [v];
                } break;

                case 'albedo_texture': {
                    this.material.textures['texture_albedo'] = v.texture;
                } break;
            }
        }

        return this;
    }
}
res_class_map['SpatialMaterial'] = SpatialMaterial;
