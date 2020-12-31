import { node_class_map, res_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { MessageQueue } from "engine/core/message_queue";
import { List, Element as List$Element } from "engine/core/list";
import { SelfList } from "engine/core/self_list";
import { Vector2Like } from "engine/core/math/vector2";
import { PoolVector2Array } from "engine/core/math/pool_vector2_array";
import { Transform2D } from "engine/core/math/transform_2d";
import { Rect2 } from "engine/core/math/rect2";
import { Color, ColorLike } from "engine/core/color";

import { VSG } from "engine/servers/visual/visual_server_globals";

import { ImageTexture } from "../resources/texture";
import { StyleBox } from "../resources/style_box";
import { Material } from "../resources/material";
import { GROUP_CALL_UNIQUE } from "../main/scene_tree";
import { CanvasLayer } from "../main/canvas_layer";
import {
    Node,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_MOVED_IN_PARENT,
    NOTIFICATION_EXIT_TREE,
} from "../main/node";
import { NOTIFICATION_TRANSFORM_CHANGED } from "../const";


export const NOTIFICATION_DRAW = 30;
export const NOTIFICATION_VISIBILITY_CHANGED = 31;
export const NOTIFICATION_ENTER_CANVAS = 32;
export const NOTIFICATION_EXIT_CANVAS = 33;
export const NOTIFICATION_LOCAL_TRANSFORM_CHANGED = 35;
export const NOTIFICATION_WORLD_2D_CHANGED = 36;

export const BLEND_MODE_MIX = 0;
export const BLEND_MODE_ADD = 1;
export const BLEND_MODE_SUB = 2;
export const BLEND_MODE_MUL = 3;
export const BLEND_MODE_PREMULT_ALPHA = 4;
export const BLEND_MODE_DISABLE = 5;

const WHITE = new Color(1, 1, 1, 1);

export class CanvasItemMaterial extends Material {
    get class() { return "CanvasItemMaterial" }

    blend_mode = BLEND_MODE_MIX;

    _load_data(data: any) {
        if (data.blend_mode !== undefined) this.blend_mode = data.blend_mode;
        return this;
    }
}
res_class_map['CanvasItemMaterial'] = CanvasItemMaterial;

export class CanvasItem extends Node {
    get class() { return 'CanvasItem' }

    is_canvas_item = true;

    xform_change: SelfList<Node> = new SelfList(this);

    canvas_item = VSG.canvas.canvas_item_create();
    group = "";

    canvas_layer: CanvasLayer = null;

    modulate = new Color(1, 1, 1, 1);
    self_modulate = new Color(1, 1, 1, 1);

    children_items: List<CanvasItem> = new List;
    C: List$Element<CanvasItem> = null;

    first_draw = false;
    visible = true;
    pending_update = false;
    toplevel = false;
    drawing = false;
    block_transform_notify = false;
    show_behind_parent = false;
    use_parent_material = true;
    notify_local_transform = false;
    notify_transform = false;

    material: Material = null;

    global_transform = new Transform2D;
    global_invalid = true;

    _free() {
        VSG.canvas.item_free(this.canvas_item);
        super._free();
    }

    /* virtual */

    /**
     * @param {any} data
     */
    _load_data(data: any) {
        super._load_data(data);

        if (data.modulate !== undefined) {
            this.set_modulate(data.modulate);
        }
        if (data.self_modulate !== undefined) {
            this.set_self_modulate(data.self_modulate);
        }
        if (data.show_behind_parent !== undefined) {
            this.set_show_behind_parent(data.show_behind_parent);
        }
        if (data.visible !== undefined) {
            this.set_visible(data.visible);
        }
        if (data.material !== undefined) {
            this.set_material(data.material);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                this.first_draw = true;
                let ci: CanvasItem = this.get_parent() as CanvasItem;
                if (!ci.is_canvas_item) ci = null;

                if (ci) {
                    this.C = ci.children_items.push_back(this);
                }
                this._enter_canvas();
                if (!this.block_transform_notify && !this.xform_change.in_list()) {
                    this.get_tree().xform_change_list.add(this.xform_change);
                }
            } break;
            case NOTIFICATION_MOVED_IN_PARENT: {
                if (!this.is_inside_tree()) {
                    break;
                }

                if (this.group.length > 0) {
                    this.get_tree().call_group_flags(GROUP_CALL_UNIQUE, this.group, '_toplevel_raise_self');
                } else {
                    const p = this.get_parent_item();
                    VSG.canvas.canvas_item_set_draw_index(this.canvas_item, this.get_index());
                }
            } break;
            case NOTIFICATION_EXIT_TREE: {
                if (this.xform_change.in_list()) {
                    this.get_tree().xform_change_list.remove(this.xform_change);
                }
                this._exit_canvas();
                if (this.C) {
                    let ci: CanvasItem = this.get_parent() as CanvasItem;
                    ci.children_items.erase(this.C);
                    this.C = null;
                }
                this.global_invalid = true;
            } break;
            case NOTIFICATION_VISIBILITY_CHANGED: {
                this.emit_signal('visibility_changed');
            } break;
        }
    }

    _draw() { }

    /* public */

    /**
     * @param {Vector2Like} p_from
     * @param {Vector2Like} p_to
     * @param {ColorLike} p_color
     * @param {number} p_width
     * @param {boolean} [p_antialiased]
     */
    draw_line(p_from: Vector2Like, p_to: Vector2Like, p_color: ColorLike, p_width: number = 1.0, p_antialiased: boolean = false) {
        VSG.canvas.canvas_item_add_line(this.canvas_item, p_from, p_to, p_color, p_width, p_antialiased);
    }

    /**
     * @param {PoolVector2Array | number[]} p_points
     * @param {ColorLike} p_color
     * @param {number} [p_width]
     * @param {boolean} [p_antialiased]
     */
    draw_polyline(p_points: PoolVector2Array | number[], p_color: ColorLike, p_width: number = 1.0, p_antialiased: boolean = false) {
        if (Array.isArray(p_points)) {
            VSG.canvas.canvas_item_add_polyline(this.canvas_item, p_points, [p_color.r, p_color.g, p_color.b, p_color.a], p_width, p_antialiased);
        } else {
            VSG.canvas.canvas_item_add_polyline(this.canvas_item, p_points.data, [p_color.r, p_color.g, p_color.b, p_color.a], p_width, p_antialiased);
        }
    }

    /**
     * @param {PoolVector2Array | number[]} p_points
     * @param {number[]} p_colors
     * @param {number} [p_width]
     * @param {boolean} [p_antialiased]
     */
    draw_polyline_colors(p_points: PoolVector2Array | number[], p_colors: number[], p_width: number = 1.0, p_antialiased: boolean = false) {
        if (Array.isArray(p_points)) {
            VSG.canvas.canvas_item_add_polyline(this.canvas_item, p_points, p_colors, p_width, p_antialiased);
        } else {
            VSG.canvas.canvas_item_add_polyline(this.canvas_item, p_points.data, p_colors, p_width, p_antialiased);
        }
    }

    /**
     * @param {Rect2} p_rect
     * @param {ColorLike} p_color
     * @param {boolean} [p_filled=true]
     * @param {number} [p_width=1]
     * @param {boolean} [p_antialiased=false]
     */
    draw_rect(p_rect: Rect2, p_color: ColorLike, p_filled: boolean = true, p_width: number = 1.0, p_antialiased: boolean = false) {
        if (p_filled) {
            VSG.canvas.canvas_item_add_rect(this.canvas_item, p_rect, p_color);
        } else {
            VSG.canvas.canvas_item_add_polyline(this.canvas_item, [
                p_rect.left, p_rect.top,
                p_rect.right, p_rect.top,
                p_rect.right, p_rect.bottom,
                p_rect.left, p_rect.bottom,
                p_rect.left, p_rect.top,
            ], [p_color.r, p_color.g, p_color.b, p_color.a], p_width, p_antialiased);
        }
    }

    /**
     * @param {Vector2Like} p_pos
     * @param {number} p_radius
     * @param {ColorLike} p_color
     */
    draw_circle(p_pos: Vector2Like, p_radius: number, p_color: ColorLike) {
        VSG.canvas.canvas_item_add_circle(this.canvas_item, p_pos, p_radius, p_color);
    }

    /**
     * @param {Vector2Like} p_center
     * @param {number} p_radius
     * @param {number} p_start_angle
     * @param {number} p_end_angle
     * @param {number} p_point_count
     * @param {ColorLike} p_color
     * @param {number} [p_width]
     * @param {boolean} [p_antialiased]
     */
    draw_arc(p_center: Vector2Like, p_radius: number, p_start_angle: number, p_end_angle: number, p_point_count: number, p_color: ColorLike, p_width: number = 1.0, p_antialiased: boolean = false) {
        const points = new Array(p_point_count);
        const delta_angle = p_end_angle - p_start_angle;
        for (let i = 0; i < p_point_count; i++) {
            const theta = i / (p_point_count - 1) * delta_angle + p_start_angle;
            points[i] = {
                x: Math.cos(theta) * p_radius + p_center.x,
                y: Math.sin(theta) * p_radius + p_center.y,
            };
        }

        this.draw_polyline(points, p_color, p_width, p_antialiased);
    }

    /**
     * @param {StyleBox} p_style_box
     * @param {Rect2} p_rect
     */
    draw_style_box(p_style_box: StyleBox, p_rect: Rect2) {
        p_style_box.draw(this.canvas_item, p_rect);
    }

    draw_string() { }
    draw_char() { }

    /**
     * @param {Vector2Like} p_offset
     * @param {number} p_rot
     * @param {Vector2Like} p_scale
     */
    draw_set_transform(p_offset: Vector2Like, p_rot: number, p_scale: Vector2Like) {
        const xform = Transform2D.create();
        const cr = Math.cos(p_rot);
        const sr = Math.sin(p_rot);
        xform.a = cr;
        xform.b = sr;
        xform.c = -sr;
        xform.d = cr;
        xform.tx = p_offset.x;
        xform.ty = p_offset.y;
        xform.scale_basis(p_scale.x, p_scale.y);
        VSG.canvas.canvas_item_add_set_transform(this.canvas_item, [xform.a, xform.b, xform.c, xform.d, xform.tx, xform.ty]);
        Transform2D.free(xform);
    }
    /**
     * @param {Transform2D | number[]} p_matrix
     */
    draw_set_transform_matrix(p_matrix: Transform2D | number[]) {
        if (Array.isArray(p_matrix)) {
            VSG.canvas.canvas_item_add_set_transform(this.canvas_item, p_matrix);
        } else {
            VSG.canvas.canvas_item_add_set_transform(this.canvas_item, [p_matrix.a, p_matrix.b, p_matrix.c, p_matrix.d, p_matrix.tx, p_matrix.ty]);
        }
    }

    /**
     * @param {ImageTexture} p_texture
     * @param {Vector2Like} p_pos
     * @param {ColorLike} [p_modulate=white]
     */
    draw_texture(p_texture: ImageTexture, p_pos: Vector2Like, p_modulate: ColorLike = WHITE) {
        p_texture.draw(this.canvas_item, p_pos, p_modulate, false);
    }

    /**
     * @param {ImageTexture} p_texture
     * @param {Rect2} p_rect
     * @param {boolean} [p_tile=false]
     * @param {ColorLike} [p_modulate=white]
     * @param {boolean} [p_transpose=false]
     */
    draw_texture_rect(p_texture: ImageTexture, p_rect: Rect2, p_tile: boolean = false, p_modulate: ColorLike = WHITE, p_transpose: boolean = false) {
        p_texture.draw_rect(this.canvas_item, p_rect, p_tile, p_modulate, p_transpose);
    }

    /**
     * @param {ImageTexture} p_texture
     * @param {Rect2} p_rect
     * @param {Rect2} p_src_rect
     * @param {ColorLike} [p_modulate=white]
     * @param {boolean} [p_transpose=false]
     */
    draw_texture_rect_region(p_texture: ImageTexture, p_rect: Rect2, p_src_rect: Rect2, p_modulate: ColorLike = WHITE, p_transpose: boolean = false) {
        p_texture.draw_rect_region(this.canvas_item, p_rect, p_src_rect, p_modulate, p_transpose);
    }

    /**
     * @param {PoolVector2Array | number[]} p_points
     * @param {Color} p_colors
     * @param {PoolVector2Array | number[]} [p_uvs]
     * @param {ImageTexture} [p_texture]
     * @param {number[]} [p_indices]
     */
    draw_polygon(p_points: PoolVector2Array | number[], p_colors: Color, p_uvs: PoolVector2Array | number[] = null, p_texture: ImageTexture = null, p_indices: number[]) {
        const points = Array.isArray(p_points) ? p_points : p_points.data;
        const uvs = p_uvs ? Array.isArray(p_uvs) ? p_uvs : p_uvs.data : null;
        VSG.canvas.canvas_item_add_polygon(this.canvas_item, points, [p_colors.r, p_colors.g, p_colors.b, p_colors.a], uvs, p_texture, p_indices);
    }

    /**
     * @param {PoolVector2Array | number[]} p_points
     * @param {Color} p_color
     * @param {PoolVector2Array | number[]} [p_uvs]
     * @param {ImageTexture} [p_texture]
     * @param {number[]} [p_indices]
     */
    draw_colored_polygon(p_points: PoolVector2Array | number[], p_color: Color, p_uvs: PoolVector2Array | number[] = null, p_texture: ImageTexture = null, p_indices: number[]) {
        const points = Array.isArray(p_points) ? p_points : p_points.data;
        const uvs = p_uvs ? Array.isArray(p_uvs) ? p_uvs : p_uvs.data : null;
        VSG.canvas.canvas_item_add_polygon(this.canvas_item, points, [p_color.r, p_color.g, p_color.b, p_color.a], uvs, p_texture, p_indices);
    }

    get_canvas_layer() {
        if (this.canvas_layer) {
            return this.canvas_layer.layer;
        } else {
            return 0;
        }
    }

    get_parent_item(): CanvasItem {
        if (this.toplevel) {
            return null;
        }

        let parent = this.get_parent();
        return (parent.is_canvas_item) ? (parent as CanvasItem) : null;
    }

    /**
     * return new Transform2D
     */
    get_transform() {
        return Transform2D.create();
    }

    get_global_transform() {
        if (this.global_invalid) {
            const pi: CanvasItem = this.get_parent_item();
            const xform = this.get_transform();
            if (pi) {
                this.global_transform.copy(pi.get_global_transform()).append(xform);
            } else {
                this.global_transform.copy(xform);
            }
            Transform2D.free(xform);

            this.global_invalid = false;
        }

        return this.global_transform;
    }

    /**
     * returns new Transform2D
     */
    get_global_transform_with_canvas() {
        if (this.canvas_layer) {
            return this.canvas_layer.transform.clone().append(this.get_global_transform());
        } else if (this.is_inside_tree()) {
            return this.get_viewport().canvas_transform.clone().append(this.get_global_transform());
        } else {
            return this.get_global_transform();
        }
    }

    /**
     * @returns {Transform2D}
     */
    get_canvas_transform(): Transform2D {
        if (this.canvas_layer) {
            return this.canvas_layer.transform;
        } else if (this.get_parent().is_canvas_item) {
            const c: CanvasItem = this.get_parent() as CanvasItem;
            return c.get_canvas_transform();
        } else {
            return this.get_viewport().canvas_transform;
        }
    }
    get_viewport_transform() {
        if (this.canvas_layer) {
            if (this.get_viewport()) {
                return this.get_viewport().get_final_transform().append(this.canvas_layer.transform);
            } else {
                return this.canvas_layer.transform;
            }
        } else {
            return this.get_viewport().get_final_transform().append(this.get_viewport().canvas_transform);
        }
    }

    get_viewport_rect() {
        return this.get_viewport().get_visible_rect();
    }
    get_viewport_rid() {
        return this.get_viewport().get_viewport_rid();
    }

    get_canvas() {
        if (this.canvas_layer) {
            return this.canvas_layer.canvas;
        } else {
            return this.get_viewport().find_world_2d().canvas;
        }
    }

    get_toplevel() {
        let ci: CanvasItem = this;
        while (!ci.toplevel && ci.get_parent().is_canvas_item) {
            ci = ci.get_parent() as CanvasItem;
        }
        return ci;
    }

    get_world_2d() {
        let viewport = this.get_toplevel().get_viewport();
        if (viewport) {
            return viewport.find_world_2d();
        } else {
            return null;
        }
    }

    get_anchorable_rect() {
        return Rect2.create();
    }

    get_global_mouse_position() {
        const xform = this.get_canvas_transform().clone().affine_inverse()
        const pos = xform.xform(this.get_viewport().get_mouse_position());
        Transform2D.free(xform);
        return pos;
    }
    get_local_mouse_position() { }

    update() {
        if (!this.is_inside_tree()) {
            return;
        }
        if (this.pending_update) {
            return;
        }

        this.pending_update = true;

        MessageQueue.get_singleton().push_call(this, '_update_callback');
    }

    force_update_transform() {
        if (!this.xform_change.in_list()) {
            return;
        }

        this.get_tree().xform_change_list.remove(this.xform_change);

        this.notification(NOTIFICATION_TRANSFORM_CHANGED);
    }

    /**
     * @param {boolean} p_enable
     */
    set_notify_local_transform(p_enable: boolean) {
        this.notify_local_transform = p_enable;
    }
    is_local_transform_notification_enabled() {
        return this.notify_local_transform;
    }

    /**
     * @param {boolean} p_enable
     */
    set_notify_transform(p_enable: boolean) {
        if (this.notify_transform === p_enable) {
            return;
        }

        this.notify_transform = p_enable;

        if (this.notify_transform && this.is_inside_tree()) {
            this.get_global_transform();
        }
    }
    is_transform_notification_enabled() {
        return this.notify_transform;
    }

    /**
     * @param {boolean} p_toplevel
     */
    set_as_toplevel(p_toplevel: boolean) {
        if (this.toplevel === p_toplevel) {
            return;
        }

        if (!this.is_inside_tree()) {
            this.toplevel = p_toplevel;
            return;
        }

        this._exit_canvas();
        this.toplevel = p_toplevel;
        this._enter_canvas();
    }

    is_set_as_toplevel() {
        return this.toplevel;
    }

    /**
     * @param {boolean} p_visible
     */
    set_visible(p_visible: boolean) {
        if (p_visible) {
            this.show();
        } else {
            this.hide();
        }
    }

    is_visible_in_tree() {
        if (!this.is_inside_tree()) {
            return false;
        }

        let p: CanvasItem = this;

        while (p) {
            if (!p.visible) {
                return false;
            }
            p = p.get_parent_item();
        }

        return true;
    }
    show() {
        if (this.visible) {
            return;
        }

        this.visible = true;
        VSG.canvas.canvas_item_set_visible(this.canvas_item, true);

        if (!this.is_inside_tree()) {
            return;
        }

        this._propagate_visibility_changed(true);
    }
    hide() {
        if (!this.visible) {
            return;
        }

        this.visible = false;
        VSG.canvas.canvas_item_set_visible(this.canvas_item, false);

        if (!this.is_inside_tree()) {
            return;
        }

        this._propagate_visibility_changed(false);
    }

    /**
     * @param {boolean} value
     */
    set_show_behind_parent(value: boolean) {
        if (this.show_behind_parent === value) {
            return;
        }
        this.show_behind_parent = value;
        VSG.canvas.canvas_item_set_draw_behind_parent(this.canvas_item, this.show_behind_parent);
    }

    /**
     * @param {number} r color as hex number or red channel
     * @param {number} [g] green channel
     * @param {number} [b] blue channel
     * @param {number} [a=1.0] alpha channel
     */
    set_modulate_n(r: number, g: number, b: number, a: number = 1.0) {
        // r, g, b, a
        if (Number.isFinite(g)) {
            this.modulate.set(r, g, b, a);
        }
        // hex
        else {
            this.modulate.set_with_hex(r);
        }
        VSG.canvas.canvas_item_set_modulate(this.canvas_item, this.modulate);
    }
    /**
     * @param {ColorLike} color
     */
    set_modulate(color: ColorLike) {
        this.set_modulate_n(color.r, color.g, color.b, color.a);
    }

    /**
     * @param {number} r color as hex number or red channel
     * @param {number} [g] green channel
     * @param {number} [b] blue channel
     * @param {number} [a=1.0] alpha channel
     */
    set_self_modulate_n(r: number, g: number, b: number, a: number = 1.0) {
        // r, g, b, a
        if (g !== undefined) {
            this.self_modulate.set(/** @type {number} */(r), g, b, a);
        }
        // hex
        else {
            this.self_modulate.set_with_hex(r);
        }
        VSG.canvas.canvas_item_set_self_modulate(this.canvas_item, this.self_modulate);
    }
    /**
     * @param {ColorLike} color
     */
    set_self_modulate(color: ColorLike) {
        this.set_self_modulate_n(color.r, color.g, color.b, color.a);
    }

    /**
     * @param {boolean} p_value
     */
    set_use_parent_material(p_value: boolean) {
        this.use_parent_material = p_value;
        this.canvas_item.use_parent_material = p_value;
    }

    /**
     * @param {Material} p_mat
     */
    set_material(p_mat: Material) {
        this.material = p_mat;
        VSG.canvas.canvas_item_set_material(this.canvas_item, this.material);
    }

    /* private */

    /**
     * @param {boolean} p_visible
     */
    _propagate_visibility_changed(p_visible: boolean) {
        if (p_visible && this.first_draw) {
            this.first_draw = false;
        }
        this.notification(NOTIFICATION_VISIBILITY_CHANGED);

        if (p_visible) {
            this.update();
        } else {
            this.emit_signal('hide');
        }

        for (let child of this.data.children) {
            let c: CanvasItem = (child.is_canvas_item ? child : null) as CanvasItem;

            if (c && c.visible) {
                c._propagate_visibility_changed(p_visible);
            }
        }
    }

    _update_callback() {
        if (!this.is_inside_tree()) {
            this.pending_update = false;
            return;
        }

        VSG.canvas.canvas_item_clear(this.canvas_item);
        if (this.is_visible_in_tree()) {
            if (this.first_draw) {
                this.notification(NOTIFICATION_VISIBILITY_CHANGED);
                this.first_draw = false;
            }
            this.drawing = true;
            current_item_drawn = this;
            this.notification(NOTIFICATION_DRAW);
            this.emit_signal('draw');
            this._draw();
            current_item_drawn = null;
            this.drawing = false;
        }
        this.pending_update = false;
    }

    _enter_canvas() {
        const  ci: CanvasItem = this.get_parent() as CanvasItem;
        if (!ci.is_canvas_item || this.toplevel) {
            /** @type {Node} */
            let n: Node = this;

            this.canvas_layer = null;

            while (n) {
                this.canvas_layer = (n instanceof CanvasLayer) ? n : null;
                if (this.canvas_layer) {
                    break;
                }
                if (n.is_viewport) {
                    break;
                }
                n = n.get_parent();
            }

            /** @type {import('engine/servers/visual/visual_server_canvas').Canvas} */
            let canvas: import('engine/servers/visual/visual_server_canvas').Canvas = null;
            if (this.canvas_layer) {
                canvas = this.canvas_layer.canvas;
            } else {
                canvas = this.get_viewport().find_world_2d().canvas;
            }

            VSG.canvas.canvas_item_set_parent(this.canvas_item, canvas);

            this.group = `root_canvas${canvas._id}`;

            this.add_to_group(this.group);
            if (this.canvas_layer) {
                this.canvas_layer.reset_sort_index();
            } else {
                this.get_viewport().gui_reset_canvas_sort_index();
            }

            this.get_tree().call_group_flags(GROUP_CALL_UNIQUE, this.group, '_toplevel_raise_self');
        } else {
            const parent = this.get_parent_item();
            this.canvas_layer = parent.canvas_layer;
            VSG.canvas.canvas_item_set_parent(this.canvas_item, parent.canvas_item);
            VSG.canvas.canvas_item_set_draw_index(this.canvas_item, this.get_index());
        }

        this.pending_update = false;
        this.update();

        this.notification(NOTIFICATION_ENTER_CANVAS);
    }
    _exit_canvas() {
        this.notification(NOTIFICATION_EXIT_CANVAS, true);
        VSG.canvas.canvas_item_set_parent(this.canvas_item, null);
        this.canvas_layer = null;
        this.group = '';
    }

    _notify_transform(p_node?: CanvasItem) {
        if (!p_node) {
            /* `_notify_transform()` */
            if (!this.is_inside_tree()) return;
            this._notify_transform(this);
            if (!this.block_transform_notify && this.notify_local_transform) {
                this.notification(NOTIFICATION_LOCAL_TRANSFORM_CHANGED);
            }
        } else {
            /* `_notify_transform(node)` */
            if (p_node.global_invalid) {
                return;
            }

            p_node.global_invalid = true;

            if (p_node.notify_transform && !p_node.xform_change.in_list()) {
                if (!p_node.block_transform_notify) {
                    if (p_node.is_inside_tree()) {
                        this.get_tree().xform_change_list.add(p_node.xform_change);
                    }
                }
            }

            for (let E = p_node.children_items.front(); E; E = E.next) {
                let ci = E.value;
                if (ci.toplevel) {
                    continue;
                }
                this._notify_transform(ci);
            }
        }
    }

    _toplevel_raise_self() {
        if (!this.is_inside_tree()) {
            return;
        }

        if (this.canvas_layer) {
            VSG.canvas.canvas_item_set_draw_index(this.canvas_item, this.canvas_layer.sort_index);
        } else {
            VSG.canvas.canvas_item_set_draw_index(this.canvas_item, this.get_viewport().gui_get_canvas_sort_index());
        }
    }

    item_rect_changed(p_size_changed = true) {
        if (p_size_changed) {
            this.update();
        }
        this.emit_signal('item_rect_changed');
    }

    get_current_item_drawn() {
        return current_item_drawn;
    }
}
node_class_map['CanvasItem'] = GDCLASS(CanvasItem, Node)

/**
 * @type {CanvasItem}
 */
let current_item_drawn: CanvasItem = null;
