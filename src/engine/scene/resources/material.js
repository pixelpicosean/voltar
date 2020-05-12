import { res_class_map } from "engine/registry";
import { VSG } from "engine/servers/visual/visual_server_globals";

/**
 * @typedef {import('engine/drivers/webgl/rasterizer_storage').Material_t} Material_t
 * @typedef {import('engine/drivers/webgl/rasterizer_storage').Texture_t} Texture_t
 * @typedef {import('engine/drivers/webgl/rasterizer_storage').UniformTypes} UniformTypes
 */

export class Material {
    get class() { return "Material" }

    constructor() {
        /** @type {Material_t} */
        this.material = null;
        /** @type {Material} */
        this.next_pass = null;
        this.render_priority = 0;

        this.materials = {
            /* 2D */

            /** @type {Material_t} */
            flat: null,
            /** @type {Material_t} */
            tile: null,
            /** @type {Material_t} */
            multimesh: null,

            /* 3D */

            /** @type {Material_t} */
            spatial: null,
        };
    }
}


const UNIFORM_PRECISIONS = ["lowp", "mediump", "highp"];
/** @type {{ [key: string]: string }} */
const UNIFORM_TYPES = {
    "float": "1f",
    "vec2": "2f",
    "vec3": "3f",
    "vec4": "4f",
    "mat3": "mat3",
    "mat4": "mat4",
    "sampler2D": "1i",
}

/**
 * @param {string} code
 */
function parse_value(code) {
    let idx = code.indexOf("(");
    if (idx >= 0) {
        return code.substring(idx + 1, code.lastIndexOf(")")).split(",")
            .map(parseFloat);
    } else {
        return [parseFloat(code)];
    }
}

/**
 * @param {string} code
 */
function parse_uniform(code) {
    let tokens = code.split(' ');
    let idx = 1;

    // precision
    let precision = UNIFORM_PRECISIONS.indexOf(tokens[idx]) >= 0 ? tokens[idx] : "";
    idx += precision ? 1 : 0;

    // type
    let type_str = tokens[idx];
    let type = UNIFORM_TYPES[type_str];
    idx += 1;

    // name
    let name = tokens[idx].replace(';', '');

    // default value
    let value = null;
    let value_match = code.match(/=[ ]{0,}([\s\S]*?);/);
    if (value_match) {
        value = parse_value(value_match[1]);
    }

    // texture value hint
    if (type_str === "sampler2D") {
        if (code.includes("hint_white")) {
            value = VSG.storage.resources.white_tex.texture;
        } else if (code.includes("hint_black")) {
            value = VSG.storage.resources.black_tex.texture;
        }
    }

    return {
        type,
        name,
        precision,
        value,
        code: `uniform ${precision} ${type_str} ${name};`
            .replace(/ +/, ' '), // multi space to single
    }
}

/**
 * Rules:
 * 1. vertex entry has to be: "void vertex()"
 * 2. fragment entry has to be: "void fragment()"
 * 3. vertex always on top and fragment on bottom if both exist
 * @param {string} code
 */
function parse_shader_code(code) {
    const vs_start = code.indexOf("void vertex()");
    const fs_start = code.indexOf("void fragment()");

    let type_match = code.match(/shader_type\s*=\s*(canvas_item|spatial);/);
    let type = type_match ? type_match[1] : "canvas_item";

    let uses_screen_texture = code.indexOf("SCREEN_TEXTURE") >= 0;

    // uniform
    let uniforms = [];
    let uniform_lines = code.match(/uniform([\s\S]*?);/gm);
    if (uniform_lines) {
        uniforms = uniform_lines.map(parse_uniform);
    }

    // vertex
    let vs_code = "";
    if (vs_start >= 0) {
        vs_code = (fs_start >= 0) ? code.substring(vs_start, fs_start) : code.substring(vs_start);

        // remove entry and its brackets
        vs_code = vs_code.substring(vs_code.indexOf("{") + 1, vs_code.lastIndexOf("}")).trim();
    }
    let vs_uniform_code = uniforms.filter(({ name }) => vs_code.indexOf(name) >= 0)
        .map(({ code }) => code)
        .join("\n")

    // fragment
    let fs_code = "";
    if (fs_start >= 0) {
        fs_code = code.substring(fs_start);

        // remove entry and its brackets
        fs_code = fs_code.substring(fs_code.indexOf("{") + 1, fs_code.lastIndexOf("}")).trim();
    }
    let fs_uniform_code = uniforms.filter(({ name }) => fs_code.indexOf(name) >= 0)
        .map(({ code }) => code)
        .join("\n")

    return {
        type,
        uses_screen_texture,
        vs_code, vs_uniform_code,
        fs_code, fs_uniform_code,
        uniforms: uniforms.filter(({ name }) => vs_code.indexOf(name) >= 0 || fs_code.indexOf(name) >= 0)
            .map((u) => ({ name: u.name, type: u.type, value: u.value })),
    };
}

export class ShaderMaterial extends Material {
    get class() { return "ShaderMaterial" }

    /**
     * @param {string} [name]
     */
    constructor(name = "unknown") {
        super();

        this.name = name;

        /** @type {string} */
        this.shader_type = "canvas_item";
        this.uses_screen_texture = false;

        /** @type {{ name: string, type: UniformTypes, value?: number[] | Texture_t }[]} */
        this.uniforms = [];
        /** @type {{ [name: string]: Texture_t }} */
        this.texture_hints = {};

        this.vs_code = "";
        this.vs_uniform_code = "";

        this.fs_code = "";
        this.fs_uniform_code = "";
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

        this.material = VSG.scene_render.materials.spatial.clone();
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

export const SPATIAL_SHADER_UNIFORMS = [
    { name: 'CAMERA_MATRIX', type: 'mat4' },
    { name: 'INV_CAMERA_MATRIX', type: 'mat4' },
    { name: 'PROJECTION_MATRIX', type: 'mat4' },
    { name: 'INV_PROJECTION_MATRIX', type: 'mat4' },
    { name: 'WORLD_MATRIX', type: 'mat4' },

    { name: 'TIME', type: '1f' },

    // light general
    { name: 'LIGHT_COLOR', type: '4f' },
    { name: 'LIGHT_SPECULAR', type: '1f' },

    // directional light
    { name: 'LIGHT_DIRECTION', type: '3f' },

    // omni light
    { name: 'LIGHT_POSITION', type: '3f' },
    { name: 'LIGHT_ATTENUATION', type: '1f' },

    // spot light
    { name: 'LIGHT_SPOT_ATTENUATION', type: '1f' },
    { name: 'LIGHT_SPOT_RANGE', type: '1f' },
    { name: 'LIGHT_SPOT_ANGLE', type: '1f' },

    { name: 'bg_color', type: '4f' },
    { name: 'bg_energy', type: '1f' },
    { name: 'ambient_color', type: '4f' },
    { name: 'ambient_energy', type: '1f' },
]
