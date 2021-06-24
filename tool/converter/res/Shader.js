const path = require("path");
const fs = require("fs");

const { parse_shader_code } = require("../../parser/shader_parser");

module.exports = (data) => {
    const code = data.prop.code.replace(/\t/gm, "\n");

    const shader_state = parse_shader_code(code);

    // do not pack full shader code, to keep shader code size small
    /*
    const shader_path = path.resolve(__dirname, "../../../src/engine/drivers/webgl/shaders");

    let vs_template = "", fs_template = "";
    switch (shader_state.type) {
        case "canvas_item": {
            vs_template = fs.readFileSync(path.resolve(shader_path, "canvas.vert"), "utf8");
            fs_template = fs.readFileSync(path.resolve(shader_path, "canvas.frag"), "utf8");
        } break;
        case "spatial": {
            vs_template = fs.readFileSync(path.resolve(shader_path, "spatial.vert"), "utf8");
            fs_template = fs.readFileSync(path.resolve(shader_path, "spatial.frag"), "utf8");
        } break;
    }
    */

    const vs_code = translate_godot_function_names(shader_state.vs_code);
    const fs_code = translate_godot_function_names(shader_state.fs_code);
    const ls_code = translate_godot_function_names(shader_state.lt_code);

    return {
        id: data.attr.id,
        type: "Shader",

        shader_type: shader_state.type,
        render_modes: shader_state.render_modes,

        uniforms: shader_state.uniforms,

        // code
        global_code: shader_state.global_code,

        vs_code: vs_code,
        vs_uniform_code: shader_state.vs_uniform_code,

        fs_code: fs_code,
        fs_uniform_code: shader_state.fs_uniform_code,

        lt_code: ls_code,
    };
};

module.exports.is_tres = true;

/**
 * @param {string} code
 */
function translate_godot_function_names(code) {
    return code
        .replace(/\btexture\(/g, "texture2D(")

        .replace(/\btextureLod\(/g, "texture2D(")
        .replace(/\btextureCubeLod\(/g, "textureCube(")

        .replace(/\bFRAGCOORD\b/g, "gl_FragCoord")
}
