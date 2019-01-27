import Shape2D from './shape_2d';
import { Matrix, Vector2, Rectangle } from 'engine/math/index';

class ShapeData {
    constructor() {
        /**
         * @type {Shape2D}
         */
        this.shape = null;
        this.shape_transform = new Matrix();
        this.autotile_coord = new Vector2();
        this.one_way_collision = false;
        this.one_way_collision_margin = 1;
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
export const SINGLE_TITLE = 0;
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
        this.region = new Rectangle();
        this.shapes_data = [];
        this.occluder_offset = new Vector2();
        this.occluder = null;
        this.navigation_polygon_offset = new Vector2();
        this.navigation_polygon = null;
        this.tile_mode = SINGLE_TITLE;
        this.autotile_data = new AutotileData();
    }
}

export default class TileSet {
    constructor() {
        /**
         * @type {TileData[]}
         */
        this.tile_map = [];
    }
    _load_data(data) {
        return this;
    }
}
