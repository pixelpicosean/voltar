import { res_class_map } from 'engine/registry';
import { Vector2 } from 'engine/core/math/vector2';
import { Rect2 } from 'engine/core/math/rect2';
import { Transform2D } from 'engine/core/math/transform_2d';
import { Color } from 'engine/core/color';

import { Shape2D } from './shape_2d';
import { ConvexPolygonShape2D } from './convex_polygon_shape_2d';
import { ImageTexture } from './texture';


class ShapeData {
    constructor() {
        /**
         * @type {Shape2D}
         */
        this.shape = null;
        this.shape_transform = new Transform2D();
        this.autotile_coord = new Vector2();
        this.one_way_collision = false;
        this.one_way_collision_margin = 1.0;
    }
    _load_data(data) {
        if (data.autotile_coord !== undefined) {
            this.autotile_coord.copy(data.autotile_coord);
        }
        if (data.one_way !== undefined) {
            this.one_way_collision = data.one_way;
        }
        if (data.one_way_margin !== undefined) {
            this.one_way_collision_margin = data.one_way_margin;
        }
        if (data.shape_transform !== undefined) {
            this.shape_transform.from_array(data.shape_transform);
        }
        if (data.shape !== undefined) {
            if (data.shape.type === 'ConvexPolygonShape2D') {
                this.shape = new ConvexPolygonShape2D();
                /** @type {ConvexPolygonShape2D} */(this.shape).set_points_in_pool_vec2(data.shape.points);
            } else {
                console.warn(`${data.shape.type} shape in TileSet is not supported yet!`);
            }
        }

        return this;
    }
}

// @enum BitmaskMode
export const BITMASK_2X2 = 0;
export const BITMASK_3X3_MINIMAL = 1;
export const BITMASK_3X3 = 2;

// @enum AutotileBindings
export const BIND_TOPLEFT = 1;
export const BIND_TOP = 2;
export const BIND_TOPRIGHT = 4;
export const BIND_LEFT = 8;
export const BIND_CENTER = 16;
export const BIND_RIGHT = 32;
export const BIND_BOTTOMLEFT = 64;
export const BIND_BOTTOM = 128;
export const BIND_BOTTOM_RIGHT = 256;

// @enum TileMode
export const SINGLE_TILE = 0;
export const AUTO_TILE = 1;
export const ATLAS_TILE = 2;

class AutotileData {
    constructor() {
        this.bitmask_mode = BITMASK_2X2;
        this.size = new Vector2(64, 64);
        this.spacing = 0;
        this.flags = new Map();
        this.occluder_map = new Map();
        this.navpoly_map = new Map();
        this.priority_map = new Map();
        this.z_index_map = new Map();
    }
}

class TileData {
    constructor() {
        this.offset = new Vector2();
        this.region = new Rect2();
        /** @type {ShapeData[]} */
        this.shapes_data = [];
        this.occluder_offset = new Vector2();
        this.occluder = null;
        this.navigation_polygon_offset = new Vector2();
        this.navigation_polygon = null;
        this.tile_mode = SINGLE_TILE;
        this.modulate = new Color(1, 1, 1, 1);
        this.autotile_data = new AutotileData();
    }
    _load_data(data) {
        if (data.offset !== undefined) {
            this.offset.copy(data.offset);
        }
        if (data.region !== undefined) {
            this.region.copy(data.region);
        }
        if (data.shapes !== undefined) {
            this.shapes_data = data.shapes.map(s_data => new ShapeData()._load_data(s_data));
        }
        if (data.tile_mode !== undefined) {
            this.tile_mode = data.tile_mode;
        }
        if (data.modulate !== undefined) {
            this.modulate.copy(data.modulate);
        }
        return this;
    }
}

/** @type {Object<string, TileSet>} */
const tile_set_map = {};

export default class TileSet {
    /**
     * @param {string} key
     */
    static with_key(key) {
        return tile_set_map[key];
    }
    constructor() {
        /**
         * @type {TileData[]}
         */
        this.tile_map = [];
        /**
         * @type {ImageTexture}
         */
        this.texture = null;
    }
    _load_data(data) {
        this.tile_map.length = data.tile_map.length;
        for (let i = 0; i < this.tile_map.length; i++) {
            if (!data.tile_map[i]) continue;
            this.tile_map[i] = new TileData()._load_data(data.tile_map[i]);
        }
        this.texture = data.texture;

        return this;
    }

    clear() {
        this.tile_map.length = 0;
    }

    /**
     * @param {number} id
     */
    has_tile(id) {
        return (id < this.tile_map.length) && !!(this.tile_map[id]);
    }
    /**
     * @param {number} id
     */
    get_tile(id) {
        return this.tile_map[id];
    }
}
res_class_map['TileSet'] = TileSet
