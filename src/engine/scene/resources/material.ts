import { res_class_map } from "engine/registry";
import { VSG } from "engine/servers/visual/visual_server_globals";

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

    uniforms: { name: string; type: UniformTypes; value?: any }[] = [];
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
        if (data.shader) {
            this.set_shader(
                data.shader.shader_type,
                data.shader.uniforms,
                data.shader.global_code,
                data.shader.vs_code,
                data.shader.vs_uniform_code,
                data.shader.fs_code,
                data.shader.fs_uniform_code,
                data.shader.lt_code
            );
        }

        return this;
    }

    set_shader(type: string, uniforms: { name: string, type: UniformTypes, value: any }[], global_code: string, vertex: string, vertex_uniform_code: string, fragment: string, fragment_uniform_code: string, light: string) {
        this.shader_type = type;

        this.uses_screen_texture = fragment.includes("SCREEN_TEXTURE");
        this.uses_custom_light = !!light;

        if (uniforms && uniforms.length > 0) {
            this.uniforms = uniforms;
            for (let u of this.uniforms) {
                if (!Array.isArray(u.value)) {
                    this.texture_hints[u.name] = u.value;
                }
            }
        }

        // code
        this.global_code = global_code || "";

        this.vs_code = vertex || "";
        this.vs_uniform_code = vertex_uniform_code || "";

        this.fs_code = fragment || "";
        this.fs_uniform_code = fragment_uniform_code || "";

        this.lt_code = light || "";
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
