import { remove_item } from 'engine/dep/index';
import { Element } from 'engine/core/list';
import { earcut } from 'engine/dep/earcut';
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
import { ProjectSettings } from 'engine/core/project_settings';
import { NoShrinkArray } from 'engine/core/v_array';
import { Texture } from 'engine/scene/resources/texture';
import { Material } from 'engine/scene/resources/material';

import { VisualServer } from '../visual_server';
import { VSG } from './visual_server_globals';
import {
    TYPE_LINE,
    TYPE_POLYLINE,
    TYPE_CIRCLE,
    TYPE_RECT,
    TYPE_NINEPATCH,
    TYPE_TRANSFORM,
    TYPE_CUSTOM,
    CANVAS_RECT_TILE,
    CANVAS_RECT_REGION,
    CANVAS_RECT_FLIP_H,
    CANVAS_RECT_FLIP_V,
    CANVAS_RECT_TRANSPOSE,
    NINE_PATCH_STRETCH,
    Command,
    CommandCircle,
    CommandRect,
    CommandNinePatch,
    CommandLine,
    CommandPolyLine,
    CommandPolygon,
    CommandMultiMesh,
    CommandTransform,
} from './commands';


let uid = 0;

const TYPE_ITEM = 0;
const TYPE_CANVAS = 1;

const CANVAS_ITEM_Z_MIN = -4096;
const CANVAS_ITEM_Z_MAX = 4096;

class CopyBackBuffer {
    rect = new Rect2;
    screen_rect = new Rect2;
    full = false;

    _predelete() {
        return true;
    }
    _free() { }
}

class ViewportRender {
    owner: VisualServer = null;
    udata: any = null;
    rect = new Rect2;
}

export class Item {
    _id = uid++;

    type = TYPE_ITEM;

    xform = new Transform2D;
    clip = false;
    visible = true;
    behind = false;
    update_when_visible = false;
    commands: Command[] = [];
    custom_rect = false;
    rect_dirty = true;
    rect = new Rect2;
    material: Material = null;

    next: Item = null;

    copy_back_buffer: CopyBackBuffer = null;

    final_modulate = new Color(1, 1, 1, 1);
    final_transform = new Transform2D;
    final_clip_rect = new Rect2;
    final_clip_owner: Item = null;
    material_owner: Item = null;
    vp_render: ViewportRender = null;

    distance_field = false;

    global_rect_cache = new Rect2;

    parent: Item | Canvas = null;
    E: Element<Item> = null;
    z_index = 0;
    z_relative = true;
    sort_y = false;
    modulate = new Color(1, 1, 1, 1);
    self_modulate = new Color(1, 1, 1, 1);
    use_parent_material = false;
    index = 0;
    children_order_dirty = true;
    ysort_children_count = -1;
    ysort_modulate = new Color(1, 1, 1, 1);
    ysort_xform = new Transform2D;
    ysort_pos = new Vector2;
    ysort_index = 0;

    /** @type {Item[]} */
    child_items: Item[] = [];

    /** @type {((item: Item) => void)[]} */
    free_listeners: ((item: Item) => void)[] = [];

    _predelete() {
        return true;
    }
    _free() {
        this.clear();
        if (this.copy_back_buffer) {
            this.copy_back_buffer._free();
        }

        for (let i = 0; i < this.free_listeners.length; i++) {
            this.free_listeners[i](this);
        }
        this.free_listeners.length = 0;

        Item_free(this);
    }

    get_rect() {
        if (this.custom_rect || (!this.rect_dirty && !this.update_when_visible)) {
            return this.rect;
        }

        // must update rect
        let s = this.commands.length;
        if (s === 0) {
            this.rect.set(0, 0, 0, 0);
            this.rect_dirty = false;
            return this.rect;
        }

        const xf = _i_get_rect_Transform2D_1.identity();
        let found_xform = false;
        let first = true;

        let cmd = this.commands;

        const r = _i_get_rect_Rect2_1.set(0, 0, 0, 0);
        for (let i = 0; i < s; i++) {
            let c = cmd[i];
            r.set(0, 0, 0, 0);

            switch (c.type) {
                case TYPE_LINE: {
                    let line = c as CommandLine;
                    r.x = line.from.x;
                    r.y = line.from.y;
                    r.expand_to(line.to);
                } break;
                case TYPE_POLYLINE: {
                    let pline = c as CommandPolyLine;
                    const vec = _i_get_rect_Vector2_1.set(0, 0);
                    let tri = pline.triangles;
                    for (let j = 0, len = Math.floor(tri.length / 2); j < len; j++) {
                        if (j === 0) {
                            r.x = tri[j * 2];
                            r.y = tri[j * 2 + 1];
                        } else {
                            r.expand_to(vec.set(tri[j * 2], tri[j * 2 + 1]));
                        }
                    }
                } break;
                case TYPE_CIRCLE: {
                    let circle = c as CommandCircle;
                    r.x = -circle.radius + circle.pos.x;
                    r.y = -circle.radius + circle.pos.y;
                    r.width = r.height = circle.radius * 2;
                } break;
                case TYPE_RECT: {
                    let crect = c as CommandRect;
                    r.copy(crect.rect);
                } break;
                case TYPE_NINEPATCH: {
                    let style = c as CommandNinePatch;
                    r.copy(style.rect);
                } break;
                case TYPE_TRANSFORM: {
                    let transform = c as CommandTransform;
                    xf.copy(transform.xform);
                    found_xform = true;
                } break;
                case TYPE_CUSTOM: {
                    // @ts-ignore
                    if (c.rect) {
                        // @ts-ignore
                        r.copy(c.rect);
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
                this.rect.merge_with(r);
            }
        }

        this.rect_dirty = false;
        return this.rect;
    }

    clear() {
        for (let c of this.commands) {
            c._free();
        }
        this.commands.length = 0;
        this.clip = false;
        this.rect_dirty = true;
        this.final_clip_owner = null;
        this.material_owner = null;
    }
}

/** @type {Item[]} */
const Item_pool: Item[] = [];
function Item_create() {
    let item = Item_pool.pop();
    if (!item) {
        item = new Item();
    }
    return item;
}
/**
 * @param {Item} item
 */
function Item_free(item: Item) {
    if (item) Item_pool.push(item);
}

const z_range = CANVAS_ITEM_Z_MAX - CANVAS_ITEM_Z_MIN + 1;
let z_list: Item[] = null;
let z_last_list: Item[] = null;
function get_z_list(reset = false) {
    if (!z_list) {
        z_list = Array(z_range);
        reset = false;
    }
    if (reset) {
        for (let i = 0; i < z_range; i++) {
            z_list[i] = null;
        }
    }
    return z_list;
}
function get_z_last_list(reset = false) {
    if (!z_last_list) {
        z_last_list = Array(z_range);
        reset = false;
    }
    if (reset) {
        for (let i = 0; i < z_range; i++) {
            z_last_list[i] = null;
        }
    }
    return z_last_list;
}

const item_list: NoShrinkArray<Item> = new NoShrinkArray;

const WHITE = Object.freeze(new Color(1, 1, 1, 1));

function childitem_index_sort(p_left: ChildItem, p_right: ChildItem) {
    return p_left.item.index - p_right.item.index;
}

function item_index_sort(p_left: Item, p_right: Item) {
    return p_left.index - p_right.index;
}

function item_sort(p_left: Item, p_right: Item) {
    if (Math.abs(p_left.ysort_pos.y - p_right.ysort_pos.y) < CMP_EPSILON) {
        return p_left.ysort_pos.x - p_right.ysort_pos.x;
    } else {
        return p_left.ysort_pos.y - p_right.ysort_pos.y;
    }
}

class ChildItem {
    mirror = new Vector2;
    item: Item = null;
}

export class Canvas {
    _id = uid++;

    type = TYPE_CANVAS;

    viewports: Set<import('./visual_server_viewport').Viewport_t> = new Set;

    children_order_dirty = true;
    child_items: ChildItem[] = [];
    modulate = new Color(1, 1, 1, 1);
    parent: Canvas = null;
    parent_scale = 1;

    /**
     * @param {Item} p_item
     */
    find_item(p_item: Item) {
        for (let i = 0; i < this.child_items.length; i++) {
            if (this.child_items[i].item === p_item) {
                return i;
            }
        }
        return -1;
    }

    /**
     * @param {Item} p_item
     */
    erase_item(p_item: Item) {
        let idx = this.find_item(p_item);
        if (idx >= 0) {
            remove_item(this.child_items, idx);
        }
    }
}

export class VisualServerCanvas {
    canvas_owner: Set<Canvas> = new Set;
    canvas_item_owner: Set<Item> = new Set;

    disable_scale = false;
    snap_2d_transforms = false;

    z_last: Item[] = null;
    z_last_list: Item[] = null;

    /**
     * @param {Canvas} p_canvas
     * @param {Item} p_item
     * @param {Vector2Like} p_mirroring
     */
    canvas_set_item_mirroring(p_canvas: Canvas, p_item: Item, p_mirroring: Vector2Like) {
        let idx = p_canvas.find_item(p_item);
        p_canvas.child_items[idx].mirror.copy(p_mirroring);
    }
    /**
     * @param {Canvas} p_canvas
     * @param {ColorLike} p_color
     */
    canvas_set_modulate(p_canvas: Canvas, p_color: ColorLike) {
        p_canvas.modulate.copy(p_color);
    }
    /**
     * @param {Canvas} p_canvas
     * @param {Canvas} p_parent
     * @param {number} p_scale
     */
    canvas_set_parent(p_canvas: Canvas, p_parent: Canvas, p_scale: number) {
        p_canvas.parent = p_parent;
        p_canvas.parent_scale = p_scale;
    }

    /**
     * @param {boolean} p_disable
     */
    canvas_set_disable_scale(p_disable: boolean) {
        this.disable_scale = p_disable;
    }


    canvas_create() { return new Canvas }

    canvas_item_create() { return new Item }

    /**
     * @param {Item} p_item
     * @param {Item | Canvas} p_parent
     */
    canvas_item_set_parent(p_item: Item, p_parent: Item | Canvas) {
        if (p_item.parent) {
            if (p_item.parent.type === TYPE_CANVAS) {
                (p_item.parent as Canvas).erase_item(p_item);
            } else if (p_item.parent.type === TYPE_ITEM) {
                let item_owner = p_item.parent as Item;
                item_owner.child_items.splice(item_owner.child_items.indexOf(p_item), 1);

                if (item_owner.sort_y) {
                    this._mark_ysort_dirty(item_owner, this.canvas_item_owner);
                }
            }
            p_item.parent = null;
        }

        if (p_parent) {
            if (p_parent.type === TYPE_CANVAS) {
                let canvas = p_parent as Canvas;
                // @Incomplete: recycling
                let ci = new ChildItem;
                ci.item = p_item;
                canvas.child_items.push(ci);
                canvas.children_order_dirty = true;
            } else if (p_parent.type === TYPE_ITEM) {
                let item_owner = p_parent as Item;
                item_owner.child_items.push(p_item);
                item_owner.children_order_dirty = true;

                if (item_owner.sort_y) {
                    this._mark_ysort_dirty(item_owner, this.canvas_item_owner);
                }
            }
        }

        p_item.parent = p_parent;
    }

    /**
     * @param {Item} p_item
     * @param {boolean} p_visible
     */
    canvas_item_set_visible(p_item: Item, p_visible: boolean) {
        p_item.visible = p_visible;

        this._mark_ysort_dirty(p_item, this.canvas_item_owner);
    }

    /**
     * @param {Item} p_item
     * @param {boolean} p_update
     */
    canvas_item_set_update_when_visible(p_item: Item, p_update: boolean) {
        p_item.update_when_visible = p_update;
    }

    /**
     * @param {Item} p_item
     * @param {Transform2D} p_xform
     */
    canvas_item_set_transform(p_item: Item, p_xform: Transform2D) {
        p_item.xform.copy(p_xform);
    }
    /**
     * @param {Item} p_item
     * @param {boolean} p_clip
     */
    canvas_item_set_clip(p_item: Item, p_clip: boolean) {
        p_item.clip = p_clip;
    }
    /**
     * @param {Item} p_item
     * @param {boolean} p_enable
     */
    canvas_item_set_distance_field_mode(p_item: Item, p_enable: boolean) {
        p_item.distance_field = p_enable;
    }
    /**
     * @param {Item} p_item
     * @param {boolean} p_custom_rect
     * @param {Rect2} p_rect
     */
    canvas_item_set_custom_rect(p_item: Item, p_custom_rect: boolean, p_rect: Rect2) {
        p_item.custom_rect = p_custom_rect;
        p_item.rect.copy(p_rect);
    }
    /**
     * @param {Item} canvas_item
     * @param {ColorLike} modulate
     */
    canvas_item_set_modulate(canvas_item: Item, modulate: ColorLike) {
        canvas_item.modulate.copy(modulate);
    }
    /**
     * @param {Item} canvas_item
     * @param {ColorLike} modulate
     */
    canvas_item_set_self_modulate(canvas_item: Item, modulate: ColorLike) {
        canvas_item.self_modulate.copy(modulate);
    }

    /**
     * @param {Item} canvas_item
     * @param {boolean} behind
     */
    canvas_item_set_draw_behind_parent(canvas_item: Item, behind: boolean) {
        canvas_item.behind = behind;
    }

    /**
     * @param {Item} p_item
     * @param {Vector2Like} p_from
     * @param {Vector2Like} p_to
     * @param {ColorLike} p_color
     * @param {number} p_width
     * @param {boolean} p_antialiased
     */
    canvas_item_add_line(p_item: Item, p_from: Vector2Like, p_to: Vector2Like, p_color: ColorLike, p_width: number, p_antialiased: boolean) {
        let line = CommandLine.instance();
        line.color.copy(p_color);
        line.from.copy(p_from);
        line.to.copy(p_to);
        line.width = p_width;
        line.antialiased = p_antialiased;
        p_item.rect_dirty = true;

        p_item.commands.push(line);
    }
    /**
     * @param {Item} p_item
     * @param {number[]} p_points
     * @param {number[]} p_colors
     * @param {number} [p_width]
     * @param {boolean} [p_antialiased]
     */
    canvas_item_add_polyline(p_item: Item, p_points: number[], p_colors: number[], p_width: number = 1.0, p_antialiased: boolean = false) {
        let pline = CommandPolyLine.instance();

        pline.antialiased = p_antialiased;

        /* make a triangle strip for drawing */
        let prev_x = 0, prev_y = 0;
        pline.triangles.length = p_points.length * 2;

        if (p_colors.length === 0) {
            pline.triangle_colors.push(1, 1, 1, 1);
        } else if (p_colors.length === 4) {
            for (let i = 0; i < p_colors.length; i++) {
                pline.triangle_colors[i] = p_colors[i];
            }
        } else {
            if (p_colors.length * 4 !== p_points.length * 2) {
                pline.triangle_colors.push(p_colors[0], p_colors[1], p_colors[2], p_colors[3]);
            } else {
                pline.triangle_colors.length = pline.triangles.length / 2 * 4;
            }
        }

        const t = _i_canvas_item_add_polyline_Vector2_1.set(0, 0);
        const tangent = _i_canvas_item_add_polyline_Vector2_2.set(0, 0);
        for (let i = 0, len = Math.floor(p_points.length / 2); i < len; i++) {
            let index = i * 2;

            if (i === len - 1) {
                t.x = prev_x;
                t.y = prev_y;
            } else {
                let _t = t.set(
                    p_points[(i + 1) * 2 + 0] - p_points[index + 0],
                    p_points[(i + 1) * 2 + 1] - p_points[index + 1]
                )
                .normalize().tangent(_i_canvas_item_add_polyline_Vector2_3);
                t.copy(_t);

                if (i === 0) {
                    prev_x = t.x;
                    prev_y = t.y;
                }
            }

            tangent.copy(t).add(prev_x, prev_y).normalize().scale(p_width * 0.5);

            pline.triangles[index * 2 + 0] = p_points[index + 0] + tangent.x;
            pline.triangles[index * 2 + 1] = p_points[index + 1] + tangent.y;
            pline.triangles[index * 2 + 2] = p_points[index + 0] - tangent.x;
            pline.triangles[index * 2 + 3] = p_points[index + 1] - tangent.y;

            if (pline.triangle_colors.length > 4) {
                pline.triangle_colors[index * 2 + 0] = p_colors[i * 2 + 0];
                pline.triangle_colors[index * 2 + 1] = p_colors[i * 2 + 1];
                pline.triangle_colors[index * 2 + 2] = p_colors[i * 2 + 2];
                pline.triangle_colors[index * 2 + 3] = p_colors[i * 2 + 3];

                pline.triangle_colors[index * 2 + 4] = p_colors[i * 2 + 0];
                pline.triangle_colors[index * 2 + 5] = p_colors[i * 2 + 1];
                pline.triangle_colors[index * 2 + 6] = p_colors[i * 2 + 2];
                pline.triangle_colors[index * 2 + 7] = p_colors[i * 2 + 3];
            }

            prev_x = t.x;
            prev_y = t.y;
        }

        p_item.rect_dirty = true;
        p_item.commands.push(pline);
    }
    canvas_item_add_multiline() { }
    /**
     * @param {Item} p_item
     * @param {Rect2} p_rect
     * @param {ColorLike} p_color
     */
    canvas_item_add_rect(p_item: Item, p_rect: Rect2, p_color: ColorLike) {
        let rect = CommandRect.instance();
        rect.modulate.copy(p_color);
        rect.rect.copy(p_rect);
        p_item.rect_dirty = true;

        p_item.commands.push(rect);
    }
    /**
     * @param {Item} p_item
     * @param {Vector2Like} p_pos
     * @param {number} p_radius
     * @param {ColorLike} p_color
     */
    canvas_item_add_circle(p_item: Item, p_pos: Vector2Like, p_radius: number, p_color: ColorLike) {
        let circle = CommandCircle.instance();
        circle.color.copy(p_color);
        circle.pos.copy(p_pos);
        circle.radius = p_radius;
        p_item.rect_dirty = true;

        p_item.commands.push(circle);
    }
    /**
     * @param {Item} p_item
     * @param {Rect2} p_rect
     * @param {Texture} p_texture
     * @param {boolean} [p_tile=false]
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose=false]
     */
    canvas_item_add_texture_rect(p_item: Item, p_rect: Rect2, p_texture: Texture, p_tile: boolean = false, p_modulate: ColorLike = WHITE, p_transpose: boolean = false) {
        let rect = CommandRect.instance();
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
            let t = rect.rect.height;
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
     * @param {Texture} p_texture
     * @param {Rect2} p_src_rect
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose=false]
     */
    canvas_item_add_texture_rect_region(p_item: Item, p_rect: Rect2, p_texture: Texture, p_src_rect: Rect2, p_modulate: ColorLike = WHITE, p_transpose: boolean = false) {
        let rect = CommandRect.instance();
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
            let t = rect.rect.height;
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
     * @param {Texture} p_texture
     * @param {Vector2} p_topleft
     * @param {Vector2} p_bottomright
     * @param {number} [p_x_axis_mode]
     * @param {number} [p_y_axis_mode]
     * @param {boolean} [p_draw_center=true]
     * @param {ColorLike} [p_modulate=white]
     */
    canvas_item_add_nine_patch(p_item: Item, p_rect: Rect2, p_source: Rect2, p_texture: Texture, p_topleft: Vector2, p_bottomright: Vector2, p_x_axis_mode: number = NINE_PATCH_STRETCH, p_y_axis_mode: number = NINE_PATCH_STRETCH, p_draw_center: boolean = true, p_modulate: ColorLike = WHITE) {
        let style = CommandNinePatch.instance();
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
    /**
     * Unlike same method of Godot, we accept indices array as optional parameter,
     * we will not triangulate if it is provided (could be faster).
     * @param {Item} p_item
     * @param {number[]} p_points [x, y]
     * @param {number[]} p_colors [r, g, b, a]
     * @param {number[]} [p_uvs] [u, v]
     * @param {Texture} [p_texture]
     * @param {number[]} [p_indices]
     */
    canvas_item_add_polygon(p_item: Item, p_points: number[], p_colors: number[], p_uvs: number[], p_texture: Texture, p_indices: number[]) {
        let polygon = CommandPolygon.instance();
        polygon.texture = p_texture;
        polygon.points = p_points.slice();
        polygon.colors = p_colors.slice();
        if (p_uvs) polygon.uvs = p_uvs.slice();
        if (p_indices) {
            polygon.indices = p_indices.slice();
        } else {
            polygon.indices = earcut(polygon.points);
        }

        p_item.rect_dirty = true;

        p_item.commands.push(polygon);
    }
    /**
     * Unlike same method of Godot, we accept indices array as optional parameter,
     * we will not triangulate if it is provided (could be faster).
     * @param {Item} p_item
     * @param {number[]} p_indices
     * @param {number[]} p_points [x, y]
     * @param {number[]} p_colors [r, g, b, a]
     * @param {number[]} [p_uvs] [u, v]
     * @param {number[]} [p_bones]
     * @param {number[]} [p_weights]
     * @param {Texture} [p_texture]
     */
    canvas_item_add_triangle_array(p_item: Item, p_indices: number[], p_points: number[], p_colors: number[], p_uvs: number[], p_bones: number[], p_weights: number[], p_texture: Texture) {
        let polygon = CommandPolygon.instance();
        polygon.texture = p_texture;
        polygon.points = p_points.slice();
        polygon.colors = p_colors.slice();
        polygon.bones = p_bones.slice();
        polygon.weights = p_weights.slice();
        if (p_uvs) polygon.uvs = p_uvs.slice();
        if (p_indices) {
            polygon.indices = p_indices.slice();
        } else {
            polygon.indices = earcut(polygon.points);
        }

        p_item.rect_dirty = true;

        p_item.commands.push(polygon);
    }
    /**
     * @param {Item} p_item
     * @param {any} p_mesh
     * @param {Texture} p_texture
     */
    canvas_item_add_multimesh(p_item: Item, p_mesh: any, p_texture: Texture) {
        let mm = CommandMultiMesh.instance();
        mm.multimesh = p_mesh;
        mm.texture = p_texture;

        p_item.rect_dirty = true;
        p_item.commands.push(mm);
    }
    /**
     * @param {Item} p_item
     * @param {number[]} p_transform
     */
    canvas_item_add_set_transform(p_item: Item, p_transform: number[]) {
        let tr = CommandTransform.instance();
        tr.xform.from_array(p_transform);

        p_item.commands.push(tr);
    }
    /**
     * @param {Item} p_item
     * @param {boolean} p_enabled
     */
    canvas_item_set_sort_children_by_y(p_item: Item, p_enabled: boolean) {
        p_item.sort_y = p_enabled;
        this._mark_ysort_dirty(p_item, this.canvas_item_owner);
    }
    /**
     * @param {Item} p_item
     * @param {number} p_z
     */
    canvas_item_set_z_index(p_item: Item, p_z: number) {
        p_item.z_index = p_z;
    }
    /**
     * @param {Item} p_item
     * @param {boolean} p_enable
     */
    canvas_item_set_z_as_relative_to_parent(p_item: Item, p_enable: boolean) {
        p_item.z_relative = p_enable;
    }

    /**
     * @param {Item} p_item
     */
    canvas_item_clear(p_item: Item) {
        p_item.clear();
    }
    /**
     * @param {Item} p_item
     * @param {number} p_index
     */
    canvas_item_set_draw_index(p_item: Item, p_index: number) {
        p_item.index = p_index;
        p_item.parent.children_order_dirty = true;
    }

    /**
     * @param {Item} p_item
     * @param {Material} p_material
     */
    canvas_item_set_material(p_item: Item, p_material: Material) {
        p_item.material = p_material;
    }

    /**
     * @param {Canvas | Item} p_item
     */
    item_free(p_item: Canvas | Item) {
        if (p_item.type === TYPE_CANVAS) {
            let canvas = p_item as Canvas;

            for (let vp of canvas.viewports) {
                vp.canvas_map.delete(canvas);
            }
            canvas.viewports.clear();

            for (let c of canvas.child_items) {
                c.item.parent = null;
            }

            canvas._id = NaN; // as invalid
            // @Incomplete: canvas._free();
        } else if (p_item.type === TYPE_ITEM) {
            let item = p_item as Item;

            if (item.parent) {
                if (item.parent.type === TYPE_CANVAS) {
                    let canvas = item.parent as Canvas;
                    canvas.erase_item(item);
                } else if (item.parent.type === TYPE_ITEM) {
                    let item_owner = item.parent as Item;
                    item_owner.child_items.splice(item_owner.child_items.indexOf(item), 1);
                    if (item_owner.sort_y) {
                        this._mark_ysort_dirty(item_owner, this.canvas_item_owner);
                    }
                }
            }
            for (let c of item.child_items) {
                c.parent = null;
            }

            item._id = NaN; // as invalid
            // @Incomplete: item._free();
        } else {
            return false;
        }

        return true;
    }

    /**
     * @param {Canvas} p_canvas
     * @param {Transform2D} p_transform
     * @param {Rect2} p_clip_rect
     * @param {number} p_canvas_layer_id
     */
    render_canvas(p_canvas: Canvas, p_transform: Transform2D, p_clip_rect: Rect2, p_canvas_layer_id: number) {
        VSG.canvas_render.canvas_begin();

        if (p_canvas.children_order_dirty) {
            p_canvas.child_items.sort(childitem_index_sort);
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

        if (!ProjectSettings.get_singleton().display.fast2d) {
            if (!has_mirror) {
                get_z_list(true);
                get_z_last_list(true);

                for (let i = 0; i < l; i++) {
                    this._render_canvas_item(ci[i].item, p_transform, p_clip_rect, WHITE, 0, z_list, z_last_list, null, null);
                }

                for (let i = 0; i < z_range; i++) {
                    if (!z_list[i]) {
                        continue;
                    }

                    VSG.canvas_render.canvas_render_items(z_list[i], CANVAS_ITEM_Z_MIN + i, p_canvas.modulate, p_transform);
                }
            } else {
                for (let i = 0; i < l; i++) {
                    let ci2 = p_canvas.child_items[i];
                    this._render_canvas_item_tree(ci2.item, p_transform, p_clip_rect, p_canvas.modulate);

                    const xform2 = _i_render_canvas_Transform2D_1.identity();
                    if (ci2.mirror.x !== 0) {
                        xform2.copy(p_transform).translate(ci2.mirror.x, 0);
                        this._render_canvas_item_tree(ci2.item, xform2, p_clip_rect, p_canvas.modulate);
                    }
                    if (ci2.mirror.y !== 0) {
                        xform2.copy(p_transform).translate(0, ci2.mirror.y);
                        this._render_canvas_item_tree(ci2.item, xform2, p_clip_rect, p_canvas.modulate);
                    }
                    if (ci2.mirror.x !== 0 && ci2.mirror.y !== 0) {
                        xform2.copy(p_transform).translate(ci2.mirror.x, ci2.mirror.y);
                        this._render_canvas_item_tree(ci2.item, xform2, p_clip_rect, p_canvas.modulate);
                    }
                }
            }
        } else {
            if (!has_mirror) {
                item_list.clear();
                for (let i = 0; i < l; i++) {
                    this._render_canvas_item_fast(ci[i].item, p_transform, p_clip_rect, WHITE, item_list, null, null);
                }
                VSG.canvas_render.canvas_render_items_array(item_list, p_canvas.modulate, p_transform);
            } else {
                for (let i = 0; i < l; i++) {
                    const ci2 = ci[i];
                    this._render_canvas_item_tree_fast(ci[i].item, p_transform, p_clip_rect, WHITE);

                    const xform2 = _i_render_canvas_Transform2D_1.identity();
                    if (ci2.mirror.x !== 0) {
                        xform2.copy(p_transform).translate(ci2.mirror.x, 0);
                        this._render_canvas_item_tree_fast(ci2.item, xform2, p_clip_rect, p_canvas.modulate);
                    }
                    if (ci2.mirror.y !== 0) {
                        xform2.copy(p_transform).translate(0, ci2.mirror.y);
                        this._render_canvas_item_tree_fast(ci2.item, xform2, p_clip_rect, p_canvas.modulate);
                    }
                    if (ci2.mirror.x !== 0 && ci2.mirror.y !== 0) {
                        xform2.copy(p_transform).translate(ci2.mirror.x, ci2.mirror.y);
                        this._render_canvas_item_tree_fast(ci2.item, xform2, p_clip_rect, p_canvas.modulate);
                    }
                }
            }
        }

        VSG.canvas_render.canvas_end();
    }

    /* private */

    _render_canvas_item_tree(p_canvas_item: Item, p_transform: Transform2D, p_clip_rect: Rect2, p_modulate: Color) {
        get_z_list(true);
        get_z_last_list(true);

        this._render_canvas_item(p_canvas_item, p_transform, p_clip_rect, WHITE, 0, z_list, z_last_list, null, null);

        for (let i = 0; i < z_range; i++) {
            if (!z_list[i]) {
                continue;
            }
            VSG.canvas_render.canvas_render_items(z_list[i], CANVAS_ITEM_Z_MIN + i, p_modulate, p_transform);
        }
    }

    _render_canvas_item_tree_fast(p_canvas_item: Item, p_transform: Transform2D, p_clip_rect: Rect2, p_modulate: Color) {
        item_list.clear();
        this._render_canvas_item_fast(p_canvas_item, p_transform, p_clip_rect, WHITE, item_list, null, null);
        VSG.canvas_render.canvas_render_items_array(item_list, p_modulate, p_transform);
    }

    /**
     * @param {Item} p_canvas_item
     * @param {Transform2D} p_transform
     * @param {Rect2} p_clip_rect
     * @param {Color} p_modulate
     * @param {number} p_z
     * @param {Item[]} z_list
     * @param {Item[]} z_last_list
     * @param {Item} p_canvas_clip
     * @param {Item} p_material_owner
     */
    _render_canvas_item(p_canvas_item: Item, p_transform: Transform2D, p_clip_rect: Rect2, p_modulate: Color, p_z: number, z_list: Item[], z_last_list: Item[], p_canvas_clip: Item, p_material_owner: Item) {
        let ci = p_canvas_item;

        if (!ci.visible) {
            return;
        }

        if (ci.children_order_dirty) {
            ci.child_items.sort(item_index_sort);
            ci.children_order_dirty = false;
        }

        const rect = _i_render_canvas_item_Rect2_1.copy(ci.get_rect());
        const xform = Transform2D.new().copy(ci.xform);
        if (this.snap_2d_transforms) {
            xform.tx = Math.floor(xform.tx);
            xform.ty = Math.floor(xform.ty);
        }
        const xx = _i_render_canvas_item_Transform2D_2.copy(xform);
        xform.copy(p_transform).append(xx);

        let global_rect = xform.xform_rect(rect, rect);
        global_rect.x += p_clip_rect.x;
        global_rect.y += p_clip_rect.y;

        if (ci.use_parent_material && p_material_owner) {
            ci.material_owner = p_material_owner;
        } else {
            p_material_owner = ci;
            ci.material_owner = null;
        }

        const modulate = ci.modulate.clone().multiply(p_modulate);

        if (modulate.a < 0.007) {
            Color.free(modulate);
            Transform2D.free(xform);
            return;
        }

        let child_item_count = ci.child_items.length;
        let child_items = ci.child_items;

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
                const xform = _i_render_canvas_item_Transform2D_3.identity();
                ci.ysort_children_count = this._collect_ysort_children(ci, xform, p_material_owner, WHITE, null, 0);
            }

            child_item_count = ci.ysort_children_count;
            if (child_items.length < child_item_count) {
                while (child_items.length < child_item_count) {
                    child_items.push(Item_create());
                }
            } else {
                for (let i = child_items.length - 1; i >= child_item_count; i--) {
                    Item_free(child_items.pop());
                }
            }

            const xform = _i_render_canvas_item_Transform2D_4.identity();
            this._collect_ysort_children(ci, xform, p_material_owner, WHITE, child_items, 0);

            child_items.sort(item_sort);
        }

        if (ci.z_relative) {
            p_z = clamp(p_z + ci.z_index, CANVAS_ITEM_Z_MIN, CANVAS_ITEM_Z_MAX);
        } else {
            p_z = ci.z_index;
        }

        for (let i = 0; i < child_item_count; i++) {
            let item = child_items[i];

            if (!item.behind || (ci.sort_y && item.sort_y)) {
                continue;
            }
            if (ci.sort_y) {
                const xf = xform.clone().append(item.ysort_xform);
                const mo = modulate.clone().multiply(item.ysort_modulate);
                this._render_canvas_item(item, xf, p_clip_rect, mo, p_z, z_list, z_last_list, ci.final_clip_owner, item.material_owner);
                Color.free(mo);
                Transform2D.free(xf);
            } else {
                this._render_canvas_item(item, xform, p_clip_rect, modulate, p_z, z_list, z_last_list, ci.final_clip_owner, p_material_owner);
            }
        }

        if (ci.copy_back_buffer) {
            xform.xform_rect(ci.copy_back_buffer.screen_rect, ci.copy_back_buffer.screen_rect).clip_by(p_clip_rect);
        }

        if (ci.update_when_visible) {
            VisualServer.get_singleton().redraw_request();
        }

        if ((ci.commands.length > 0 && p_clip_rect.intersects(global_rect)) || ci.vp_render || ci.copy_back_buffer) {
            // something to draw?
            ci.final_transform.copy(xform);
            ci.final_modulate.copy(modulate).multiply(ci.self_modulate);
            ci.global_rect_cache.copy(global_rect);
            ci.global_rect_cache.x -= p_clip_rect.x;
            ci.global_rect_cache.y -= p_clip_rect.y;

            let zidx = p_z - CANVAS_ITEM_Z_MIN;

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
            let item = child_items[i];

            if (item.behind || (ci.sort_y && item.sort_y)) {
                continue;
            }
            if (ci.sort_y) {
                const xx = xform.clone().append(item.ysort_xform);
                const mm = modulate.clone().multiply(item.ysort_modulate);
                this._render_canvas_item(item, xx, p_clip_rect, mm, p_z, z_list, z_last_list, ci.final_clip_owner, item.material_owner);
                Color.free(mm);
                Transform2D.free(xx);
            } else {
                this._render_canvas_item(item, xform, p_clip_rect, modulate, p_z, z_list, z_last_list, ci.final_clip_owner, p_material_owner);
            }
        }

        Transform2D.free(xform);
        Color.free(modulate);
    }

    _render_canvas_item_fast(p_canvas_item: Item, p_transform: Transform2D, p_clip_rect: Rect2, p_modulate: Color, item_list: NoShrinkArray<Item>, p_canvas_clip: Item, p_material_owner: Item) {
        let ci = p_canvas_item;

        if (!ci.visible) {
            return;
        }

        if (ci.children_order_dirty) {
            ci.child_items.sort(item_index_sort);
            ci.children_order_dirty = false;
        }

        const rect = _i_render_canvas_item_Rect2_1.copy(ci.get_rect());
        const xform = Transform2D.new().copy(ci.xform);
        if (this.snap_2d_transforms) {
            xform.tx = Math.floor(xform.tx);
            xform.ty = Math.floor(xform.ty);
        }
        const xx = _i_render_canvas_item_Transform2D_2.copy(xform);
        xform.copy(p_transform).append(xx);

        let global_rect = xform.xform_rect(rect, rect);
        global_rect.x += p_clip_rect.x;
        global_rect.y += p_clip_rect.y;

        if (ci.use_parent_material && p_material_owner) {
            ci.material_owner = p_material_owner;
        } else {
            p_material_owner = ci;
            ci.material_owner = null;
        }

        const modulate = ci.modulate.clone().multiply(p_modulate);

        if (modulate.a < 0.007) {
            Color.free(modulate);
            Transform2D.free(xform);
            return;
        }

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

        if (ci.copy_back_buffer) {
            xform.xform_rect(ci.copy_back_buffer.screen_rect, ci.copy_back_buffer.screen_rect).clip_by(p_clip_rect);
        }

        if ((ci.commands.length > 0 && p_clip_rect.intersects(global_rect)) || ci.vp_render || ci.copy_back_buffer) {
            // something to draw?
            ci.final_transform.copy(xform);
            ci.final_modulate.copy(modulate).multiply(ci.self_modulate);
            ci.global_rect_cache.copy(global_rect);
            ci.global_rect_cache.x -= p_clip_rect.x;
            ci.global_rect_cache.y -= p_clip_rect.y;

            item_list.push(ci);
        }

        // try to render all its child items
        for (let item of ci.child_items) {
            this._render_canvas_item_fast(item, xform, p_clip_rect, modulate, item_list, ci.final_clip_owner, p_material_owner);
        }
    }

    /**
     * @param {Item} ysort_owner
     * @param {Set<Item>} canvas_item_owner
     */
    _mark_ysort_dirty(ysort_owner: Item, canvas_item_owner: Set<Item>) {
        do {
            ysort_owner.ysort_children_count = -1;
            ysort_owner = canvas_item_owner.has(ysort_owner.parent as Item) ? ysort_owner.parent as Item : null;
        } while (ysort_owner && ysort_owner.sort_y);
    }

    /**
     * @param {Item} p_canvas_item
     * @param {Transform2D} p_transform
     * @param {Item} p_material_owner
     * @param {Color} p_modulate
     * @param {Item[]} r_items
     * @param {number} r_index
     */
    _collect_ysort_children(p_canvas_item: Item, p_transform: Transform2D, p_material_owner: Item, p_modulate: Color, r_items: Item[], r_index: number) {
        let child_item_count = p_canvas_item.child_items.length;
        let child_items = p_canvas_item.child_items;
        for (let i = 0; i < child_item_count; i++) {
            let item = child_items[i];

            if (item.visible && item.final_modulate.a > 0.001) {
                if (r_items) {
                    r_items[r_index] = item;
                    item.ysort_modulate.copy(p_modulate);
                    item.ysort_xform.copy(p_transform);
                    const origin = item.xform.get_origin(_i_collect_ysort_children_Vector2_1);
                    p_transform.xform(origin, item.ysort_pos);
                    item.material_owner = item.use_parent_material ? p_material_owner : null;
                    item.ysort_index = r_index;
                }

                r_index++;

                if (item.sort_y) {
                    const xform = _i_collect_ysort_children_Transform2D_1.copy(p_transform).append(item.xform);
                    const mm = _i_collect_ysort_children_Color_1.copy(p_modulate).multiply(item.modulate);
                    r_index = this._collect_ysort_children(item, xform, item.use_parent_material ? p_material_owner : item, mm, r_items, r_index);
                }
            }
        }
        return r_index;
    }
}

const _i_get_rect_Vector2_1 = new Vector2;
const _i_get_rect_Rect2_1 = new Rect2;
const _i_get_rect_Transform2D_1 = new Transform2D;

const _i_canvas_item_add_polyline_Vector2_1 = new Vector2;
const _i_canvas_item_add_polyline_Vector2_2 = new Vector2;
const _i_canvas_item_add_polyline_Vector2_3 = new Vector2;

const _i_render_canvas_Transform2D_1 = new Transform2D;

const _i_render_canvas_item_Rect2_1 = new Rect2;
const _i_render_canvas_item_Transform2D_1 = new Transform2D;
const _i_render_canvas_item_Transform2D_2 = new Transform2D;
const _i_render_canvas_item_Transform2D_3 = new Transform2D;
const _i_render_canvas_item_Transform2D_4 = new Transform2D;
const _i_render_canvas_item_Transform2D_5 = new Transform2D;
const _i_render_canvas_item_Transform2D_6 = new Transform2D;
const _i_render_canvas_item_Color_1 = new Color;
const _i_render_canvas_item_Color_2 = new Color;
const _i_render_canvas_item_Color_3 = new Color;

const _i_collect_ysort_children_Vector2_1 = new Vector2;
const _i_collect_ysort_children_Transform2D_1 = new Transform2D;
const _i_collect_ysort_children_Color_1 = new Color;
