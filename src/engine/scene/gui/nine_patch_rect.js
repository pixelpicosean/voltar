import { node_class_map, resource_map } from 'engine/registry';
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

    get draw_center() { return this._draw_center }
    set draw_center(value) { this.set_draw_center(value) }

    get axis_stretch_horizontal() { return this._axis_stretch_horizontal }
    set axis_stretch_horizontal(value) { this.set_axis_stretch_horizontal(value) }

    get axis_stretch_vertical() { return this._axis_stretch_vertical }
    set axis_stretch_vertical(value) { this.set_axis_stretch_vertical(value) }

    get region_rect() { return this._region_rect }
    set region_rect(value) { this.set_region_rect(value) }

    get texture() { return this._texture }
    set texture(value) { this.set_texture(value) }

    get patch_margin_bottom() { return this.margin[MARGIN_BOTTOM] }
    set patch_margin_bottom(value) { this.set_patch_margin(MARGIN_BOTTOM, value) }

    get patch_margin_left() { return this.margin[MARGIN_LEFT] }
    set patch_margin_left(value) { this.set_patch_margin(MARGIN_LEFT, value) }

    get patch_margin_top() { return this.margin[MARGIN_TOP] }
    set patch_margin_top(value) { this.set_patch_margin(MARGIN_TOP, value) }

    get patch_margin_right() { return this.margin[MARGIN_RIGHT] }
    set patch_margin_right(value) { this.set_patch_margin(MARGIN_RIGHT, value) }

    constructor() {
        super();

        this.margin = [0, 0, 0, 0];
        this._region_rect = new Rect2();

        this._draw_center = true;
        this._axis_stretch_horizontal = AXIS_STRETCH_MODE_STRETCH;
        this._axis_stretch_vertical = AXIS_STRETCH_MODE_STRETCH;

        /**
         * @type {ImageTexture}
         */
        this._texture = null;
    }

    /* virtual */

    _load_data(data) {
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
            this.patch_margin_bottom = data.patch_margin_bottom;
        }
        if (data.patch_margin_left !== undefined) {
            this.patch_margin_left = data.patch_margin_left;
        }
        if (data.patch_margin_top !== undefined) {
            this.patch_margin_top = data.patch_margin_top;
        }
        if (data.patch_margin_right !== undefined) {
            this.patch_margin_right = data.patch_margin_right;
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        if (p_what === NOTIFICATION_DRAW) {
            if (!this._texture) return;

            const rect = Rect2.new(0, 0, this.rect_size.x, this.rect_size.y);
            const src_rect = this._region_rect.clone();

            this._texture.get_rect_region(rect, src_rect, rect, src_rect);

            const topleft = Vector2.new(this.margin[MARGIN_LEFT], this.margin[MARGIN_TOP]);
            const bottomright = Vector2.new(this.margin[MARGIN_RIGHT], this.margin[MARGIN_BOTTOM]);
            VSG.canvas.canvas_item_add_nine_patch(this.canvas_item, rect, src_rect, this._texture.texture, topleft, bottomright, this._axis_stretch_horizontal, this._axis_stretch_vertical, this._draw_center);
            Vector2.free(bottomright);
            Vector2.free(topleft);

            Rect2.free(src_rect);
            Rect2.free(rect);
        }
    }

    get_minimum_size() {
        return Vector2.new(
            this.margin[MARGIN_LEFT] + this.margin[MARGIN_RIGHT],
            this.margin[MARGIN_TOP] + this.margin[MARGIN_BOTTOM]
        )
    }

    /* public */

    /**
     * @param {boolean} value
     */
    set_draw_center(value) {
        this._draw_center = value;
        this.update();
    }

    /**
     * @param {number} value
     */
    set_axis_stretch_horizontal(value) {
        this._axis_stretch_horizontal = value;
        this.update();
    }

    /**
     * @param {number} value
     */
    set_axis_stretch_vertical(value) {
        this._axis_stretch_vertical = value;
        this.update();
    }

    /**
     * @param {number} p_margin
     * @param {number} p_size
     */
    set_patch_margin(p_margin, p_size) {
        this.margin[p_margin] = p_size;
        this.update();
        this.minimum_size_changed();
    }

    /**
     * @param {Rect2} p_region_rect
     */
    set_region_rect(p_region_rect) {
        if (this._region_rect.equals(p_region_rect)) {
            return;
        }
        this._region_rect.copy(p_region_rect);
        this.item_rect_changed();
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     */
    set_region_rect_n(x, y, w, h) {
        const rect = Rect2.new(x, y, w, h);
        this.set_region_rect(rect);
        Rect2.free(rect);
    }

    /**
     * @param {string | ImageTexture} p_texture
     */
    set_texture(p_texture) {
        /** @type {ImageTexture} */
        const texture = (typeof (p_texture) === 'string') ? resource_map[p_texture] : p_texture;

        if (this._texture === texture) {
            return;
        }
        this._texture = texture;
        this.update();
        this.minimum_size_changed();
        this.emit_signal('texture_changed');
    }
}
node_class_map['NinePatchRect'] = GDCLASS(NinePatchRect, Control)
