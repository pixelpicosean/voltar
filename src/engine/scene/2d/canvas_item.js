import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { MessageQueue } from "engine/core/message_queue";
import { SelfList } from "engine/core/self_list";
import { Color, ColorLike } from "engine/core/color";
import { Transform2D } from "engine/core/math/transform_2d";
import { Rect2 } from "engine/core/math/rect2";

import { VSG } from "engine/servers/visual/visual_server_globals";

import { GROUP_CALL_UNIQUE } from "../main/scene_tree";
import { CanvasLayer } from "../main/canvas_layer";
import {
    Node,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_MOVED_IN_PARENT,
    NOTIFICATION_EXIT_TREE,
} from "../main/node";


export const NOTIFICATION_TRANSFORM_CHANGED = 0;
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


export class CanvasItem extends Node {
    get class() { return 'CanvasItem' }

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
    get_visible() {
        return this.visible;
    }

    is_visible_in_tree() {
        if (!this.is_inside_tree()) {
            return false;
        }

        /** @type {CanvasItem} */
        let p = this;

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
    set_show_behind_parent(value) {
        if (this.show_behind_parent === value) {
            return;
        }
        this.show_behind_parent = value;
        VSG.canvas.canvas_item_set_draw_behind_parent(this.canvas_item, this.show_behind_parent);
    }
    get_show_behind_parent() {
        return this.show_behind_parent;
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
            this.modulate.set(r, g, b, a);
        }
        // hex
        else {
            this.modulate.set_with_hex(r);
        }
    }
    /**
     * @param {ColorLike} color
     */
    set_modulate(color) {
        this.modulate.copy(color);
    }
    get_modulate() {
        return this.modulate;
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
    set_self_modulate(color) {
        this.set_self_modulate_n(color.r, color.g, color.b, color.a);
    }
    get_self_modulate() {
        return this.self_modulate;
    }

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

        this.modulate = new Color(1, 1, 1, 1);
        this.self_modulate = new Color(1, 1, 1, 1);

        /**
         * @type {Set<CanvasItem>}
         */
        this.children_items = new Set();

        this.light_mask = 1;

        this.first_draw = false;
        this.visible = true;
        this.pending_update = false;
        this.toplevel = false;
        this.drawing = false;
        this.block_transform_notify = false;
        this.show_behind_parent = false;
        this.use_parent_material = true;
        this.notify_local_transform = false;
        this.notify_transform = false;

        this.material = null;

        this.global_transform = new Transform2D();
        this.global_invalid = false;
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

    get_canvas_layer() {
        if (this.canvas_layer) {
            return this.canvas_layer.layer;
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

    get_transform() {
        return Transform2D.new();
    }

    get_global_transform() {
        if (this.global_invalid) {
            const pi = this.get_parent_item();
            if (pi) {
                this.global_transform.copy(pi.get_global_transform()).append(this.get_transform());
            } else {
                this.global_transform.copy(this.get_transform());
            }

            this.global_invalid = false;
        }

        return this.global_transform;
    }
    get_global_transform_with_canvas() {
        if (this.canvas_layer) {
            return this.canvas_layer.get_transform().clone().append(this.get_global_transform());
        } else if (this.is_inside_tree()) {
            return this.get_viewport().get_canvas_transform().clone().append(this.get_global_transform());
        } else {
            return this.get_global_transform();
        }
    }

    /**
     * @returns {Transform2D}
     */
    get_canvas_transform() {
        if (this.canvas_layer) {
            return this.canvas_layer.get_transform();
        } else if (this.get_parent().is_canvas_item) {
            const c = /** @type {CanvasItem} */(this.get_parent());
            return c.get_canvas_transform();
        } else {
            return this.get_viewport().get_canvas_transform();
        }
    }
    get_viewport_transform() {
        if (this.canvas_layer) {
            if (this.get_viewport()) {
                return this.get_viewport().get_final_transform().append(this.canvas_layer.get_transform());
            } else {
                return this.canvas_layer.get_transform();
            }
        } else {
            return this.get_viewport().get_final_transform().append(this.get_viewport().get_canvas_transform());
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
            return this.canvas_layer.get_canvas();
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

            if (c.is_canvas_item && c.visible) {
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
                if (n.class === 'CanvasLayer') {
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
                canvas = this.canvas_layer.get_canvas();
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
    _draw() { }
    _exit_canvas() {
        this.notification(NOTIFICATION_EXIT_CANVAS, true);
        VSG.canvas.canvas_item_set_parent(this.canvas_item, null);
        this.canvas_layer = null;
        this.group = '';
    }

    _notify_transform_self() {
        if (!this.is_inside_tree()) return;
        this._notify_transform(this);
        if (!this.block_transform_notify && this.notify_local_transform) {
            this.notification(NOTIFICATION_LOCAL_TRANSFORM_CHANGED);
        }
    }
    /**
     * @param {CanvasItem} p_node
     */
    _notify_transform(p_node) {
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