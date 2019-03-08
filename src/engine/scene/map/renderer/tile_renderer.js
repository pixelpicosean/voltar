import { WRAP_MODES, BLEND_MODES, SCALE_MODES } from 'engine/const';
import GLBuffer from 'engine/drivers/webgl/gl_buffer';
import GLTexture from 'engine/drivers/webgl/gl_texture';
import GLShader from 'engine/drivers/webgl/gl_shader';
import VertexArrayObject from 'engine/drivers/webgl/vao';
import ObjectRenderer from 'engine/servers/visual/utils/object_renderer';
import WebGLRenderer from 'engine/servers/visual/webgl_renderer';
import RenderTexture from 'engine/scene/resources/textures/render_texture';
import Texture from 'engine/scene/resources/textures/texture';

import Sprite from '../../sprites/sprite';
import RectTileShader from './rect_tile_shader';
import TilemapShader from './tilemap_shader';
import { MAX_TEXTURES, BUFFER_SIZE, BOUND_COUNT_PER_BUFFER, BOUND_SIZE } from './const';

/**
 * @typedef VertexBufferPack
 * @property {number} id
 * @property {GLBuffer} vb
 * @property {VertexArrayObject} vao
 * @property {number} last_time_access
 * @property {RectTileShader} shader
 */

/**
 * @param {GLTexture} tex
 * @param {Sprite} sprite
 * @param {Uint8Array} [clear_buffer]
 * @param {number} [clear_width]
 * @param {number} [clear_height]
 */
function hack_sub_image(tex, sprite, clear_buffer, clear_width = 0, clear_height = 0) {
    const gl = tex.gl;
    const base_tex = sprite.texture.base_texture;
    if (clear_buffer && clear_width > 0 && clear_height > 0) {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, sprite.position.x, sprite.position.y, clear_width, clear_height, tex.format, tex.type, clear_buffer);
    }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, sprite.position.x, sprite.position.y, tex.format, tex.type, base_tex.source);
}

/*
 * Renderer for square and rectangle tiles.
 * Squares cannot be rotated, skewed.
 *
 * @param {WebGLRenderer} renderer The renderer this sprite batch works for.
 */
export default class TileRenderer extends ObjectRenderer {
    /**
     * @param {WebGLRenderer} renderer
     */
    constructor(renderer) {
        super(renderer);

        this.renderer = renderer;
        /** @type {WebGLRenderingContext} */
        this.gl = null;
        /** @type {Object<number, VertexBufferPack>} */
        this.vbs = {};
        this.indices = new Uint16Array(0);
        /** @type {GLBuffer} */
        this.index_buffer = null;
        this.last_time_check = 0;
        /** @type {number[]} */
        this.tex_loc = [];

        /** @type {RectTileShader} */
        this.rect_shader = null;
        /** @type {Sprite[]} */
        this.bound_sprites = null;
        /** @type {RenderTexture[]} */
        this.gl_textures = null;

        /** @type {Uint8Array} */
        this._clear_buffer = null;
    }

    on_context_change() {
        const gl = this.renderer.gl;

        this.rect_shader = new RectTileShader(gl, MAX_TEXTURES);
        this.check_index_buffer(2000);
        this.rect_shader.index_buffer = this.index_buffer;
        this.vbs = {};
        this.gl_textures = [];
        this.bound_sprites = [];
        this.init_bounds();
    }

    init_bounds() {
        for (let i = 0; i < MAX_TEXTURES; i++) {
            const rt = RenderTexture.create(BUFFER_SIZE, BUFFER_SIZE);
            rt.base_texture.premultiplied_alpha = true;
            rt.base_texture.scale_mode = TileRenderer.SCALE_MODE;
            rt.base_texture.wrap_mode = WRAP_MODES.CLAMP;
            this.renderer.texture_manager.update_texture(rt.base_texture);

            this.gl_textures.push(rt);
            for (let j = 0; j < BOUND_COUNT_PER_BUFFER; j++) {
                const spr = new Sprite();
                spr.position.x = BOUND_SIZE * (j & 1);
                spr.position.y = BOUND_SIZE * (j >> 1);
                this.bound_sprites.push(spr);
            }
        }
    }

    /**
     * @param {WebGLRenderer} renderer
     * @param {TilemapShader} shader
     * @param {Texture[]} textures
     */
    bind_textures(renderer, shader, textures) {
        const len = textures.length;
        if (len > BOUND_COUNT_PER_BUFFER * MAX_TEXTURES) {
            return;
        }
        const do_clear = TileRenderer.DO_CLEAR;
        if (do_clear && !this._clear_buffer) {
            this._clear_buffer = new Uint8Array(BOUND_SIZE * BOUND_SIZE * 4);
        }
        const glts = this.gl_textures;
        const bounds = this.bound_sprites;

        const old_active_render_target = this.renderer._active_render_target;

        let i = 0;
        for (i = 0; i < len; i++) {
            const texture = textures[i];
            if (!texture || !texture.valid) continue;
            const bounds_spr = bounds[i];
            if (
                !bounds_spr.texture
                ||
                bounds_spr.texture.base_texture !== texture.base_texture
            ) {
                bounds_spr.texture = texture;
                const glt = glts[i >> 2];
                renderer.bind_texture(glt, 0, true);
                if (do_clear) {
                    hack_sub_image((glt.base_texture)._gl_textures[renderer.CONTEXT_UID], bounds_spr, this._clear_buffer, BOUND_SIZE, BOUND_SIZE);
                } else {
                    hack_sub_image((glt.base_texture)._gl_textures[renderer.CONTEXT_UID], bounds_spr);
                }
            }
        }

        // fix in case we are inside of filter or render_texture
        if (!old_active_render_target) {
            this.renderer._active_render_target.frame_buffer.bind();
        }

        this.tex_loc.length = 0;
        const glts_used = (i + 3) >> 2;
        for (i = 0; i < glts_used; i++) {
            //remove "i, true" after resolving a bug
            this.tex_loc.push(renderer.bind_texture(glts[i], i, true))
        }
        shader.uniforms.u_samplers = this.tex_loc;
    }

    check_leaks() {
        const now = Date.now();
        const old = now - 10000;
        if (this.last_time_check < old ||
            this.last_time_check > now) {
            this.last_time_check = now;
            const vbs = this.vbs;
            for (let key in vbs) {
                if (vbs[key].last_time_access < old) {
                    this.remove_vb(key);
                }
            }
        }
    }

    start() {
        this.renderer.state.set_blend_mode(BLEND_MODES.NORMAL);
    }

    /**
     * @param {number} id
     */
    get_vb(id) {
        this.check_leaks();
        const vb = this.vbs[id];
        if (vb) {
            vb.last_time_access = Date.now();
            return vb;
        }
        return null;
    }

    create_vb() {
        const id = ++TileRenderer.vb_auto_increment;
        const shader = this.get_shader();
        const gl = this.renderer.gl;

        this.renderer.bind_vao(null);

        const vb = GLBuffer.create_vertex_buffer(gl, null, gl.STREAM_DRAW);
        /** @type {VertexBufferPack} */
        const stuff = {
            id: id,
            vb: vb,
            vao: shader.create_vao(this.renderer, vb),
            last_time_access: Date.now(),
            shader: shader,
        };
        this.vbs[id] = stuff;
        return stuff;
    }

    /**
     * @param {string} id
     */
    remove_vb(id) {
        if (this.vbs[id]) {
            this.vbs[id].vb.destroy();
            this.vbs[id].vao.destroy();
            delete this.vbs[id];
        }
    }

    /**
     * @param {number} size
     */
    check_index_buffer(size) {
        // the total number of indices in our array, there are 6 points per quad.
        const total_indices = size * 6;
        let indices = this.indices;
        if (total_indices <= indices.length) {
            return;
        }
        let len = indices.length || total_indices;
        while (len < total_indices) {
            len <<= 1;
        }

        indices = new Uint16Array(len);
        this.indices = indices;

        // fill the indices with the quads to draw
        for (let i = 0, j = 0; i + 5 < indices.length; i += 6, j += 4) {
            indices[i + 0] = j + 0;
            indices[i + 1] = j + 1;
            indices[i + 2] = j + 2;
            indices[i + 3] = j + 0;
            indices[i + 4] = j + 2;
            indices[i + 5] = j + 3;
        }

        if (this.index_buffer) {
            this.index_buffer.upload(indices);
        } else {
            const gl = this.renderer.gl;
            this.index_buffer = GLBuffer.create_index_buffer(gl, this.indices, gl.STATIC_DRAW);
        }
    }

    get_shader() {
        return this.rect_shader;
    }

    destroy() {
        super.destroy();
        this.rect_shader.destroy();
        this.rect_shader = null;
    }
}

TileRenderer.vb_auto_increment = 0;
TileRenderer.DO_CLEAR = false;
TileRenderer.SCALE_MODE = SCALE_MODES.LINEAR;
