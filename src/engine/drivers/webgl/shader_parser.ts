import { VSG } from "engine/servers/visual/visual_server_globals";

type UniformInfo = {
    type: UniformTypes;
    name: string;
    precision: string;
    value: import("engine/drivers/webgl/rasterizer_storage").Texture_t | number[];
    code: string;
}

const PRECISIONS = ["lowp", "mediump", "highp"];

const UNIFORM_TYPES: { [key: string]: UniformTypes } = {
    "float": "1f",
    "ivec2": "2i",
    "vec2": "2f",
    "vec3": "3f",
    "vec4": "4f",
    "mat3": "mat3",
    "mat4": "mat4",
    "sampler2D": "1i",
}

const ATTRIBUTRE_TYPES: { [key: string]: string } = {
    "float": "float",
    "vec2": "vec2",
    "vec3": "vec3",
    "vec4": "vec4",
}

/**
 * @param {string} code
 */
function parse_value(code: string) {
    // @Incomplete: this cannot handle vector values
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
function parse_uniform(code: string): UniformInfo {
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
function parse_attribute(code: string) {
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
export function parse_uniforms_from_code(code: string) {
    let uniforms: UniformInfo[] = [];
    let uniform_lines = code.match(/uniform([\s\S]*?);/gm);
    if (uniform_lines) {
        uniforms = uniform_lines.map(parse_uniform);
    }
    return uniforms;
}

/**
 * @param {string} code
 */
export function parse_attributes_from_code(code: string) {
    let attrib_lines = code.match(/attribute([\s\S]*?);/gm);
    if (attrib_lines) {
        return attrib_lines.map((line, index) => Object.assign(parse_attribute(line), { index }))
    }
    return [];
}
