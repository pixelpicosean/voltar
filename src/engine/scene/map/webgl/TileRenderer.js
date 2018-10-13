import ObjectRenderer from '../../../renderers/webgl/utils/ObjectRenderer';

import WebGLRenderer from '../../../renderers/webgl/WebGLRenderer';
import RenderTexture from '../../../textures/RenderTexture';
import Sprite from '../../sprites/Sprite';
import { WRAP_MODES, BLEND_MODES } from '../../../const';

import { GLBuffer } from 'pixi-gl-core';

import RectTileShader from './RectTileShader';


function _hackSubImage(tex, sprite, clearBuffer, clearWidth, clearHeight) {
    const gl = tex.gl;
    const baseTex = sprite.texture.base_texture;
    if (clearBuffer && clearWidth > 0 && clearHeight > 0)
    {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, sprite.position.x, sprite.position.y, clearWidth, clearHeight, tex.format, tex.type, clearBuffer);
    }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, sprite.position.x, sprite.position.y, tex.format, tex.type, baseTex.source);
}

/*
 * Renderer for square and rectangle tiles.
 * Squares cannot be rotated, skewed.
 *
 * @class
 * @extends ObjectRenderer
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
        this._clearBuffer = null;
        this.lastTimeCheck = 0;
        this.tileAnim = [0, 0];
        this.maxTextures = 4;
        this.texLoc = [];

        this.rectShader = null;
        this.boundSprites = null;
        this.glTextures = null;
    }

    on_context_change() {
        const gl = this.renderer.gl;
        const maxTextures = this.maxTextures;
        this.rectShader = new RectTileShader(gl, maxTextures);
        this.checkIndexBuffer(2000);
        this.rectShader.index_buffer = this.index_buffer;
        this.vbs = {};
        this.glTextures = [];
        this.boundSprites = [];
        this.initBounds();
    }

    initBounds() {
        const gl = this.renderer.gl;
        for (let i = 0; i < this.maxTextures; i++) {
            const rt = RenderTexture.create(2048, 2048);
            rt.base_texture.premultiplied_alpha = true;
            rt.base_texture.wrap_mode = WRAP_MODES.CLAMP;
            this.renderer.texture_manager.update_texture(rt);

            this.glTextures.push(rt);
            const bounds = this.boundSprites;
            for (let j = 0; j < 4; j++) {
                const spr = new Sprite();
                spr.position.x = 1024 * (j & 1);
                spr.position.y = 1024 * (j >> 1);
                bounds.push(spr);
            }
        }
    }

    bindTextures(renderer, shader, textures) {
        const len = textures.length;
        const maxTextures = this.maxTextures;
        if (len > 4 * maxTextures) {
            return;
        }
        const doClear = TileRenderer.DO_CLEAR;
        if (doClear && !this._clearBuffer) {
            this._clearBuffer = new Uint8Array(1024 * 1024 * 4);
        }
        const glts = this.glTextures;
        const bounds = this.boundSprites;

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
                if (doClear) {
                    _hackSubImage((glt.base_texture)._gl_textures[renderer.CONTEXT_UID], bs, this._clearBuffer, 1024, 1024);
                } else {
                    _hackSubImage((glt.base_texture)._gl_textures[renderer.CONTEXT_UID], bs);
                }
            }
        }
        this.texLoc.length = 0;
        for (i = 0; i < maxTextures; i++) {
            //remove "i, true" after resolving a bug
            this.texLoc.push(renderer.bind_texture(glts[i], i, true))
        }
        shader.uniforms.uSamplers = this.texLoc;
    }

    checkLeaks() {
        const now = Date.now();
        const old = now - 10000;
        if (this.lastTimeCheck < old ||
            this.lastTimeCheck > now) {
            this.lastTimeCheck = now;
            const vbs = this.vbs;
            for (let key in vbs) {
                if (vbs[key].lastTimeAccess < old) {
                    this.removeVb(key);
                }
            }
        }
    }

    start() {
        this.renderer.state.setBlendMode(BLEND_MODES.NORMAL);
        //sorry, nothing
    }

    getVb(id) {
        this.checkLeaks();
        const vb = this.vbs[id];
        if (vb) {
            vb.lastAccessTime = Date.now();
            return vb;
        }
        return null;
    }

    createVb() {
        const id = ++TileRenderer.vbAutoincrement;
        const shader = this.getShader();
        const gl = this.renderer.gl;
        const vb = GLBuffer.createVertexBuffer(gl, null, gl.STREAM_DRAW);
        const stuff = {
            id: id,
            vb: vb,
            vao: shader.createVao(this.renderer, vb),
            lastTimeAccess: Date.now(),
            shader: shader
        };
        this.vbs[id] = stuff;
        return stuff;
    }

    removeVb(id) {
        if (this.vbs[id]) {
            this.vbs[id].vb.destroy();
            this.vbs[id].vao.destroy();
            delete this.vbs[id];
        }
    }

    checkIndexBuffer(size) {
        // the total number of indices in our array, there are 6 points per quad.
        const totalIndices = size * 6;
        let indices = this.indices;
        if (totalIndices <= indices.length) {
            return;
        }
        let len = indices.length || totalIndices;
        while (len < totalIndices) {
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
            this.index_buffer = GLBuffer.createIndexBuffer(gl, this.indices, gl.STATIC_DRAW);
        }
    }

    getShader() {
        return this.rectShader;
    }

    destroy() {
        super.destroy();
        this.rectShader.destroy();
        this.rectShader = null;
    }
}

TileRenderer.vbAutoincrement = 0;
TileRenderer.DO_CLEAR = false;

WebGLRenderer.register_plugin('tilemap', TileRenderer);
