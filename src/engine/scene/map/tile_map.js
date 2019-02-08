// Based on pixi-tilemap master~02218a043cacd310b49e2801a117423cb46b23d3
import Node2D from '../Node2D';

import { TextureCache } from 'engine/utils/index';
import { Matrix, Vector2 } from 'engine/math/index';
import Texture from 'engine/textures/Texture';
import { node_class_map } from 'engine/registry';
import TileSet from '../resources/tile_set';

export default class TileMap extends Node2D {
    constructor() {
        super();

        this.type = 'TileMap';

        this.cell_size = new Vector2();

        /**
         * @type {Texture[]}
         */
        this.textures = [];

        /**
         * @type {number[]}
         */
        this.data = [];

        /**
         * @type {TileSet}
         */
        this.tile_set = null;


        // Rendering caches
        this.points_buf = [];
        this._temp_size = new Float32Array([0, 0]);
        this._temp_tex_size = 1;
        this.modification_marker = 0;

        this.vb_id = 0;
        this.vb_buffer = null;
        this.vb_array = null;
        this.vb_ints = null;

        this._global_mat = new Matrix();
        this._temp_scale = [0, 0];

        this._needs_redraw = true;
    }

    clear() {
        this.data = [];

        this.points_buf.length = 0;
        this.modification_marker = 0;
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    get_tile(x, y) {
        return this.data[y][x];
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} tile
     */
    set_tile(x, y, tile) {
        this.data[y][x] = tile;

        this._needs_redraw = true;
    }

    /**
     * @param {number} u
     * @param {number} v
     * @param {number} x
     * @param {number} y
     */
    _push_tile(u, v, x, y) {
        var pb = this.points_buf;

        pb.push(u);
        pb.push(v);
        pb.push(x);
        pb.push(y);
        pb.push(this.cell_size.x);
        pb.push(this.cell_size.y);

        // TODO: support multi-textures
        pb.push(0);
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

    /**
     * @param {import('engine/renderers/WebGLRenderer').default} renderer
     */
    _render_webgl(renderer) {
        // Check whether we need to redraw the whole map
        if (this._needs_redraw) {
            this._needs_redraw = false;
            this.points_buf.length = 0;
            this.modification_marker = 0;
            this._draw_tiles();
        }

        // Start to render
        var gl = renderer.gl;
        var shader = renderer.plugins.tilemap.get_shader();
        renderer.set_object_renderer(renderer.plugins.tilemap);
        renderer.bind_shader(shader);
        this._global_mat.copy(renderer._active_render_target.projection_matrix).append(this.world_transform);
        shader.uniforms.projectionMatrix = this._global_mat.to_array(true);

        var points = this.points_buf;
        if (points.length === 0) return;
        var rects_count = points.length / 7;
        var tile = renderer.plugins.tilemap;
        var gl = renderer.gl;
        tile.check_index_buffer(rects_count);

        var textures = this.textures;
        if (textures.length === 0) return;
        var len = textures.length;
        if (this._temp_tex_size < shader.maxTextures) {
            this._temp_tex_size = shader.maxTextures;
            this._temp_size = new Float32Array(2 * shader.maxTextures);
        }
        // var samplerSize = this._tempSize;
        for (var i = 0; i < len; i++) {
            if (!textures[i] || !textures[i].valid) return;
        }
        tile.bind_textures(renderer, shader, textures);
        // shader.uniforms.uSamplerSize = samplerSize;
        //lost context! recover!
        var vb = tile.get_vb(this.vb_id);
        if (!vb) {
            vb = tile.create_vb();
            this.vb_id = vb.id;
            this.vb_buffer = null;
            this.modification_marker = 0;
        }
        var vao = vb.vao;
        renderer.bind_vao(vao);
        var vertexBuf = vb.vb;
        //if layer was changed, re-upload vertices
        vertexBuf.bind();
        var vertices = rects_count * shader.vertPerQuad;
        if (vertices === 0) return;
        if (this.modification_marker != vertices) {
            this.modification_marker = vertices;
            var vs = shader.stride * vertices;
            if (!this.vb_buffer || this.vb_buffer.byteLength < vs) {
                //!@#$ happens, need resize
                var bk = shader.stride;
                while (bk < vs) {
                    bk *= 2;
                }
                this.vb_buffer = new ArrayBuffer(bk);
                this.vb_array = new Float32Array(this.vb_buffer);
                this.vb_ints = new Uint32Array(this.vb_buffer);
                vertexBuf.upload(this.vb_buffer, 0, true);
            }

            var arr = this.vb_array, ints = this.vb_ints;
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
            vertexBuf.upload(arr, 0, true);
        }
        gl.drawElements(gl.TRIANGLES, rects_count * 6, gl.UNSIGNED_SHORT, 0);
    }
}

node_class_map['TileMap'] = TileMap;