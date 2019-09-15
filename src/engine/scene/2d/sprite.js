import { node_class_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';

import { Color } from 'engine/core/color';
import { VSG } from 'engine/servers/visual/visual_server_globals';

import { NOTIFICATION_DRAW } from '../2d/canvas_item';
import { Node2D } from '../2d/node_2d';
import { Rect2 } from 'engine/core/math/rect2';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { ImageTexture } from '../resources/texture';
import { Engine } from 'engine/core/engine';


const rect = new Rect2();
const white = new Color(1, 1, 1);

export class Sprite extends Node2D {
    get class() { return 'Sprite' }

    /**
     * @param {ImageTexture} p_texture
     */
    set_texture(p_texture) {
        if (this.texture === p_texture) return;
        this.texture = p_texture;
        this.update();
        this.item_rect_changed();
    }
    /**
     * @param {ImageTexture} p_texture
     */
    set_normal_map(p_texture) {
        this.normal_map = p_texture;
        this.update();
    }

    /**
     * @param {boolean} p_center
     */
    set_centered(p_center) {
        this.centered = p_center;
        this.update();
        this.item_rect_changed();
    }

    /**
     * @param {Vector2Like} p_offset
     */
    set_offset(p_offset) {
        this.offset.copy(p_offset);
        this.update();
        this.item_rect_changed();
    }
    /**
     * @param {number} p_offset_x
     * @param {number} p_offset_y
     */
    set_offset_n(p_offset_x, p_offset_y) {
        this.offset.set(p_offset_x, p_offset_y);
        this.update();
        this.item_rect_changed();
    }

    /**
     * @param {boolean} p_flip
     */
    set_flip_h(p_flip) {
        this.hflip = p_flip;
        this.update();
    }
    /**
     * @param {boolean} p_flip
     */
    set_flip_v(p_flip) {
        this.vflip = p_flip;
        this.update();
    }

    /**
     * @param {boolean} p_enabled
     */
    set_region_enabled(p_enabled) {
        if (this.region_enabled) return;
        this.region_enabled = p_enabled;
        this.update();
    }

    /**
     * @param {Rect2} p_rect
     */
    set_rect_region(p_rect) {
        if (this.region_rect.equals(p_rect)) return;
        this.region_rect.copy(p_rect);
        if (this.region_enabled) {
            this.item_rect_changed();
        }
    }

    /**
     * @param {boolean} p_enabled
     */
    set_region_filter_clip(p_enabled) {
        this.region_filter_clip = p_enabled;
        this.update();
    }

    /**
     * @param {number} p_frame
     */
    set_frame(p_frame) {
        if (this.frame === p_frame) {
            this.item_rect_changed();
        }

        this.frame = p_frame;

        this.emit_signal('frame_changed');
    }

    /**
     * @param {Vector2Like} p_coord
     */
    set_frame_coords(p_coord) {
        this.set_frame(Math.floor(p_coord.y * this.hframes + p_coord.x));
    }

    get_frame_coords() {
        return Vector2.new(this.frame % this.hframes, this.frame / this.hframes).floor();
    }

    /**
     * @param {number} p_amount
     */
    set_vframes(p_amount) {
        this.vframes = p_amount;
        this.update();
        this.item_rect_changed();
    }
    /**
     * @param {number} p_amount
     */
    set_hframes(p_amount) {
        this.hframes = p_amount;
        this.update();
        this.item_rect_changed();
    }

    get_rect() {
        if (!this.texture || !this.texture.texture) {
            return Rect2.new(0, 0, 1, 1);
        }

        const s = Vector2.new(0, 0);

        if (this.region_enabled) {
            s.set(this.region_rect.width, this.region_rect.height);
        } else {
            s.set(this.texture.width, this.texture.height);
        }

        s.x /= this.hframes;
        s.y /= this.vframes;

        const ofs = Vector2.new(0, 0);
        if (this.centered) {
            ofs.x -= s.x / 2;
            ofs.y -= s.y / 2;
        }
        if (s.is_zero()) {
            s.set(1, 1);
        }

        const rect = Rect2.new(ofs.x, ofs.y, s.x, s.y);
        Vector2.free(s);
        Vector2.free(ofs);

        return rect;
    }

    constructor() {
        super();

        this.centered = true;
        this.offset = new Vector2(0, 0);
        this.hflip = false;
        this.vflip = false;
        this.region_enabled = false;
        this.region_filter_clip = false;
        this.region_rect = new Rect2();

        this.frame = 0;
        this.frame_coords = new Vector2();

        this.hframes = 1;
        this.vframes = 1;

        /** @type {ImageTexture} */
        this.texture = null;

        /** @type {ImageTexture} */
        this.normal_map = null;
    }

    /* private */

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_DRAW: {
                if (!this.texture) {
                    break;
                }

                const src_rect = Rect2.new();
                const dst_rect = Rect2.new();

                const filter_clip = this._get_rects(src_rect, dst_rect);
                this.texture.draw_rect_region(this.canvas_item, dst_rect, src_rect, white, false, this.normal_map, filter_clip);

                Rect2.free(src_rect);
                Rect2.free(dst_rect);
            } break;
        }
    }

    /**
     * @param {Rect2} r_src_rect
     * @param {Rect2} r_dst_rect
     */
    _get_rects(r_src_rect, r_dst_rect) {
        const base_rect = Rect2.new();

        let r_filter_clip = false;

        if (this.region_enabled) {
            r_filter_clip = this.region_filter_clip;
            base_rect.copy(this.region_rect);
        } else {
            r_filter_clip = false;
            base_rect.width = this.texture.width;
            base_rect.height = this.texture.height;
        }

        const frame_size = Vector2.new(base_rect.width / this.hframes, base_rect.height / this.vframes);
        const frame_offset = Vector2.new(this.frame % this.hframes, this.frame / this.hframes);
        frame_offset.multiply(frame_size);

        r_src_rect.width = frame_size.x;
        r_src_rect.height = frame_size.y;
        r_src_rect.x = base_rect.x + frame_offset.x;
        r_src_rect.y = base_rect.y + frame_offset.y;

        const dest_offset = this.offset.clone();
        if (this.centered) {
            dest_offset.x -= frame_size.x / 2;
            dest_offset.y -= frame_size.y / 2;
        }
        if (Engine.get_singleton().use_pixel_snap) {
            dest_offset.floor();
        }

        r_dst_rect.set(dest_offset.x, dest_offset.y, frame_size.x, frame_size.y);

        if (this.hflip) {
            r_dst_rect.width = -r_dst_rect.width;
        }
        if (this.vflip) {
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
