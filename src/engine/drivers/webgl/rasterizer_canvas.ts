import {
    MARGIN_LEFT,
    MARGIN_RIGHT,
    MARGIN_TOP,
    MARGIN_BOTTOM,
} from 'engine/core/math/math_defs';
import { Transform2D } from 'engine/core/math/transform_2d';
import { Transform } from 'engine/core/math/transform';
import { ColorLike, Color } from 'engine/core/color';
import {
    OS,
    VIDEO_DRIVER_GLES2,
    VIDEO_DRIVER_GLES3,
} from 'engine/core/os/os';
import { VObject } from 'engine/core/v_object';

import { Item } from 'engine/servers/visual/visual_server_canvas';
import { VSG } from 'engine/servers/visual/visual_server_globals';
import {
    TYPE_LINE,
    TYPE_POLYLINE,
    TYPE_CIRCLE,
    TYPE_RECT,
    TYPE_NINEPATCH,
    TYPE_POLYGON,
    TYPE_MULTIMESH,
    TYPE_TRANSFORM,
    CANVAS_RECT_REGION,
    CANVAS_RECT_TRANSPOSE,
    CANVAS_RECT_FLIP_H,
    CANVAS_RECT_FLIP_V,
    CANVAS_RECT_TILE,
    CommandLine,
    CommandPolyLine,
    CommandCircle,
    CommandRect,
    CommandNinePatch,
    CommandPolygon,
    CommandMultiMesh,
    CommandTransform,
} from 'engine/servers/visual/commands';
import { Texture } from 'engine/scene/resources/texture';
import { ShaderMaterial, CANVAS_ITEM_SHADER_UNIFORMS } from 'engine/scene/resources/material';
import {
    CanvasItemMaterial,
    BLEND_MODE_MIX,
    BLEND_MODE_ADD,
    BLEND_MODE_SUB,
    BLEND_MODE_MUL,
    BLEND_MODE_PREMULT_ALPHA,
} from 'engine/scene/2d/canvas_item';

import normal_vs from './shaders/canvas.vert';
import normal_fs from './shaders/canvas.frag';

import tile_vs from './shaders/canvas_tile.vert';
import tile_fs from './shaders/canvas_tile.frag';

import multimesh_vs from './shaders/canvas_multimesh.vert';
import multimesh_fs from './shaders/canvas_multimesh.frag';
import {
    MULTIMESH_TRANSFORM_2D,
    MULTIMESH_TRANSFORM_3D,
    MULTIMESH_COLOR_NONE,
    MULTIMESH_COLOR_8BIT,
    MULTIMESH_COLOR_FLOAT,
    MULTIMESH_CUSTOM_DATA_NONE,
    MULTIMESH_CUSTOM_DATA_8BIT,
    MULTIMESH_CUSTOM_DATA_FLOAT,
} from 'engine/servers/visual/visual_server';
import { Rect2 } from 'engine/core/math/rect2';
import { ARRAY_MAX } from 'engine/scene/const';
import { parse_attributes_from_code, parse_uniforms_from_code } from './shader_parser';
import { NoShrinkArray } from 'engine/core/v_array';

type Material_t = import('./rasterizer_storage').Material_t;
type Texture_t = import('./rasterizer_storage').Texture_t;
type Shader_t = import('./rasterizer_storage').Shader_t;

const ATTR_VERTEX = 0;
const ATTR_UV = 1;
const ATTR_COLOR = 2;

const ATTR_INST_XFORM0 = 3;
const ATTR_INST_XFORM1 = 4;
const ATTR_INST_XFORM2 = 5;
const ATTR_INST_COLOR = 6;
const ATTR_INST_DATA = 7;

const VTX_COMP = (2 + 2 + 1); // position(2) + uv(2) + color(1)
const VTX_STRIDE = VTX_COMP * 4;

const VERTEX_BUFFER_LENGTH = 4096 * VTX_COMP;
const INDEX_BUFFER_LENGTH = 4096;

const MAX_STEPS_PER_CIRCLE = 64;
const MIN_STEPS_PER_CIRCLE = 20;

const NinePatchIndices = [
    0, 1, 5,
    0, 5, 4,

    1, 2, 6,
    1, 6, 5,

    2, 3, 7,
    2, 7, 6,

    4, 5, 9,
    4, 9, 8,

    5, 6, 10,
    5, 10, 9,

    6, 7, 11,
    6, 11, 10,

    8, 9, 13,
    8, 13, 12,

    9, 10, 14,
    9, 14, 13,

    10, 11, 15,
    10, 15, 14,
];

class DrawGroup_t {
    vert_slot = 0;
    buffer_slot = 0;

    v_start = 0;
    v_length = 0;

    i_start = 0;
    i_length = 0;

    gl_tex: WebGLTexture = null;
    tex_key = '';

    material: Material_t = null;
    uniforms = Object.create(null);

    init() {
        this.vert_slot = 0;
        this.buffer_slot = 0;

        this.v_start = 0;
        this.v_length = 0;

        this.i_start = 0;
        this.i_length = 0;

        this.gl_tex = null;
        this.tex_key = '';

        this.material = null;
        this.uniforms = Object.create(null);

        return this;
    }
}
/** @type {DrawGroup_t[]} */
const DrawGroup_pool: DrawGroup_t[] = [];
function DrawGroup_new() {
    const dp = DrawGroup_pool.pop();
    if (dp) {
        return dp.init();
    } else {
        return new DrawGroup_t;
    }
}
/** @param {DrawGroup_t} dg */
function DrawGroup_free(dg: DrawGroup_t) {
    DrawGroup_pool.push(dg);
}

/**
 * Swap values of 2 vertex
 * @param {Float32Array | Uint8Array | Uint16Array} arr
 * @param {number} idx_a
 * @param {number} idx_b
 */
function swap_vertices(arr: Float32Array | Uint8Array | Uint16Array, idx_a: number, idx_b: number) {
    let v = 0;
    // x
    v = arr[idx_a];
    arr[idx_a] = arr[idx_b];
    arr[idx_b] = v;
    // y
    v = arr[idx_a + 1];
    arr[idx_a + 1] = arr[idx_b + 1];
    arr[idx_b + 1] = v;
}

/**
 * @param {Float32Array} r_vts
 * @param {number} vt_start
 * @param {number[]} tex_uvs
 * @param {number} tex_width
 * @param {number} tex_height
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 */
function get_uvs_of_sub_rect(r_vts: Float32Array, vt_start: number, tex_uvs: number[], tex_width: number, tex_height: number, x: number, y: number, width: number, height: number) {
    const uv_w = tex_uvs[2] - tex_uvs[0];
    const uv_h = tex_uvs[3] - tex_uvs[1];
    const topleft_x = tex_uvs[0] + uv_w * (x / tex_width);
    const topleft_y = tex_uvs[1] + uv_h * (y / tex_height);
    const bottomright_x = topleft_x + uv_w * (width / tex_width);
    const bottomright_y = topleft_y + uv_h * (height / tex_height);
    r_vts[vt_start + VTX_COMP * 0 + 2] = topleft_x;
    r_vts[vt_start + VTX_COMP * 0 + 3] = topleft_y;
    r_vts[vt_start + VTX_COMP * 1 + 2] = bottomright_x;
    r_vts[vt_start + VTX_COMP * 1 + 3] = topleft_y;
    r_vts[vt_start + VTX_COMP * 2 + 2] = bottomright_x;
    r_vts[vt_start + VTX_COMP * 2 + 3] = bottomright_y;
    r_vts[vt_start + VTX_COMP * 3 + 2] = topleft_x;
    r_vts[vt_start + VTX_COMP * 3 + 3] = bottomright_y;
}

export class RasterizerCanvas extends VObject {
    scene_render: import("./rasterizer_scene").RasterizerScene = null;

    storage: import("./rasterizer_storage").RasterizerStorage = null;

    states = {
        material: null as Material_t,
        texture: null as Texture_t,
        blend_mode: 0,

        canvas_texscreen_used: false,
        using_transparent_rt: false,

        active_vert_slot: 0,
        active_buffer_slot: 0,
        v_start: 0,
        i_start: 0,
        v_index: 0,
        i_index: 0,

        uniforms: {
            projection_matrix: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ],
            TIME: [0],
            SCREEN_PIXEL_SIZE: [0, 0],
        } as { [name: string]: number[] },
    }

    // private

    gl = OS.get_singleton().gl;
    gl_ext = OS.get_singleton().gl_ext;

    vertices = [
        {
            v: new Float32Array(VERTEX_BUFFER_LENGTH),
            i: new Uint16Array(INDEX_BUFFER_LENGTH),
        },
    ]

    current_draw_group: DrawGroup_t = null;
    draw_groups: DrawGroup_t[] = [];

    vbs: WebGLBuffer[] = [];
    ibs: WebGLBuffer[] = [];

    materials = {
        flat: null as Material_t,
        tile: null as Material_t,
        multimesh: null as Material_t,
    };
    shader_materials: { [id: number]: { flat: Material_t; tile: Material_t; multimesh: Material_t; }; } = Object.create(null);

    copy_shader: Shader_t;
    copy_shader_with_section: Shader_t;
    copy_shader_with_display_transform: Shader_t;

    extensions: {
        drawBuffers?: any;
        depthTexture?: any;
        loseContext?: any;
        uint32ElementIndex?: any;
    }

    /* API */

    /**
     * @param {WebGLRenderingContext} gl
     */
    initialize(gl: WebGLRenderingContext) {
        this.gl = gl;

        this.get_extensions();

        const size = OS.get_singleton().get_window_size();
        this.resize(size.width, size.height);

        const mat = new ShaderMaterial("normal");
        mat.set_shader(
            "canvas_item",
            [],

            null, // uniforms

            null, // global

            null, // vertex
            null, // vertex uniforms

            `COLOR = texture2D(TEXTURE, UV);`,
            null, // fragment uniforms

            null  // light
        );
        this.materials.flat = this.init_shader_material(mat, normal_vs, normal_fs, true);
        this.materials.tile = this.init_shader_material(mat, tile_vs, tile_fs, false);

        this.materials.multimesh = (() => {
            const shader = VSG.storage.shader_create(
                multimesh_vs, multimesh_fs,
                [
                    // normal attributes
                    { name: 'position', loc: 0 },
                    { name: 'uv', loc: 1 },
                    { name: 'color', loc: 2 },

                    // instance attributes
                    { name: 'instance_xform0', loc: 3 },
                    { name: 'instance_xform1', loc: 4 },
                    { name: 'instance_xform2', loc: 5 },
                    { name: 'instance_color', loc: 6 },
                    { name: 'instance_custom_data', loc: 7 },
                ],
                [
                    { name: 'projection_matrix', type: 'mat4' },
                    { name: 'item_matrix', type: 'mat3' },
                    { name: 'TIME', type: '1f' },
                    { name: 'TEXTURE', type: '1i' },
                ]
            );
            const material = VSG.storage.material_create(shader);
            material.name = 'multimesh';
            material.batchable = false;
            return material;
        })();
        this.copy_shader_with_section = VSG.storage.shader_create(
            `
            uniform highp vec4 copy_section;
            attribute vec2 position;
            attribute vec2 uv;
            varying vec2 uv_interp;
            void main() {
                uv_interp = copy_section.xy + uv * copy_section.zw;
                gl_Position = vec4((copy_section.xy + (position * 0.5 + 0.5) * copy_section.zw) * 2.0 - 1.0, 0.0, 1.0);
            }
            `,
            `
            precision mediump float;
            uniform sampler2D source;
            varying vec2 uv_interp;
            void main() {
                gl_FragColor = texture2D(source, uv_interp);
            }
            `,
            [
                { name: "position", loc: 0 },
                { name: "uv", loc: 1 },
            ],
            [
                { name: "copy_section", type: "4f" },
                { name: "source", type: "1i" },
            ]
        );
        this.copy_shader_with_display_transform = VSG.storage.shader_create(
            `
            uniform highp mat4 display_transform;
            attribute vec2 position;
            attribute vec2 uv;
            varying vec2 uv_interp;
            void main() {
                uv_interp = (display_transform * vec4(uv, 1.0, 1.0)).xy;
                gl_Position = vec4(position, 0.0, 1.0);
            }
            `,
            `
            precision mediump float;
            uniform sampler2D source;
            varying vec2 uv_interp;
            void main() {
                gl_FragColor = texture2D(source, uv_interp);
            }
            `,
            [
                { name: "position", loc: 0 },
                { name: "uv", loc: 1 },
            ],
            [
                { name: "display_transform", type: "mat4" },
                { name: "source", type: "1i" },
            ]
        );
        this.copy_shader = VSG.storage.shader_create(
            `
            attribute vec2 position;
            attribute vec2 uv;
            varying vec2 uv_interp;
            void main() {
                uv_interp = uv;
                gl_Position = vec4(position, 0.0, 1.0);
            }
            `,
            `
            precision mediump float;
            uniform sampler2D source;
            varying vec2 uv_interp;
            void main() {
                gl_FragColor = texture2D(source, uv_interp);
            }
            `,
            [
                { name: "position", loc: 0 },
                { name: "uv", loc: 1 },
            ],
            [
                { name: "source", type: "1i" },
            ]
        );

        this.states.material = null;
    }
    get_extensions() {
        const gl = this.gl;

        if (OS.get_singleton().video_driver_index === VIDEO_DRIVER_GLES2) {
            this.extensions = {
                drawBuffers: gl.getExtension('WEBGL_draw_buffers'),
                depthTexture: gl.getExtension('WEBGL_depth_texture'),
                loseContext: gl.getExtension('WEBGL_lose_context'),
                uint32ElementIndex: gl.getExtension('OES_element_index_uint'),
            };
        } else if (OS.get_singleton().video_driver_index === VIDEO_DRIVER_GLES3) {
            this.extensions = {};
        }
    }

    prepare() {
        this.states.material = this.materials.flat;
        this.states.texture = this.storage.resources.white_tex.get_rid();

        this.states.active_vert_slot = 0;
        this.states.active_buffer_slot = 0;

        this.states.v_start = 0;
        this.states.i_start = 0;

        this.states.v_index = 0;
        this.states.i_index = 0;
    }

    canvas_begin() {
        const gl = this.gl;

        this.states.using_transparent_rt = false;
        const frame = this.storage.frame;
        let viewport_x = 0, viewport_y = 0, viewport_width = 0, viewport_height = 0;

        if (frame.current_rt) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, frame.current_rt.gl_fbo);
            this.states.using_transparent_rt = frame.current_rt.flags.TRANSPARENT;

            if (frame.current_rt.flags.DIRECT_TO_SCREEN) {
                viewport_width = frame.current_rt.width;
                viewport_height = frame.current_rt.height;
                viewport_x = frame.current_rt.x;
                viewport_y = OS.get_singleton().get_window_size().height - viewport_height - frame.current_rt.y;
                gl.scissor(viewport_x, viewport_y, viewport_width, viewport_height);
                gl.viewport(viewport_x, viewport_y, viewport_width, viewport_height);
                gl.enable(gl.SCISSOR_TEST);
            }
        }

        if (frame.clear_request) {
            gl.clearColor(
                frame.clear_request_color.r,
                frame.clear_request_color.g,
                frame.clear_request_color.b,
                frame.clear_request_color.a
            );
            gl.clear(gl.COLOR_BUFFER_BIT);
            frame.clear_request = false;
        }

        this.reset_canvas();

        // update general uniform data
        let canvas_transform = Transform.new();

        if (frame.current_rt) {
            let csy = 1;
            if (frame.current_rt && frame.current_rt.flags.VFLIP) {
                csy = -1;
            }
            canvas_transform.translate_n(-(frame.current_rt.width / 2), -(frame.current_rt.height / 2), 0);
            canvas_transform.scale_n(2 / frame.current_rt.width, csy * (-2) / frame.current_rt.height, 1);
        } else {
            let ssize = OS.get_singleton().get_window_size();
            canvas_transform.translate_n(-ssize.width / 2, -ssize.height / 2, 0);
            canvas_transform.scale_n(2 / ssize.width, -2 / ssize.height, 1);
        }

        canvas_transform.as_array(this.states.uniforms.projection_matrix);

        Transform.free(canvas_transform);

        this.states.uniforms.TIME[0] = frame.time[0];

        // reset states
        this.states.material = this.materials.flat;
        this.states.texture = this.storage.resources.white_tex.get_rid();
    }

    canvas_end() {
        this.flush();

        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        for (let i = 0; i < ARRAY_MAX; i++) {
            gl.disableVertexAttribArray(i);
        }

        if (this.storage.frame.current_rt && this.storage.frame.current_rt.flags.DIRECT_TO_SCREEN) {
            let ssize = OS.get_singleton().get_window_size();
            gl.viewport(0, 0, ssize.width, ssize.height);
            gl.scissor(0, 0, ssize.width, ssize.height);
        }
    }

    reset_canvas() { }

    canvas_render_items(p_item_list: import('engine/servers/visual/visual_server_canvas').Item, p_z: number, p_modulate: Color, p_base_transform: Transform2D) {
        while (p_item_list) {
            this._canvas_item_render_commands(p_item_list, p_modulate, p_base_transform);
            p_item_list = /** @type {Item} */(p_item_list.next);
        }
    }
    canvas_render_items_array(p_item_array: NoShrinkArray<import('engine/servers/visual/visual_server_canvas').Item>, p_modulate: Color, p_base_transform: Transform2D) {
        for (let i = 0, len = p_item_array.length; i < len; i++) {
            this._canvas_item_render_commands(p_item_array.buffer[i], p_modulate, p_base_transform);
        }
    }

    /* private */

    /**
     * @param {ShaderMaterial} shader_material
     * @param {string} vs
     * @param {string} fs
     * @param {boolean} batchable
     */
    init_shader_material(shader_material: ShaderMaterial, vs: string, fs: string, batchable: boolean) {
        const vs_code = vs
            // uniform
            .replace("/* GLOBALS */", `${shader_material.global_code}\n${shader_material.vs_uniform_code}`)
            // shader code
            .replace(/\/\* VERTEX_CODE_BEGIN \*\/([\s\S]*?)\/\* VERTEX_CODE_END \*\//, `{\n${shader_material.vs_code}\n}`)
        const fs_code = fs
            // uniform
            .replace("/* GLOBALS */", `${shader_material.global_code}\n${shader_material.fs_uniform_code}`)
            // shader code
            .replace(/\/\* FRAGMENT_CODE_BEGIN \*\/([\s\S]*?)\/\* FRAGMENT_CODE_END \*\//, `{\n${shader_material.fs_code}\n}`)

        const vs_uniforms = parse_uniforms_from_code(vs_code)
            .map(u => ({ type: u.type, name: u.name }))
        const fs_uniforms = parse_uniforms_from_code(fs_code)
            .map(u => ({ type: u.type, name: u.name }))
        const uniforms: { type: UniformTypes, name: string }[] = [];
        for (let u of vs_uniforms) {
            if (!uniforms.find((v) => v.name === u.name)) {
                uniforms.push(u);
            }
        }
        for (let u of fs_uniforms) {
            if (!uniforms.find((v) => v.name === u.name)) {
                uniforms.push(u);
            }
        }

        const attribs = parse_attributes_from_code(vs_code)
            .map((a, i) => ({ name: a.name, loc: i }))

        const shader = VSG.storage.shader_create(
            vs_code,
            fs_code,
            attribs,
            uniforms
        );
        shader.name = shader_material.name;

        const material = VSG.storage.material_create(shader);
        material.name = shader_material.name;
        material.batchable = batchable;
        for (let u of shader_material.uniforms) {
            let shader_u = shader.uniforms[u.name];
            if (u.value && shader_u && shader_u.gl_loc) {
                if (Array.isArray(u.value)) {
                    material.params[u.name] = u.value;
                } else {
                    material.textures[u.name] = u.value;
                }
            }
        }
        return material;
    }

    /**
     * @param {import('./rasterizer_storage').Material_t} material
     * @param {Object<string, number[]>} uniforms
     */
    use_material(material: import('./rasterizer_storage').Material_t, uniforms: { [s: string]: number[]; }) {
        const gl = this.gl;

        // screen texture support
        if (material.shader.canvas_item.uses_screen_texture && !this.states.canvas_texscreen_used) {
            this.states.canvas_texscreen_used = true;

            let rect = Rect2.new();
            this._copy_screen(rect);
            Rect2.free(rect);

            const ssize = this.storage.frame.current_rt;
            this.states.uniforms.SCREEN_PIXEL_SIZE[0] = 1.0 / ssize.width;
            this.states.uniforms.SCREEN_PIXEL_SIZE[1] = 1.0 / ssize.height;

            this.states.canvas_texscreen_used = false;
        }

        gl.enable(gl.BLEND);
        switch (this.states.blend_mode) {
            case BLEND_MODE_MIX: {
                gl.blendEquation(gl.FUNC_ADD);
                gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            } break;
            case BLEND_MODE_ADD: {
                gl.blendEquation(gl.FUNC_ADD);
                gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.SRC_ALPHA, gl.ONE);
            } break;
            case BLEND_MODE_SUB: {
                gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);
                gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.SRC_ALPHA, gl.ONE);
            } break;
            case BLEND_MODE_MUL: {
                gl.blendEquation(gl.FUNC_ADD);
                gl.blendFuncSeparate(gl.DST_COLOR, gl.ZERO, gl.DST_ALPHA, gl.ZERO);
            } break;
            case BLEND_MODE_PREMULT_ALPHA: {
                gl.blendEquation(gl.FUNC_ADD);
                gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            } break;
        }

        gl.useProgram(material.shader.gl_prog);
        const global_uniforms = this.states.uniforms;
        const mat_uniforms = material.shader.uniforms;
        for (const k in mat_uniforms) {
            const u = mat_uniforms[k];
            switch (u.type) {
                case '1f': gl.uniform1fv(u.gl_loc, uniforms[k] ? uniforms[k] : global_uniforms[k] ? uniforms[k] ? uniforms[k] : global_uniforms[k] : material.params[k]); break;
                case '2f': gl.uniform2fv(u.gl_loc, uniforms[k] ? uniforms[k] : global_uniforms[k] ? uniforms[k] ? uniforms[k] : global_uniforms[k] : material.params[k]); break;
                case '3f': gl.uniform3fv(u.gl_loc, uniforms[k] ? uniforms[k] : global_uniforms[k] ? uniforms[k] ? uniforms[k] : global_uniforms[k] : material.params[k]); break;
                case '4f': gl.uniform4fv(u.gl_loc, uniforms[k] ? uniforms[k] : global_uniforms[k] ? uniforms[k] ? uniforms[k] : global_uniforms[k] : material.params[k]); break;
                case 'mat3': gl.uniformMatrix3fv(u.gl_loc, false, uniforms[k] ? uniforms[k] : global_uniforms[k] ? uniforms[k] ? uniforms[k] : global_uniforms[k] : material.params[k]); break;
                case 'mat4': gl.uniformMatrix4fv(u.gl_loc, false, uniforms[k] ? uniforms[k] : global_uniforms[k] ? uniforms[k] ? uniforms[k] : global_uniforms[k] : material.params[k]); break;
            }
        }

        if (material.shader.canvas_item.uses_screen_texture) {
            if (this.storage.frame.current_rt.copy_screen_effect.gl_color) {
                const texunit = VSG.config.max_texture_image_units - 4;
                gl.activeTexture(gl.TEXTURE0 + texunit);
                gl.uniform1i(material.shader.uniforms["SCREEN_TEXTURE"].gl_loc, texunit);
                gl.bindTexture(gl.TEXTURE_2D, this.storage.frame.current_rt.copy_screen_effect.gl_color);
            }
        }
    }

    /**
     * @param {Item} p_item
     * @param {Color} p_modulate
     * @param {Transform2D} p_transform
     */
    _canvas_item_render_commands(p_item: Item, p_modulate: Color, p_transform: Transform2D) {
        let color = Color.new();

        let full_xform = Transform2D.new();
        /** @type {Transform2D} */
        let extra_xform: Transform2D = null;

        let materials = this.materials;
        let item_material = p_item.material;

        // TODO: cache blend mode
        /** @type {number} */
        let blend_mode: number = undefined;
        if (item_material) {
            if (item_material.class === "CanvasItemMaterial") {
                blend_mode = (item_material as CanvasItemMaterial).blend_mode;
            } else if (item_material.class === "ShaderMaterial") {
                let sm: ShaderMaterial = item_material as ShaderMaterial;
                let mat_cache = this.shader_materials[sm.id];
                if (!mat_cache) {
                    mat_cache = this.shader_materials[sm.id] = {
                        flat: null,
                        tile: null,
                        multimesh: null,
                    };
                }

                if (!mat_cache.flat) {
                    mat_cache.flat = this.init_shader_material(sm, normal_vs, normal_fs, true);
                }
                if (!mat_cache.tile) {
                    mat_cache.tile = this.init_shader_material(sm, tile_vs, tile_fs, false);
                }
                if (!mat_cache.multimesh) {
                    mat_cache.multimesh = this.materials.multimesh;
                }

                materials = mat_cache;
            }
        }

        for (let cmd of p_item.commands) {
            switch (cmd.type) {
                case TYPE_LINE: {
                    const line: CommandLine = cmd as CommandLine;

                    this.check_batch_state(4, 6, this.storage.resources.white_tex, this.materials.flat, blend_mode);

                    const {
                        v: vertices,
                        i: indices,
                    } = this.vertices[this.states.active_vert_slot];

                    const v_idx = this.states.v_index - this.states.v_start;

                    let vb_idx = this.states.v_index * VTX_COMP;
                    let ib_idx = this.states.i_index;

                    // vertex
                    const wt = extra_xform ? full_xform.copy(p_item.final_transform).append(p_transform).append(extra_xform) : full_xform.copy(p_item.final_transform).append(p_transform);
                    const a = wt.a;
                    const b = wt.b;
                    const c = wt.c;
                    const d = wt.d;
                    const tx = wt.tx;
                    const ty = wt.ty;

                    const angle = line.from.angle_to_point(line.to);
                    const offset_x = line.width * 0.5 * Math.sin(angle);
                    const offset_y = -line.width * 0.5 * Math.cos(angle);
                    const x0 = line.from.x;
                    const y0 = line.from.y;
                    const x1 = line.to.x;
                    const y1 = line.to.y;

                    // - position
                    vertices[vb_idx + VTX_COMP * 0 + 0] = (a * (x0 - offset_x)) + (c * (y0 - offset_y)) + tx;
                    vertices[vb_idx + VTX_COMP * 0 + 1] = (d * (y0 - offset_y)) + (b * (x0 - offset_x)) + ty;

                    vertices[vb_idx + VTX_COMP * 1 + 0] = (a * (x1 - offset_x)) + (c * (y1 - offset_y)) + tx;
                    vertices[vb_idx + VTX_COMP * 1 + 1] = (d * (y1 - offset_y)) + (b * (x1 - offset_x)) + ty;

                    vertices[vb_idx + VTX_COMP * 2 + 0] = (a * (x1 + offset_x)) + (c * (y1 + offset_y)) + tx;
                    vertices[vb_idx + VTX_COMP * 2 + 1] = (d * (y1 + offset_y)) + (b * (x1 + offset_x)) + ty;

                    vertices[vb_idx + VTX_COMP * 3 + 0] = (a * (x0 + offset_x)) + (c * (y0 + offset_y)) + tx;
                    vertices[vb_idx + VTX_COMP * 3 + 1] = (d * (y0 + offset_y)) + (b * (x0 + offset_x)) + ty;

                    // - uv
                    vertices[vb_idx + VTX_COMP * 0 + 2] = -1;
                    vertices[vb_idx + VTX_COMP * 0 + 3] = -1;

                    vertices[vb_idx + VTX_COMP * 1 + 2] = -1;
                    vertices[vb_idx + VTX_COMP * 1 + 3] = -1;

                    vertices[vb_idx + VTX_COMP * 2 + 2] = -1;
                    vertices[vb_idx + VTX_COMP * 2 + 3] = -1;

                    vertices[vb_idx + VTX_COMP * 3 + 2] = -1;
                    vertices[vb_idx + VTX_COMP * 3 + 3] = -1;

                    // - color
                    const color_num = color.copy(line.color).multiply(p_item.final_modulate).multiply(p_modulate).as_rgba8();
                    vertices[vb_idx + VTX_COMP * 0 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 1 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 2 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 3 + 4] = color_num;

                    // index
                    indices[ib_idx++] = v_idx + 0;
                    indices[ib_idx++] = v_idx + 1;
                    indices[ib_idx++] = v_idx + 2;
                    indices[ib_idx++] = v_idx + 2;
                    indices[ib_idx++] = v_idx + 3;
                    indices[ib_idx++] = v_idx + 0;

                    this.states.v_index += 4;
                    this.states.i_index += 6;
                } break;
                case TYPE_RECT: {
                    const rect: CommandRect = cmd as CommandRect;
                    const tex = rect.texture || this.storage.resources.white_tex;

                    this.check_batch_state(4, 6, tex, (rect.flags & CANVAS_RECT_TILE) ? materials.tile : materials.flat, blend_mode);

                    const {
                        v: vertices,
                        i: indices,
                    } = this.vertices[this.states.active_vert_slot];

                    const v_idx = this.states.v_index - this.states.v_start;

                    let vb_idx = this.states.v_index * VTX_COMP;
                    let ib_idx = this.states.i_index;

                    // vertex
                    const wt = extra_xform ? full_xform.copy(p_item.final_transform).append(p_transform).append(extra_xform) : full_xform.copy(p_item.final_transform).append(p_transform);
                    const a = wt.a;
                    const b = wt.b;
                    const c = wt.c;
                    const d = wt.d;
                    const tx = wt.tx;
                    const ty = wt.ty;

                    const x0 = rect.rect.x;
                    const x1 = x0 + rect.rect.width;
                    const y0 = rect.rect.y;
                    const y1 = y0 + rect.rect.height;

                    // - position
                    vertices[vb_idx + VTX_COMP * 0 + 0] = (a * x0) + (c * y0) + tx;
                    vertices[vb_idx + VTX_COMP * 0 + 1] = (d * y0) + (b * x0) + ty;

                    vertices[vb_idx + VTX_COMP * 1 + 0] = (a * x1) + (c * y0) + tx;
                    vertices[vb_idx + VTX_COMP * 1 + 1] = (d * y0) + (b * x1) + ty;

                    vertices[vb_idx + VTX_COMP * 2 + 0] = (a * x1) + (c * y1) + tx;
                    vertices[vb_idx + VTX_COMP * 2 + 1] = (d * y1) + (b * x1) + ty;

                    vertices[vb_idx + VTX_COMP * 3 + 0] = (a * x0) + (c * y1) + tx;
                    vertices[vb_idx + VTX_COMP * 3 + 1] = (d * y1) + (b * x0) + ty;

                    // - uv
                    if (tex) {
                        const tex_uvs = tex.uvs;
                        if (rect.flags & CANVAS_RECT_REGION) {
                            if (rect.flags & CANVAS_RECT_TILE) {
                                this.states.uniforms.frame_uv = [
                                    tex_uvs[0],
                                    tex_uvs[1],
                                    tex_uvs[2],
                                    tex_uvs[3],
                                ];

                                const u_pct = rect.source.width / rect.texture.get_width();
                                const v_pct = rect.source.height / rect.texture.get_height();

                                vertices[vb_idx + VTX_COMP * 0 + 2] = 0;
                                vertices[vb_idx + VTX_COMP * 0 + 3] = 0;
                                vertices[vb_idx + VTX_COMP * 1 + 2] = u_pct;
                                vertices[vb_idx + VTX_COMP * 1 + 3] = 0;
                                vertices[vb_idx + VTX_COMP * 2 + 2] = u_pct;
                                vertices[vb_idx + VTX_COMP * 2 + 3] = v_pct;
                                vertices[vb_idx + VTX_COMP * 3 + 2] = 0;
                                vertices[vb_idx + VTX_COMP * 3 + 3] = v_pct;
                            } else {
                                get_uvs_of_sub_rect(
                                    vertices, vb_idx,
                                    tex_uvs,
                                    rect.texture.get_width(), rect.texture.get_height(),
                                    rect.source.x, rect.source.y,
                                    rect.source.width, rect.source.height
                                )
                            }
                        } else {
                            vertices[vb_idx + VTX_COMP * 0 + 2] = tex_uvs[0];
                            vertices[vb_idx + VTX_COMP * 0 + 3] = tex_uvs[1];

                            vertices[vb_idx + VTX_COMP * 1 + 2] = tex_uvs[2];
                            vertices[vb_idx + VTX_COMP * 1 + 3] = tex_uvs[1];

                            vertices[vb_idx + VTX_COMP * 2 + 2] = tex_uvs[2];
                            vertices[vb_idx + VTX_COMP * 2 + 3] = tex_uvs[3];

                            vertices[vb_idx + VTX_COMP * 3 + 2] = tex_uvs[0];
                            vertices[vb_idx + VTX_COMP * 3 + 3] = tex_uvs[3];
                        }

                        if (rect.flags & CANVAS_RECT_TRANSPOSE) {
                            swap_vertices(vertices, vb_idx + VTX_COMP * 1 + 2, vb_idx + VTX_COMP * 3 + 2);
                        }
                        if (rect.flags & CANVAS_RECT_FLIP_H) {
                            swap_vertices(vertices, vb_idx + VTX_COMP * 0 + 2, vb_idx + VTX_COMP * 1 + 2);
                            swap_vertices(vertices, vb_idx + VTX_COMP * 2 + 2, vb_idx + VTX_COMP * 3 + 2);
                        }
                        if (rect.flags & CANVAS_RECT_FLIP_V) {
                            swap_vertices(vertices, vb_idx + VTX_COMP * 0 + 2, vb_idx + VTX_COMP * 3 + 2);
                            swap_vertices(vertices, vb_idx + VTX_COMP * 1 + 2, vb_idx + VTX_COMP * 2 + 2);
                        }
                    } else {
                        vertices[vb_idx + VTX_COMP * 0 + 2] = -1;
                        vertices[vb_idx + VTX_COMP * 0 + 3] = -1;

                        vertices[vb_idx + VTX_COMP * 1 + 2] = -1;
                        vertices[vb_idx + VTX_COMP * 1 + 3] = -1;

                        vertices[vb_idx + VTX_COMP * 2 + 2] = -1;
                        vertices[vb_idx + VTX_COMP * 2 + 3] = -1;

                        vertices[vb_idx + VTX_COMP * 3 + 2] = -1;
                        vertices[vb_idx + VTX_COMP * 3 + 3] = -1;
                    }

                    // - color
                    const color_num = color.copy(rect.modulate).multiply(p_item.final_modulate).multiply(p_modulate).as_rgba8();
                    vertices[vb_idx + VTX_COMP * 0 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 1 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 2 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 3 + 4] = color_num;

                    // index
                    indices[ib_idx++] = v_idx + 0;
                    indices[ib_idx++] = v_idx + 1;
                    indices[ib_idx++] = v_idx + 2;
                    indices[ib_idx++] = v_idx + 2;
                    indices[ib_idx++] = v_idx + 3;
                    indices[ib_idx++] = v_idx + 0;

                    this.states.v_index += 4;
                    this.states.i_index += 6;
                } break;
                case TYPE_NINEPATCH: {
                    const np: CommandNinePatch = cmd as CommandNinePatch;
                    const tex = np.texture || this.storage.resources.white_tex;

                    this.check_batch_state(32, 54, tex, this.materials.flat, blend_mode);

                    const {
                        v: vertices,
                        i: indices,
                    } = this.vertices[this.states.active_vert_slot];

                    const v_idx = this.states.v_index - this.states.v_start;

                    let vb_idx = this.states.v_index * VTX_COMP;
                    let ib_idx = this.states.i_index;

                    // vertex
                    const wt = extra_xform ? full_xform.copy(p_item.final_transform).append(p_transform).append(extra_xform) : full_xform.copy(p_item.final_transform).append(p_transform);
                    const a = wt.a;
                    const b = wt.b;
                    const c = wt.c;
                    const d = wt.d;
                    const tx = wt.tx;
                    const ty = wt.ty;

                    const x0 = np.rect.x;
                    const x1 = x0 + np.rect.width;
                    const y0 = np.rect.y;
                    const y1 = y0 + np.rect.height;

                    const m_l = np.margin[MARGIN_LEFT];
                    const m_r = np.margin[MARGIN_RIGHT];
                    const m_t = np.margin[MARGIN_TOP];
                    const m_b = np.margin[MARGIN_BOTTOM];

                    const s_w = np.source.width || np.texture.get_width();
                    const s_h = np.source.height || np.texture.get_height();

                    const uv_x0 = tex ? tex.uvs[0] : -1;
                    const uv_y0 = tex ? tex.uvs[1] : -1;
                    const uv_x1 = tex ? tex.uvs[2] : -1;
                    const uv_y1 = tex ? tex.uvs[3] : -1;

                    const uv_m_l = (uv_x1 - uv_x0) * (m_l / s_w);
                    const uv_m_r = (uv_x1 - uv_x0) * (m_r / s_w);
                    const uv_m_t = (uv_y1 - uv_y0) * (m_t / s_h);
                    const uv_m_b = (uv_y1 - uv_y0) * (m_b / s_h);

                    // - first row

                    vertices[vb_idx + VTX_COMP * 0 + 0] = (a * x0) + (c * y0) + tx;
                    vertices[vb_idx + VTX_COMP * 0 + 1] = (d * y0) + (b * x0) + ty;

                    vertices[vb_idx + VTX_COMP * 0 + 2] = uv_x0;
                    vertices[vb_idx + VTX_COMP * 0 + 3] = uv_y0;

                    vertices[vb_idx + VTX_COMP * 1 + 0] = (a * (x0 + m_l)) + (c * y0) + tx;
                    vertices[vb_idx + VTX_COMP * 1 + 1] = (d * y0) + (b * (x0 + m_l)) + ty;

                    vertices[vb_idx + VTX_COMP * 1 + 2] = uv_x0 + uv_m_l;
                    vertices[vb_idx + VTX_COMP * 1 + 3] = uv_y0;

                    vertices[vb_idx + VTX_COMP * 2 + 0] = (a * (x1 - m_r)) + (c * y0) + tx;
                    vertices[vb_idx + VTX_COMP * 2 + 1] = (d * y0) + (b * (x1 - m_r)) + ty;

                    vertices[vb_idx + VTX_COMP * 2 + 2] = uv_x1 - uv_m_r;
                    vertices[vb_idx + VTX_COMP * 2 + 3] = uv_y0;

                    vertices[vb_idx + VTX_COMP * 3 + 0] = (a * x1) + (c * y0) + tx;
                    vertices[vb_idx + VTX_COMP * 3 + 1] = (d * y0) + (b * x1) + ty;

                    vertices[vb_idx + VTX_COMP * 3 + 2] = uv_x1;
                    vertices[vb_idx + VTX_COMP * 3 + 3] = uv_y0;

                    // - second row

                    vertices[vb_idx + VTX_COMP * 4 + 0] = (a * x0) + (c * (y0 + m_t)) + tx;
                    vertices[vb_idx + VTX_COMP * 4 + 1] = (d * (y0 + m_t)) + (b * x0) + ty;

                    vertices[vb_idx + VTX_COMP * 4 + 2] = uv_x0;
                    vertices[vb_idx + VTX_COMP * 4 + 3] = uv_y0 + uv_m_t;

                    vertices[vb_idx + VTX_COMP * 5 + 0] = (a * (x0 + m_l)) + (c * (y0 + m_t)) + tx;
                    vertices[vb_idx + VTX_COMP * 5 + 1] = (d * (y0 + m_t)) + (b * (x0 + m_l)) + ty;

                    vertices[vb_idx + VTX_COMP * 5 + 2] = uv_x0 + uv_m_l;
                    vertices[vb_idx + VTX_COMP * 5 + 3] = uv_y0 + uv_m_t;

                    vertices[vb_idx + VTX_COMP * 6 + 0] = (a * (x1 - m_r)) + (c * (y0 + m_t)) + tx;
                    vertices[vb_idx + VTX_COMP * 6 + 1] = (d * (y0 + m_t)) + (b * (x1 - m_r)) + ty;

                    vertices[vb_idx + VTX_COMP * 6 + 2] = uv_x1 - uv_m_r;
                    vertices[vb_idx + VTX_COMP * 6 + 3] = uv_y0 + uv_m_t;

                    vertices[vb_idx + VTX_COMP * 7 + 0] = (a * x1) + (c * (y0 + m_t)) + tx;
                    vertices[vb_idx + VTX_COMP * 7 + 1] = (d * (y0 + m_t)) + (b * x1) + ty;

                    vertices[vb_idx + VTX_COMP * 7 + 2] = uv_x1;
                    vertices[vb_idx + VTX_COMP * 7 + 3] = uv_y0 + uv_m_t;

                    // - third row

                    vertices[vb_idx + VTX_COMP * 8 + 0] = (a * x0) + (c * (y1 - m_b)) + tx;
                    vertices[vb_idx + VTX_COMP * 8 + 1] = (d * (y1 - m_b)) + (b * x0) + ty;

                    vertices[vb_idx + VTX_COMP * 8 + 2] = uv_x0;
                    vertices[vb_idx + VTX_COMP * 8 + 3] = uv_y1 - uv_m_b;

                    vertices[vb_idx + VTX_COMP * 9 + 0] = (a * (x0 + m_l)) + (c * (y1 - m_b)) + tx;
                    vertices[vb_idx + VTX_COMP * 9 + 1] = (d * (y1 - m_b)) + (b * (x0 + m_l)) + ty;

                    vertices[vb_idx + VTX_COMP * 9 + 2] = uv_x0 + uv_m_l;
                    vertices[vb_idx + VTX_COMP * 9 + 3] = uv_y1 - uv_m_b;

                    vertices[vb_idx + VTX_COMP * 10 + 0] = (a * (x1 - m_r)) + (c * (y1 - m_b)) + tx;
                    vertices[vb_idx + VTX_COMP * 10 + 1] = (d * (y1 - m_b)) + (b * (x1 - m_r)) + ty;

                    vertices[vb_idx + VTX_COMP * 10 + 2] = uv_x1 - uv_m_r;
                    vertices[vb_idx + VTX_COMP * 10 + 3] = uv_y1 - uv_m_b;

                    vertices[vb_idx + VTX_COMP * 11 + 0] = (a * x1) + (c * (y1 - m_b)) + tx;
                    vertices[vb_idx + VTX_COMP * 11 + 1] = (d * (y1 - m_b)) + (b * x1) + ty;

                    vertices[vb_idx + VTX_COMP * 11 + 2] = uv_x1;
                    vertices[vb_idx + VTX_COMP * 11 + 3] = uv_y1 - uv_m_b;

                    // - forth row

                    vertices[vb_idx + VTX_COMP * 12 + 0] = (a * x0) + (c * y1) + tx;
                    vertices[vb_idx + VTX_COMP * 12 + 1] = (d * y1) + (b * x0) + ty;

                    vertices[vb_idx + VTX_COMP * 12 + 2] = uv_x0;
                    vertices[vb_idx + VTX_COMP * 12 + 3] = uv_y1;

                    vertices[vb_idx + VTX_COMP * 13 + 0] = (a * (x0 + m_l)) + (c * y1) + tx;
                    vertices[vb_idx + VTX_COMP * 13 + 1] = (d * y1) + (b * (x0 + m_l)) + ty;

                    vertices[vb_idx + VTX_COMP * 13 + 2] = uv_x0 + uv_m_l;
                    vertices[vb_idx + VTX_COMP * 13 + 3] = uv_y1;

                    vertices[vb_idx + VTX_COMP * 14 + 0] = (a * (x1 - m_r)) + (c * y1) + tx;
                    vertices[vb_idx + VTX_COMP * 14 + 1] = (d * y1) + (b * (x1 - m_r)) + ty;

                    vertices[vb_idx + VTX_COMP * 14 + 2] = uv_x1 - uv_m_r;
                    vertices[vb_idx + VTX_COMP * 14 + 3] = uv_y1;

                    vertices[vb_idx + VTX_COMP * 15 + 0] = (a * x1) + (c * y1) + tx;
                    vertices[vb_idx + VTX_COMP * 15 + 1] = (d * y1) + (b * x1) + ty;

                    vertices[vb_idx + VTX_COMP * 15 + 2] = uv_x1;
                    vertices[vb_idx + VTX_COMP * 15 + 3] = uv_y1;

                    // - color
                    const color_num = color.copy(np.color).multiply(p_item.final_modulate).multiply(p_modulate).as_rgba8();
                    vertices[vb_idx + VTX_COMP * 0 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 1 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 2 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 3 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 4 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 5 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 6 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 7 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 8 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 9 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 10 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 11 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 12 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 13 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 14 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 15 + 4] = color_num;

                    // index
                    for (let i = 0; i < NinePatchIndices.length; i++) {
                        indices[ib_idx++] = v_idx + NinePatchIndices[i];
                    }

                    this.states.v_index += 32;
                    this.states.i_index += 54;
                } break;
                case TYPE_POLYGON: {
                    const polygon: CommandPolygon = cmd as CommandPolygon;
                    const tex = polygon.texture || this.storage.resources.white_tex;

                    const vert_count = polygon.get_vert_count();
                    const indi_count = polygon.indices.length;

                    this.check_batch_state(vert_count, indi_count, tex, this.materials.flat, blend_mode);

                    const {
                        v: vertices,
                        i: indices,
                    } = this.vertices[this.states.active_vert_slot];

                    const v_idx = this.states.v_index - this.states.v_start;

                    let vb_idx = this.states.v_index * VTX_COMP;
                    let ib_idx = this.states.i_index;

                    // vertex
                    const wt = extra_xform ? full_xform.copy(p_item.final_transform).append(p_transform).append(extra_xform) : full_xform.copy(p_item.final_transform).append(p_transform);
                    const a = wt.a;
                    const b = wt.b;
                    const c = wt.c;
                    const d = wt.d;
                    const tx = wt.tx;
                    const ty = wt.ty;

                    const points = polygon.points;
                    const colors = polygon.colors;
                    const s_color = (colors.length === 4);
                    const s_color_num = s_color ? color.set(colors[0], colors[1], colors[2], colors[3]).multiply(p_item.final_modulate).as_rgba8() : 0;
                    const uvs = polygon.uvs;
                    const p_indices = polygon.indices;

                    for (let i = 0, len = vert_count; i < len; i++) {
                        // position
                        vertices[vb_idx + VTX_COMP * i + 0] = (a * points[i * 2]) + (c * points[i * 2 + 1]) + tx;
                        vertices[vb_idx + VTX_COMP * i + 1] = (d * points[i * 2 + 1]) + (b * points[i * 2]) + ty;
                        // uv
                        // TODO: support uv calculation from atlas textures
                        if (uvs && uvs.length) {
                            vertices[vb_idx + VTX_COMP * i + 2] = uvs[i * 2];
                            vertices[vb_idx + VTX_COMP * i + 3] = uvs[i * 2 + 1];
                        } else {
                            vertices[vb_idx + VTX_COMP * i + 2] = -1;
                            vertices[vb_idx + VTX_COMP * i + 3] = -1;
                        }
                        // color
                        vertices[vb_idx + VTX_COMP * i + 4] = s_color ? s_color_num : color.set(colors[i * 4], colors[i * 4 + 1], colors[i * 4 + 2], colors[i * 4 + 3]).multiply(p_item.final_modulate).multiply(p_modulate).as_rgba8();
                    }

                    // index
                    for (let i = 0; i < p_indices.length; i++) {
                        indices[ib_idx++] = v_idx + p_indices[i];
                    }

                    this.states.v_index += vert_count;
                    this.states.i_index += indi_count;
                } break;
                case TYPE_CIRCLE: {
                    const circle: CommandCircle = cmd as CommandCircle;
                    const radius = circle.radius;
                    const tex = circle.texture || this.storage.resources.white_tex;

                    const wt = extra_xform ? full_xform.copy(p_item.final_transform).append(p_transform).append(extra_xform) : full_xform.copy(p_item.final_transform).append(p_transform);
                    const a = wt.a;
                    const b = wt.b;
                    const c = wt.c;
                    const d = wt.d;
                    const tx = wt.tx;
                    const ty = wt.ty;

                    const scaled_radius = Math.max(Math.sqrt(a * a + b * b), Math.sqrt(c * c + b * b)) * radius;

                    const steps = Math.max(MIN_STEPS_PER_CIRCLE, scaled_radius * 5 / (200 + scaled_radius * 5) * MAX_STEPS_PER_CIRCLE) | 0;
                    const angle_per_step = Math.PI * 2 / steps;

                    this.check_batch_state(steps, (steps - 2) * 3, tex, this.materials.flat, blend_mode);

                    const {
                        v: vertices,
                        i: indices,
                    } = this.vertices[this.states.active_vert_slot];

                    const v_idx = this.states.v_index - this.states.v_start;

                    let vb_idx = this.states.v_index * VTX_COMP;
                    let ib_idx = this.states.i_index;

                    // vertex
                    const x0 = circle.pos.x;
                    const y0 = circle.pos.y;

                    const color_num = color.copy(circle.color).multiply(p_item.final_modulate).multiply(p_modulate).as_rgba8();

                    for (let i = 0; i < steps; i++) {
                        const x = Math.cos(angle_per_step * i) * radius + x0;
                        const y = Math.sin(angle_per_step * i) * radius + y0;
                        vertices[vb_idx + VTX_COMP * i + 0] = (a * x) + (c * y) + tx;
                        vertices[vb_idx + VTX_COMP * i + 1] = (d * y) + (b * x) + ty;
                        vertices[vb_idx + VTX_COMP * i + 2] = -1;
                        vertices[vb_idx + VTX_COMP * i + 3] = -1;
                        vertices[vb_idx + VTX_COMP * i + 4] = color_num;
                    }

                    // index
                    for (let i = 0; i < steps - 2; i++) {
                        indices[ib_idx + i * 3] = v_idx + 0;
                        indices[ib_idx + i * 3 + 1] = v_idx + i + 1;
                        indices[ib_idx + i * 3 + 2] = v_idx + i + 2;
                    }

                    this.states.v_index += steps;
                    this.states.i_index += (steps - 2) * 3;
                } break;
                case TYPE_POLYLINE: {
                    const pline: CommandPolyLine = cmd as CommandPolyLine;
                    const tex = pline.texture || this.storage.resources.white_tex;

                    const vert_count = Math.floor(pline.triangles.length / 2);
                    const indi_count = (vert_count - 2) * 3;

                    this.check_batch_state(vert_count, indi_count, tex, this.materials.flat, blend_mode);

                    const {
                        v: vertices,
                        i: indices,
                    } = this.vertices[this.states.active_vert_slot];

                    const v_idx = this.states.v_index - this.states.v_start;

                    let vb_idx = this.states.v_index * VTX_COMP;
                    let ib_idx = this.states.i_index;

                    // vertex
                    const wt = extra_xform ? full_xform.copy(p_item.final_transform).append(p_transform).append(extra_xform) : full_xform.copy(p_item.final_transform).append(p_transform);
                    const a = wt.a;
                    const b = wt.b;
                    const c = wt.c;
                    const d = wt.d;
                    const tx = wt.tx;
                    const ty = wt.ty;

                    const points = pline.triangles;
                    const colors = pline.triangle_colors;
                    const s_color = (colors.length === 4);
                    const s_color_num = s_color ? color.set(colors[0], colors[1], colors[2], colors[3]).multiply(p_item.final_modulate).multiply(p_modulate).as_rgba8() : 0;

                    for (let i = 0, len = vert_count; i < len; i++) {
                        // position
                        vertices[vb_idx + VTX_COMP * i + 0] = (a * points[i * 2]) + (c * points[i * 2 + 1]) + tx;
                        vertices[vb_idx + VTX_COMP * i + 1] = (d * points[i * 2 + 1]) + (b * points[i * 2]) + ty;
                        // uv
                        vertices[vb_idx + VTX_COMP * i + 2] = -1;
                        vertices[vb_idx + VTX_COMP * i + 3] = -1;
                        // color
                        vertices[vb_idx + VTX_COMP * i + 4] = s_color ? s_color_num : color.set(colors[i * 4], colors[i * 4 + 1], colors[i * 4 + 2], colors[i * 4 + 3]).multiply(p_item.final_modulate).as_rgba8();
                    }

                    // index
                    for (let i = 0, len = Math.floor((vert_count - 2) / 2); i < len; i++) {
                        indices[ib_idx + i * 6 + 0] = v_idx + i * 2 + 0;
                        indices[ib_idx + i * 6 + 1] = v_idx + i * 2 + 1;
                        indices[ib_idx + i * 6 + 2] = v_idx + i * 2 + 2;
                        indices[ib_idx + i * 6 + 3] = v_idx + i * 2 + 1;
                        indices[ib_idx + i * 6 + 4] = v_idx + i * 2 + 3;
                        indices[ib_idx + i * 6 + 5] = v_idx + i * 2 + 2;
                    }

                    this.states.v_index += vert_count;
                    this.states.i_index += indi_count;
                } break;
                case TYPE_MULTIMESH: {
                    // flush and reset states
                    this.flush();
                    this.states.texture = null;
                    this.states.material = null;

                    const mm: CommandMultiMesh = cmd as CommandMultiMesh;
                    const multimesh = mm.multimesh;
                    const mesh_data = multimesh.mesh;

                    const gl = this.gl;
                    const gl_ext = this.gl_ext;

                    // - material
                    const xform = extra_xform ? full_xform.copy(p_item.final_transform).append(p_transform).append(extra_xform) : full_xform.copy(p_item.final_transform).append(p_transform);
                    this.use_material(this.materials.multimesh, {
                        item_matrix: xform.as_array(true),
                    });

                    // - texture
                    const texunit = VSG.config.max_texture_image_units - 1;
                    gl.activeTexture(gl.TEXTURE0 + texunit);
                    gl.uniform1i(this.materials.multimesh.shader.uniforms["TEXTURE"].gl_loc, texunit);
                    gl.bindTexture(gl.TEXTURE_2D, mm.texture.get_rid().gl_tex);

                    if (mm.texture.get_rid().render_target) {
                        mm.texture.get_rid().render_target.used_in_frame = true;
                    }

                    let amount = Math.min(multimesh.size, multimesh.visible_instances);
                    if (amount === -1) {
                        amount = multimesh.size;
                    }

                    for (let i = 0; i < mesh_data.surfaces.length; i++) {
                        const s = mesh_data.surfaces[i];

                        // bind mesh data
                        gl.bindBuffer(gl.ARRAY_BUFFER, s.vertex_id);
                        if (s.index_id) {
                            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.index_id);
                        }
                        const mesh_stride = (2 + 2 + 1) * 4;
                        gl.vertexAttribPointer(ATTR_VERTEX, 2, gl.FLOAT, false, mesh_stride, 0);
                        gl.enableVertexAttribArray(ATTR_VERTEX);
                        gl.vertexAttribPointer(ATTR_UV, 2, gl.FLOAT, false, mesh_stride, 2 * 4);
                        gl.enableVertexAttribArray(ATTR_UV);
                        gl.vertexAttribPointer(ATTR_COLOR, 4, gl.UNSIGNED_BYTE, true, mesh_stride, 4 * 4);
                        gl.enableVertexAttribArray(ATTR_COLOR);

                        // bind instance buffer
                        gl.bindBuffer(gl.ARRAY_BUFFER, multimesh.buffer);

                        const stride = (multimesh.xform_floats + multimesh.color_floats + multimesh.custom_data_floats) * 4;

                        gl.enableVertexAttribArray(ATTR_INST_XFORM0);
                        gl.vertexAttribPointer(ATTR_INST_XFORM0, 4, gl.FLOAT, false, stride, 0);
                        gl_ext.vertexAttribDivisor(ATTR_INST_XFORM0, 1);
                        gl.enableVertexAttribArray(ATTR_INST_XFORM1);
                        gl.vertexAttribPointer(ATTR_INST_XFORM1, 4, gl.FLOAT, false, stride, 4 * 4);
                        gl_ext.vertexAttribDivisor(ATTR_INST_XFORM1, 1);

                        let color_ofs = 0;

                        if (multimesh.transform_format === MULTIMESH_TRANSFORM_3D) {
                            gl.enableVertexAttribArray(ATTR_INST_XFORM2);
                            gl.vertexAttribPointer(ATTR_INST_XFORM2, 4, gl.FLOAT, false, stride, 8 * 4);
                            gl_ext.vertexAttribDivisor(ATTR_INST_XFORM2, 1);
                            color_ofs = 12 * 4;
                        } else {
                            gl.disableVertexAttribArray(ATTR_INST_XFORM2);
                            gl.vertexAttrib4f(ATTR_INST_XFORM2, 0, 0, 1, 0);
                            color_ofs = 8 * 4;
                        }

                        let custom_data_ofs = color_ofs;

                        switch (multimesh.color_format) {
                            case MULTIMESH_COLOR_NONE: {
                                gl.disableVertexAttribArray(ATTR_INST_COLOR);
                                gl.vertexAttrib4f(ATTR_INST_COLOR, 1, 1, 1, 1);
                            } break;
                            case MULTIMESH_COLOR_8BIT: {
                                gl.enableVertexAttribArray(ATTR_INST_COLOR);
                                gl.vertexAttribPointer(ATTR_INST_COLOR, 4, gl.UNSIGNED_BYTE, true, stride, color_ofs);
                                gl_ext.vertexAttribDivisor(ATTR_INST_COLOR, 1);
                                custom_data_ofs += 4;
                            } break;
                            case MULTIMESH_COLOR_FLOAT: {
                                gl.enableVertexAttribArray(ATTR_INST_COLOR);
                                gl.vertexAttribPointer(ATTR_INST_COLOR, 4, gl.FLOAT, false, stride, color_ofs);
                                gl_ext.vertexAttribDivisor(ATTR_INST_COLOR, 1);
                                custom_data_ofs += 4 * 4;
                            } break;
                        }

                        switch (multimesh.custom_data_format) {
                            case MULTIMESH_CUSTOM_DATA_NONE: {
                                gl.disableVertexAttribArray(ATTR_INST_DATA);
                                gl.vertexAttrib4f(ATTR_INST_DATA, 1, 1, 1, 1);
                            } break;
                            case MULTIMESH_CUSTOM_DATA_8BIT: {
                                gl.enableVertexAttribArray(ATTR_INST_DATA);
                                gl.vertexAttribPointer(ATTR_INST_DATA, 4, gl.UNSIGNED_BYTE, true, stride, custom_data_ofs);
                                gl_ext.vertexAttribDivisor(ATTR_INST_DATA, 1);
                            } break;
                            case MULTIMESH_CUSTOM_DATA_FLOAT: {
                                gl.enableVertexAttribArray(ATTR_INST_DATA);
                                gl.vertexAttribPointer(ATTR_INST_DATA, 4, gl.FLOAT, false, stride, custom_data_ofs);
                                gl_ext.vertexAttribDivisor(ATTR_INST_DATA, 1);
                            } break;
                        }

                        if (s.index_array_len) {
                            gl_ext.drawElementsInstanced(s.primitive, s.index_array_len, gl.UNSIGNED_SHORT, 0, amount);
                        } else {
                            gl_ext.drawArraysInstanced(s.primitive, 0, s.array_len, amount);
                        }

                        gl.bindBuffer(gl.ARRAY_BUFFER, null);
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
                    }
                } break;
                case TYPE_TRANSFORM: {
                    const transform: CommandTransform = cmd as CommandTransform;
                    extra_xform = transform.xform;
                } break;
            }
        }

        Transform2D.free(full_xform);
        Color.free(color);
    }

    /**
     * @param {number} num_vertex
     * @param {number} num_index
     * @param {Texture} texture
     * @param {import('./rasterizer_storage').Material_t} material
     * @param {number} blend_mode no blend mode provided = MIX
     */
    check_batch_state(num_vertex: number, num_index: number, texture: Texture, material: import('./rasterizer_storage').Material_t, blend_mode: number) {
        let batch_broken = false;
        let use_new_buffer = false;

        // different texture?
        if (
            texture
            &&
            texture.get_rid() !== this.states.texture
        ) {
            if (this.states.texture) {
                batch_broken = true;
            }
        }

        // different material?
        if (
            (material && material !== this.states.material)
            ||
            (this.states.material && !this.states.material.batchable)
        ) {
            batch_broken = true;
        }

        if (blend_mode === undefined) blend_mode = BLEND_MODE_MIX;
        if (blend_mode !== this.states.blend_mode) {
            batch_broken = true;
        }

        // buffer overflow?
        if (
            ((this.states.v_index + num_vertex) * VTX_COMP > VERTEX_BUFFER_LENGTH)
            ||
            (this.states.i_index + num_index > INDEX_BUFFER_LENGTH)
        ) {
            batch_broken = true;
            use_new_buffer = true;
        }

        if (batch_broken) {
            this.flush();

            // update states with new batch data
            if (texture) {
                this.states.texture = texture.get_rid();
            }
            this.states.material = material;
            this.states.blend_mode = blend_mode;

            if (use_new_buffer) {
                this.states.v_start = 0;
                this.states.i_start = 0;
                this.states.v_index = 0;
                this.states.i_index = 0;

                this.states.active_vert_slot += 1;
                if (!this.vertices[this.states.active_vert_slot]) {
                    this.vertices[this.states.active_vert_slot] = {
                        v: new Float32Array(VERTEX_BUFFER_LENGTH),
                        i: new Uint16Array(INDEX_BUFFER_LENGTH),
                    };
                }
            }
        }
    }
    flush() {
        const v_length = this.states.v_index - this.states.v_start;
        const i_length = this.states.i_index - this.states.i_start;
        if (v_length === 0 || i_length === 0) return;

        const gl = this.gl;

        // - material
        this.use_material(this.states.material, this.states.uniforms);

        // - texture
        if (this.states.material.shader.uniforms["TEXTURE"]) {
            const texunit = VSG.config.max_texture_image_units - 1;
            gl.activeTexture(gl.TEXTURE0 + texunit);
            gl.uniform1i(this.states.material.shader.uniforms["TEXTURE"].gl_loc, texunit);
            gl.bindTexture(gl.TEXTURE_2D, this.states.texture.self().gl_tex);
        }

        if (this.states.texture.self().render_target) {
            this.states.texture.self().render_target.used_in_frame = true;
        }

        // - upload vertices/indices
        const {
            v: vertices,
            i: indices,
        } = this.vertices[this.states.active_vert_slot];

        let vb = this.vbs[this.states.active_buffer_slot];
        if (!vb) {
            vb = this.vbs[this.states.active_buffer_slot] = gl.createBuffer();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bufferData(gl.ARRAY_BUFFER, vertices.subarray(this.states.v_start * VTX_COMP, this.states.v_index * VTX_COMP), gl.DYNAMIC_DRAW);

        let ib = this.ibs[this.states.active_buffer_slot];
        if (!ib) {
            ib = this.ibs[this.states.active_buffer_slot] = gl.createBuffer();
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices.subarray(this.states.i_start, this.states.i_index), gl.DYNAMIC_DRAW);

        this.states.active_buffer_slot += 1;

        // - attributes
        gl.vertexAttribPointer(ATTR_VERTEX, 2, gl.FLOAT, false, VTX_STRIDE, 0);
        gl.enableVertexAttribArray(ATTR_VERTEX);

        gl.vertexAttribPointer(ATTR_UV, 2, gl.FLOAT, false, VTX_STRIDE, 2 * 4);
        gl.enableVertexAttribArray(ATTR_UV);

        gl.vertexAttribPointer(ATTR_COLOR, 4, gl.UNSIGNED_BYTE, true, VTX_STRIDE, 4 * 4);
        gl.enableVertexAttribArray(ATTR_COLOR);

        // - draw call
        gl.drawElements(gl.TRIANGLES, i_length, gl.UNSIGNED_SHORT, 0);

        // - update states
        this.states.v_start = this.states.v_index;
        this.states.i_start = this.states.i_index;
    }

    /**
     * Resizes the WebGL view to the specified width and height.
     *
     * @param {number} width - The new width of the screen.
     * @param {number} height - The new height of the screen.
     */
    resize(width: number, height: number) { }

    reset() {
        return this;
    }

    /**
     * Clear the frame buffer
     */
    clear() { }

    /**
     * @param {Rect2} p_rect
     */
    _copy_screen(p_rect: Rect2) {
        const gl = this.gl;

        gl.disable(gl.BLEND);

        let w = this.storage.frame.current_rt.width;
        let h = this.storage.frame.current_rt.height;
        let copy_section = [
            p_rect.x / w,
            p_rect.y / h,
            p_rect.width / w,
            p_rect.height / h,
        ];
        let shader = p_rect.is_zero() ? this.copy_shader : this.copy_shader_with_section;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.storage.frame.current_rt.copy_screen_effect.gl_fbo);

        gl.useProgram(shader.gl_prog);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.storage.frame.current_rt.gl_color);

        if (!p_rect.is_zero()) {
            gl.uniform4fv(shader.uniforms.copy_section.gl_loc, copy_section);
        }

        this.storage.bind_quad_array();

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.storage.frame.current_rt.gl_fbo);
        gl.enable(gl.BLEND);
    }
}
