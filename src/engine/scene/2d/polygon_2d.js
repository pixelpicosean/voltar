import { node_class_map, resource_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
import { Color, ColorLike } from "engine/core/color";

import BatchGeometry from "engine/drivers/batch/BatchGeometry";

import { ImageTexture } from "../resources/texture";
import { NOTIFICATION_DRAW } from "./canvas_item";
import { Node2D } from "./node_2d";


class PolygonGeometry extends BatchGeometry {
    constructor() {
        super();

        /** @type {number[]} */
        this.points = [];

        /** @type {number[]} */
        this.colors = [];

        /** @type {number[]} */
        this.uvs = [];

        /** @type {number[]} */
        this.indices = [];

        /** @type {number[]} */
        this.texture_ids = [];

        this.polygons = [];

        this.dirty = 0;
        this.batch_dirty = -1;
        this.cache_dirty = -1;
        this.clear_dirty = 0;
        this.draw_calls = [];
        this.batches = [];
    }
}

export class Polygon2D extends Node2D {
    get class() { return 'Polygon2D'}

    constructor() {
        super();

        /** @type {number[]} */
        this._polygon = [];
        /** @type {number[]} */
        this._uv = [];
        /** @type {number[]} */
        this.vertex_colors = [];
        this._polygons = [];
        this._internal_vertices = 0;

        this.bone_weights = [];

        this._color = new Color(1, 1, 1);
        /** @type {ImageTexture} */
        this._texture = null;
        this.tex_scale = new Vector2(1, 1);
        this.tex_ofs = new Vector2();
        this.tex_tile = true;
        this.tex_rot = 0;
        this.invert = false;
        this.invert_border = 100;
        this.antialiased = false;

        this.offset = new Vector2();
        this.rect_cache_dirty = true;
        this.item_rect = new Rect2();

        this.skeleton = null;
        this.current_skeleton = null;
    }

    /* virtual */

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_DRAW: {
                if (this._polygon.length < 3) {
                    return;
                }

                // TODO: handle skeleton
            } break;
        }
    }

    /* public */

    /**
     * @param {number[]} p_polygon
     */
    set_polygon(p_polygon) {
        this._polygon = p_polygon;
        this.rect_cache_dirty = true;
        this.update();
    }

    /**
     * @param {number} p_count
     */
    set_internal_vertex_count(p_count) {
        this._internal_vertices = p_count;
    }

    /**
     * @param {number[]} p_uv
     */
    set_uv(p_uv) {
        this._uv = p_uv;
        this.update();
    }

    /**
     * @param {any[]} p_polygons
     */
    set_polygons(p_polygons) {
        this._polygons = p_polygons;
    }

    /**
     * @param {ColorLike} p_color
     */
    set_color(p_color) {
        this._color.copy(p_color);
        this.update();
    }

    /**
     * @param {number[]} p_colors
     */
    set_vertex_colors(p_colors) {
        this.vertex_colors = p_colors;
        this.update();
    }

    /**
     * ]@param {ImageTexture | string} p_texture
     */
    set_texture(p_texture) {
        /** @type {ImageTexture} */
        const texture = (typeof (p_texture) === 'string') ? resource_map[p_texture] : p_texture;
        if (this._texture === texture) return;
        this.update();
    }

    /**
     * @param {Vector2Like} p_offset
     */
    set_texture_offset(p_offset) {
        this.tex_ofs.copy(p_offset);
    }

    /**
     * @param {number} p_rot
     */
    set_texture_rotation(p_rot) {
        this.tex_rot = p_rot;
        this.update();
    }

    /**
     * @param {Vector2Like} p_scale
     */
    set_texture_scale(p_scale) {
        this.tex_scale.copy(p_scale);
        this.update();
    }

    /**
     * @param {boolean} p_invert
     */
    set_invert_enabled(p_invert) {
        this.invert = p_invert;
        this.update();
    }

    /**
     * @param {boolean} p_antialiased
     */
    set_antialiased(p_antialiased) {
        this.antialiased = p_antialiased;
        this.update();
    }

    /**
     * @param {Vector2Like} p_offset
     */
    set_offset(p_offset) {
        this.offset.copy(p_offset);
        this.rect_cache_dirty = true;
        this.update();
    }
}
node_class_map['Polygon2D'] = GDCLASS(Polygon2D, Node2D)
