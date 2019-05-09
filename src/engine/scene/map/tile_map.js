// Based on pixi-tilemap master~02218a043cacd310b49e2801a117423cb46b23d3
import { node_class_map } from 'engine/registry';
import { VMap_new, VMap_get, VMap_erase, VMap_set } from 'engine/core/v_map';
import { Matrix, Vector2, Rectangle } from 'engine/core/math/index';
import SelfList, { List } from 'engine/core/self_list';
import PhysicsServer from 'engine/servers/physics_2d/physics_server';
import Body2DSW from 'engine/servers/physics_2d/body_2d_sw';
import Texture from 'engine/scene/resources/textures/texture';

import TileSet, { SINGLE_TILE } from '../resources/tile_set';
import TileRenderer from './renderer/tile_renderer';

import Node2D from '../node_2d';
import { BodyMode, BodyState } from '../physics/const';

export const Mode = {
    SQUARE: 0,
    ISOMETRIC: 1,
    CUSTOM: 2,
}

export const HalfOffset = {
    X: 0,
    Y: 1,
    DISABLED: 2,
}

export const TileOrigin = {
    TOP_LEFT: 0,
    CENTER: 1,
    BOTTOM_LEFT: 2,
}

export const INVALID_CELL = -1;

class Cell {
    constructor(id = 0) {
        this.id = 0;
        this.flip_h = false;
        this.flip_v = false;
        this.transpose = false;
        this.autotile_coord_x = 0;
        this.autotile_coord_y = 0;
    }
}

class NavPoly {
    constructor() {
        this.id = 0;
        this.xform = new Matrix();
    }
}

class Occluder {
    constructor() {
        this.id = 0;
        this.xform = new Matrix();
    }
}

class Quadrant {
    constructor() {
        this.pos = new Vector2();

        /**
         * @type {Body2DSW}
         */
        this.body = null;

        /**
         * @type {SelfList<Quadrant>}
         */
        this.dirty_list = new SelfList(this);

        /**
         * @type {NavPoly[]}
         */
        this.navpoly_ids = [];

        /**
         * @type {Occluder[]}
         */
        this.occluder_instances = [];

        /**
         * @type {import('engine/core/v_map').VMap<number>}
         */
        this.cells = VMap_new();
    }
}

const buffer = new ArrayBuffer(12);
const view = new DataView(buffer);

export default class TileMap extends Node2D {
    constructor() {
        super();

        this.type = 'TileMap';

        this._mode = Mode.SQUARE;

        this.collision_layer = 1;
        this.collision_mask = 1;

        this.collision_friction = 1;
        this.collision_bounce = 0;

        this.cell_clip_uv = false;
        this._cell_custom_transform = new Matrix();
        this.cell_half_offset = HalfOffset.DISABLED;
        this._cell_quadrant_size = 16;
        this._cell_size = new Vector2(64, 64);
        this.cell_tile_origin = TileOrigin.TOP_LEFT;
        this.cell_y_sort = false;

        /**
         * @type {import('engine/core/v_map').VMap<Cell>}
         */
        this.tile_map = VMap_new();

        /**
         * @type {import('engine/core/v_map').VMap<Quadrant>}
         */
        this.quadrant_map = VMap_new();

        /**
         * @type {List<Quadrant>}
         */
        this.dirty_quadrant_list = new List();

        this.pending_updates = false;

        this.rect_cache = new Rectangle();
        this.rect_cache_dirty = true;
        this.used_size_cache = new Rectangle();
        this.used_size_cache_dirty = false;
        this.quadrant_order_dirty = false;

        /**
         * @type {Texture[]}
         */
        this.textures = [];

        /**
         * @type {number[]}
         */
        this._data = [];

        /**
         * @type {TileSet}
         */
        this._tile_set = null;

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
    }

    _load_data(data) {
        super._load_data(data);

        if (data.mode !== undefined) {
            this.set_mode(data.mode);
        }

        if (data.tile_set !== undefined) {
            this.set_tile_set(data.tile_set);
        }

        if (data.cell_size !== undefined) {
            this.set_cell_size(data.cell_size);
        }

        if (data.tile_data !== undefined) {
            this._data = data.tile_data;
        }

        return this;
    }

    _propagate_enter_tree() {
        super._propagate_enter_tree();

        const data = this._data;
        if (data.length > 0) {
            for (let i = 0; i < data.length; i += 3) {
                // Insert int32 data
                view.setInt32(0, data[i + 0]); // 0 - 4 byte
                view.setInt32(4, data[i + 1]); // 4 - 8 byte
                view.setInt32(8, data[i + 2]); // 8 - 12 byte

                // Decode real data from the buffer
                const y = view.getInt16(0); // 0 - 2 byte
                const x = view.getInt16(2); // 2 - 4 byte
                const t = view.getUint32(4); // 4 - 8 byte

                // TODO: parse tile flags `view.getUint32(8)` // 8 - 12 byte

                this.set_cell(x, y, t);
            }
        }
    }

    clear() {
        this._data.length = 0;

        this.points_buf.length = 0;
        this.modification_marker = 0;
    }

    get mode() {
        return this._mode;
    }
    set mode(value) {
        this.set_mode(value);
    }
    /**
     * @param {number} value
     */
    set_mode(value) {
        this._clear_quadrants();
        this._mode = value;
        this._recreate_quadrants();
        return this;
    }

    get cell_size() {
        return this._cell_size;
    }
    set cell_size(value) {
        this.set_cell_size(value);
    }
    /**
     * @param {Vector2} value
     */
    set_cell_size(value) {
        this._clear_quadrants();
        this._cell_size.copy(value);
        this._recreate_quadrants();
        return this;
    }

    get cell_quadrant_size() {
        return this._cell_quadrant_size;
    }
    set cell_quadrant_size(value) {
        this.set_cell_quadrant_size(value);
    }
    /**
     * @param {number} value
     */
    set_cell_quadrant_size(value) {
        this._clear_quadrants();
        this._cell_quadrant_size = value;
        this._recreate_quadrants();
        return this;
    }

    get cell_custom_transform() {
        return this._cell_custom_transform;
    }
    set cell_custom_transform(value) {
        this.set_cell_custom_transform(value);
    }
    /**
     * @param {Matrix} value
     */
    set_cell_custom_transform(value) {
        this._clear_quadrants();
        this._cell_custom_transform.copy(value);
        this._recreate_quadrants();
        return this;
    }

    get tile_set() {
        return this._tile_set;
    }
    set tile_set(value) {
        this.set_tile_set(value);
    }
    /**
     * @param {string|TileSet} value
     */
    set_tile_set(value) {
        let tile_set = value;
        if (typeof (value) === 'string') {
            tile_set = TileSet.with_key(value);
        } else {
            tile_set = value;
        }

        this._clear_quadrants();
        this._tile_set = tile_set;
        this._recreate_quadrants();

        return this;
    }

    /**
     * @param {number} p_x
     * @param {number} p_y
     * @param {number} p_tile
     * @param {boolean} [p_flip_x]
     * @param {boolean} [p_flip_y]
     * @param {boolean} [p_transpose]
     * @param {Vector2} [p_autotile_coord]
     */
    set_cell(p_x, p_y, p_tile, p_flip_x = false, p_flip_y = false, p_transpose = false, p_autotile_coord = Vector2.ZERO) {
        let E = VMap_get(this.tile_map, p_x, p_y);
        if (!E && p_tile === INVALID_CELL) {
            return;
        }

        const qk_x = Math.floor(p_x / this._cell_quadrant_size);
        const qk_y = Math.floor(p_y / this._cell_quadrant_size);
        if (p_tile === INVALID_CELL) {
            // erase existing
            VMap_erase(this.tile_map, p_x, p_y);
            const q = VMap_get(this.quadrant_map, qk_x, qk_y);
            VMap_erase(q.cells, p_x, p_y);
            if (q.cells.size === 0) {
                this._erase_quadrant(qk_x, qk_y);
            } else {
                this._make_quadrant_dirty(q);
            }

            return;
        }

        let q = VMap_get(this.quadrant_map, qk_x, qk_y);

        if (!E) {
            E = new Cell();
            VMap_set(this.tile_map, p_x, p_y, E);
            if (!q) {
                q = this._create_quadrant(qk_x, qk_y);
            }
            VMap_set(q.cells, p_x, p_y, 1);
        } else {
            if (
                E.id === p_tile
                &&
                E.flip_h === p_flip_x
                &&
                E.flip_v === p_flip_y
                &&
                E.transpose === p_transpose
                &&
                E.autotile_coord_x === p_autotile_coord.x
                &&
                E.autotile_coord_y === p_autotile_coord.y
            ) {
                return; // nothing changed
            }
        }

        E.id = p_tile;
        E.flip_h = p_flip_x;
        E.flip_v = p_flip_y;
        E.transpose = p_transpose;
        E.autotile_coord_y = p_autotile_coord.x;
        E.autotile_coord_y = p_autotile_coord.y;

        this._make_quadrant_dirty(q);
        this.used_size_cache_dirty = true;
    }

    /**
     * @param {Matrix} [out]
     */
    get_cell_transform(out) {
        out = out || Matrix.new();
        out.reset();

        const cell_size_x = this._cell_size.x;
        const cell_size_y = this._cell_size.y;

        switch (this.mode) {
            case Mode.SQUARE: {
                out.a *= cell_size_x;
                out.b *= cell_size_x;
                out.c *= cell_size_y;
                out.d *= cell_size_y;
            } break;
            case Mode.ISOMETRIC: {
                // isometric only makes sense when y is positive in both x and y vectors, otherwise
                // the drawing of tiles will overlap
                out.a = cell_size_x * 0.5;
                out.b = cell_size_y * 0.5;
                out.c = -cell_size_x * 0.5;
                out.d = cell_size_y * 0.5;
            } break;
            case Mode.CUSTOM: {
                out.copy(this._cell_custom_transform);
            } break;
        }

        return out;
    }

    /**
     * @param {Vector2} [out]
     */
    get_cell_draw_offset(out) {
        out = out || Vector2.new();

        switch (this.mode) {
            case Mode.SQUARE: {
            } break;
            case Mode.ISOMETRIC: {
                out.set(-this._cell_size.x * 0.5, 0);
            } break;
            case Mode.CUSTOM: {
                out.x = Math.min(this._cell_custom_transform.a, out.x);
                out.y = Math.min(this._cell_custom_transform.b, out.y);
                out.x = Math.min(this._cell_custom_transform.c, out.x);
                out.y = Math.min(this._cell_custom_transform.d, out.y);
            } break;
        }

        return out;
    }

    update_dirty_quadrants() {
        if (!this.pending_updates) {
            return;
        }
        if (!this.is_inside_tree || !this._tile_set) {
            this.pending_updates = false;
            return;
        }

        const ps = PhysicsServer.singleton;
        const tofs = this.get_cell_draw_offset();

        // TODO: navigation support

        // Reset
        this.points_buf.length = 0;
        this.modification_marker = 0;

        // Upload textures
        this.textures[0] = this._tile_set.texture;

        while (this.dirty_quadrant_list._first) {
            const q = this.dirty_quadrant_list._first._self;

            ps.body_clear_shapes(q.body);
            let shape_idx = 0;

            for (const [x, y_map] of q.cells) {
                for (const [y, _] of y_map) {
                    // Fetch tile data
                    const c = VMap_get(this.tile_map, x, y);
                    if (!this._tile_set.has_tile(c.id)) {
                        continue;
                    }
                    const tile = this._tile_set.get_tile(c.id);

                    const r = tile.region;
                    const s = Vector2.new(r.width, r.height);

                    // Draw tiles
                    const wofs = this._map_to_world(x, y);
                    const offset = wofs.subtract(q.pos).add(tofs);
                    this._push_tile(
                        q.pos.x + offset.x, q.pos.y + offset.y,
                        tile.region.x, tile.region.y,
                        tile.region.width, tile.region.height
                    );
                    Vector2.free(offset);

                    // Add shapes
                    for (const sd of tile.shapes_data) {
                        if (sd.shape) {
                            if (tile.tile_mode === SINGLE_TILE || (sd.autotile_coord.x == c.autotile_coord_x && sd.autotile_coord.y === c.autotile_coord_y)) {
                                const xform = Matrix.new();
                                xform.tx = Math.floor(offset.x);
                                xform.ty = Math.floor(offset.y);

                                const shape_ofs = sd.shape_transform.origin;
                                this._fix_cell_transform(xform, c, shape_ofs, s);

                                const un_t = sd.shape_transform.untranslated();
                                xform.append(un_t);

                                ps.body_add_shape(q.body, sd.shape.shape, xform);
                                ps.body_set_shape_as_one_way_collision(q.body, shape_idx, sd.one_way_collision, sd.one_way_collision_margin)
                                shape_idx++;

                                Matrix.free(un_t);
                                Matrix.free(xform);
                            }
                        }
                    }

                    Vector2.free(s);
                }
            }

            this.dirty_quadrant_list.remove(this.dirty_quadrant_list._first);
            this.quadrant_order_dirty = true;
        }

        this.pending_updates = false;
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    _create_quadrant(x, y) {
        const xform = Matrix.new();
        const q = new Quadrant();
        const q_size = this._cell_quadrant_size;
        const pos = this._map_to_world(x * q_size, y * q_size);
        const cell_draw_offset = this.get_cell_draw_offset();
        q.pos.copy(pos).add(cell_draw_offset);
        if (this.cell_tile_origin === TileOrigin.CENTER) {
            q.pos.add(this._cell_size.x / 2, this._cell_size.y / 2);
        } else if (this.cell_tile_origin === TileOrigin.BOTTOM_LEFT) {
            q.pos.y += this._cell_size.y;
        }

        xform.set_origin(q.pos);
        q.body = PhysicsServer.singleton.body_create();
        q.body.mode = BodyMode.STATIC;

        q.body.instance = this;
        q.body.collision_layer = this.collision_layer;
        q.body.collision_mask = this.collision_mask;
        q.body.friction = this.collision_friction;
        q.body.bounce = this.collision_bounce;

        if (this.is_inside_tree) {
            const g_xform = this.get_global_transform().clone();
            xform.copy(g_xform.append(xform));
            PhysicsServer.singleton.body_set_space(q.body, this.get_world_2d().space);
            Matrix.free(g_xform);
        }

        q.body.set_state(BodyState.TRANSFORM, xform);

        this.rect_cache_dirty = true;
        this.quadrant_order_dirty = true;

        Vector2.free(cell_draw_offset);
        Vector2.free(pos);
        Matrix.free(xform);

        return VMap_set(this.quadrant_map, x, y, q);
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    _erase_quadrant(x, y) {
        const q = VMap_get(this.quadrant_map, x, y);

        // Remove physics body
        PhysicsServer.singleton.body_set_space(q.body, null);

        // Remove from dirty list
        if (q.dirty_list.in_list()) {
            this.dirty_quadrant_list.remove(q.dirty_list);
        }

        // TODO: remove navigation and occluder objects

        VMap_erase(this.quadrant_map, x, y);
        this.rect_cache_dirty = true;
    }

    _recreate_quadrants() {
        this._clear_quadrants();

        for (const [x, y_map] of this.tile_map) {
            for (const [y, _] of y_map) {

                const q = Vector2.new(x, y).scale(1 / this._cell_quadrant_size).floor();

                let Q = VMap_get(this.quadrant_map, q.x, q.y);
                if (!Q) {
                    Q = this._create_quadrant(q.x, q.y);
                    this.dirty_quadrant_list.add_last(Q.dirty_list);
                }

                VMap_set(Q.cells, x, y, 1);
                this._make_quadrant_dirty(Q, false);
            }
        }
    }
    _clear_quadrants() {
        for (const [x, y_map] of this.quadrant_map) {
            for (const [y, _] of y_map) {
                this._erase_quadrant(x, y);
            }
        }
    }

    /**
     * @param {Quadrant} q
     * @param {boolean} [update]
     */
    _make_quadrant_dirty(q, update = true) {
        if (!q.dirty_list.in_list()) {
            this.dirty_quadrant_list.add_last(q.dirty_list);
        }

        if (this.pending_updates) {
            return;
        }
        this.pending_updates = true;
        if (!this.is_inside_tree) {
            return;
        }

        if (update) {
            this.call_deferred('update_dirty_quadrants');
        }
    }

    /**
     * @param {Matrix} xform
     * @param {Cell} p_cell
     * @param {Vector2} p_offset
     * @param {Vector2} p_sc
     */
    _fix_cell_transform(xform, p_cell, p_offset, p_sc) {
        const s = p_sc.clone();
        const offset = p_offset.clone();

        // if (this.cell_tile_origin === TileOrigin.BOTTOM_LEFT) {
        //     offset.y += this._cell_size.y;
        // } else if (this.cell_tile_origin === TileOrigin.CENTER) {
        //     offset.x += this._cell_size.x / 2;
        //     offset.y += this._cell_size.y / 2;
        // }

        // if (s.y > s.x) {
        //     if ((p_cell.flip_h && (p_cell.flip_v || p_cell.transpose)) || (p_cell.flip_v && !p_cell.transpose)) {
        //         offset.y += (s.y - s.x);
        //     }
        // } else if (s.y < s.x) {
        //     if ((p_cell.flip_v && (p_cell.flip_h || p_cell.transpose)) || (p_cell.flip_h && !p_cell.transpose)) {
        //         offset.x += (s.x - s.y);
        //     }
        // }

        // if (p_cell.transpose) {
        // }

        // if (p_cell.flip_h) {
        // }
        // if (p_cell.flip_v) {
        // }

        xform.tx += offset.x;
        xform.ty += offset.y;

        Vector2.free(offset);
        Vector2.free(s);
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

    /**
     * @param {number} x
     * @param {number} y
     * @param {boolean} [ignore_ofs]
     */
    _map_to_world(x, y, ignore_ofs = false) {
        const cell_mat = this.get_cell_transform();
        const ret = Vector2.new(x, y);
        cell_mat.xform(ret, ret);
        if (!ignore_ofs) {
            switch (this.cell_half_offset) {
                case HalfOffset.X: {
                    if (Math.abs(y) & 1) {
                        ret.x += cell_mat.a * 0.5;
                        ret.y += cell_mat.b * 0.5;
                    }
                } break;
                case HalfOffset.Y: {
                    if (Math.abs(x) & 1) {
                        ret.x += cell_mat.c * 0.5;
                        ret.y += cell_mat.d * 0.5;
                    }
                } break;
                default: {
                    // Nothing
                } break;
            }
        }
        Matrix.free(cell_mat);
        return ret;
    }

    /**
     * @param {import('engine/servers/visual/webgl_renderer').default} renderer
     */
    _render_webgl(renderer) {
        this.update_dirty_quadrants();

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
