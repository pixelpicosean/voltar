// Based on pixi-tilemap master~02218a043cacd310b49e2801a117423cb46b23d3
import { node_class_map } from 'engine/registry';
import { Matrix, Vector2 } from 'engine/core/math/index';
import Texture from 'engine/scene/resources/textures/texture';

import TileSet from '../resources/tile_set';
import TileRenderer from './renderer/tile_renderer';

import Node2D from '../node_2d';

export default class TileMap extends Node2D {
    constructor() {
        super();

        this.type = 'TileMap';

        this.cell_size = new Vector2(64, 64);

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
        this.tile_set = new TileSet();

        // Rendering caches
        /** @type {number[]} */
        this.points_buf = [];

        this._temp_size = new Float32Array([0, 0]);
        this._temp_tex_size = 1;

        /** @type {number} */
        this.modification_marker = 0;

        this.shadow_color = new Float32Array([0.0, 0.0, 0.0, 0.5]);

        this.vb_id = 0;
        /** @type {ArrayBuffer} */
        this.vb_buffer = null;
        /** @type {Float32Array} */
        this.vb_array = null;
        /** @type {Uint32Array} */
        this.vb_ints = null;

        this._global_mat = new Matrix();
        this._temp_scale = [0, 0];

        this._needs_redraw = true;
    }

    _load_data(data) {
        super._load_data(data);

        this.tile_set = TileSet.with_key(data.tile_set);
        this.data = data.tile_data;

        this._needs_redraw = true;

        return this;
    }

    clear() {
        this.data.length = 0;

        this.points_buf.length = 0;
        this.modification_marker = 0;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} u
     * @param {number} v
     * @param {number} tile_width
     * @param {number} tile_height
     * @param {number} [texture_index]
     */
    _push_tile(x, y, u, v, tile_width, tile_height, texture_index = 0) {
        const pb = this.points_buf;

        pb.push(u);
        pb.push(v);
        pb.push(x);
        pb.push(y);
        pb.push(tile_width);
        pb.push(tile_height);
        pb.push(texture_index);
    }

    _draw_tiles() {
        // Reset
        this.points_buf.length = 0;
        this.modification_marker = 0;

        // Upload textures
        this.textures[0] = this.tile_set.texture;

        // Create tiles
        for (let i = 0; i < this.data.length; i += 3) {
            const tile = this.tile_set.tile_map[this.data[i + 2]];
            this._push_tile(
                this.data[i + 0] * this.cell_size.x, this.data[i + 1] * this.cell_size.y,
                tile.region.x, tile.region.y,
                tile.region.width, tile.region.height
            );
        }
    }

    /**
     * @param {import('engine/servers/visual/webgl_renderer').default} renderer
     */
    _render_webgl(renderer) {
        const gl = renderer.gl;
        /** @type {import('./renderer/tile_renderer').default} */
        const plugin = renderer.plugins.tilemap;
        const shader = plugin.get_shader();
        renderer.set_object_renderer(plugin);
        renderer.bind_shader(shader);

        this._global_mat.copy(renderer._active_render_target.projection_matrix).append(this.world_transform);
        shader.uniforms.projection_matrix = this._global_mat.to_array(true);
        shader.uniforms.shadow_color = this.shadow_color;
        this._render_webgl_core(renderer, plugin);
    }

    /**
     * @param {import('engine/servers/visual/webgl_renderer').default} renderer
     * @param {TileRenderer} plugin
     */
    _render_webgl_core(renderer, plugin) {
        // Check whether we need to redraw the whole map
        if (this._needs_redraw) {
            this._needs_redraw = false;
            this._draw_tiles();
        }

        const points = this.points_buf;
        if (points.length === 0) return;
        const rects_count = points.length / 7;

        const tile = plugin;
        const gl = renderer.gl;

        const shader = tile.get_shader();
        const textures = this.textures;
        if (textures.length === 0) return;

        tile.bind_textures(renderer, shader, textures);

        // lost context! recover!
        let vb = tile.get_vb(this.vb_id);
        if (!vb) {
            vb = tile.create_vb();
            this.vb_id = vb.id;
            this.vb_buffer = null;
            this.modification_marker = 0;
        }

        const vao = vb.vao;
        renderer.bind_vao(vao);

        tile.check_index_buffer(rects_count);

        const vertex_buf = vb.vb;
        // if layer was changed, re-upload vertices
        vertex_buf.bind();

        const vertices = rects_count * shader.vert_per_quad;
        if (vertices === 0) return;

        if (this.modification_marker !== vertices) {
            this.modification_marker = vertices;
            const vs = shader.stride * vertices;
            if (!this.vb_buffer || this.vb_buffer.byteLength < vs) {
                //!@#$ happens, need resize
                let bk = shader.stride;
                while (bk < vs) {
                    bk *= 2;
                }
                this.vb_buffer = new ArrayBuffer(bk);
                this.vb_array = new Float32Array(this.vb_buffer);
                this.vb_ints = new Uint32Array(this.vb_buffer);
                vertex_buf.upload(this.vb_buffer, 0, true);
            }

            const arr = this.vb_array, ints = this.vb_ints;
            //upload vertices!
            let sz = 0;
            let texture_id = 0, shift_u = 0, shift_v = 0;

            for (let i = 0, len = points.length; i < len; i += 7) {
                const eps = 0.5;

                texture_id = (points[i + 6] >> 2);

                const x = points[i + 2];
                const y = points[i + 3];

                const w = points[i + 4];
                const h = points[i + 5];

                const u = points[i] + shift_u;
                const v = points[i + 1] + shift_v;

                arr[sz++] = x;
                arr[sz++] = y;
                arr[sz++] = u;
                arr[sz++] = v;
                arr[sz++] = u + eps;
                arr[sz++] = v + eps;
                arr[sz++] = u + w - eps;
                arr[sz++] = v + h - eps;
                arr[sz++] = texture_id;
                arr[sz++] = x + w;
                arr[sz++] = y;
                arr[sz++] = u + w;
                arr[sz++] = v;
                arr[sz++] = u + eps;
                arr[sz++] = v + eps;
                arr[sz++] = u + w - eps;
                arr[sz++] = v + h - eps;
                arr[sz++] = texture_id;
                arr[sz++] = x + w;
                arr[sz++] = y + h;
                arr[sz++] = u + w;
                arr[sz++] = v + h;
                arr[sz++] = u + eps;
                arr[sz++] = v + eps;
                arr[sz++] = u + w - eps;
                arr[sz++] = v + h - eps;
                arr[sz++] = texture_id;
                arr[sz++] = x;
                arr[sz++] = y + h;
                arr[sz++] = u;
                arr[sz++] = v + h;
                arr[sz++] = u + eps;
                arr[sz++] = v + eps;
                arr[sz++] = u + w - eps;
                arr[sz++] = v + h - eps;
                arr[sz++] = texture_id;
            }
            vertex_buf.upload(arr, 0, true);
        }
        gl.drawElements(gl.TRIANGLES, rects_count * 6, gl.UNSIGNED_SHORT, 0);
    }
}

node_class_map['TileMap'] = TileMap;
