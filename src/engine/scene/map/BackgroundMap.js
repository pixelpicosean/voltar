// Based on pixi-tilemap master~02218a043cacd310b49e2801a117423cb46b23d3
import Node2D from '../Node2D';

import { TextureCache } from '../../utils';
import { Matrix } from '../../math';
import './canvas/CanvasTileRenderer';
import './webgl/TileRenderer';


export default class BackgroundMap extends Node2D {
    constructor(tile_width, tile_height, data, texture) {
        super();

        this.type = 'BackgroundMap';

        this.data = data;

        this.tile_width = tile_width;
        this.tile_height = tile_height;

        this.pointsBuf = [];
        this._tempSize = new Float32Array([0, 0]);
        this._tempTexSize = 1;
        this.modificationMarker = 0;

        this.vbId = 0;
        this.vbBuffer = null;
        this.vbArray = null;
        this.vbInts = null;

        this._globalMat = new Matrix();
        this._tempScale = [0, 0];

        if (!texture) {
            this.textures = [];
        }
        else if (!Array.isArray(texture)) {
            if (texture.base_texture) {
                this.textures = [texture];
            }
            else {
                this.textures = [TextureCache[texture]];
            }
        }

        this._needs_redraw = true;
    }

    clear() {
        this.data = [[]];

        this.pointsBuf.length = 0;
        this.modificationMarker = 0;
    }

    get_tile(x, y) {
        return this.data[y][x];
    }
    set_tile(x, y, tile) {
        this.data[y][x] = tile;

        this._needs_redraw = true;
    }

    _push_tile(u, v, x, y) {
        var pb = this.pointsBuf;

        // var i;
        // if (this.tile_width % this.tile_height === 0) {
        //     //horizontal line on squares
        //     for (i = 0; i < this.tile_width / this.tile_height; i++) {
        //         pb.push(u + i * this.tile_height);
        //         pb.push(v);
        //         pb.push(x + i * this.tile_height);
        //         pb.push(y);
        //         pb.push(this.tile_height);
        //         pb.push(this.tile_height);
        //         pb.push(animX | 0);
        //         pb.push(animY | 0);
        //         pb.push(0);
        //     }
        // } else if (this.tile_height % this.tile_width === 0) {
        //     //vertical line on squares
        //     for (i = 0; i < this.tile_height / this.tile_width; i++) {
        //         pb.push(u);
        //         pb.push(v + i * this.tile_width);
        //         pb.push(x);
        //         pb.push(y + i * this.tile_width);
        //         pb.push(this.tile_width);
        //         pb.push(this.tile_width);
        //         pb.push(animX | 0);
        //         pb.push(animY | 0);
        //         pb.push(0);
        //     }
        // } else {
        //ok, ok, lets use rectangle. but its not working with square shader yet
        pb.push(u);
        pb.push(v);
        pb.push(x);
        pb.push(y);
        pb.push(this.tile_width);
        pb.push(this.tile_height);
        pb.push(0);
        // }
    }

    _draw_tiles() {
        let r, q, row, c, u, v;
        const tile_per_row = Math.floor(this.textures[0].width / this.tile_width);

        for (r = 0; r < this.data.length; r++) {
            row = this.data[r];
            for (q = 0; q < row.length; q++) {
                c = row[q];

                if (c === 0)
                    continue;
                else
                    c -= 1;

                u = Math.floor(c % tile_per_row) * this.tile_width;
                v = Math.floor(c / tile_per_row) * this.tile_height;

                this._push_tile(u, v, q * this.tile_width, r * this.tile_height);
            }
        }
    }

    _render_canvas(renderer) {
        if (this.textures.length === 0) return;

        // Check whether we need to redraw the whole map
        if (this._needs_redraw) {
            this._needs_redraw = false;
            this.pointsBuf.length = 0;
            this.modificationMarker = 0;
            this._draw_tiles();
        }

        // Start to render
        var wt = this.world_transform;
        renderer.context.setTransform(
            wt.a,
            wt.b,
            wt.c,
            wt.d,
            wt.tx * renderer.resolution,
            wt.ty * renderer.resolution
        );

        var points = this.pointsBuf;
        renderer.context.fillStyle = '#000000';
        for (var i = 0, n = points.length; i < n; i += 7) {
            var x1 = points[i], y1 = points[i + 1];
            var x2 = points[i + 2], y2 = points[i + 3];
            var w = points[i + 4];
            var h = points[i + 5];
            var textureId = points[i + 6];
            if (textureId >= 0) {
                renderer.context.drawImage(this.textures[textureId].base_texture.source, x1, y1, w, h, x2, y2, w, h);
            } else {
                renderer.context.globalAlpha = 0.5;
                renderer.context.fillRect(x2, y2, w, h);
                renderer.context.globalAlpha = 1;
            }
        }
    }

    _render_webgl(renderer) {
        // Check whether we need to redraw the whole map
        if (this._needs_redraw) {
            this._needs_redraw = false;
            this.pointsBuf.length = 0;
            this.modificationMarker = 0;
            this._draw_tiles();
        }

        // Start to render
        var gl = renderer.gl;
        var shader = renderer.plugins.tilemap.getShader();
        renderer.set_object_renderer(renderer.plugins.tilemap);
        renderer.bindShader(shader);
        renderer._active_render_target.projectionMatrix.copy(this._globalMat).append(this.world_transform);
        shader.uniforms.projectionMatrix = this._globalMat.to_array(true);

        var points = this.pointsBuf;
        if (points.length === 0) return;
        var rectsCount = points.length / 7;
        var tile = renderer.plugins.tilemap;
        var gl = renderer.gl;
        tile.checkIndexBuffer(rectsCount);

        var textures = this.textures;
        if (textures.length === 0) return;
        var len = textures.length;
        if (this._tempTexSize < shader.maxTextures) {
            this._tempTexSize = shader.maxTextures;
            this._tempSize = new Float32Array(2 * shader.maxTextures);
        }
        // var samplerSize = this._tempSize;
        for (var i = 0; i < len; i++) {
            if (!textures[i] || !textures[i].valid) return;
        }
        tile.bindTextures(renderer, shader, textures);
        // shader.uniforms.uSamplerSize = samplerSize;
        //lost context! recover!
        var vb = tile.getVb(this.vbId);
        if (!vb) {
            vb = tile.createVb();
            this.vbId = vb.id;
            this.vbBuffer = null;
            this.modificationMarker = 0;
        }
        var vao = vb.vao;
        renderer.bindVao(vao);
        var vertexBuf = vb.vb;
        //if layer was changed, re-upload vertices
        vertexBuf.bind();
        var vertices = rectsCount * shader.vertPerQuad;
        if (vertices === 0) return;
        if (this.modificationMarker != vertices) {
            this.modificationMarker = vertices;
            var vs = shader.stride * vertices;
            if (!this.vbBuffer || this.vbBuffer.byteLength < vs) {
                //!@#$ happens, need resize
                var bk = shader.stride;
                while (bk < vs) {
                    bk *= 2;
                }
                this.vbBuffer = new ArrayBuffer(bk);
                this.vbArray = new Float32Array(this.vbBuffer);
                this.vbInts = new Uint32Array(this.vbBuffer);
                vertexBuf.upload(this.vbBuffer, 0, true);
            }

            var arr = this.vbArray, ints = this.vbInts;
            //upload vertices!
            var sz = 0;
            var textureId, shiftU, shiftV;

            var tint = -1;
            for (i = 0; i < points.length; i += 7) {
                var eps = 0.5;
                textureId = (points[i + 6] >> 2);
                shiftU = 1024 * (points[i + 6] & 1);
                shiftV = 1024 * ((points[i + 6] >> 1) & 1);
                var x = points[i + 2], y = points[i + 3];
                var w = points[i + 4], h = points[i + 5];
                var u = points[i] + shiftU, v = points[i + 1] + shiftV;
                arr[sz++] = x;
                arr[sz++] = y;
                arr[sz++] = u;
                arr[sz++] = v;
                arr[sz++] = u + eps;
                arr[sz++] = v + eps;
                arr[sz++] = u + w - eps;
                arr[sz++] = v + h - eps;
                arr[sz++] = textureId;
                arr[sz++] = x + w;
                arr[sz++] = y;
                arr[sz++] = u + w;
                arr[sz++] = v;
                arr[sz++] = u + eps;
                arr[sz++] = v + eps;
                arr[sz++] = u + w - eps;
                arr[sz++] = v + h - eps;
                arr[sz++] = textureId;
                arr[sz++] = x + w;
                arr[sz++] = y + h;
                arr[sz++] = u + w;
                arr[sz++] = v + h;
                arr[sz++] = u + eps;
                arr[sz++] = v + eps;
                arr[sz++] = u + w - eps;
                arr[sz++] = v + h - eps;
                arr[sz++] = textureId;
                arr[sz++] = x;
                arr[sz++] = y + h;
                arr[sz++] = u;
                arr[sz++] = v + h;
                arr[sz++] = u + eps;
                arr[sz++] = v + eps;
                arr[sz++] = u + w - eps;
                arr[sz++] = v + h - eps;
                arr[sz++] = textureId;
            }
            // if (vs > this.vbArray.length/2 ) {
            vertexBuf.upload(arr, 0, true);
            // } else {
            //     var view = arr.subarray(0, vs);
            //     vb.upload(view, 0);
            // }
        }
        gl.drawElements(gl.TRIANGLES, rectsCount * 6, gl.UNSIGNED_SHORT, 0);
    }
}
