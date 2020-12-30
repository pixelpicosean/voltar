import { node_class_map, get_resource_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { Rect2 } from 'engine/core/math/rect2.js';
import { Color } from 'engine/core/color';
import { Engine } from 'engine/core/engine';

import { ImageTexture } from '../resources/texture.js';
import { NOTIFICATION_DRAW } from './canvas_item';
import { Node2D } from './node_2d';

const WHITE = new Color(1, 1, 1);

export class Sprite extends Node2D {
    get class() { return 'Sprite' }

    get frame_coords() {
        return Vector2.create(this.frame % this.hframes, this.frame / this.hframes).floor();
    }

    centered = true;
    offset = new Vector2;
    flip_h = false;
    flip_v = false;
    region_enabled = false;
    region_filter_clip = false;
    region_rect = new Rect2;

    frame = 0;

    hframes = 1;
    vframes = 1;

    texture: ImageTexture = null;

    normal_map: ImageTexture = null;

    /* virtual */

    _load_data(data: any) {
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
    _notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_DRAW: {
                if (!this.texture) {
                    break;
                }

                const src_rect = Rect2.create();
                const dst_rect = Rect2.create();

                this._get_rects(src_rect, dst_rect);
                this.texture.draw_rect_region(this.canvas_item, dst_rect, src_rect, WHITE, false);

                Rect2.free(src_rect);
                Rect2.free(dst_rect);
            } break;
        }
    }

    /* public */

    /**
     * @param {string | ImageTexture} p_texture
     */
    set_texture(p_texture: string | ImageTexture) {
        /** @type {ImageTexture} */
        const texture: ImageTexture = (typeof (p_texture) === 'string') ? get_resource_map()[p_texture] : p_texture;

        if (this.texture === texture) return;
        this.texture = texture;
        this.update();
        this.item_rect_changed();
    }
    /**
     * @param {ImageTexture} p_texture
     */
    set_normal_map(p_texture: ImageTexture) {
        this.normal_map = p_texture;
        this.update();
    }

    /**
     * @param {boolean} p_center
     */
    set_centered(p_center: boolean) {
        this.centered = p_center;
        this.update();
        this.item_rect_changed();
    }

    /**
     * @param {Vector2Like} p_offset
     */
    set_offset(p_offset: Vector2Like) {
        this.offset.copy(p_offset);
        this.update();
        this.item_rect_changed();
    }
    /**
     * @param {number} p_offset_x
     * @param {number} p_offset_y
     */
    set_offset_n(p_offset_x: number, p_offset_y: number) {
        this.offset.set(p_offset_x, p_offset_y);
        this.update();
        this.item_rect_changed();
    }

    /**
     * @param {boolean} p_flip
     */
    set_flip_h(p_flip: boolean) {
        this.flip_h = p_flip;
        this.update();
    }
    /**
     * @param {boolean} p_flip
     */
    set_flip_v(p_flip: boolean) {
        this.flip_v = p_flip;
        this.update();
    }

    /**
     * @param {number} p_amount
     */
    set_vframes(p_amount: number) {
        this.vframes = p_amount;
        this.update();
        this.item_rect_changed();
    }
    /**
     * @param {number} p_amount
     */
    set_hframes(p_amount: number) {
        this.hframes = p_amount;
        this.update();
        this.item_rect_changed();
    }

    get_rect() {
        if (!this.texture || !this.texture.get_rid()) {
            return Rect2.create(0, 0, 1, 1);
        }

        const s = Vector2.create(0, 0);

        if (this.region_enabled) {
            s.set(this.region_rect.width, this.region_rect.height);
        } else {
            s.set(this.texture.get_width(), this.texture.get_height());
        }

        s.x /= this.hframes;
        s.y /= this.vframes;

        const ofs = Vector2.create(0, 0);
        if (this.centered) {
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
    set_region_enabled(p_enabled: boolean) {
        if (this.region_enabled) return;
        this.region_enabled = p_enabled;
        this.update();
    }

    /**
     * @param {Rect2} p_rect
     */
    set_region_rect(p_rect: Rect2) {
        if (this.region_rect.equals(p_rect)) return;
        this.region_rect.copy(p_rect);
        if (this.region_enabled) {
            this.item_rect_changed();
        }
    }

    /**
     * @param {boolean} p_enabled
     */
    set_region_filter_clip(p_enabled: boolean) {
        this.region_filter_clip = p_enabled;
        this.update();
    }

    /**
     * @param {number} p_frame
     */
    set_frame(p_frame: number) {
        if (this.frame === p_frame) {
            this.item_rect_changed();
        }

        this.frame = p_frame;

        this.emit_signal('frame_changed');
    }

    set_frame_coords(p_coord: Vector2Like) {
        this.set_frame(Math.floor(p_coord.y * this.hframes + p_coord.x));
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    set_frame_coords_n(x: number, y: number) {
        this.set_frame(Math.floor(y * this.hframes + x));
    }

    /* private */

    /**
     * @param {Rect2} r_src_rect
     * @param {Rect2} r_dst_rect
     */
    _get_rects(r_src_rect: Rect2, r_dst_rect: Rect2) {
        const base_rect = Rect2.create();

        let r_filter_clip = false;

        if (this.region_enabled) {
            r_filter_clip = this.region_filter_clip;
            base_rect.copy(this.region_rect);
        } else {
            r_filter_clip = false;
            base_rect.width = this.texture.get_width();
            base_rect.height = this.texture.get_height();
        }

        const frame_size = Vector2.create(base_rect.width / this.hframes, base_rect.height / this.vframes);
        const frame_offset = Vector2.create(this.frame % this.hframes, Math.floor(this.frame / this.hframes));
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

        if (this.flip_h) {
            r_dst_rect.width = -r_dst_rect.width;
        }
        if (this.flip_v) {
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
