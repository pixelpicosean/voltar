import { VSG } from "engine/servers/visual/visual_server_globals";

const PRECISIONS = ["lowp", "mediump", "highp"];

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

/** @type {{ [key: string]: string }} */
const ATTRIBUTRE_TYPES = {
    "float": "float",
    "vec2": "vec2",
    "vec3": "vec3",
    "vec4": "vec4",
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
    let precision = PRECISIONS.indexOf(tokens[idx]) >= 0 ? tokens[idx] : "";
    idx += precision ? 1 : 0;

    // type
    let type_str = tokens[idx];
    let type = UNIFORM_TYPES[type_str];
    idx += 1;

    // name
    let name = tokens[idx].replace(';', '');

    // default value
    let value = null;
    let value_match = code.match(/=\s*([\s\S]*?);/);
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
 * @param {string} code
 */
function parse_attribute(code) {
    let tokens = code.split(' ');
    let idx = 1;

    // precision
    let precision = PRECISIONS.indexOf(tokens[idx]) >= 0 ? tokens[idx] : "";
    idx += precision ? 1 : 0;

    // type
    let type_str = tokens[idx];
    let type = ATTRIBUTRE_TYPES[type_str];
    idx += 1;

    // name
    let name = tokens[idx].replace(';', '');

    return {
        type,
        name,
        precision,
        code: `attribute ${precision} ${type_str} ${name};`
            .replace(/ +/, ' '), // multi space to single
    }
}

/**
 * @param {string} code
 */
export function parse_uniforms_from_code(code) {
    let uniforms = [];
    let uniform_lines = code.match(/uniform([\s\S]*?);/gm);
    if (uniform_lines) {
        uniforms = uniform_lines.map(parse_uniform);
    }
    return uniforms;
}

/**
 * @param {string} code
 */
export function parse_attributes_from_code(code) {
    let uniforms = [];
    let uniform_lines = code.match(/attribute([\s\S]*?);/gm);
    if (uniform_lines) {
        uniforms = uniform_lines.map(parse_attribute);
    }
    return uniforms;
}

/**
 * Rules:
 * 1. vertex entry has to be: "void vertex()"
 * 2. fragment entry has to be: "void fragment()"
 * 3. vertex always on top and fragment on bottom if both exist
 * @param {string} code
 */
export function parse_shader_code(code) {
    const vs_start = code.indexOf("void vertex()");
    const fs_start = code.indexOf("void fragment()");

    let type_match = code.match(/shader_type\s*=\s*(canvas_item|spatial);/);
    let type = type_match ? type_match[1] : "canvas_item";

    let uses_screen_texture = code.indexOf("SCREEN_TEXTURE") >= 0;

    // uniform
    let uniforms = parse_uniforms_from_code(code);

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
