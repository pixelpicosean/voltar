import { node_class_map, get_resource_map } from "engine/registry";
import { remove_items } from "engine/dep/index";
import { SelfList, List } from "engine/core/self_list";
import { GDCLASS } from "engine/core/v_object";
import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2.js";
import { Transform2D } from "engine/core/math/transform_2d.js";

import { Item } from "engine/servers/visual/visual_server_canvas";
import { Space2DSW } from "engine/servers/physics_2d/space_2d_sw.js";
import { Body2DSW } from "engine/servers/physics_2d/body_2d_sw.js";
import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server.js";

import { VSG } from "engine/servers/visual/visual_server_globals";

import {
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
} from "../main/node";
import {
    TileSet,
    AUTO_TILE,
    ATLAS_TILE,
    SINGLE_TILE,
} from "../resources/tile_set";
import { NOTIFICATION_TRANSFORM_CHANGED } from "../const";

import {
    NOTIFICATION_LOCAL_TRANSFORM_CHANGED,
} from "./canvas_item";
import { Node2D } from "./node_2d";
import { CollisionObject2D } from "./collision_object_2d";
import { CollisionPolygon2D } from "./collision_polygon_2d";
import { BodyState, BodyMode } from "./const";


export const MODE_SQUARE = 0;
export const MODE_ISOMETRIC = 1;
export const MODE_CUSTOM = 2;

export const HALF_OFFSET_X = 0;
export const HALF_OFFSET_Y = 1;
export const HALF_OFFSET_DISABLED = 2;
export const HALF_OFFSET_NEGATIVE_X = 3;
export const HALF_OFFSET_NEGATIVE_Y = 4;

export const TILE_ORIGIN_TOP_LEFT = 0;
export const TILE_ORIGIN_CENTER = 1;
export const TILE_ORIGIN_BOTTOM_LEFT = 2;

export const INVALID_CELL = -1;

class Cell {
    id: number;
    flip_h = false;
    flip_v = false;
    transpose = false;
    autotile_coord_x = 0;
    autotile_coord_y = 0;

    _x = 0;
    _y = 0;

    constructor(id = 0) {
        this.id = id;
    }
}

class Quadrant {
    pos = new Vector2;
    canvas_items: Item[] = [];
    body: Body2DSW = null;
    shape_owner: Node2D = null;
    dirty_list: SelfList<Quadrant> = new SelfList(this);
    cells: string[] = [];
}

const buffer = new ArrayBuffer(12);
const view = new DataView(buffer);

export class TileMap extends Node2D {
    get class() { return 'TileMap' }

    mode = MODE_SQUARE;

    collision_layer = 1;
    collision_mask = 1;

    collision_friction = 1;
    collision_bounce = 0;

    cell_clip_uv = false;
    cell_custom_transform = new Transform2D(64, 0, 0, 64, 0, 0);
    cell_half_offset = HALF_OFFSET_DISABLED;
    cell_quadrant_size = 16;
    cell_size = new Vector2(64, 64);
    cell_tile_origin = TILE_ORIGIN_TOP_LEFT;
    cell_y_sort = false;

    collision_use_parent = false;
    collision_parent: CollisionObject2D = null;
    collision_use_kinematic = false;

    tile_map: { [pos_key: string]: Cell; } = Object.create(null);

    quadrant_map: { [pos_key: string]: Quadrant; } = Object.create(null);

    dirty_quadrant_list: List<Quadrant> = new List;

    rect_cache = new Rect2;
    rect_cache_dirty = true;
    used_size_cache = new Rect2;
    used_size_cache_dirty = false;
    quadrant_order_dirty = false;
    centered_textures = false;
    tilemap_pending_update = false;

    tile_set: TileSet = null;

    constructor() {
        super();

        this.set_notify_transform(true);
        this.set_notify_local_transform(false);
    }

    _load_data(data: any) {
        super._load_data(data);

        if (data.cell_half_offset !== undefined) this.set_cell_half_offset(data.cell_half_offset);
        if (data.cell_quadrant_size !== undefined) this.set_cell_quadrant_size(data.cell_quadrant_size);
        if (data.cell_size !== undefined) this.set_cell_size(data.cell_size);
        if (data.cell_tile_origin !== undefined) this.set_cell_tile_origin(data.cell_tile_origin);
        if (data.cell_y_sort !== undefined) this.set_cell_y_sort(data.cell_y_sort);
        if (data.centered_textures !== undefined) this.set_centered_texture(data.centered_textures);
        if (data.collision_bounce !== undefined) this.set_collision_bounce(data.collision_bounce);
        if (data.collision_friction !== undefined) this.set_collision_friction(data.collision_friction);
        if (data.collision_layer !== undefined) this.set_collision_layer(data.collision_layer);
        if (data.collision_mask !== undefined) this.set_collision_mask(data.collision_mask);
        if (data.collision_use_kinematic !== undefined) this.set_collision_use_kinematic(data.collision_use_kinematic);
        if (data.mode !== undefined) this.set_mode(data.mode);
        if (data.tile_set !== undefined) this.set_tile_set(data.tile_set);
        if (data.tile_data !== undefined) this.set_tile_data(data.tile_data);

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                if (this.collision_use_parent) {
                    this._clear_quadrants();
                    let c = this.get_parent();
                    this.collision_parent = (c.is_collision_object ? c : null) as CollisionObject2D;
                }

                this.tilemap_pending_update = true;
                this._recreate_quadrants();
                this.update_dirty_quadrants();
                let space = this.get_world_2d().space;
                this._update_quadrant_transform();
                this._update_quadrant_space(space);
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this._update_quadrant_space(null);
                for (let key in this.quadrant_map) {
                    let q = this.quadrant_map[key];
                    if (this.collision_parent) {
                        this.collision_parent.remove_shape_owner(q.shape_owner);
                        q.shape_owner = null;
                    }
                }

                this.collision_parent = null;
            } break;
            case NOTIFICATION_TRANSFORM_CHANGED: {
                this._update_quadrant_transform();
            } break;
            case NOTIFICATION_LOCAL_TRANSFORM_CHANGED: {
                if (this.collision_use_parent) {
                    this._recreate_quadrants();
                }
            } break;
        }
    }

    clear() {
        this._clear_quadrants();
        this.tile_map = Object.create(null);
        this.used_size_cache_dirty = true;
    }

    /**
     * @param {number} value
     */
    set_mode(value: number) {
        this._clear_quadrants();
        this.mode = value;
        this._recreate_quadrants();
    }

    /**
     * @param {number} p_value
     */
    set_cell_half_offset(p_value: number) {
        this._clear_quadrants();
        this.cell_half_offset = p_value;
        this._recreate_quadrants();
    }

    /**
     * @param {number} p_value
     */
    set_cell_tile_origin(p_value: number) {
        this._clear_quadrants();
        this.cell_tile_origin = p_value;
        this._recreate_quadrants();
    }

    /**
     * @param {Vector2} value
     */
    set_cell_size(value: Vector2) {
        this._clear_quadrants();
        this.cell_size.copy(value);
        this._recreate_quadrants();
        return this;
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_cell_size_n(x: number, y: number) {
        this._clear_quadrants();
        this.cell_size.set(x, y);
        this._recreate_quadrants();
        return this;
    }

    /**
     * @param {number} p_size
     */
    set_cell_quadrant_size(p_size: number) {
        this._clear_quadrants();
        this.cell_quadrant_size = p_size;
        this._recreate_quadrants();
        return this;
    }

    /**
     * @param {Transform2D} value
     */
    set_cell_custom_transform(value: Transform2D) {
        this._clear_quadrants();
        this.cell_custom_transform.copy(value);
        this._recreate_quadrants();
        return this;
    }

    /**
     * @param {string|TileSet} value
     */
    set_tile_set(value: string | TileSet) {
        /** @type {TileSet} */
        let tile_set: TileSet = (typeof (value) === 'string') ? get_resource_map()[value] : value;

        this._clear_quadrants();
        this.tile_set = tile_set;

        if (!tile_set) {
            this.clear();
        }

        this._recreate_quadrants();
    }

    /**
     * @param {number} p_layer
     */
    set_collision_layer(p_layer: number) {
        this.collision_layer = p_layer;

        if (!this.collision_use_parent) {
            for (let qk in this.quadrant_map) {
                let q = this.quadrant_map[qk];
                if (q) {
                    q.body.collision_layer = p_layer;
                }
            }
        }
    }

    /**
     * @param {number} p_layer
     */
    set_collision_mask(p_layer: number) {
        this.collision_mask = p_layer;

        if (!this.collision_use_parent) {
            for (let qk in this.quadrant_map) {
                let q = this.quadrant_map[qk];
                if (q) {
                    q.body.collision_mask = p_layer;
                }
            }
        }
    }

    /**
     * @param {number} p_bit
     */
    get_collision_layer_bit(p_bit: number) {
        return this.collision_layer & (1 << p_bit);
    }
    /**
     * @param {number} p_bit
     * @param {number} p_value
     */
    set_collision_layer_bit(p_bit: number, p_value: number) {
        let layer = this.collision_layer;
        if (p_value) {
            layer |= 1 << p_bit;
        } else {
            layer &= ~(1 << p_bit);
        }
        this.set_collision_layer(layer);
    }

    /**
     * @param {number} p_bit
     */
    get_collision_mask_bit(p_bit: number) {
        return this.collision_mask & (1 << p_bit);
    }
    /**
     * @param {number} p_bit
     * @param {number} p_value
     */
    set_collision_mask_bit(p_bit: number, p_value: number) {
        let mask = this.collision_mask;
        if (p_value) {
            mask |= 1 << p_bit;
        } else {
            mask &= ~(1 << p_bit);
        }
        this.set_collision_mask(mask);
    }

    /**
     * @param {boolean} p_value
     */
    set_collision_use_kinematic(p_value: boolean) {
        this._clear_quadrants();
        this.collision_use_kinematic = p_value;
        this._recreate_quadrants();
    }

    /**
     * @param {boolean} p_value
     */
    set_collision_use_parent(p_value: boolean) {
        if (this.collision_use_parent === p_value) return;

        this._clear_quadrants();

        this.collision_use_parent = p_value;
        this.set_notify_local_transform(this.collision_use_parent);

        if (this.collision_use_parent && this.is_inside_tree()) {
            let parent = this.get_parent();
            this.collision_parent = (parent.is_collision_object ? parent : null) as CollisionObject2D;
        } else {
            this.collision_parent = null;
        }

        this._recreate_quadrants();
    }

    /**
     * @param {number} p_value
     */
    set_collision_friction(p_value: number) {
        this.collision_friction = p_value;
        if (!this.collision_use_parent) {
            for (let qk in this.quadrant_map) {
                let q = this.quadrant_map[qk];
                if (q) {
                    q.body.friction = p_value;
                }
            }
        }
    }

    /**
     * @param {number} p_value
     */
    set_collision_bounce(p_value: number) {
        this.collision_bounce = p_value;
        if (!this.collision_use_parent) {
            for (let qk in this.quadrant_map) {
                let q = this.quadrant_map[qk];
                if (q) {
                    q.body.bounce = p_value;
                }
            }
        }
    }

    /**
     * @param {boolean} p_value
     */
    set_cell_y_sort(p_value: boolean) {
        this._clear_quadrants();
        this.cell_y_sort = p_value
        VSG.canvas.canvas_item_set_sort_children_by_y(this.canvas_item, p_value);
        this._recreate_quadrants();
    }

    set_centered_texture(p_value: boolean) {
        this._clear_quadrants();
        this.centered_textures = p_value;
        this._recreate_quadrants();
    }

    /**
     * @param {number} p_x
     * @param {number} p_y
     * @param {number} p_tile
     * @param {boolean} [p_flip_x]
     * @param {boolean} [p_flip_y]
     * @param {boolean} [p_transpose]
     * @param {number} [p_autotile_coord_x]
     * @param {number} [p_autotile_coord_y]
     */
    set_cell(p_x: number, p_y: number, p_tile: number, p_flip_x: boolean = false, p_flip_y: boolean = false, p_transpose: boolean = false, p_autotile_coord_x: number = 0, p_autotile_coord_y: number = 0) {
        let pk = `${p_x},${p_y}`;

        let E = this.tile_map[pk];
        if (!E && p_tile === INVALID_CELL) {
            return;
        }

        const qk_x = Math.floor(p_x / this.cell_quadrant_size);
        const qk_y = Math.floor(p_y / this.cell_quadrant_size);
        let qk = `${qk_x},${qk_y}`;

        if (p_tile === INVALID_CELL) {
            // erase existing
            delete this.tile_map[pk];
            const q = this.quadrant_map[qk];
            remove_items(q.cells, q.cells.indexOf(pk), 1);
            if (q.cells.length === 0) {
                this._erase_quadrant(qk);
            } else {
                this._make_quadrant_dirty(q);
            }
            this.used_size_cache_dirty = true;
            return;
        }

        let q = this.quadrant_map[qk];

        if (!E) {
            E = new Cell;
            this.tile_map[pk] = E;
            E._x = p_x;
            E._y = p_y;
            if (!q) {
                q = this._create_quadrant(qk_x, qk_y);
            }
            q.cells.push(pk);
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
                E.autotile_coord_x === p_autotile_coord_x
                &&
                E.autotile_coord_y === p_autotile_coord_y
            ) {
                return; // nothing changed
            }
        }

        E.id = p_tile;
        E.flip_h = p_flip_x;
        E.flip_v = p_flip_y;
        E.transpose = p_transpose;
        E.autotile_coord_x = p_autotile_coord_x;
        E.autotile_coord_y = p_autotile_coord_y;

        this._make_quadrant_dirty(q);
        this.used_size_cache_dirty = true;
    }

    /**
     * @param {number} p_x
     * @param {number} p_y
     */
    get_cell(p_x: number, p_y: number) {
        let pk = `${p_x},${p_y}`;
        let E = this.tile_map[pk];
        if (!E) return -1;
        return E.id;
    }

    /**
     * Returns new Transform2D
     */
    get_cell_transform() {
        const out = Transform2D.create();
        out.reset();

        const cell_size_x = this.cell_size.x;
        const cell_size_y = this.cell_size.y;

        switch (this.mode) {
            case MODE_SQUARE: {
                out.a *= cell_size_x;
                out.b *= cell_size_x;
                out.c *= cell_size_y;
                out.d *= cell_size_y;
            } break;
            case MODE_ISOMETRIC: {
                // isometric only makes sense when y is positive in both x and y vectors, otherwise
                // the drawing of tiles will overlap
                out.a = cell_size_x * 0.5;
                out.b = cell_size_y * 0.5;
                out.c = -cell_size_x * 0.5;
                out.d = cell_size_y * 0.5;
            } break;
            case MODE_CUSTOM: {
                out.copy(this.cell_custom_transform);
            } break;
        }

        return out;
    }

    /**
     * Returns new Vector2.
     */
    get_cell_draw_offset() {
        const out = Vector2.create();

        switch (this.mode) {
            case MODE_SQUARE: {
            } break;
            case MODE_ISOMETRIC: {
                out.set(-this.cell_size.x * 0.5, 0);
            } break;
            case MODE_CUSTOM: {
                out.x = Math.min(this.cell_custom_transform.a, out.x);
                out.y = Math.min(this.cell_custom_transform.b, out.y);
                out.x = Math.min(this.cell_custom_transform.c, out.x);
                out.y = Math.min(this.cell_custom_transform.d, out.y);
            } break;
        }

        return out;
    }

    get_used_rect() {
        if (this.used_size_cache_dirty) {
            let first = true;
            const vec = Vector2.create();
            for (const pk in this.tile_map) {
                const cell = this.tile_map[pk];
                const _x = cell._x;
                const _y = cell._y;
                if (cell) {
                    if (first) {
                        first = false;
                        this.used_size_cache.set(_x, _y, 0, 0);
                    }

                    this.used_size_cache.expand_to(vec.set(_x, _y));
                }
            }
            if (first) {
                /* empty map! */
                this.used_size_cache.set(0, 0, 0, 0);
            } else {
                this.used_size_cache.width += 1;
                this.used_size_cache.height += 1;
            }
            Vector2.free(vec);

            this.used_size_cache_dirty = false;
        }

        return this.used_size_cache;
    }

    update_dirty_quadrants() {
        if (!this.tilemap_pending_update) {
            return;
        }
        if (!this.is_inside_tree() || !this.tile_set) {
            this.tilemap_pending_update = false;
            return;
        }

        const ps = Physics2DServer.get_singleton();
        const tofs = this.get_cell_draw_offset();
        const qofs = Vector2.create();

        const xform = Transform2D.create();

        const vs = VSG.canvas;

        while (this.dirty_quadrant_list.first()) {
            const q = this.dirty_quadrant_list.first().self();

            for (let E of q.canvas_items) {
                E._free();
            }
            q.canvas_items.length = 0;

            if (!this.collision_use_parent) {
                ps.body_clear_shapes(q.body);
            } else if (this.collision_parent) {
                this.collision_parent.shape_owner_clear_shapes(q.shape_owner);
            }
            let shape_idx = 0;

            let prev_z_index = 0;
            /** @type {Item} */
            let prev_canvas_item: Item = null;

            for (let i = 0; i < q.cells.length; i++) {
                const info = q.cells[i].split(",");
                const x = parseInt(info[0], 10);
                const y = parseInt(info[1], 10);

                const c = this.tile_map[q.cells[i]];
                if (!c || !this.tile_set.has_tile(c.id)) {
                    continue;
                }
                const tile = this.tile_set.get_tile(c.id);

                // draw
                const tex = tile.texture;
                if (!tex) {
                    continue;
                }

                const tile_ofs = tile.offset.clone();

                const wofs = this.map_to_world(x, y);
                const offset = wofs.subtract(q.pos).add(tofs);

                let z_index = tile.z_index;

                if (tile.tile_mode === AUTO_TILE || tile.tile_mode === ATLAS_TILE) {
                    z_index += tile.autotile_data.get_z_index(c.autotile_coord_x, c.autotile_coord_y);
                }

                /** @type {Item} */
                let canvas_item: Item = null;

                if (!prev_canvas_item || prev_z_index !== z_index) {
                    canvas_item = vs.canvas_item_create();
                    vs.canvas_item_set_parent(canvas_item, this.canvas_item);
                    xform.identity().set_origin(q.pos);
                    vs.canvas_item_set_transform(canvas_item, xform);
                    vs.canvas_item_set_z_index(canvas_item, z_index);

                    q.canvas_items.push(canvas_item);

                    prev_canvas_item = canvas_item;
                    prev_z_index = z_index;
                } else {
                    canvas_item = prev_canvas_item;
                }

                const r = tile.region.clone();
                if (tile.tile_mode === AUTO_TILE || tile.tile_mode === ATLAS_TILE) {
                    const spacing = tile.autotile_data.spacing;
                    r.width = tile.autotile_data.size.x;
                    r.height = tile.autotile_data.size.y;
                    r.x += (r.width + spacing) * c.autotile_coord_x;
                    r.y += (r.height + spacing) * c.autotile_coord_y;
                }

                const s = Vector2.create();
                if (r.is_zero()) {
                    s.x = tex.get_width();
                    s.y = tex.get_height();
                } else {
                    s.x = r.width;
                    s.y = r.height;
                }

                const rect = Rect2.create();
                rect.x = offset.x;
                rect.y = offset.y;
                rect.width = s.x + 0.00001;
                rect.height = s.y + 0.00001;

                if (c.transpose) {
                    let tmp = tile_ofs.x; tile_ofs.x = tile_ofs.y; tile_ofs.y = tmp;
                    if (this.centered_textures) {
                        rect.x += this.cell_size.x * 0.5 - rect.width * 0.5;
                        rect.y += this.cell_size.y * 0.5 - rect.height * 0.5;
                    }
                } else if (this.centered_textures) {
                    rect.x += this.cell_size.x * 0.5 - rect.width * 0.5;
                    rect.y += this.cell_size.y * 0.5 - rect.height * 0.5;
                }

                if (c.flip_h) {
                    rect.width = -rect.width;
                    tile_ofs.x = -tile_ofs.x;
                }

                if (c.flip_v) {
                    rect.height = -rect.height;
                    tile_ofs.y = -tile_ofs.y;
                }

                rect.x += tile_ofs.x;
                rect.y += tile_ofs.y;

                const modulate = this.self_modulate.clone().multiply(tile.modulate);

                if (r.is_zero()) {
                    tex.draw_rect(canvas_item, rect, false, modulate, c.transpose);
                } else {
                    tex.draw_rect_region(canvas_item, rect, r, modulate, c.transpose);
                }

                Vector2.free(tile_ofs);
                Rect2.free(rect);
                Vector2.free(wofs);
                Rect2.free(r);
                Vector2.free(s);

                // add shapes
                for (const sd of tile.shapes_data) {
                    if (sd.shape) {
                        if (tile.tile_mode === SINGLE_TILE || (sd.autotile_coord.x == c.autotile_coord_x && sd.autotile_coord.y === c.autotile_coord_y)) {
                            const xform = Transform2D.create();
                            xform.tx = Math.floor(offset.x);
                            xform.ty = Math.floor(offset.y);

                            const shape_ofs = sd.shape_transform.get_origin();
                            this._fix_cell_transform(xform, c, shape_ofs, s);

                            const un_t = sd.shape_transform.untranslated();
                            xform.append(un_t);

                            if (!this.collision_use_parent) {
                                ps.body_add_shape(q.body, sd.shape.shape, xform);
                                ps.body_set_shape_as_one_way_collision(q.body, shape_idx, sd.one_way_collision, sd.one_way_collision_margin)
                            } else if (this.collision_parent) {
                                // TODO
                            }
                            shape_idx++;

                            Transform2D.free(xform);
                            Transform2D.free(un_t);
                            Vector2.free(shape_ofs);
                        }
                    }
                }
            }

            this.dirty_quadrant_list.remove(this.dirty_quadrant_list._first);
            this.quadrant_order_dirty = true;
        }

        this.tilemap_pending_update = false;

        Vector2.free(tofs);
        Vector2.free(qofs);
        Transform2D.free(xform);
    }

    /**
     * @param {number[]} p_data
     */
    set_tile_data(p_data: number[]) {
        const c = p_data.length;
        const offset = 3;

        this.clear();

        for (let i = 0; i < c; i += offset) {
            view.setInt32(0, p_data[i + 0]);
            view.setInt32(4, p_data[i + 1]);
            view.setInt32(8, p_data[i + 2]);

            const x = view.getInt16(2);
            const y = view.getInt16(0);

            let v = view.getUint32(4);
            const flip_h = !!(v & (1 << 29));
            const flip_v = !!(v & (1 << 30));
            const transpose = !!(v & (1 << 31));
            v &= (1 << 29) - 1;
            const coord_x = view.getUint16(10);
            const coord_y = view.getUint16(8);

            this.set_cell(x, y, v, flip_h, flip_v, transpose, coord_x, coord_y);
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    _create_quadrant(x: number, y: number) {
        const xform = Transform2D.create();
        const q = new Quadrant;
        const q_size = this.cell_quadrant_size;
        const pos = this.map_to_world(x * q_size, y * q_size);
        const cell_draw_offset = this.get_cell_draw_offset();
        q.pos.copy(pos).add(cell_draw_offset);
        if (this.cell_tile_origin === TILE_ORIGIN_CENTER) {
            q.pos.add(this.cell_size.x * 0.5, this.cell_size.y * 0.5);
        } else if (this.cell_tile_origin === TILE_ORIGIN_BOTTOM_LEFT) {
            q.pos.y += this.cell_size.y;
        }

        xform.set_origin(q.pos);

        if (!this.collision_use_parent) {
            const ps = Physics2DServer.get_singleton();

            q.body = ps.body_create();
            q.body.mode = this.collision_use_kinematic ? BodyMode.KINEMATIC : BodyMode.STATIC;

            q.body.instance = this;
            q.body.collision_layer = this.collision_layer;
            q.body.collision_mask = this.collision_mask;
            q.body.friction = this.collision_friction;
            q.body.bounce = this.collision_bounce;

            if (this.is_inside_tree()) {
                const g_xform = this.get_global_transform().clone();
                xform.copy(g_xform.append(xform));
                ps.body_set_space(q.body, this.get_world_2d().space);
                Transform2D.free(g_xform);
            }

            ps.body_set_state(q.body, BodyState.TRANSFORM, xform);
        } else if (this.collision_parent) {
            const xf = this.get_transform();
            xform.copy(xf.append(xform));
            Transform2D.free(xf);
            q.shape_owner = this.collision_parent.create_shape_owner(this);
        } else {
            q.shape_owner = null;
        }

        this.rect_cache_dirty = true;
        this.quadrant_order_dirty = true;

        Vector2.free(cell_draw_offset);
        Vector2.free(pos);
        Transform2D.free(xform);

        this.quadrant_map[`${x},${y}`] = q;
        return q;
    }

    /**
     * @param {string} qk
     */
    _erase_quadrant(qk: string) {
        const q = this.quadrant_map[qk];

        if (!this.collision_use_parent) {
            q.body.shapes.length = 0;
            Physics2DServer.get_singleton().body_set_space(q.body, null);
        } else if (this.collision_parent) {
            this.collision_parent.remove_shape_owner(q.shape_owner);
        }

        q.canvas_items.length = 0;

        // Remove from dirty list
        if (q.dirty_list.in_list()) {
            this.dirty_quadrant_list.remove(q.dirty_list);
        }

        delete this.quadrant_map[qk];
        this.rect_cache_dirty = true;
    }

    _recreate_quadrants() {
        this._clear_quadrants();

        for (let pk in this.tile_map) {
            let cell = this.tile_map[pk];
            let _x = cell._x;
            let _y = cell._y;

            let qk_x = Math.floor(_x / this.cell_quadrant_size);
            let qk_y = Math.floor(_y / this.cell_quadrant_size);
            let qk = `${qk_x},${qk_y}`;

            let Q = this.quadrant_map[qk];
            if (!Q) {
                Q = this._create_quadrant(qk_x, qk_y);
                this.dirty_quadrant_list.add(Q.dirty_list);
            }

            Q.cells.push(pk);
            this._make_quadrant_dirty(Q, false);
        }
        this.update_dirty_quadrants();
    }
    _clear_quadrants() {
        for (let qk in this.quadrant_map) {
            let q = this.quadrant_map[qk];
            if (q) {
                this._erase_quadrant(qk);
            }
        }
        this.quadrant_map = Object.create(null);
    }

    /**
     * @param {Quadrant} q
     * @param {boolean} [update]
     */
    _make_quadrant_dirty(q: Quadrant, update: boolean = true) {
        if (!q.dirty_list.in_list()) {
            this.dirty_quadrant_list.add_last(q.dirty_list);
        }

        if (this.tilemap_pending_update) {
            return;
        }
        this.tilemap_pending_update = true;
        if (!this.is_inside_tree()) {
            return;
        }

        if (update) {
            this.call_deferred('update_dirty_quadrants');
        }
    }

    /**
     * @param {Transform2D} xform
     * @param {Cell} p_cell
     * @param {Vector2} p_offset
     * @param {Vector2} p_sc
     */
    _fix_cell_transform(xform: Transform2D, p_cell: Cell, p_offset: Vector2, p_sc: Vector2) {
        let s = p_sc.clone();
        let offset = p_offset.clone();

        if (p_cell.transpose) {
            let num = 0;
            num = xform.a; xform.a = xform.b; xform.b = num;
            num = xform.c; xform.c = xform.d; xform.d = num;
            num = offset.x; offset.x = offset.y; offset.y = num;
            num = s.x; s.x = s.y; s.y = num;
        }

        if (p_cell.flip_h) {
            xform.a = -xform.a;
            xform.c = -xform.c;
            offset.x = s.x - offset.x;
        }
        if (p_cell.flip_v) {
            xform.b = -xform.b;
            xform.d = -xform.d;
            offset.y = s.y - offset.y;
        }

        if (this.centered_textures) {
            offset.x += this.cell_size.x * 0.5 - s.x * 0.5;
            offset.y += this.cell_size.y * 0.5 - s.y * 0.5;
        }

        xform.tx += offset.x;
        xform.ty += offset.y;

        Vector2.free(offset);
        Vector2.free(s);
    }

    /**
     * Returns new Vector2.
     * @param {number} x
     * @param {number} y
     * @param {boolean} [ignore_ofs]
     */
    map_to_world(x: number, y: number, ignore_ofs: boolean = false) {
        const cell_mat = this.get_cell_transform();
        const ret = Vector2.create(x, y);
        cell_mat.xform(ret, ret);
        if (!ignore_ofs) {
            switch (this.cell_half_offset) {
                case HALF_OFFSET_X:
                case HALF_OFFSET_NEGATIVE_X: {
                    if (Math.abs(y) & 1) {
                        ret.x += cell_mat.a * (this.cell_half_offset === HALF_OFFSET_X ? 0.5 : -0.5);
                        ret.y += cell_mat.b * (this.cell_half_offset === HALF_OFFSET_X ? 0.5 : -0.5);
                    }
                } break;
                case HALF_OFFSET_Y:
                case HALF_OFFSET_NEGATIVE_Y: {
                    if (Math.abs(x) & 1) {
                        ret.x += cell_mat.c * (this.cell_half_offset === HALF_OFFSET_Y ? 0.5 : -0.5);
                        ret.y += cell_mat.d * (this.cell_half_offset === HALF_OFFSET_Y ? 0.5 : -0.5);
                    }
                } break;
                case HALF_OFFSET_DISABLED: {
                    // Nothing
                } break;
            }
        }
        Transform2D.free(cell_mat);
        return ret;
    }
    /**
     * Returns new Vector2.
     * @param {number} x
     * @param {number} y
     */
    world_to_map(x: number, y: number) {
        const xform = this.get_cell_transform().affine_inverse();
        const ret = Vector2.create(x, y);
        xform.xform(ret, ret);

        switch (this.cell_half_offset) {
            case HALF_OFFSET_X: {
                if (Math.floor(ret.y) & 1) {
                    ret.x -= 0.5;
                }
            } break;
            case HALF_OFFSET_NEGATIVE_X: {
                if (Math.floor(ret.y) & 1) {
                    ret.x += 0.5;
                }
            } break;
            case HALF_OFFSET_Y: {
                if (Math.floor(ret.x) & 1) {
                    ret.y -= 0.5;
                }
            } break;
            case HALF_OFFSET_NEGATIVE_Y: {
                if (Math.floor(ret.x) & 1) {
                    ret.y += 0.5;
                }
            } break;
            case HALF_OFFSET_DISABLED: {
            } break;
        }

        Transform2D.free(xform);

        ret.x += 0.00005;
        ret.y += 0.00005;

        return ret;
    }

    _update_quadrant_transform() {
        if (!this.is_inside_tree()) {
            return;
        }

        let global_transform = this.get_global_transform();

        let xform = Transform2D.create();
        let xform2 = Transform2D.create();

        const ps = Physics2DServer.get_singleton();

        for (let key in this.quadrant_map) {
            let q = this.quadrant_map[key];

            xform.identity();
            xform.set_origin(q.pos);

            if (!this.collision_use_parent) {
                xform2.copy(global_transform).append(xform);
                ps.body_set_state(q.body, BodyState.TRANSFORM, xform2);
            }
        }

        Transform2D.free(xform2);
        Transform2D.free(xform);
    }

    /**
     * @param {Space2DSW} p_space
     */
    _update_quadrant_space(p_space: Space2DSW) {
        if (!this.collision_use_parent) {
            const ps = Physics2DServer.get_singleton();

            for (let key in this.quadrant_map) {
                let q = this.quadrant_map[key];
                ps.body_set_space(q.body, p_space);
            }
        }
    }
}
node_class_map['TileMap'] = GDCLASS(TileMap, Node2D);
