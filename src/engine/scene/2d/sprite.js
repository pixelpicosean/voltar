import { node_class_map, get_resource_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { Rect2 } from 'engine/core/math/rect2.js';
import { Color } from 'engine/core/color';
import { Engine } from 'engine/core/engine';

import { ImageTexture } from '../resources/texture.js';
import { NOTIFICATION_DRAW } from '../2d/canvas_item.js';
import { Node2D } from '../2d/node_2d.js';


const white = new Color(1, 1, 1);

export class Sprite extends Node2D {
    get class() { return 'Sprite' }

    get texture() { return this._texture }
    set texture(value) { this.set_texture(value) }

    get normal_map() { return this._normal_map }
    set normal_map(value) { this.set_normal_map(value) }

    get centered() { return this._centered }
    set centered(value) { this.set_centered(value) }

    get offset() { return this._offset }
    set offset(value) { this.set_offset(value) }

    get flip_h() { return this._flip_h }
    set flip_h(value) { this.set_flip_h(value) }

    get flip_v() { return this._flip_v }
    set flip_v(value) { this.set_flip_v(value) }

    get region_enabled() { return this._region_enabled }
    set region_enabled(value) { this.set_region_enabled(value) }

    get region_rect() { return this._region_rect }
    set region_rect(value) { this.set_region_rect(value) }

    get region_filter_clip() { return this._region_filter_clip }
    set region_filter_clip(value) { this.set_region_filter_clip(value) }

    get frame() { return this._frame }
    set frame(value) { this.set_frame(value) }

    get hframes() { return this._hframes }
    set hframes(value) { this.set_hframes(value) }

    get vframes() { return this._vframes }
    set vframes(value) { this.set_vframes(value) }

    get frame_coords() {
        return Vector2.create(this._frame % this._hframes, this._frame / this._hframes).floor();
    }
    set frame_coords(p_coord) {
        this.set_frame(Math.floor(p_coord.y * this._hframes + p_coord.x));
    }

    constructor() {
        super();

        this._centered = true;
        this._offset = new Vector2(0, 0);
        this._flip_h = false;
        this._flip_v = false;
        this._region_enabled = false;
        this._region_filter_clip = false;
        this._region_rect = new Rect2();

        this._frame = 0;

        this._hframes = 1;
        this._vframes = 1;

        /** @type {ImageTexture} */
        this._texture = null;

        /** @type {ImageTexture} */
        this._normal_map = null;
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.centered !== undefined) this.set_centered(data.centered);
        if (data.offset !== undefined) this.set_offset(data.offset);
        if (data.flip_h !== undefined) this.set_flip_h(data.flip_h);
        if (data.flip_v !== undefined) this.set_flip_v(data.flip_v);
        if (data.region_enabled !== undefined) this.set_region_enabled(data.region_enabled);
        if (data.region_filter_clip !== undefined) this.set_region_filter_clip(data.region_filter_clip);
        if (data.region_rect !== undefined) this.set_region_rect(data.region_rect);

        if (data.frame !== undefined) this.set_frame(data.frame);
        if (data.frame_coords !== undefined) this.set_frame_coords(data.frame_coords);

        if (data.hframes !== undefined) this.set_hframes(data.hframes);
        if (data.vframes !== undefined) this.set_vframes(data.vframes);

        if (data.texture !== undefined) this.set_texture(data.texture);

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_DRAW: {
                if (!this._texture) {
                    break;
                }

                const src_rect = Rect2.create();
                const dst_rect = Rect2.create();

                this._get_rects(src_rect, dst_rect);
                this._texture.draw_rect_region(this.canvas_item, dst_rect, src_rect, white, false);

                Rect2.free(src_rect);
                Rect2.free(dst_rect);
            } break;
        }
    }

    /* public */

    /**
     * @param {string | ImageTexture} p_texture
     */
    set_texture(p_texture) {
        /** @type {ImageTexture} */
        const texture = (typeof (p_texture) === 'string') ? get_resource_map()[p_texture] : p_texture;

        if (this._texture === texture) return;
        this._texture = texture;
        this.update();
        this.item_rect_changed();
    }
    /**
     * @param {ImageTexture} p_texture
     */
    set_normal_map(p_texture) {
        this._normal_map = p_texture;
        this.update();
    }

    /**
     * @param {boolean} p_center
     */
    set_centered(p_center) {
        this._centered = p_center;
        this.update();
        this.item_rect_changed();
    }

    /**
     * @param {Vector2Like} p_offset
     */
    set_offset(p_offset) {
        this._offset.copy(p_offset);
        this.update();
        this.item_rect_changed();
    }
    /**
     * @param {number} p_offset_x
     * @param {number} p_offset_y
     */
    set_offset_n(p_offset_x, p_offset_y) {
        this._offset.set(p_offset_x, p_offset_y);
        this.update();
        this.item_rect_changed();
    }

    /**
     * @param {boolean} p_flip
     */
    set_flip_h(p_flip) {
        this._flip_h = p_flip;
        this.update();
    }
    /**
     * @param {boolean} p_flip
     */
    set_flip_v(p_flip) {
        this._flip_v = p_flip;
        this.update();
    }

    /**
     * @param {number} p_amount
     */
    set_vframes(p_amount) {
        this._vframes = p_amount;
        this.update();
        this.item_rect_changed();
    }
    /**
     * @param {number} p_amount
     */
    set_hframes(p_amount) {
        this._hframes = p_amount;
        this.update();
        this.item_rect_changed();
    }

    get_rect() {
        if (!this._texture || !this._texture.get_rid()) {
            return Rect2.create(0, 0, 1, 1);
        }

        const s = Vector2.create(0, 0);

        if (this._region_enabled) {
            s.set(this._region_rect.width, this._region_rect.height);
        } else {
            s.set(this._texture.get_width(), this._texture.get_height());
        }

        s.x /= this._hframes;
        s.y /= this._vframes;

        const ofs = Vector2.create(0, 0);
        if (this._centered) {
            ofs.x -= s.x / 2;
            ofs.y -= s.y / 2;
        }
        if (s.is_zero()) {
            s.set(1, 1);
        }

        const rect = Rect2.create(ofs.x, ofs.y, s.x, s.y);
        Vector2.free(s);
        Vector2.free(ofs);

        return rect;
    }

    /**
     * @param {boolean} p_enabled
     */
    set_region_enabled(p_enabled) {
        if (this._region_enabled) return;
        this._region_enabled = p_enabled;
        this.update();
    }

    /**
     * @param {Rect2} p_rect
     */
    set_region_rect(p_rect) {
        if (this._region_rect.equals(p_rect)) return;
        this._region_rect.copy(p_rect);
        if (this._region_enabled) {
            this.item_rect_changed();
        }
    }

    /**
     * @param {boolean} p_enabled
     */
    set_region_filter_clip(p_enabled) {
        this._region_filter_clip = p_enabled;
        this.update();
    }

    /**
     * @param {number} p_frame
     */
    set_frame(p_frame) {
        if (this._frame === p_frame) {
            this.item_rect_changed();
        }

        this._frame = p_frame;

        this.emit_signal('frame_changed');
    }

    /**
     * @param {Vector2Like} p_coord
     */
    set_frame_coords(p_coord) {
        this.set_frame(Math.floor(p_coord.y * this._hframes + p_coord.x));
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    set_frame_coords_n(x, y) {
        this.set_frame(Math.floor(y * this._hframes + x));
    }

    /* private */

    /**
     * @param {Rect2} r_src_rect
     * @param {Rect2} r_dst_rect
     */
    _get_rects(r_src_rect, r_dst_rect) {
        const base_rect = Rect2.create();

        let r_filter_clip = false;

        if (this._region_enabled) {
            r_filter_clip = this._region_filter_clip;
            base_rect.copy(this._region_rect);
        } else {
            r_filter_clip = false;
            base_rect.width = this._texture.get_width();
            base_rect.height = this._texture.get_height();
        }

        const frame_size = Vector2.create(base_rect.width / this._hframes, base_rect.height / this._vframes);
        const frame_offset = Vector2.create(this._frame % this._hframes, Math.floor(this._frame / this._hframes));
        frame_offset.multiply(frame_size);

        r_src_rect.width = frame_size.x;
        r_src_rect.height = frame_size.y;
        r_src_rect.x = base_rect.x + frame_offset.x;
        r_src_rect.y = base_rect.y + frame_offset.y;

        const dest_offset = this._offset.clone();
        if (this._centered) {
            dest_offset.x -= frame_size.x / 2;
            dest_offset.y -= frame_size.y / 2;
        }
        if (Engine.get_singleton().use_pixel_snap) {
            dest_offset.floor();
        }

        r_dst_rect.set(dest_offset.x, dest_offset.y, frame_size.x, frame_size.y);

        if (this._flip_h) {
            r_dst_rect.width = -r_dst_rect.width;
        }
        if (this._flip_v) {
            r_dst_rect.height = - r_dst_rect.height;
        }

        Vector2.free(frame_size);
        Vector2.free(frame_offset);
        Vector2.free(dest_offset);
        Rect2.free(base_rect);

        return r_filter_clip;
    }
}

node_class_map['Sprite'] = GDCLASS(Sprite, Node2D)
