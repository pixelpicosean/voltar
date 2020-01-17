import {
    MARGIN_LEFT,
    MARGIN_RIGHT,
    MARGIN_TOP,
    MARGIN_BOTTOM,
} from 'engine/core/math/math_defs';
import { Transform2D } from 'engine/core/math/transform_2d';
import { identity_mat4, translate_mat4, scale_mat4 } from 'engine/core/math/transform';
import { ColorLike, Color } from 'engine/core/color';
import {
    OS,
    VIDEO_DRIVER_GLES2_LEGACY,
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
    CommandLine,
    CommandPolyLine,
    CommandCircle,
    CommandRect,
    CommandNinePatch,
    CommandPolygon,
    CANVAS_RECT_REGION,
    CANVAS_RECT_TRANSPOSE,
    CANVAS_RECT_FLIP_H,
    CANVAS_RECT_FLIP_V,
    CANVAS_RECT_TILE,
} from 'engine/servers/visual/commands';
import { ImageTexture } from 'engine/scene/resources/texture';

import normal_vs from './shaders/canvas.vert';
import normal_fs from './shaders/canvas.frag';

import tile_vs from './shaders/canvas_tile.vert';
import tile_fs from './shaders/canvas_tile.frag';


const ATTR_VERTEX = 0;
const ATTR_UV = 1;
const ATTR_COLOR = 2;
const ATTR_FLAGS = 3;

const VTX_COMP = (2 + 2 + 1 + 1); // position(2) + uv(2) + color(1) + flag(1)
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
    constructor() {
        this.init();
    }
    init() {
        this.vert_slot = 0;

        this.v_start = 0;
        this.v_length = 0;

        this.i_start = 0;
        this.i_length = 0;

        /** @type {WebGLTexture} */
        this.gl_tex = null;
        this.tex_key = '';

        /** @type {import('./rasterizer_storage').Material_t} */
        this.material = null;
        this.uniforms = Object.create(null);

        return this;
    }
}
/** @type {DrawGroup_t[]} */
const DrawGroup_pool = [];
function DrawGroup_new() {
    const dp = DrawGroup_pool.pop();
    if (dp) {
        return dp.init();
    } else {
        return new DrawGroup_t;
    }
}
/** @param {DrawGroup_t} dg */
function DrawGroup_free(dg) {
    DrawGroup_pool.push(dg);
}

/**
 * Swap values of 2 vertex
 * @param {Float32Array | Uint8Array | Uint16Array} arr
 * @param {number} idx_a
 * @param {number} idx_b
 */
function swap_vertices(arr, idx_a, idx_b) {
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
function get_uvs_of_sub_rect(r_vts, vt_start, tex_uvs, tex_width, tex_height, x, y, width, height) {
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
    constructor() {
        super();

        /** @type {import('./rasterizer_scene').RasterizerScene} */
        this.scene_render = null;

        /** @type {import('./rasterizer_storage').RasterizerStorage} */
        this.storage = null;

        this.states = {
            /** @type {import('./rasterizer_storage').Material_t} */
            material: null,
            /** @type {import('./rasterizer_storage').Texture_t} */
            texture: null,

            active_vert_slot: 0,
            active_buffer_slot: 0,
            v_index: 0,
            i_index: 0,

            uniforms: {
                projection_matrix: [
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1,
                ],
                time: [0],
            },

            vp: null,
        }

        // private

        this.gl = OS.get_singleton().gl;

        this.vertices = [
            {
                v: new Float32Array(VERTEX_BUFFER_LENGTH),
                i: new Uint16Array(INDEX_BUFFER_LENGTH),
            },
        ]

        /** @type {DrawGroup_t} */
        this.current_draw_group = null;
        /** @type {DrawGroup_t[]} */
        this.draw_groups = [];

        /** @type {WebGLBuffer[]} */
        this.vbs = [];
        /** @type {WebGLBuffer[]} */
        this.ibs = [];

        this.materials = {
            /** @type {import('./rasterizer_storage').Material_t} */
            flat: null,
            /** @type {import('./rasterizer_storage').Material_t} */
            tile: null,
        };
    }

    /* API */

    /**
     * @param {WebGLRenderingContext} gl
     */
    initialize(gl) {
        this.gl = gl;

        this.get_extensions();

        const size = OS.get_singleton().get_window_size();
        this.resize(size.width, size.height);

        this.materials.flat = (() => {
            const shader = VSG.storage.shader_create(
                normal_vs, normal_fs,
                [
                    'position',
                    'uv',
                    'color',
                    'flags',
                ],
                [
                    { name: 'projection_matrix', type: 'mat4' },
                    { name: 'time', type: '1f' },
                ]
            );
            const material = VSG.storage.material_create(shader);
            material.name = 'flat';
            material.batchable = true;
            return material;
        })();

        this.materials.tile = (() => {
            const shader = VSG.storage.shader_create(
                tile_vs, tile_fs,
                [
                    'position',
                    'uv',
                    'color',
                    'flags',
                ],
                [
                    { name: 'projection_matrix', type: 'mat4' },
                    { name: 'frame_uv', type: '4f' },
                    { name: 'time', type: '1f' },
                ],
            );
            const material = VSG.storage.material_create(shader);
            material.name = 'tile';
            material.batchable = false;
            return material;
        })();

        this.states.material = null;
    }
    get_extensions() {
        const gl = this.gl;

        if (OS.get_singleton().video_driver_index === VIDEO_DRIVER_GLES2 || OS.get_singleton().video_driver_index === VIDEO_DRIVER_GLES2_LEGACY) {
            this.extensions = {
                drawBuffers: gl.getExtension('WEBGL_draw_buffers'),
                depthTexture: gl.getExtension('WEBGL_depth_texture'),
                loseContext: gl.getExtension('WEBGL_lose_context'),
                anisotropicFiltering: gl.getExtension('EXT_texture_filter_anisotropic'),
                uint32ElementIndex: gl.getExtension('OES_element_index_uint'),
                // Floats and half-floats
                floatTexture: gl.getExtension('OES_texture_float'),
                floatTextureLinear: gl.getExtension('OES_texture_float_linear'),
                textureHalfFloat: gl.getExtension('OES_texture_half_float'),
                textureHalfFloatLinear: gl.getExtension('OES_texture_half_float_linear'),
            };
        } else if (OS.get_singleton().video_driver_index === VIDEO_DRIVER_GLES3) {
            this.extensions = {
                anisotropicFiltering: gl.getExtension('EXT_texture_filter_anisotropic'),
                // Floats and half-floats
                colorBufferFloat: gl.getExtension('EXT_color_buffer_float'),
                floatTextureLinear: gl.getExtension('OES_texture_float_linear'),
            };
        }
    }

    draw_window_margins(black_margin, black_image) { }

    update() { }

    canvas_begin() {
        const gl = this.gl;

        const frame = this.storage.frame;

        if (frame.current_rt) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, frame.current_rt.gl_fbo);
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

        // update uniforms
        const canvas_transform = identity_mat4(this.states.uniforms.projection_matrix);
        if (frame.current_rt) {
        } else {
            const ssize = OS.get_singleton().get_window_size();
            translate_mat4(canvas_transform, canvas_transform, [-ssize.width / 2, -ssize.height / 2, 0]);
            scale_mat4(canvas_transform, canvas_transform, [2 / ssize.width, -2 / ssize.height, 1]);
        }
        this.states.uniforms.time[0] = frame.time[0];

        // reset states
        this.states.material = this.materials.flat;
        this.states.texture = this.storage.resources.white_tex.texture;

        this.current_draw_group = DrawGroup_new();
        this.current_draw_group.material = this.materials.flat;
        this.draw_groups.push(this.current_draw_group);
    }

    canvas_end() {
        const gl = this.gl;

        // end last active group
        this.current_draw_group.v_length = this.states.v_index - this.current_draw_group.v_start;
        this.current_draw_group.i_length = this.states.i_index - this.current_draw_group.i_start;

        this.states.material = null;
        this.use_material(this.materials.flat, {});

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.storage.resources.white_tex.texture.gl_tex);

        let current_buffer_slot = -1;
        for (let i = 0; i < this.draw_groups.length; i++) {
            const group = this.draw_groups[i];

            // uses different vertices array? let's upload them to GPU
            if (group.vert_slot !== current_buffer_slot) {
                const {
                    v: vertices,
                    i: indices,
                } = this.vertices[group.vert_slot];

                let vb = this.vbs[this.states.active_buffer_slot];
                if (!vb) {
                    vb = this.vbs[this.states.active_buffer_slot] = gl.createBuffer();
                }
                gl.bindBuffer(gl.ARRAY_BUFFER, vb);
                gl.bufferData(gl.ARRAY_BUFFER, vertices.subarray(0, this.states.v_index * VTX_COMP), gl.DYNAMIC_DRAW);

                let ib = this.ibs[this.states.active_buffer_slot];
                if (!ib) {
                    ib = this.ibs[this.states.active_buffer_slot] = gl.createBuffer();
                }
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices.subarray(0, this.states.i_length), gl.DYNAMIC_DRAW);

                current_buffer_slot = group.vert_slot;
            }

            // issue a draw call for this group
            this.flush_group(group);
        }

        // recycle draw group data
        for (const g of this.draw_groups) {
            DrawGroup_free(g);
        }
        this.draw_groups.length = 0;
    }

    reset_canvas() {
        this.states.active_buffer_slot = 0;
        this.states.active_vert_slot = 0;

        // reset vertices and indices offset/index
        this.states.v_index = 0;
        this.states.i_index = 0;
    }

    /**
     * @param {import('engine/servers/visual/visual_server_canvas').Item} p_item_list
     * @param {number} p_z
     * @param {ColorLike} p_modulate
     * @param {any} p_light
     * @param {Transform2D} p_base_transform
     */
    canvas_render_items(p_item_list, p_z, p_modulate, p_light, p_base_transform) {
        while (p_item_list) {
            this._canvas_item_render_commands(p_item_list);
            p_item_list = /** @type {Item} */(p_item_list.next);
        }
    }

    /* private */

    /**
     * @param {import('./rasterizer_storage').Material_t} material
     * @param {Object<string, number>} uniforms
     */
    use_material(material, uniforms) {
        if (material === this.states.material) return;

        const gl = this.gl;

        // TODO: support different blend modes
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

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
    }

    /**
     * @param {Item} p_item
     */
    _canvas_item_render_commands(p_item) {
        const color = Color.new();

        for (const cmd of p_item.commands) {
            switch (cmd.type) {
                case TYPE_LINE: {
                    const line = /** @type {CommandLine} */(cmd);

                    this.check_draw_group_state(4, 6, null, this.materials.flat);

                    const {
                        v: vertices,
                        i: indices,
                    } = this.vertices[this.states.active_vert_slot];

                    const v_idx = this.states.v_index;

                    let vb_idx = this.states.v_index * VTX_COMP;
                    let ib_idx = this.states.i_index;

                    // vertex
                    const wt = p_item.final_transform;
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
                    const color_num = color.copy(line.color).multiply(p_item.final_modulate).as_rgba8();
                    vertices[vb_idx + VTX_COMP * 0 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 1 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 2 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 3 + 4] = color_num;

                    // - flags
                    const flags = color.set(p_item.fill_mode, 0, 0, 0).as_rgba8();
                    vertices[vb_idx + VTX_COMP * 0 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 1 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 2 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 3 + 5] = flags;

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
                    const rect = /** @type {CommandRect} */(cmd);
                    const tex = rect.texture;

                    this.check_draw_group_state(4, 6, tex, (rect.flags & CANVAS_RECT_TILE) ? this.materials.tile : this.materials.flat);

                    const {
                        v: vertices,
                        i: indices,
                    } = this.vertices[this.states.active_vert_slot];

                    const v_idx = this.states.v_index;

                    let vb_idx = this.states.v_index * VTX_COMP;
                    let ib_idx = this.states.i_index;

                    // vertex
                    const wt = p_item.final_transform;
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
                        const tex_uvs = rect.texture.uvs;
                        if (rect.flags & CANVAS_RECT_REGION) {
                            if (rect.flags & CANVAS_RECT_TILE) {
                                this.current_draw_group.uniforms = this.current_draw_group.uniforms || Object.create(null);
                                this.current_draw_group.uniforms.frame_uv = [
                                    tex_uvs[0],
                                    tex_uvs[1],
                                    tex_uvs[2],
                                    tex_uvs[3],
                                ];

                                const u_pct = rect.source.width / rect.texture.width;
                                const v_pct = rect.source.height / rect.texture.height;

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
                                    rect.texture.width, rect.texture.height,
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
                    const color_num = color.copy(rect.modulate).multiply(p_item.final_modulate).as_rgba8();
                    vertices[vb_idx + VTX_COMP * 0 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 1 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 2 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 3 + 4] = color_num;

                    // - flags
                    const flags = color.set(p_item.fill_mode, 0, 0, 0).as_rgba8();
                    vertices[vb_idx + VTX_COMP * 0 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 1 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 2 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 3 + 5] = flags;

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
                    const np = /** @type {CommandNinePatch} */(cmd);
                    const tex = np.texture;

                    this.check_draw_group_state(32, 54, tex, this.materials.flat);

                    const {
                        v: vertices,
                        i: indices,
                    } = this.vertices[this.states.active_vert_slot];

                    const v_idx = this.states.v_index;

                    let vb_idx = this.states.v_index * VTX_COMP;
                    let ib_idx = this.states.i_index;

                    // vertex
                    const wt = p_item.final_transform;
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

                    const s_w = np.source.width || np.texture.width;
                    const s_h = np.source.height || np.texture.height;

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
                    const color_num = color.copy(np.color).multiply(p_item.final_modulate).as_rgba8();
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

                    // - flags
                    const flags = color.set(p_item.fill_mode, 0, 0, 0).as_rgba8();
                    vertices[vb_idx + VTX_COMP * 0 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 1 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 2 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 3 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 4 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 5 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 6 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 7 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 8 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 9 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 10 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 11 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 12 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 13 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 14 + 5] = flags;
                    vertices[vb_idx + VTX_COMP * 15 + 5] = flags;

                    // index
                    for (let i = 0; i < NinePatchIndices.length; i++) {
                        indices[ib_idx++] = v_idx + NinePatchIndices[i];
                    }

                    this.states.v_index += 32;
                    this.states.i_index += 54;
                } break;
                case TYPE_POLYGON: {
                    const polygon = /** @type {CommandPolygon} */(cmd);
                    const tex = polygon.texture;

                    const vert_count = polygon.get_vert_count();
                    const indi_count = polygon.indices.length;

                    this.check_draw_group_state(vert_count, indi_count, tex, this.materials.flat);

                    const {
                        v: vertices,
                        i: indices,
                    } = this.vertices[this.states.active_vert_slot];

                    const v_idx = this.states.v_index;

                    let vb_idx = this.states.v_index * VTX_COMP;
                    let ib_idx = this.states.i_index;

                    // vertex
                    const wt = p_item.final_transform;
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
                    const flags = color.set(p_item.fill_mode, 0, 0, 0).as_rgba8();

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
                        vertices[vb_idx + VTX_COMP * i + 4] = s_color ? s_color_num : color.set(color[i * 4], color[i * 4 + 1], color[i * 4 + 2], color[i * 4 + 3]).multiply(p_item.final_modulate).as_rgba8();
                        // flags
                        vertices[vb_idx + VTX_COMP * i + 5] = flags;
                    }

                    // index
                    for (let i = 0; i < p_indices.length; i++) {
                        indices[ib_idx++] = v_idx + p_indices[i];
                    }

                    this.states.v_index += vert_count;
                    this.states.i_index += indi_count;
                } break;
                case TYPE_CIRCLE: {
                    const circle = /** @type {CommandCircle} */(cmd);
                    const radius = circle.radius;
                    const tex = circle.texture;

                    const wt = p_item.final_transform;
                    const a = wt.a;
                    const b = wt.b;
                    const c = wt.c;
                    const d = wt.d;
                    const tx = wt.tx;
                    const ty = wt.ty;

                    const scaled_radius = Math.max(Math.sqrt(a * a + b * b), Math.sqrt(c * c + b * b)) * radius;

                    const steps = Math.max(MIN_STEPS_PER_CIRCLE, scaled_radius * 5 / (200 + scaled_radius * 5) * MAX_STEPS_PER_CIRCLE) | 0;
                    const angle_per_step = Math.PI * 2 / steps;

                    this.check_draw_group_state(steps, (steps - 2) * 3, tex, this.materials.flat);

                    const {
                        v: vertices,
                        i: indices,
                    } = this.vertices[this.states.active_vert_slot];

                    const v_idx = this.states.v_index;

                    let vb_idx = this.states.v_index * VTX_COMP;
                    let ib_idx = this.states.i_index;

                    // vertex
                    const x0 = circle.pos.x;
                    const y0 = circle.pos.y;

                    const color_num = color.copy(circle.color).multiply(p_item.final_modulate).as_rgba8();
                    const flags = color.set(p_item.fill_mode, 0, 0, 0).as_rgba8();

                    for (let i = 0; i < steps; i++) {
                        const x = Math.cos(angle_per_step * i) * radius + x0;
                        const y = Math.sin(angle_per_step * i) * radius + y0;
                        vertices[vb_idx + VTX_COMP * i + 0] = (a * x) + (c * y) + tx;
                        vertices[vb_idx + VTX_COMP * i + 1] = (d * y) + (b * x) + ty;
                        vertices[vb_idx + VTX_COMP * i + 2] = -1;
                        vertices[vb_idx + VTX_COMP * i + 3] = -1;
                        vertices[vb_idx + VTX_COMP * i + 4] = color_num;
                        vertices[vb_idx + VTX_COMP * i + 5] = flags;
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
                    const pline = /** @type {CommandPolyLine} */(cmd);
                    const tex = pline.texture;

                    const vert_count = Math.floor(pline.triangles.length / 2);
                    const indi_count = (vert_count - 2) * 3;

                    this.check_draw_group_state(vert_count, indi_count, tex, this.materials.flat);

                    const {
                        v: vertices,
                        i: indices,
                    } = this.vertices[this.states.active_vert_slot];

                    const v_idx = this.states.v_index;

                    let vb_idx = this.states.v_index * VTX_COMP;
                    let ib_idx = this.states.i_index;

                    // vertex
                    const wt = p_item.final_transform;
                    const a = wt.a;
                    const b = wt.b;
                    const c = wt.c;
                    const d = wt.d;
                    const tx = wt.tx;
                    const ty = wt.ty;

                    const points = pline.triangles;
                    const colors = pline.triangle_colors;
                    const s_color = (colors.length === 4);
                    const s_color_num = s_color ? color.set(colors[0], colors[1], colors[2], colors[3]).multiply(p_item.final_modulate).as_rgba8() : 0;
                    const flags = color.set(p_item.fill_mode, 0, 0, 0).as_rgba8();

                    for (let i = 0, len = vert_count; i < len; i++) {
                        // position
                        vertices[vb_idx + VTX_COMP * i + 0] = (a * points[i * 2]) + (c * points[i * 2 + 1]) + tx;
                        vertices[vb_idx + VTX_COMP * i + 1] = (d * points[i * 2 + 1]) + (b * points[i * 2]) + ty;
                        // uv
                        vertices[vb_idx + VTX_COMP * i + 2] = -1;
                        vertices[vb_idx + VTX_COMP * i + 3] = -1;
                        // color
                        vertices[vb_idx + VTX_COMP * i + 4] = s_color ? s_color_num : color.set(color[i * 4], color[i * 4 + 1], color[i * 4 + 2], color[i * 4 + 3]).multiply(p_item.final_modulate).as_rgba8();
                        // flags
                        vertices[vb_idx + VTX_COMP * i + 5] = flags;
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
            }
        }

        Color.free(color);
    }

    /**
     * @param {number} num_vertex
     * @param {number} num_index
     * @param {ImageTexture} texture
     * @param {import('./rasterizer_storage').Material_t} material
     */
    check_draw_group_state(num_vertex, num_index, texture, material) {
        let need_new_group = false;

        let use_new_buffer = false;

        // different texture?
        if (
            texture
            &&
            texture.texture !== this.states.texture
        ) {
            // we can use same group if no texture is currently active
            if (this.states.texture) {
                need_new_group = true;
                this.current_draw_group.gl_tex = this.states.texture.gl_tex;
            }

            this.states.texture = texture.texture;
        }

        // different material?
        if (
            (material && material !== this.states.material)
            ||
            (this.states.material && !this.states.material.batchable)
        ) {
            need_new_group = true;
            this.current_draw_group.material = this.states.material;
            this.states.material = material;
        }

        // buffer overflow?
        if (
            ((this.states.v_index + num_vertex) * VTX_COMP >= VERTEX_BUFFER_LENGTH)
            ||
            (this.states.i_index + num_index >= INDEX_BUFFER_LENGTH)
        ) {
            need_new_group = true;
            use_new_buffer = true;

            this.states.active_vert_slot += 1;
        }

        if (need_new_group) {
            // finish current group
            this.current_draw_group.v_length = this.states.v_index - this.current_draw_group.v_start;
            this.current_draw_group.i_length = this.states.i_index - this.current_draw_group.i_start;

            // update states
            if (use_new_buffer) {
                this.states.v_index = 0;
                this.states.i_index = 0;
            }

            // start a new group
            const new_group = DrawGroup_new();

            new_group.vert_slot = this.states.active_vert_slot;
            new_group.v_start = this.states.v_index;
            new_group.i_start = this.states.i_index;
            if (texture) {
                new_group.gl_tex = texture.texture.gl_tex;
                new_group.tex_key = texture.resource_name;
            }
            new_group.material = material;

            this.draw_groups.push(new_group);
            this.current_draw_group = new_group;
        }
    }
    /**
     * @param {DrawGroup_t} group
     */
    flush_group(group) {
        const gl = this.gl;

        // shader
        this.use_material(group.material, group.uniforms);

        // apply data binding
        // - texture
        if (group.gl_tex) {
            gl.bindTexture(gl.TEXTURE_2D, group.gl_tex);
        }

        // - attributes
        gl.vertexAttribPointer(ATTR_VERTEX, 2, gl.FLOAT, false, VTX_STRIDE, 0);
        gl.enableVertexAttribArray(ATTR_VERTEX);

        gl.vertexAttribPointer(ATTR_UV, 2, gl.FLOAT, false, VTX_STRIDE, 2 * 4);
        gl.enableVertexAttribArray(ATTR_UV);

        gl.vertexAttribPointer(ATTR_COLOR, 4, gl.UNSIGNED_BYTE, true, VTX_STRIDE, 4 * 4);
        gl.enableVertexAttribArray(ATTR_COLOR);

        gl.vertexAttribPointer(ATTR_FLAGS, 4, gl.UNSIGNED_BYTE, false, VTX_STRIDE, 5 * 4);
        gl.enableVertexAttribArray(ATTR_FLAGS);

        // draw
        gl.drawElements(gl.TRIANGLES, group.i_length, gl.UNSIGNED_SHORT, group.i_start * 2);
    }

    /**
     * Resizes the WebGL view to the specified width and height.
     *
     * @param {number} screenWidth - The new width of the screen.
     * @param {number} screenHeight - The new height of the screen.
     */
    resize(screenWidth, screenHeight) { }

    reset() {
        return this;
    }

    /**
     * Clear the frame buffer
     */
    clear() { }

    /**
     * Removes everything from the renderer (event listeners, spritebatch, etc...)
     */
    free() {
        this.gl = null;

        return super.free();
    }
}
