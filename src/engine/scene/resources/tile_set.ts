import { res_class_map } from 'engine/registry';
import { Vector2 } from 'engine/core/math/vector2';
import { Rect2 } from 'engine/core/math/rect2';
import { Transform2D } from 'engine/core/math/transform_2d';
import { Color } from 'engine/core/color';

import { Shape2D } from './shape_2d';
import { ConvexPolygonShape2D } from './convex_polygon_shape_2d';
import { ImageTexture } from './texture';


class ShapeData {
    shape: Shape2D = null;
    shape_transform = new Transform2D;
    autotile_coord = new Vector2;
    one_way_collision = false;
    one_way_collision_margin = 1.0;

    _load_data(data: any) {
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
            if (data.shape.type === -1) {
                /* already instanced from shape class */
                this.shape = data.shape;
            } else {
                this.shape = new ConvexPolygonShape2D;
                (this.shape as ConvexPolygonShape2D).set_points_in_pool_vec2(data.shape.points);
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
    bitmask_mode = BITMASK_2X2;
    size = new Vector2(64, 64);
    spacing = 0;
    flags = Object.create(null);
    occluder_map = Object.create(null);
    navpoly_map = Object.create(null);
    priority_map = Object.create(null);
    z_index_map: { [s: string]: number; } = Object.create(null);

    _load_data(data: any) {
        if (data.bitmask_mode !== undefined) this.bitmask_mode = data.bitmask_mode;
        if (data.tile_size !== undefined) this.size.copy(data.tile_size);
        if (data.spacing !== undefined) this.spacing = data.spacing;
        if (data.flags !== undefined) this.flags = data.flags;
        if (data.occluder_map !== undefined) this.occluder_map = data.occluder_map;
        if (data.navpoly_map !== undefined) this.navpoly_map = data.navpoly_map;
        if (data.priority_map !== undefined) this.priority_map = data.priority_map;
        if (data.z_index_map !== undefined) this.z_index_map = data.z_index_map;
        return this;
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    get_z_index(x: number, y: number) {
        return this.z_index_map[`${x}.${y}`] || 0;
    }
}

class TileData {
    name = '';
    texture: ImageTexture = null;
    offset = new Vector2;
    region = new Rect2;
    shapes_data: ShapeData[] = [];
    tile_mode = SINGLE_TILE;
    modulate = new Color(1, 1, 1, 1);
    autotile_data = new AutotileData;
    z_index = 0;

    _load_data(data: any) {
        if (data.texture !== undefined) this.texture = data.texture;
        if (data.offset !== undefined) this.offset.copy(data.offset);
        if (data.region !== undefined) this.region.copy(data.region);
        if (data.shapes !== undefined) this.shapes_data = data.shapes.map((s_data: any) => new ShapeData()._load_data(s_data));
        if (data.tile_mode !== undefined) this.tile_mode = data.tile_mode;
        if (data.modulate !== undefined) this.modulate.copy(data.modulate);
        if (data.autotile !== undefined) this.autotile_data._load_data(data.autotile);
        if (data.z_index !== undefined) this.z_index = data.z_index;
        return this;
    }
}

export class TileSet {
    get class() { return 'TileSet' }

    tile_map: TileData[] = [];

    _load_data(data: any) {
        if (data.resource.length) {
            this.tile_map.length = data.resource.length;
            for (let i = 0; i < this.tile_map.length; i++) {
                if (!data.resource[i]) continue;
                this.tile_map[i] = new TileData()._load_data(data.resource[i]);
            }
        }

        return this;
    }

    clear() {
        this.tile_map.length = 0;
    }

    /**
     * @param {number} id
     */
    has_tile(id: number) {
        return (id < this.tile_map.length) && !!(this.tile_map[id]);
    }
    /**
     * @param {number} id
     */
    get_tile(id: number) {
        return this.tile_map[id];
    }
}
res_class_map['TileSet'] = TileSet
