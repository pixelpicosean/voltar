import { node_class_map, get_resource_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2.js";
import { Transform2D } from "engine/core/math/transform_2d.js";
import { Color, ColorLike } from "engine/core/color";

import { VSG } from "engine/servers/visual/visual_server_globals.js";

import { ImageTexture } from "../resources/texture.js";
import { NOTIFICATION_DRAW } from "./canvas_item.js";
import { Node2D } from "./node_2d.js";

class Bone {
    constructor() {
        this.path = '';
        /** @type {number[]} */
        this.weights = [];
    }
}
/** @type {Bone[]} */
const Bone_pool = [];
function Bone_new() {
    let bone = Bone_pool.pop();
    if (!bone) bone = new Bone;
    return bone;
}
/** @param {Bone} bone */
function Bone_free(bone) {
    Bone_pool.push(bone);
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

        /** @type {Bone[]} */
        this.bone_weights = [];

        this._color = new Color(1, 1, 1);
        /** @type {ImageTexture} */
        this._texture = null;
        this.texture_scale = new Vector2(1, 1);
        this.texture_offset = new Vector2;
        this.tex_tile = true;
        this.texture_rotation = 0;
        this.invert = false;
        this.invert_border = 100;
        this.antialiased = false;

        this.offset = new Vector2;
        this.rect_cache_dirty = true;
        this.item_rect = new Rect2;

        /** @type {string} */
        this.skeleton = null;
        this.current_skeleton = null;
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.offset) this.set_offset(data.offset);
        if (data.color) this.set_color(data.color);

        if (data.texture) this.set_texture(data.texture);
        if (data.texture_offset) this.set_texture_offset(data.texture_offset);
        if (data.texture_rotation) this.set_texture_offset(data.texture_rotation);
        if (data.texture_scale) this.set_texture_offset(data.texture_scale);

        if (data.polygon) {
            this.set_polygon(data.polygon);
        }

        return this;
    }

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

                let len = Math.floor(this._polygon.length / 2);
                if ((this.invert || this._polygons.length === 0) && this._internal_vertices > 0) {
                    len -= this._internal_vertices;
                }

                if (len <= 0) return;

                const points = Array(len * 2);
                for (let i = 0; i < len * 2; i += 2) {
                    points[i+0] = this._polygon[i+0] + this.offset.x;
                    points[i+1] = this._polygon[i+1] + this.offset.y;
                }

                if (this.invert) {

                }

                /** @type {number[]} */
                let uvs = [];
                if (this._texture) {
                    let texmat = Transform2D.create();

                    texmat.set_origin(this.texture_offset);
                    texmat.set_rotation_and_scale(this.texture_rotation, this.texture_scale);
                    let tex_size = this._texture.get_size();

                    uvs.length = len * 2;

                    let tex_uvs = this._texture.uvs;
                    let tex_uv_w = tex_uvs[2] - tex_uvs[0];
                    let tex_uv_h = tex_uvs[3] - tex_uvs[1];

                    let vec = Vector2.create();
                    if (this._uv.length === points.length) {
                        for (let i = 0; i < len * 2; i += 2) {
                            texmat.xform(vec.set(this._uv[i+0], this._uv[i+1]), vec);
                            uvs[i+0] = (vec.x / tex_size.x) % tex_uv_w + tex_uvs[0];
                            uvs[i+1] = (vec.y / tex_size.y) % tex_uv_h + tex_uvs[1];
                        }
                    } else {
                        for (let i = 0; i < len * 2; i += 2) {
                            texmat.xform(vec.set(points[i+0], points[i+1]), vec);
                            uvs[i+0] = (vec.x / tex_size.x) % tex_uv_w + tex_uvs[0];
                            uvs[i+1] = (vec.y / tex_size.y) % tex_uv_h + tex_uvs[1];
                        }
                    }

                    Vector2.free(vec);
                    Vector2.free(tex_size);
                    Transform2D.free(texmat);
                }

                /** @type {number[]} */
                let colors = null;
                if (this.vertex_colors.length * 2 === points.length) {
                    colors = this.vertex_colors;
                } else {
                    colors = [
                        this._color.r,
                        this._color.g,
                        this._color.b,
                        this._color.a,
                    ];
                }

                if (this.invert || this._polygons.length === 0) {
                    VSG.canvas.canvas_item_add_triangle_array(this.canvas_item, null, points, colors, uvs, [], [], this._texture);
                } else { }
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
        const texture = (typeof (p_texture) === 'string') ? get_resource_map()[p_texture] : p_texture;
        if (this._texture === texture) return;
        this._texture = texture;
        this.update();
    }

    /**
     * @param {Vector2Like} p_offset
     */
    set_texture_offset(p_offset) {
        this.texture_offset.copy(p_offset);
    }

    /**
     * @param {number} p_rot
     */
    set_texture_rotation(p_rot) {
        this.texture_rotation = p_rot;
        this.update();
    }

    /**
     * @param {Vector2Like} p_scale
     */
    set_texture_scale(p_scale) {
        this.texture_scale.copy(p_scale);
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
