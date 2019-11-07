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
    TYPE_RECT,
    CommandRect,
    CANVAS_RECT_REGION,
    CANVAS_RECT_TRANSPOSE,
    CANVAS_RECT_FLIP_H,
    CANVAS_RECT_FLIP_V,
} from 'engine/servers/visual/commands';

import vs from './shaders/canvas.vert';
import fs from './shaders/canvas.frag';


const ATTR_VERTEX = 0;
const ATTR_UV = 1;
const ATTR_COLOR = 2;

const VTX_COMP = 5;
const VTX_STRIDE = VTX_COMP * 4;

const VERTEX_BUFFER_LENGTH = 4000 * (2 + 1 + 2);
const INDEX_BUFFER_LENGTH = 4000;


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
    r_vts[vt_start + VTX_COMP * 0 + 3] = topleft_x;
    r_vts[vt_start + VTX_COMP * 0 + 4] = topleft_y;
    r_vts[vt_start + VTX_COMP * 1 + 3] = bottomright_x;
    r_vts[vt_start + VTX_COMP * 1 + 4] = topleft_y;
    r_vts[vt_start + VTX_COMP * 2 + 3] = bottomright_x;
    r_vts[vt_start + VTX_COMP * 2 + 4] = bottomright_y;
    r_vts[vt_start + VTX_COMP * 3 + 3] = topleft_x;
    r_vts[vt_start + VTX_COMP * 3 + 4] = bottomright_y;
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
            current_material: null,
            /** @type {import('./rasterizer_storage').Texture_t} */
            current_tex: null,
            current_v_index: 0,
            current_i_index: 0,

            uniforms: {
                projection_matrix: [
                    1,0,0,0,
                    0,1,0,0,
                    0,0,1,0,
                    0,0,0,1,
                ],
                time: [0],
            },

            vp: null,
        }

        // private

        this.gl = OS.get_singleton().gl;

        this.vertices = new Float32Array(VERTEX_BUFFER_LENGTH);
        this.indices = new Uint16Array(INDEX_BUFFER_LENGTH);

        /** @type {WebGLBuffer[]} */
        this.vbs = [];
        /** @type {WebGLBuffer[]} */
        this.ibs = [];
        this.active_buffer_index = 0;
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

        const flat_shader = VSG.storage.shader_create(
            vs, fs,
            [
                'position',
                'uv',
                'color',
            ],
            [
                { name: 'projection_matrix', type: 'mat4' },
                { name: 'time', type: '1f' },
            ]
        );
        this.states.current_material = VSG.storage.material_create(flat_shader);
        this.states.current_material.name = 'flat';
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

        const canvas_transform = identity_mat4(this.states.uniforms.projection_matrix);

        if (frame.current_rt) {
        } else {
            const ssize = OS.get_singleton().get_window_size();
            translate_mat4(canvas_transform, canvas_transform, [-ssize.width / 2, -ssize.height / 2, 0]);
            scale_mat4(canvas_transform, canvas_transform, [2 / ssize.width, -2 / ssize.height, 1]);

            // const left = 0;
            // const right = ssize.width;
            // const top = 0;
            // const bottom = ssize.height;
            // const near = 0.5;
            // const far = 1;

            // var lr = 1 / (left - right);
            // var bt = 1 / (bottom - top);
            // var nf = 1 / (near - far);
            // canvas_transform[0] = -2 * lr;
            // canvas_transform[1] = 0;
            // canvas_transform[2] = 0;
            // canvas_transform[3] = 0;
            // canvas_transform[4] = 0;
            // canvas_transform[5] = -2 * bt;
            // canvas_transform[6] = 0;
            // canvas_transform[7] = 0;
            // canvas_transform[8] = 0;
            // canvas_transform[9] = 0;
            // canvas_transform[10] = 2 * nf;
            // canvas_transform[11] = 0;
            // canvas_transform[12] = (left + right) * lr;
            // canvas_transform[13] = (top + bottom) * bt;
            // canvas_transform[14] = (far + near) * nf;
            // canvas_transform[15] = 1;
        }

        this.states.uniforms.time[0] = frame.time[0];

        this.states.current_tex = this.storage.resources.white_tex.texture;
    }

    canvas_end() {
        this.flush();
    }

    reset_canvas() {
        this.active_buffer_index = 0;
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
     * @param {Item} p_item
     */
    _canvas_item_render_commands(p_item) {
        const color = Color.new();

        for (const cmd of p_item.commands) {
            const vertices = this.vertices;
            const indices = this.indices;

            const v_idx = this.states.current_v_index;

            let vb_idx = v_idx * VTX_COMP;
            let ib_idx = this.states.current_i_index;

            switch (cmd.type) {
                case TYPE_RECT: {
                    const rect = /** @type {CommandRect} */(cmd);

                    this.check_draw_states(4, 6, rect.texture.texture);

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
                    const tex_uvs = rect.texture.uvs;
                    if (rect.flags & CANVAS_RECT_REGION) {
                        get_uvs_of_sub_rect(
                            vertices, vb_idx,
                            tex_uvs,
                            rect.texture.width, rect.texture.height,
                            rect.source.x, rect.source.y,
                            rect.source.width, rect.source.height
                        )
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

                    // - color
                    const color_num = color.copy(rect.modulate).multiply(p_item.final_modulate).as_rgba8();
                    vertices[vb_idx + VTX_COMP * 0 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 1 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 2 + 4] = color_num;
                    vertices[vb_idx + VTX_COMP * 3 + 4] = color_num;

                    // index
                    indices[ib_idx++] = v_idx + 0;
                    indices[ib_idx++] = v_idx + 1;
                    indices[ib_idx++] = v_idx + 2;
                    indices[ib_idx++] = v_idx + 0;
                    indices[ib_idx++] = v_idx + 2;
                    indices[ib_idx++] = v_idx + 3;
                } break;
            }
        }

        Color.free(color);
    }

    /**
     * @param {number} num_vertex
     * @param {number} num_index
     * @param {import('./rasterizer_storage').Texture_t} tex
     */
    check_draw_states(num_vertex, num_index, tex) {
        if (
            (tex !== this.states.current_tex)
            ||
            (this.states.current_v_index + num_vertex * VTX_COMP >= VERTEX_BUFFER_LENGTH)
            ||
            (this.states.current_i_index + num_index >= INDEX_BUFFER_LENGTH)
        ) {
            this.flush();
        }

        this.states.current_v_index += num_vertex;
        this.states.current_i_index += num_index;

        if (tex && tex.gl_tex) {
            this.states.current_tex = tex;
        } else {
            this.states.current_tex === this.storage.resources.white_tex.texture;
        }
    }
    flush() {
        if (this.states.current_v_index === 0 || this.states.current_i_index === 0) {
            return;
        }

        const gl = this.gl;

        // apply pipeline
        const mat = this.states.current_material;
        gl.useProgram(mat.shader.gl_prog);
        const global_uniforms = this.states.uniforms;
        const uniforms = mat.shader.uniforms;
        for (const k in uniforms) {
            const u = uniforms[k];
            switch (u.type) {
                case '1f': gl.uniform1fv(u.gl_loc, global_uniforms[k] ? global_uniforms[k] : mat.params[k]); break;
                case '2f': gl.uniform2fv(u.gl_loc, global_uniforms[k] ? global_uniforms[k] : mat.params[k]); break;
                case '3f': gl.uniform3fv(u.gl_loc, global_uniforms[k] ? global_uniforms[k] : mat.params[k]); break;
                case '4f': gl.uniform4fv(u.gl_loc, global_uniforms[k] ? global_uniforms[k] : mat.params[k]); break;
                case 'mat3': gl.uniformMatrix3fv(u.gl_loc, false, global_uniforms[k] ? global_uniforms[k] : mat.params[k]); break;
                case 'mat4': gl.uniformMatrix4fv(u.gl_loc, false, global_uniforms[k] ? global_uniforms[k] : mat.params[k]); break;
            }
        }

        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        // apply data binding
        // - texture
        gl.bindTexture(gl.TEXTURE_2D, this.states.current_tex.gl_tex);

        // - buffers
        let vb = this.vbs[this.active_buffer_index];
        if (!vb) {
            vb = this.vbs[this.active_buffer_index] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vb);
            gl.bufferData(gl.ARRAY_BUFFER, VERTEX_BUFFER_LENGTH * 4, gl.STREAM_DRAW);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);

        let ib = this.ibs[this.active_buffer_index];
        if (!ib) {
            ib = this.ibs[this.active_buffer_index] = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, INDEX_BUFFER_LENGTH * 2, gl.STREAM_DRAW);
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, this.indices);

        // - attributes
        gl.vertexAttribPointer(ATTR_VERTEX, 2, gl.FLOAT, false, VTX_STRIDE, 0);
        gl.enableVertexAttribArray(ATTR_VERTEX);

        gl.vertexAttribPointer(ATTR_UV, 2, gl.FLOAT, false, VTX_STRIDE, 2 * 4);
        gl.enableVertexAttribArray(ATTR_UV);

        gl.vertexAttribPointer(ATTR_COLOR, 4, gl.UNSIGNED_BYTE, true, VTX_STRIDE, 4 * 4);
        gl.enableVertexAttribArray(ATTR_COLOR);

        // draw
        gl.drawElements(gl.TRIANGLES, this.states.current_i_index, gl.UNSIGNED_SHORT, 0);

        // reset states
        this.states.current_v_index = 0;
        this.states.current_i_index = 0;
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
