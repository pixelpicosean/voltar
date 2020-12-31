import { node_class_map, get_resource_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import {
    MARGIN_LEFT,
    MARGIN_RIGHT,
    MARGIN_TOP,
    MARGIN_BOTTOM,
} from 'engine/core/math/math_defs';
import { Vector2 } from 'engine/core/math/vector2';
import { Rect2 } from 'engine/core/math/rect2';
import { VSG } from 'engine/servers/visual/visual_server_globals';

import { ImageTexture } from '../resources/texture';
import { NOTIFICATION_DRAW } from '../2d/canvas_item';
import { Control } from './control';


export const AXIS_STRETCH_MODE_STRETCH = 0;
export const AXIS_STRETCH_MODE_TILE = 1;
export const AXIS_STRETCH_MODE_TILE_FIT = 2;

export class NinePatchRect extends Control {
    get class() { return 'NinePatchRect' }

    get patch_margin_bottom() { return this.margin[MARGIN_BOTTOM] }
    set_patch_margin_bottom(value: number) { this.margin[MARGIN_BOTTOM] = value }

    get patch_margin_left() { return this.margin[MARGIN_LEFT] }
    set_patch_margin_left(value: number) { this.margin[MARGIN_LEFT] = value }

    get patch_margin_top() { return this.margin[MARGIN_TOP] }
    set_patch_margin_top(value: number) { this.margin[MARGIN_TOP] = value }

    get patch_margin_right() { return this.margin[MARGIN_RIGHT] }
    set_patch_margin_right(value: number) { this.margin[MARGIN_RIGHT] = value }

    margin = [0, 0, 0, 0];
    region_rect = new Rect2;

    draw_center = true;
    axis_stretch_horizontal = AXIS_STRETCH_MODE_STRETCH;
    axis_stretch_vertical = AXIS_STRETCH_MODE_STRETCH;

    texture: ImageTexture = null;

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.texture !== undefined) {
            this.set_texture(data.texture);
        }
        if (data.region_rect !== undefined) {
            this.set_region_rect(data.region_rect);
        }
        if (data.draw_center !== undefined) {
            this.set_draw_center(data.draw_center);
        }
        if (data.axis_stretch_horizontal !== undefined) {
            this.set_axis_stretch_horizontal(data.axis_stretch_horizontal);
        }
        if (data.axis_stretch_vertical !== undefined) {
            this.set_axis_stretch_vertical(data.axis_stretch_vertical);
        }
        if (data.patch_margin_bottom !== undefined) {
            this.set_patch_margin_bottom(data.patch_margin_bottom);
        }
        if (data.patch_margin_left !== undefined) {
            this.set_patch_margin_left(data.patch_margin_left);
        }
        if (data.patch_margin_top !== undefined) {
            this.set_patch_margin_top(data.patch_margin_top);
        }
        if (data.patch_margin_right !== undefined) {
            this.set_patch_margin_right(data.patch_margin_right);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
        if (p_what === NOTIFICATION_DRAW) {
            if (!this.texture) return;

            const rect = Rect2.create(0, 0, this.rect_size.x, this.rect_size.y);
            const src_rect = this.region_rect.clone();

            this.texture.get_rect_region(rect, src_rect, rect, src_rect);

            const topleft = Vector2.create(this.margin[MARGIN_LEFT], this.margin[MARGIN_TOP]);
            const bottomright = Vector2.create(this.margin[MARGIN_RIGHT], this.margin[MARGIN_BOTTOM]);
            VSG.canvas.canvas_item_add_nine_patch(this.canvas_item, rect, src_rect, this.texture, topleft, bottomright, this.axis_stretch_horizontal, this.axis_stretch_vertical, this.draw_center);
            Vector2.free(bottomright);
            Vector2.free(topleft);

            Rect2.free(src_rect);
            Rect2.free(rect);
        }
    }

    get_minimum_size() {
        return Vector2.create(
            this.margin[MARGIN_LEFT] + this.margin[MARGIN_RIGHT],
            this.margin[MARGIN_TOP] + this.margin[MARGIN_BOTTOM]
        )
    }

    /* public */

    /**
     * @param {boolean} value
     */
    set_draw_center(value: boolean) {
        this.draw_center = value;
        this.update();
    }

    /**
     * @param {number} value
     */
    set_axis_stretch_horizontal(value: number) {
        this.axis_stretch_horizontal = value;
        this.update();
    }

    /**
     * @param {number} value
     */
    set_axis_stretch_vertical(value: number) {
        this.axis_stretch_vertical = value;
        this.update();
    }

    /**
     * @param {number} p_margin
     * @param {number} p_size
     */
    set_patch_margin(p_margin: number, p_size: number) {
        this.margin[p_margin] = p_size;
        this.update();
        this.minimum_size_changed();
    }

    /**
     * @param {Rect2} p_region_rect
     */
    set_region_rect(p_region_rect: Rect2) {
        if (this.region_rect.equals(p_region_rect)) {
            return;
        }
        this.region_rect.copy(p_region_rect);
        this.item_rect_changed();
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     */
    set_region_rect_n(x: number, y: number, w: number, h: number) {
        const rect = Rect2.create(x, y, w, h);
        this.set_region_rect(rect);
        Rect2.free(rect);
    }

    /**
     * @param {string | ImageTexture} p_texture
     */
    set_texture(p_texture: string | ImageTexture) {
        /** @type {ImageTexture} */
        const texture: ImageTexture = (typeof (p_texture) === 'string') ? get_resource_map()[p_texture] : p_texture;

        if (this.texture === texture) {
            return;
        }
        this.texture = texture;
        this.update();
        this.minimum_size_changed();
        this.emit_signal('texture_changed');
    }
}
node_class_map['NinePatchRect'] = GDCLASS(NinePatchRect, Control)
