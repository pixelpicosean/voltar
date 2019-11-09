import { remove_items } from 'engine/dep/index';
import {
    CMP_EPSILON,
    MARGIN_LEFT,
    MARGIN_TOP,
    MARGIN_RIGHT,
    MARGIN_BOTTOM,
} from 'engine/core/math/math_defs';
import { clamp } from 'engine/core/math/math_funcs';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { Rect2 } from 'engine/core/math/rect2';
import { Transform2D } from 'engine/core/math/transform_2d';
import { Color, ColorLike } from 'engine/core/color';
import { ImageTexture } from 'engine/scene/resources/texture';

import { VisualServer } from '../visual_server';
import { VSG } from './visual_server_globals';
import {
    TYPE_RECT,
    TYPE_NINEPATCH,
    CANVAS_RECT_TILE,
    CANVAS_RECT_REGION,
    CANVAS_RECT_FLIP_H,
    CANVAS_RECT_FLIP_V,
    CANVAS_RECT_TRANSPOSE,
    NINE_PATCH_STRETCH,
    TYPE_CUSTOM,
    Command,
    CommandRect,
    CommandNinePatch,
    CommandCircle,
    CommandMultiMesh,
    CommandPolygon,
} from './commands';


const white = Object.freeze(new Color(1, 1, 1, 1));

let uid = 0;

const TYPE_ITEM = 0;
const TYPE_CANVAS = 1;

const CANVAS_ITEM_Z_MIN = -4096;
const CANVAS_ITEM_Z_MAX = 4096;

export class Item {
    constructor() {
        this._id = uid++;

        this.type = TYPE_ITEM;

        this.xform = new Transform2D();
        this.clip = false;
        this.visible = true;
        this.behind = false;
        this.update_when_visible = false;
        /** @type {Command[]} */
        this.commands = [];
        this.custom_rect = false;
        this.rect_dirty = true;
        this.rect = new Rect2();
        this.material = null;
        this.skeleton = null;

        this.final_modulate = new Color(1, 1, 1, 1);
        this.final_transform = new Transform2D();
        this.final_clip_rect = new Rect2();
        /** @type {Item} */
        this.final_clip_owner = null;
        /** @type {Item} */
        this.material_owner = null;
        this.distance_field = false;
        this.light_masked = false;

        this.global_rect_cache = new Rect2();

        this.z_index = 0;
        this.z_relative = true;
        this.sort_y = false;
        this.modulate = new Color(1, 1, 1, 1);
        this.self_modulate = new Color(1, 1, 1, 1);
        this.index = 0;
        this.children_order_dirty = true;
        this.ysort_children_count = -1;
        this.ysort_xform = new Transform2D();
        this.ysort_pos = new Vector2();

        this.mirror = new Vector2();

        /** @type {Item | Canvas} */
        this.parent = null;
        /** @type {Item[]} */
        this.child_items = [];
        /** @type {Item} */
        this.next = null;
    }
    free() {
        this.clear();
    }

    get_rect() {
        if (this.custom_rect || (!this.rect_dirty && !this.update_when_visible)) {
            return this.rect;
        }

        // must update rect
        const s = this.commands.length;
        if (s === 0) {
            this.rect.set(0, 0, 0, 0);
            this.rect_dirty = false;
            return this.rect;
        }

        const xf = Transform2D.new();
        let found_xform = false;
        let first = true;

        const cmd = this.commands;

        const r = Rect2.new();
        for (let i = 0; i < s; i++) {
            const c = cmd[i];
            r.set(0, 0, 0, 0);

            switch (c.type) {
                case TYPE_RECT: {
                    const crect = /** @type {CommandRect} */(c);
                    r.copy(crect.rect);
                } break;
                case TYPE_NINEPATCH: {
                    const style = /** @type {CommandNinePatch} */(c);
                    r.copy(style.rect);
                } break;
                case TYPE_CUSTOM: {
                    if (/** @type {any} */(c).rect) {
                        r.copy(/** @type {any} */(c).rect);
                    }
                } break;
            }

            if (found_xform) {
                xf.xform_rect(r, r);
                found_xform = false;
            }

            if (first) {
                this.rect.copy(r);
                first = false;
            } else {
                this.rect.merge(r);
            }
        }
        Rect2.free(r);
        Transform2D.free(xf);

        this.rect_dirty = false;
        return this.rect;
    }

    /**
     * @param {Item} p_item
     */
    find_item(p_item) {
        return this.child_items.indexOf(p_item);
    }

    /**
     * @param {Item} p_item
     */
    erase_item(p_item) {
        const idx = this.find_item(p_item);
        if (idx >= 0) {
            remove_items(this.child_items, idx, 1);
        }
    }

    clear() {
        for (let c of this.commands) {
            c.free();
        }
        this.commands.length = 0;
        this.clip = false;
        this.rect_dirty = true;
        this.final_clip_owner = null;
        this.material_owner = null;
        this.light_masked = false;
    }
}

/** @type {Item[]} */
const Item_pool = [];
function create_Item() {
    let item = Item_pool.pop();
    if (!item) {
        item = new Item();
    }
    return item;
}
/**
 * @param {Item} item
 */
function free_Item(item) {
    if (item) Item_pool.push(item);
}

const z_range = CANVAS_ITEM_Z_MAX - CANVAS_ITEM_Z_MIN + 1;
const z_list = new Array(z_range);
const z_last_list = new Array(z_range);
function get_z_list(reset = false) {
    if (reset) {
        z_list.length = 0;
        z_list.length = z_range;
    }
    return z_list;
}
function get_z_last_list(reset = false) {
    if (reset) {
        z_last_list.length = 0;
        z_last_list.length = z_range;
    }
    return z_last_list;
}

const WHITE = Object.freeze(new Color(1, 1, 1, 1));

/**
 * @param {Item} p_left
 * @param {Item} p_right
 */
function item_index_sort(p_left, p_right) {
    return p_left.index - p_right.index;
}

/**
 * @param {Item} p_left
 * @param {Item} p_right
 */
function item_sort(p_left, p_right) {
    if (Math.abs(p_left.ysort_pos.y - p_right.ysort_pos.y) < CMP_EPSILON) {
        return p_left.ysort_pos.x - p_right.ysort_pos.x;
    } else {
        return p_left.ysort_pos.y - p_right.ysort_pos.y;
    }
}

export class Canvas {
    constructor() {
        this.type = TYPE_CANVAS;

        this._id = uid++;

        /** @type {Set<import('./visual_server_viewport').Viewport>} */
        this.viewports = new Set();

        this.children_order_dirty = true;
        /** @type {Item[]} */
        this.child_items = [];
        this.modulate = new Color(1, 1, 1, 1);
        this.parent = null;
        this.parent_scale = 1;
    }

    /**
     * @param {Item} p_item
     */
    find_item(p_item) {
        return this.child_items.indexOf(p_item);
    }

    /**
     * @param {Item} p_item
     */
    erase_item(p_item) {
        const idx = this.find_item(p_item);
        if (idx >= 0) {
            remove_items(this.child_items, idx, 1);
        }
    }
}

export class VisualServerCanvas {
    get width() { return this.view.width }
    get height() { return this.view.height }

    constructor() {
        this.resolution = 1;
        this.transparent = false;
        this.preserve_drawing_buffer = false;
        this.clear_before_render = true;

        this.disable_scale = false;

        this.z_last = null;
        this.z_last_list = null;

        this.screen = new Rect2();
    }

    /**
     * @param {HTMLCanvasElement} canvas
     */
    initialize(canvas) {
        this.view = canvas;
    }

    free_rid(rid) {
        return false;
    }

    /**
     * @param {Canvas} p_canvas
     * @param {Item} p_item
     * @param {Vector2Like} p_mirroring
     */
    canvas_set_item_mirroring(p_canvas, p_item, p_mirroring) {
        p_item.mirror.copy(p_mirroring);
    }
    /**
     * @param {Canvas} p_canvas
     * @param {ColorLike} p_color
     */
    canvas_set_modulate(p_canvas, p_color) {
        p_canvas.modulate.copy(p_color);
    }
    /**
     * @param {Canvas} p_canvas
     * @param {Canvas} p_parent
     * @param {number} p_scale
     */
    canvas_set_parent(p_canvas, p_parent, p_scale) {
        p_canvas.parent = p_parent;
        p_canvas.parent_scale = p_scale;
    }

    /**
     * @param {boolean} p_disable
     */
    canvas_set_disable_scale(p_disable) {
        this.disable_scale = p_disable;
    }


    canvas_create() { return new Canvas() }

    canvas_item_create() { return new Item() }

    /**
     * @param {Item} p_item
     * @param {Item | Canvas} p_parent
     */
    canvas_item_set_parent(p_item, p_parent) {
        if (p_item.parent) {
            p_item.parent.erase_item(p_item);
            p_item.parent = null;
        }

        if (p_parent) {
            p_parent.child_items.push(p_item);
            p_parent.children_order_dirty = true;

            if (p_parent.type === TYPE_ITEM) {
                this._mark_ysort_dirty(/** @type {Item} */(p_parent));
            }
        }

        p_item.parent = p_parent;
    }

    /**
     * @param {Item} p_item
     * @param {boolean} p_visible
     */
    canvas_item_set_visible(p_item, p_visible) {
        p_item.visible = p_visible;

        if (p_item.parent) {
            this._mark_ysort_dirty(/** @type {Item} */(p_item.parent));
        }
    }

    /**
     * @param {Item} p_item
     * @param {boolean} p_update
     */
    canvas_item_set_update_when_visible(p_item, p_update) {
        p_item.update_when_visible = p_update;
    }

    /**
     * @param {Item} p_item
     * @param {Transform2D} p_xform
     */
    canvas_item_set_transform(p_item, p_xform) {
        p_item.xform.copy(p_xform);
    }
    /**
     * @param {Item} p_item
     * @param {boolean} p_clip
     */
    canvas_item_set_clip(p_item, p_clip) {
        p_item.clip = p_clip;
    }
    canvas_item_set_distance_field_mode() { }
    /**
     * @param {Item} p_item
     * @param {boolean} p_custom_rect
     * @param {Rect2} p_rect
     */
    canvas_item_set_custom_rect(p_item, p_custom_rect, p_rect) {
        p_item.custom_rect = p_custom_rect;
        p_item.rect.copy(p_rect);
    }
    /**
     * @param {Item} canvas_item
     * @param {ColorLike} modulate
     */
    canvas_item_set_modulate(canvas_item, modulate) {
        canvas_item.modulate.copy(modulate);
    }
    /**
     * @param {Item} canvas_item
     * @param {ColorLike} modulate
     */
    canvas_item_set_self_modulate(canvas_item, modulate) {
        canvas_item.self_modulate.copy(modulate);
    }

    /**
     * @param {Item} canvas_item
     * @param {boolean} behind
     */
    canvas_item_set_draw_behind_parent(canvas_item, behind) {
        canvas_item.behind = behind;
    }

    canvas_item_set_default_texture_filter() { }
    canvas_item_set_default_texture_repeat() { }

    canvas_item_add_line() { }
    canvas_item_add_polyline() { }
    canvas_item_add_multiline() { }
    /**
     * @param {Item} p_item
     * @param {Rect2} p_rect
     * @param {ColorLike} p_color
     */
    canvas_item_add_rect(p_item, p_rect, p_color) {
        const rect = CommandRect.instance();
        rect.modulate.copy(p_color);
        rect.rect.copy(p_rect);
        p_item.rect_dirty = true;

        p_item.commands.push(rect);
    }
    /**
     * @param {Item} p_item
     * @param {Vector2} p_pos
     * @param {number} p_radius
     * @param {ColorLike} p_color
     */
    canvas_item_add_circle(p_item, p_pos, p_radius, p_color) {
        const circle = CommandCircle.instance();
        circle.color.copy(p_color);
        circle.pos.copy(p_pos);
        circle.radius = p_radius;

        p_item.commands.push(circle);
    }
    /**
     * @param {Item} p_item
     * @param {Rect2} p_rect
     * @param {ImageTexture} p_texture
     * @param {boolean} [p_tile=false]
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose=false]
     */
    canvas_item_add_texture_rect(p_item, p_rect, p_texture, p_tile = false, p_modulate = white, p_transpose = false) {
        const rect = CommandRect.instance();
        rect.modulate.copy(p_modulate);
        rect.rect.copy(p_rect);
        rect.flags = 0;
        if (p_tile) {
            rect.flags |= CANVAS_RECT_TILE;
            rect.flags |= CANVAS_RECT_REGION;
            rect.source.set(0, 0, Math.abs(p_rect.width), Math.abs(p_rect.height));
        }

        if (p_rect.width < 0) {
            rect.flags |= CANVAS_RECT_FLIP_H;
            rect.rect.width = -rect.rect.width;
        }
        if (p_rect.height < 0) {
            rect.flags |= CANVAS_RECT_FLIP_V;
            rect.rect.height = -rect.rect.height;
        }
        if (p_transpose) {
            rect.flags |= CANVAS_RECT_TRANSPOSE;
            const t = rect.rect.height;
            rect.rect.height = rect.rect.width;
            rect.rect.width = t;
        }
        rect.texture = p_texture;
        p_item.rect_dirty = true;
        p_item.commands.push(rect);
    }
    /**
     * @param {Item} p_item
     * @param {Rect2} p_rect
     * @param {ImageTexture} p_texture
     * @param {Rect2} p_src_rect
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose=false]
     */
    canvas_item_add_texture_rect_region(p_item, p_rect, p_texture, p_src_rect, p_modulate = white, p_transpose = false) {
        const rect = CommandRect.instance();
        rect.modulate.copy(p_modulate);
        rect.rect.copy(p_rect);
        rect.texture = p_texture;
        rect.source.copy(p_src_rect);
        rect.flags = CANVAS_RECT_REGION;

        if (p_rect.width < 0) {
            rect.flags |= CANVAS_RECT_FLIP_H;
            rect.rect.width = -rect.rect.width;
        }
        if (p_rect.height < 0) {
            rect.flags |= CANVAS_RECT_FLIP_V;
            rect.rect.height = -rect.rect.height;
        }
        if (p_transpose) {
            rect.flags |= CANVAS_RECT_TRANSPOSE;
            const t = rect.rect.height;
            rect.rect.height = rect.rect.width;
            rect.rect.width = t;
        }
        p_item.rect_dirty = true;
        p_item.commands.push(rect);
    }
    /**
     * @param {Item} p_item
     * @param {Rect2} p_rect
     * @param {Rect2} p_source
     * @param {ImageTexture} p_texture
     * @param {Vector2} p_topleft
     * @param {Vector2} p_bottomright
     * @param {number} [p_x_axis_mode]
     * @param {number} [p_y_axis_mode]
     * @param {boolean} [p_draw_center=true]
     * @param {ColorLike} [p_modulate=white]
     */
    canvas_item_add_nine_patch(p_item, p_rect, p_source, p_texture, p_topleft, p_bottomright, p_x_axis_mode = NINE_PATCH_STRETCH, p_y_axis_mode = NINE_PATCH_STRETCH, p_draw_center = true, p_modulate = white) {
        const style = CommandNinePatch.instance();
        style.texture = p_texture;
        style.rect.copy(p_rect);
        style.source.copy(p_source);
        style.draw_center = p_draw_center;
        style.color.copy(p_modulate);
        style.margin[MARGIN_LEFT] = p_topleft.x;
        style.margin[MARGIN_TOP] = p_topleft.y;
        style.margin[MARGIN_RIGHT] = p_bottomright.x;
        style.margin[MARGIN_BOTTOM] = p_bottomright.y;
        style.axis_x = p_x_axis_mode;
        style.axis_y = p_y_axis_mode;
        p_item.rect_dirty = true;

        p_item.commands.push(style);
    }
    canvas_item_add_primitive() { }
    /**
     * Unlike same method of Godot, we accept indices array as optional parameter,
     * we will not triangulate if it is provided (could be faster).
     * @param {Item} p_item
     * @param {number[]} p_points [x, y]
     * @param {number[]} p_colors [r, g, b, a]
     * @param {number[]} [p_uvs] [u, v]
     * @param {ImageTexture} [p_texture]
     * @param {number[]} [p_indices]
     */
    canvas_item_add_polygon(p_item, p_points, p_colors, p_uvs, p_texture, p_indices) {
        const polygon = CommandPolygon.instance();
        polygon.texture = p_texture;
        polygon.points = p_points.slice();
        polygon.colors = p_colors.slice();
        if (p_uvs) polygon.uvs = p_uvs.slice();
        if (p_indices) {
            polygon.indices = p_indices.slice();
        } else {
            // TODO: use earcut to triangulate the polygon
        }

        p_item.rect_dirty = true;

        p_item.commands.push(polygon);
    }
    canvas_item_add_triangle_array() { }
    canvas_item_add_mesh() { }
    /**
     * @param {Item} p_item
     * @param {any} p_mesh
     * @param {ImageTexture} p_texture
     */
    canvas_item_add_multimesh(p_item, p_mesh, p_texture) {
        const mm = CommandMultiMesh.instance();
        mm.multimesh = p_mesh;
        mm.texture = p_texture;

        p_item.rect_dirty = true;
        p_item.commands.push(mm);
    }
    canvas_item_add_particles() { }
    canvas_item_add_clip_ignore() { }
    /**
     * @param {Item} p_item
     * @param {boolean} p_enabled
     */
    canvas_item_set_sort_children_by_y(p_item, p_enabled) {
        p_item.sort_y = p_enabled;
        this._mark_ysort_dirty(p_item);
    }
    /**
     * @param {Item} p_item
     * @param {number} p_z
     */
    canvas_item_set_z_index(p_item, p_z) {
        p_item.z_index = p_z;
    }
    /**
     * @param {Item} p_item
     * @param {boolean} p_enable
     */
    canvas_item_set_z_as_relative_to_parent(p_item, p_enable) {
        p_item.z_relative = p_enable;
    }

    canvas_item_attach_skeleton() { }

    /**
     * @param {Item} p_item
     */
    canvas_item_clear(p_item) {
        p_item.clear();
    }
    /**
     * @param {Item} p_item
     * @param {number} p_index
     */
    canvas_item_set_draw_index(p_item, p_index) {
        p_item.index = p_index;
        p_item.parent.children_order_dirty = true;
    }

    canvas_item_set_material() { }

    /**
     * @param {Canvas | Item} p_item
     */
    free_item(p_item) {
        if (p_item.type === TYPE_CANVAS) {
            const canvas = /** @type {Canvas} */(p_item);

            // TODO: delete viewports

            for (const c of canvas.child_items) {
                c.parent = null;
            }

            canvas._id = NaN; // as invalid
        } else if (p_item.type === TYPE_ITEM) {
            const item = /** @type {Item} */(p_item);

            if (item.parent) {
                item.parent.erase_item(item);

                if (item.parent.type === TYPE_ITEM) {
                    this._mark_ysort_dirty(/** @type {Item} */(item.parent));
                }
            }
            for (const c of item.child_items) {
                c.parent = null;
            }

            item._id = NaN; // as invalid
        } else {
            return false;
        }

        return true;
    }

    /**
     * @param {Canvas} p_canvas
     * @param {Transform2D} p_transform
     * @param {any} p_lights
     * @param {any} p_masked_lights
     * @param {Rect2} p_clip_rect
     */
    render_canvas(p_canvas, p_transform, p_lights, p_masked_lights, p_clip_rect) {
        VSG.canvas_render.canvas_begin();

        if (p_canvas.children_order_dirty) {
            p_canvas.child_items.sort(item_index_sort);
            p_canvas.children_order_dirty = false;
        }

        const l = p_canvas.child_items.length;
        const ci = p_canvas.child_items;

        let has_mirror = false;
        for (let i = 0; i < l; i++) {
            if (ci[i].mirror.x || ci[i].mirror.y) {
                has_mirror = true;
                break;
            }
        }

        if (!has_mirror) {
            get_z_list(true);
            get_z_last_list(true);

            for (let i = 0; i < l; i++) {
                this._render_canvas_item(ci[i], p_transform, p_clip_rect, WHITE, 0, z_list, z_last_list, null);
            }

            for (let i = 0; i < z_range; i++) {
                if (!z_list[i]) {
                    continue;
                }

                VSG.canvas_render.canvas_render_items(z_list[i], CANVAS_ITEM_Z_MIN + i, p_canvas.modulate, null, p_transform);
            }
        } else {
            for (let i = 0; i < l; i++) {
                const ci2 = p_canvas.child_items[i];
                this._render_canvas_item_tree(ci2, p_transform, p_clip_rect, p_canvas.modulate, null);

                const xform2 = Transform2D.new();
                if (ci2.mirror.x !== 0) {
                    xform2.copy(p_transform).translate(ci2.mirror.x, 0);
                    this._render_canvas_item_tree(ci2, xform2, p_clip_rect, p_canvas.modulate, null);
                }
                if (ci2.mirror.y !== 0) {
                    xform2.copy(p_transform).translate(0, ci2.mirror.y);
                    this._render_canvas_item_tree(ci2, xform2, p_clip_rect, p_canvas.modulate, null);
                }
                if (ci2.mirror.x !== 0 && ci2.mirror.y !== 0) {
                    xform2.copy(p_transform).translate(ci2.mirror.x, ci2.mirror.y);
                    this._render_canvas_item_tree(ci2, xform2, p_clip_rect, p_canvas.modulate, null);
                }
                Transform2D.free(xform2);
            }
        }

        VSG.canvas_render.canvas_end();
    }

    /* private */

    /**
     * @param {Item} p_canvas_item
     * @param {Transform2D} p_transform
     * @param {Rect2} p_clip_rect
     * @param {ColorLike} p_module
     * @param {any} p_lights
     */
    _render_canvas_item_tree(p_canvas_item, p_transform, p_clip_rect, p_module, p_lights) {
        this._render_canvas_item(p_canvas_item, p_transform, p_clip_rect, WHITE, 0, get_z_list(), get_z_last_list(), null);

        for (let i = 0; i < z_range; i++) {
            if (!z_list[i]) {
                continue;
            }
            VSG.canvas_render.canvas_render_items(z_list[i], CANVAS_ITEM_Z_MIN + i, p_module, null, p_transform);
        }
    }

    /**
     * @param {Item} p_canvas_item
     * @param {Transform2D} p_transform
     * @param {Rect2} p_clip_rect
     * @param {ColorLike} p_module
     * @param {number} p_z
     * @param {Item[]} z_list
     * @param {Item[]} z_last_list
     * @param {Item} p_canvas_clip
     */
    _render_canvas_item(p_canvas_item, p_transform, p_clip_rect, p_module, p_z, z_list, z_last_list, p_canvas_clip) {
        const ci = p_canvas_item;

        if (!ci.visible) {
            return;
        }

        if (ci.children_order_dirty) {
            ci.child_items.sort(item_index_sort);
            ci.children_order_dirty = false;
        }

        const rect = ci.get_rect().clone();
        const xform = p_transform.clone().append(ci.xform);
        const global_rect = xform.xform_rect(rect, rect);
        global_rect.x += p_clip_rect.x;
        global_rect.y += p_clip_rect.y;

        const modulate = Color.new().copy(ci.modulate).multiply(p_module);

        if (modulate.a < 0.007) {
            Rect2.free(rect);
            Transform2D.free(xform);
            return;
        }

        let child_item_count = ci.child_items.length;
        const child_items = ci.child_items;

        if (ci.clip) {
            if (p_canvas_clip) {
                ci.final_clip_rect.copy(p_canvas_clip.final_clip_rect).clip_by(global_rect);
            } else {
                ci.final_clip_rect.copy(global_rect);
            }
            ci.final_clip_owner = ci;
        } else {
            ci.final_clip_owner = p_canvas_clip;
        }

        if (ci.sort_y) {
            if (ci.ysort_children_count === -1) {
                ci.ysort_children_count = 0;
                const xform = Transform2D.new();
                ci.ysort_children_count = this._collect_ysort_children(ci, xform, null, ci.ysort_children_count);
                Transform2D.free(xform);
            }

            child_item_count = ci.ysort_children_count;
            if (child_items.length < child_item_count) {
                child_items.push(create_Item());
            } else {
                for (let i = child_items.length - 1; i >= child_item_count; i--) {
                    free_Item(child_items.pop());
                }
            }

            const xform = Transform2D.new();
            this._collect_ysort_children(ci, xform, child_items, 0);
            Transform2D.free(xform);

            child_items.sort(item_sort);
        }

        if (ci.z_relative) {
            p_z = clamp(p_z + ci.z_index, CANVAS_ITEM_Z_MIN, CANVAS_ITEM_Z_MAX);
        } else {
            p_z = ci.z_index;
        }

        for (let i = 0; i < child_item_count; i++) {
            const item = child_items[i];

            if (!item.behind || (ci.sort_y && item.sort_y)) {
                continue;
            }
            if (ci.sort_y) {
                const xf = xform.clone().append(item.ysort_xform);
                const mo = Color.new().copy(modulate);
                this._render_canvas_item(item, xf, p_clip_rect, /* mo.multiply(item.ysort_modulate) */null, p_z, z_list, z_last_list, /** @type {Item} */(ci.final_clip_owner));
                Color.free(mo);
                Transform2D.free(xf);
            } else {
                this._render_canvas_item(item, xform, p_clip_rect, modulate, p_z, z_list, z_last_list, /** @type {Item} */(ci.final_clip_owner));
            }
        }

        if (ci.update_when_visible) {
            VisualServer.changes++;
        }

        if (ci.commands.length > 0 && p_clip_rect.intersects(global_rect)) {
            // something to draw?
            ci.final_transform.copy(xform);
            ci.final_modulate.copy(modulate).multiply(ci.self_modulate);
            ci.global_rect_cache.copy(global_rect);
            ci.global_rect_cache.x -= p_clip_rect.x;
            ci.global_rect_cache.y -= p_clip_rect.y;

            const zidx = p_z - CANVAS_ITEM_Z_MIN;

            if (z_last_list[zidx]) {
                z_last_list[zidx].next = ci;
                z_last_list[zidx] = ci;
            } else {
                z_list[zidx] = ci;
                z_last_list[zidx] = ci;
            }

            ci.next = null;
        }

        for (let i = 0; i < child_item_count; i++) {
            const item = child_items[i];

            if (item.behind || (ci.sort_y && item.sort_y)) {
                continue;
            }
            if (ci.sort_y) {
                this._render_canvas_item(item, xform.clone().append(item.ysort_xform), p_clip_rect, modulate, p_z, z_list, z_last_list, /** @type {Item} */(ci.final_clip_owner));
            } else {
                this._render_canvas_item(item, xform, p_clip_rect, modulate, p_z, z_list, z_last_list, /** @type {Item} */(ci.final_clip_owner));
            }
        }

        Rect2.free(rect);
        Transform2D.free(xform);
        Color.free(modulate);
    }

    /**
     * @param {Item} ysort_owner
     */
    _mark_ysort_dirty(ysort_owner) {
        while (ysort_owner && ysort_owner.sort_y) {
            ysort_owner.ysort_children_count = -1;
            if (ysort_owner.parent.type === TYPE_ITEM) {
                ysort_owner = /** @type {Item} */(ysort_owner.parent);
            } else {
                ysort_owner = null;
            }
        }
    }

    /**
     * @param {Item} p_canvas_item
     * @param {Transform2D} p_transform
     * @param {Item[]} r_items
     * @param {number} r_index
     */
    _collect_ysort_children(p_canvas_item, p_transform, r_items, r_index) {
        const child_item_count = p_canvas_item.child_items.length;
        const child_items = p_canvas_item.child_items;
        for (let i = 0; i < child_item_count; i++) {
            const item = child_items[i];

            if (item.visible && item.final_modulate.a > 0.001) {
                if (r_items) {
                    r_items[r_index] = item;
                    item.ysort_xform.copy(p_transform);
                    const origin = item.xform.get_origin();
                    p_transform.xform(origin, item.ysort_pos);
                    Vector2.free(origin);
                }

                r_index++;

                if (item.sort_y) {
                    const xform = p_transform.clone().append(item.xform);
                    r_index = this._collect_ysort_children(item, xform, r_items, r_index);
                }
            }
        }
        return r_index;
    }
}
