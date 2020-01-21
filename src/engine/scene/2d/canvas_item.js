import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { MessageQueue } from "engine/core/message_queue";
import { SelfList } from "engine/core/self_list";
import { Vector2Like } from "engine/core/math/vector2";
import { PoolVector2Array } from "engine/core/math/pool_vector2_array";
import { Transform2D } from "engine/core/math/transform_2d";
import { Rect2 } from "engine/core/math/rect2";
import { Color, ColorLike } from "engine/core/color";

import { VSG } from "engine/servers/visual/visual_server_globals";

import { ImageTexture } from "../resources/texture";
import { StyleBox } from "../resources/style_box";
import { GROUP_CALL_UNIQUE } from "../main/scene_tree";
import { CanvasLayer } from "../main/canvas_layer";
import {
    Node,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_MOVED_IN_PARENT,
    NOTIFICATION_EXIT_TREE,
} from "../main/node";


export const NOTIFICATION_TRANSFORM_CHANGED = 2000;
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

const white = Object.freeze(new Color(1, 1, 1, 1));

export class CanvasItem extends Node {
    get class() { return 'CanvasItem' }

    get modulate() { return this._modulate }
    set modulate(value) { this.set_modulate(value) }

    get self_modulate() { return this._self_modulate }
    set self_modulate(value) { this.set_self_modulate(value) }

    get show_behind_parent() { return this._show_behind_parent }
    set show_behind_parent(value) { this.set_show_behind_parent(value) }

    get show_on_top() { return !this._show_behind_parent }
    set show_on_top(value) { this.set_show_behind_parent(!value) }

    get use_parent_material() { return this._use_parent_material }
    set use_parent_material(value) { this.set_use_parent_material(value) }

    get visible() { return this._visible }
    set visible(value) { this.set_visible(value) }

    get fill_mode() { return this._fill_mode }
    set fill_mode(mode) { this.set_fill_mode(mode) }

    constructor() {
        super();

        this.is_canvas_item = true;

        /**
         * @type {SelfList<Node>}
         */
        this.xform_change = new SelfList(this);

        this.canvas_item = VSG.canvas.canvas_item_create();
        this.group = '';

        /** @type {CanvasLayer} */
        this.canvas_layer = null;

        this._modulate = new Color(1, 1, 1, 1);
        this._self_modulate = new Color(1, 1, 1, 1);
        /** 0 = normal, 1 = fill with modulate */
        this._fill_mode = 0;

        /**
         * @type {Set<CanvasItem>}
         */
        this.children_items = new Set();

        this.light_mask = 1;

        this.first_draw = false;
        this._visible = true;
        this.pending_update = false;
        this.toplevel = false;
        this.drawing = false;
        this.block_transform_notify = false;
        this._show_behind_parent = false;
        this._use_parent_material = true;
        this.notify_local_transform = false;
        this.notify_transform = false;

        this.material = null;

        this._global_transform = new Transform2D();
        this.global_invalid = true;
    }
    free() {
        VSG.canvas.free_item(this.canvas_item);
        return super.free();
    }

    /* virtual */

    /**
     * @param {any} data
     */
    _load_data(data) {
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

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                this.first_draw = true;
                const ci = /** @type {CanvasItem} */(this.get_parent());
                if (ci && ci.is_canvas_item) {
                    ci.children_items.add(this);
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
                const ci = /** @type {CanvasItem} */(this.get_parent());
                if (ci.is_canvas_item) {
                    ci.children_items.delete(this);
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
    draw_line(p_from, p_to, p_color, p_width = 1.0, p_antialiased = false) {
        VSG.canvas.canvas_item_add_line(this.canvas_item, p_from, p_to, p_color, p_width, p_antialiased);
    }

    /**
     * @param {PoolVector2Array | number[]} p_points
     * @param {ColorLike} p_color
     * @param {number} [p_width]
     * @param {boolean} [p_antialiased]
     */
    draw_polyline(p_points, p_color, p_width = 1.0, p_antialiased = false) {
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
    draw_polyline_colors(p_points, p_colors, p_width = 1.0, p_antialiased = false) {
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
    draw_rect(p_rect, p_color, p_filled = true, p_width = 1.0, p_antialiased = false) {
        if (p_filled) {
            VSG.canvas.canvas_item_add_rect(this.canvas_item, p_rect, p_color);
        } else {
            // TODO: draw stroke
        }
    }

    /**
     * @param {Vector2Like} p_pos
     * @param {number} p_radius
     * @param {ColorLike} p_color
     */
    draw_circle(p_pos, p_radius, p_color) {
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
    draw_arc(p_center, p_radius, p_start_angle, p_end_angle, p_point_count, p_color, p_width = 1.0, p_antialiased = false) {
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
    draw_style_box(p_style_box, p_rect) {
        p_style_box.draw(this.canvas_item, p_rect);
    }

    draw_string() { }
    draw_char() { }

    /**
     * @param {Vector2Like} p_offset
     * @param {number} p_rot
     * @param {Vector2Like} p_scale
     */
    draw_set_transform(p_offset, p_rot, p_scale) {
        const xform = Transform2D.new();
        const cr = Math.cos(p_rot);
        const sr = Math.sin(p_rot);
        xform.a = cr;
        xform.b = sr;
        xform.c = -sr;
        xform.d = cr;
        xform.tx = p_offset.x;
        xform.ty = p_offset.y;
        xform.scale_basis(p_scale.x, p_scale.y);
        VSG.canvas.canvas_item_add_set_transform(this.canvas_item, xform.to_array(false));
        Transform2D.free(xform);
    }
    /**
     * @param {Transform2D | number[]} p_matrix
     */
    draw_set_transform_matrix(p_matrix) {
        if (Array.isArray(p_matrix)) {
            VSG.canvas.canvas_item_add_set_transform(this.canvas_item, p_matrix);
        } else {
            VSG.canvas.canvas_item_add_set_transform(this.canvas_item, p_matrix.to_array(false));
        }
    }

    /**
     * @param {ImageTexture} p_texture
     * @param {Vector2Like} p_pos
     * @param {ColorLike} [p_modulate=white]
     */
    draw_texture(p_texture, p_pos, p_modulate = white) {
        p_texture.draw(this.canvas_item, p_pos, p_modulate, false);
    }

    /**
     * @param {ImageTexture} p_texture
     * @param {Rect2} p_rect
     * @param {boolean} [p_tile=false]
     * @param {ColorLike} [p_modulate=white]
     * @param {boolean} [p_transpose=false]
     */
    draw_texture_rect(p_texture, p_rect, p_tile = false, p_modulate = white, p_transpose = false) {
        p_texture.draw_rect(this.canvas_item, p_rect, p_tile, p_modulate, p_transpose);
    }

    /**
     * @param {ImageTexture} p_texture
     * @param {Rect2} p_rect
     * @param {Rect2} p_src_rect
     * @param {ColorLike} [p_modulate=white]
     * @param {boolean} [p_transpose=false]
     */
    draw_texture_rect_region(p_texture, p_rect, p_src_rect, p_modulate = white, p_transpose = false) {
        p_texture.draw_rect_region(this.canvas_item, p_rect, p_src_rect, p_modulate, p_transpose);
    }

    /**
     * @param {PoolVector2Array | number[]} p_points
     * @param {Color} p_colors
     * @param {PoolVector2Array | number[]} [p_uvs]
     * @param {ImageTexture} [p_texture]
     * @param {number[]} [p_indices]
     */
    draw_polygon(p_points, p_colors, p_uvs = null, p_texture = null, p_indices) {
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
    draw_colored_polygon(p_points, p_color, p_uvs = null, p_texture = null, p_indices) {
        const points = Array.isArray(p_points) ? p_points : p_points.data;
        const uvs = p_uvs ? Array.isArray(p_uvs) ? p_uvs : p_uvs.data : null;
        VSG.canvas.canvas_item_add_polygon(this.canvas_item, points, [p_color.r, p_color.g, p_color.b, p_color.a], uvs, p_texture, p_indices);
    }

    get_canvas_layer() {
        if (this.canvas_layer) {
            return this.canvas_layer._layer;
        } else {
            return 0;
        }
    }

    get_parent_item() {
        if (this.toplevel) {
            return null;
        }

        const parent = this.get_parent();
        return (parent.is_canvas_item) ? /** @type {CanvasItem} */(parent) : null;
    }

    /**
     * return new Transform2D
     */
    get_transform() {
        return Transform2D.new();
    }

    get_global_transform() {
        if (this.global_invalid) {
            const pi = this.get_parent_item();
            const xform = this.get_transform();
            if (pi) {
                this._global_transform.copy(pi.get_global_transform()).append(xform);
            } else {
                this._global_transform.copy(xform);
            }
            Transform2D.free(xform);

            this.global_invalid = false;
        }

        return this._global_transform;
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
    get_canvas_transform() {
        if (this.canvas_layer) {
            return this.canvas_layer.transform;
        } else if (this.get_parent().is_canvas_item) {
            const c = /** @type {CanvasItem} */(this.get_parent());
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
        /** @type {CanvasItem} */
        let ci = this;
        while (!ci.toplevel && ci.get_parent().is_canvas_item) {
            ci = /** @type {CanvasItem} */(ci.get_parent());
        }
        return ci;
    }

    get_world_2d() {
        const viewport = this.get_toplevel().get_viewport();
        if (viewport) {
            return viewport.find_world_2d();
        } else {
            return null;
        }
    }

    get_anchorable_rect() {
        return Rect2.new();
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
    set_notify_local_transform(p_enable) {
        this.notify_local_transform = p_enable;
    }
    is_local_transform_notification_enabled() {
        return this.notify_local_transform;
    }

    /**
     * @param {boolean} p_enable
     */
    set_notify_transform(p_enable) {
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
    set_as_toplevel(p_toplevel) {
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
    set_visible(p_visible) {
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

        /** @type {CanvasItem} */
        let p = this;

        while (p) {
            if (!p._visible) {
                return false;
            }
            p = p.get_parent_item();
        }

        return true;
    }
    show() {
        if (this._visible) {
            return;
        }

        this._visible = true;
        VSG.canvas.canvas_item_set_visible(this.canvas_item, true);

        if (!this.is_inside_tree()) {
            return;
        }

        this._propagate_visibility_changed(true);
    }
    hide() {
        if (!this._visible) {
            return;
        }

        this._visible = false;
        VSG.canvas.canvas_item_set_visible(this.canvas_item, false);

        if (!this.is_inside_tree()) {
            return;
        }

        this._propagate_visibility_changed(false);
    }

    /**
     * @param {boolean} value
     */
    set_show_behind_parent(value) {
        if (this._show_behind_parent === value) {
            return;
        }
        this._show_behind_parent = value;
        VSG.canvas.canvas_item_set_draw_behind_parent(this.canvas_item, this._show_behind_parent);
    }

    /**
     * 0 = normal, 1 = fill with modulate
     * @param {number} p_mode
     */
    set_fill_mode(p_mode) {
        this.canvas_item.fill_mode = p_mode;
    }

    /**
     * @param {number} r color as hex number or red channel
     * @param {number} [g] green channel
     * @param {number} [b] blue channel
     * @param {number} [a=1.0] alpha channel
     */
    set_modulate_n(r, g, b, a = 1.0) {
        // r, g, b, a
        if (Number.isFinite(g)) {
            this._modulate.set(r, g, b, a);
        }
        // hex
        else {
            this._modulate.set_with_hex(r);
        }
        VSG.canvas.canvas_item_set_modulate(this.canvas_item, this._modulate);
    }
    /**
     * @param {ColorLike} color
     */
    set_modulate(color) {
        this._modulate.copy(color);
    }

    /**
     * @param {number} r color as hex number or red channel
     * @param {number} [g] green channel
     * @param {number} [b] blue channel
     * @param {number} [a=1.0] alpha channel
     */
    set_self_modulate_n(r, g, b, a = 1.0) {
        // r, g, b, a
        if (g !== undefined) {
            this._self_modulate.set(/** @type {number} */(r), g, b, a);
        }
        // hex
        else {
            this._self_modulate.set_with_hex(r);
        }
        VSG.canvas.canvas_item_set_self_modulate(this.canvas_item, this._self_modulate);
    }
    /**
     * @param {ColorLike} color
     */
    set_self_modulate(color) {
        this.set_self_modulate_n(color.r, color.g, color.b, color.a);
    }

    /**
     * @param {boolean} p_value
     */
    set_use_parent_material(p_value) {
        this._use_parent_material = p_value;
    }

    /* private */

    /**
     * @param {boolean} p_visible
     */
    _propagate_visibility_changed(p_visible) {
        if (p_visible && this.first_draw) {
            this.first_draw = false;
        }
        this.notification(NOTIFICATION_VISIBILITY_CHANGED);

        if (p_visible) {
            this.update();
        } else {
            this.emit_signal('hide');
        }

        for (const child of this.data.children) {
            const c = /** @type {CanvasItem} */(child);

            if (c.is_canvas_item && c._visible) {
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
            CanvasItem.current_item_drawn = this;
            this.notification(NOTIFICATION_DRAW);
            this.emit_signal('draw');
            this._draw();
            CanvasItem.current_item_drawn = null;
            this.drawing = false;
        }
        this.pending_update = false;
    }

    _enter_canvas() {
        const ci = /** @type {CanvasItem} */(this.get_parent());
        if (!ci.is_canvas_item || this.toplevel) {
            /** @type {Node} */
            let n = this;

            this.canvas_layer = null;

            while (n) {
                if (n instanceof CanvasLayer) {
                    this.canvas_layer = /** @type {CanvasLayer} */(n);
                    break;
                }
                if (n.class === 'Viewport') {
                    break;
                }
                n = n.get_parent();
            }

            let canvas = null;
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

    /**
     * @param {CanvasItem} [p_node]
     */
    _notify_transform(p_node) {
        if (!this.is_inside_tree()) return;
        let has_param = !!p_node;
        if (!has_param) {
            p_node = this;
        }

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

        for (const ci of this.children_items) {
            if (ci.toplevel) {
                continue;
            }
            this._notify_transform(ci);
        }

        if (!has_param) {
            if (!this.block_transform_notify && this.notify_local_transform) {
                this.notification(NOTIFICATION_LOCAL_TRANSFORM_CHANGED);
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
        return CanvasItem.current_item_drawn;
    }
}
node_class_map['CanvasItem'] = GDCLASS(CanvasItem, Node)

/**
 * @type {CanvasItem}
 */
CanvasItem.current_item_drawn = null;
