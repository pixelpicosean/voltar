import { res_class_map } from "engine/registry";
import { VSG } from "engine/servers/visual/visual_server_globals";
import { parse_shader_code } from "engine/drivers/webgl/shader_parser";

type Texture_t = import('engine/drivers/webgl/rasterizer_storage').Texture_t;
type Material_t = import('engine/drivers/webgl/rasterizer_storage').Material_t;

let mat_uid = 0;
export class Material {
    get class() { return "Material" }

    id = mat_uid++;

    name = '';

    material: Material_t = null;
    next_pass: Material = null;
    render_priority = 0;
}


let noname_uid = 0;
export class ShaderMaterial extends Material {
    get class() { return "ShaderMaterial" }

    /** @type {string} */
    shader_type: string = "canvas_item";

    uses_screen_texture = false;
    uses_custom_light = false;

    uniforms: { name: string; type: UniformTypes; value?: number[] | Texture_t; }[] = [];
    texture_hints: { [name: string]: Texture_t; } = {};

    vs_code = "";
    vs_uniform_code = "";

    fs_code = "";
    fs_uniform_code = "";

    lt_code = "";
    global_code = "";

    constructor(name?: string) {
        super();

        if (!name) {
            name = `noname[${noname_uid++}]`;
        }
        this.name = name;

    }
    _load_data(data: any) {
        if (data.shader && data.shader.code) {
            this.set_shader(data.shader.code);
        }

        return this;
    }

    set_shader(code: string) {
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
    _load_data(data: any) {
        /** @type {Set<string>} */
        let features: Set<string> = new Set;

        let params: { [name: string]: number[] } = Object.create(null);
        let textures: { [name: string]: Texture_t } = Object.create(null);

        for (let k in data) {
            let v = data[k];
            switch (k) {
                // general
                case 'metallic_specular': {
                    params['m_specular'] = [v];
                } break;
                case 'metallic': {
                    params['m_metallic'] = [v];
                } break;
                case 'roughness': {
                    params['m_roughness'] = [v];
                } break;

                // albedo
                case 'albedo_color': {
                    params['m_albedo'] = [v.r, v.g, v.b, v.a];
                    features.add('albedo');
                } break;
                case 'albedo_texture': {
                    textures['m_texture_albedo'] = v.texture;
                    features.add('albedo');
                } break;

                // emission
                case 'emission_enabled': {
                    features.add('emission');
                } break;
                case 'emission': {
                    params['m_emission'] = [v.r, v.g, v.b, v.a];
                } break;
                case 'emission_energy': {
                    params['m_emission_energy'] = [v];
                } break;
                case 'emission_operator': {
                    params['m_emission_operator'] = [v];
                } break;
                case 'emission_texture': {
                    textures['m_texture_emission'] = v.texture;
                } break;

                // rim
                case 'rim_enabled': {
                    features.add('rim');
                } break;
                case 'rim': {
                    params['m_rim'] = [v];
                } break;
                case 'rim_tint': {
                    params['m_rim_tint'] = [v];
                } break;
                case 'rim_texture': {
                    textures['m_texture_rim'] = v.texture;
                } break;
            }
        }

        this.material = VSG.scene_render.metarial_instance_create({
            diffuse: data.diffuse || 0,
            specular: data.specular || 0,

            spatial: data.spatial || Object.create(null),
            conditions: data.conditions || [],

            features: [...features],

            params,
            textures,
        });

        return this;
    }
}
res_class_map['SpatialMaterial'] = SpatialMaterial;
