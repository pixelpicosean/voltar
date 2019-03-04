import ObjectRenderer from 'engine/renderers/utils/ObjectRenderer';

import RenderTexture from 'engine/textures/RenderTexture';
import Sprite from '../../sprites/Sprite';
import { WRAP_MODES, BLEND_MODES } from 'engine/const';

import GLBuffer from 'engine/drivers/webgl/gl_buffer';

import RectTileShader from './RectTileShader';


function hack_sub_image(tex, sprite, clear_buffer, clear_width, clear_height) {
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
 * @param renderer {WebGLRenderer} The renderer this sprite batch works for.
 */

export default class TileRenderer extends ObjectRenderer {
    constructor(renderer) {
        super(renderer);

        this.renderer = renderer;
        this.gl = null;
        this.vbs = {};
        this.indices = new Uint16Array(0);
        this.index_buffer = null;
        this.clear_buffer = null;
        this.last_time_check = 0;
        this.max_textures = 4;
        this.tex_loc = [];

        this.rect_shader = null;
        this.bound_sprites = null;
        this.gl_textures = null;
    }

    on_context_change() {
        const gl = this.renderer.gl;
        const maxTextures = this.max_textures;
        this.rect_shader = new RectTileShader(gl, maxTextures);
        this.check_index_buffer(2000);
        this.rect_shader.index_buffer = this.index_buffer;
        this.vbs = {};
        this.gl_textures = [];
        this.bound_sprites = [];
        this.init_bounds();
    }

    init_bounds() {
        const gl = this.renderer.gl;
        for (let i = 0; i < this.max_textures; i++) {
            const rt = RenderTexture.create(2048, 2048);
            rt.base_texture.premultiplied_alpha = true;
            rt.base_texture.wrap_mode = WRAP_MODES.CLAMP;
            this.renderer.texture_manager.update_texture(rt);

            this.gl_textures.push(rt);
            const bounds = this.bound_sprites;
            for (let j = 0; j < 4; j++) {
                const spr = new Sprite();
                spr.position.x = 1024 * (j & 1);
                spr.position.y = 1024 * (j >> 1);
                bounds.push(spr);
            }
        }
    }

    bind_textures(renderer, shader, textures) {
        const len = textures.length;
        const max_textures = this.max_textures;
        if (len > 4 * max_textures) {
            return;
        }
        const do_clear = TileRenderer.DO_CLEAR;
        if (do_clear && !this.clear_buffer) {
            this.clear_buffer = new Uint8Array(1024 * 1024 * 4);
        }
        const glts = this.gl_textures;
        const bounds = this.bound_sprites;

        let i;
        for (i = 0; i < len; i++) {
            const texture = textures[i];
            if (!texture || !textures[i].valid) continue;
            const bs = bounds[i];
            if (!bs.texture ||
                bs.texture.base_texture !== texture.base_texture) {
                bs.texture = texture;
                const glt = glts[i >> 2];
                renderer.bind_texture(glt, 0, true);
                if (do_clear) {
                    hack_sub_image((glt.base_texture)._gl_textures[renderer.CONTEXT_UID], bs, this.clear_buffer, 1024, 1024);
                } else {
                    hack_sub_image((glt.base_texture)._gl_textures[renderer.CONTEXT_UID], bs);
                }
            }
        }
        this.tex_loc.length = 0;
        for (i = 0; i < max_textures; i++) {
            //remove "i, true" after resolving a bug
            this.tex_loc.push(renderer.bind_texture(glts[i], i, true))
        }
        shader.uniforms.uSamplers = this.tex_loc;
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
        this.renderer.state.setBlendMode(BLEND_MODES.NORMAL);
        //sorry, nothing
    }

    get_vb(id) {
        this.check_leaks();
        const vb = this.vbs[id];
        if (vb) {
            vb.lastAccessTime = Date.now();
            return vb;
        }
        return null;
    }

    create_vb() {
        const id = ++TileRenderer.vb_auto_increment;
        const shader = this.get_shader();
        const gl = this.renderer.gl;
        const vb = GLBuffer.create_vertex_buffer(gl, null, gl.STREAM_DRAW);
        const stuff = {
            id: id,
            vb: vb,
            vao: shader.createVao(this.renderer, vb),
            last_time_access: Date.now(),
            shader: shader
        };
        this.vbs[id] = stuff;
        return stuff;
    }

    remove_vb(id) {
        if (this.vbs[id]) {
            this.vbs[id].vb.destroy();
            this.vbs[id].vao.destroy();
            delete this.vbs[id];
        }
    }

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
            let gl = this.renderer.gl;
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
