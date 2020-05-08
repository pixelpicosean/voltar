import { res_class_map } from "engine/registry";

export class Material {
    get class() { return "Material" }

    constructor() {
        this.materials = {
            /* 2D */

            /** @type {import('engine/drivers/webgl/rasterizer_storage').Material_t} */
            flat: null,
            /** @type {import('engine/drivers/webgl/rasterizer_storage').Material_t} */
            tile: null,
            /** @type {import('engine/drivers/webgl/rasterizer_storage').Material_t} */
            multimesh: null,

            /* 3D */

            /** @type {import('engine/drivers/webgl/rasterizer_storage').Material_t} */
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
    let name = tokens[idx];

    // default value
    let value = null;
    let value_match = code.match(/=[ ]{0,}([\s\S]*?);/);
    if (value_match) {
        value = parse_value(value_match[1]);
    }

    return {
        type,
        name,
        precision,
        value,
        code: `uniform ${precision} ${type_str} ${name};`,
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

    let type_match = code.match(/shader_type (canvas_item|spatial);/);
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

        /** @type {{ name: string, type: import('engine/drivers/webgl/rasterizer_storage').UniformTypes, value?: number[] }[]} */
        this.uniforms = [];

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

export const SPATIAL_SHADER_UNIFORMS = [
    { name: 'CAMERA_MATRIX', type: 'mat4' },
    { name: 'INV_CAMERA_MATRIX', type: 'mat4' },
    { name: 'PROJECTION_MATRIX', type: 'mat4' },
    { name: 'INV_PROJECTION_MATRIX', type: 'mat4' },
    { name: 'WORLD_MATRIX', type: 'mat4' },

    { name: 'TIME', type: '1f' },

    { name: 'albedo', type: '4f' },
    { name: 'texture_albedo', type: '1i' },
    { name: 'specular', type: '1f' },
    { name: 'metallic', type: '1f' },
    { name: 'roughness', type: '1f' },

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
