import { node_class_map, get_resource_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import { Vector2 } from 'engine/core/math/vector2';
import { Rect2 } from 'engine/core/math/rect2';

import { ImageTexture } from '../resources/texture';
import { NOTIFICATION_DRAW } from '../2d/canvas_item';
import { Control } from './control';


export const STRETCH_SCALE_ON_EXPAND = 0;
export const STRETCH_SCALE = 1;
export const STRETCH_TILE = 2;
export const STRETCH_KEEP = 3;
export const STRETCH_KEEP_CENTERED = 4;
export const STRETCH_KEEP_ASPECT = 5;
export const STRETCH_KEEP_ASPECT_CENTERED = 6;
export const STRETCH_KEEP_ASPECT_COVERED = 7;

export class TextureRect extends Control {
    get class() { return 'TextureRect' }

    expand = false;
    flip_h = false;
    flip_v = false;
    stretch_mode = STRETCH_SCALE_ON_EXPAND;

    texture: ImageTexture = null;

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.expand !== undefined) {
            this.set_expand(data.expand);
        }
        if (data.stretch_mode !== undefined) {
            this.set_stretch_mode(data.stretch_mode);
        }
        if (data.texture !== undefined) {
            this.set_texture(data.texture);
        }
        if (data.flip_h !== undefined) {
            this.set_flip_h(data.flip_h);
        }
        if (data.flip_v !== undefined) {
            this.set_flip_v(data.flip_v);
        }

        return this;
    }

    get_minimum_size() {
        if (!this.expand && this.texture) {
            return this.texture.get_size();
        } else {
            return Vector2.create(0, 0);
        }
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
        if (p_what === NOTIFICATION_DRAW) {
            if (!this.texture) {
                return;
            }

            /** @type {Vector2} */
            let size: Vector2 = null;
            const offset = Vector2.create();
            const region = Rect2.create();
            let tile = false;

            switch (this.stretch_mode) {
                case STRETCH_SCALE_ON_EXPAND: {
                    size = this.expand ? this.rect_size.clone() : this.texture.get_size();
                } break;
                case STRETCH_SCALE: {
                    size = this.rect_size.clone();
                } break;
                case STRETCH_TILE: {
                    size = this.rect_size.clone();
                    tile = true;
                } break;
                case STRETCH_KEEP: {
                    size = this.texture.get_size();
                } break;
                case STRETCH_KEEP_CENTERED: {
                    offset.copy(this.rect_size)
                        .subtract(this.texture.get_width(), this.texture.get_height())
                        .scale(0.5)
                    size = this.texture.get_size();
                } break;
                case STRETCH_KEEP_ASPECT_CENTERED:
                case STRETCH_KEEP_ASPECT: {
                    size = this.rect_size.clone();
                    let tex_width = this.texture.get_width() * size.y / this.texture.get_height();
                    let tex_height = size.y;

                    if (tex_width > size.x) {
                        tex_width = size.x;
                        tex_height = this.texture.get_height() * tex_width / this.texture.get_width();
                    }

                    if (this.stretch_mode === STRETCH_KEEP_ASPECT_CENTERED) {
                        offset.x += (size.x - tex_width) * 0.5;
                        offset.y += (size.y - tex_height) * 0.5;
                    }

                    size.x = tex_width;
                    size.y = tex_height;
                } break;
                case STRETCH_KEEP_ASPECT_COVERED: {
                    size = this.rect_size.clone();

                    const tex_size = this.texture.get_size();
                    const scale = Math.max(size.x / tex_size.x, size.y / tex_size.y);
                    tex_size.scale(scale);

                    region.x = Math.abs((tex_size.x - size.x) / scale) * 0.5;
                    region.y = Math.abs((tex_size.y - size.y) / scale) * 0.5;
                    region.width = size.x / scale;
                    region.height = size.y / scale;

                    Vector2.free(tex_size);
                } break;
            }

            size.x *= this.flip_h ? -1 : 1;
            size.y *= this.flip_v ? -1 : 1;

            const rect = Rect2.create(offset.x, offset.y, size.x, size.y);
            if (region.has_no_area()) {
                this.draw_texture_rect(this.texture, rect, tile);
            } else {
                this.draw_texture_rect_region(this.texture, rect, region);
            }
            Rect2.free(rect);

            Rect2.free(region);
            Vector2.free(offset);
            Vector2.free(size);
        }
    }

    /* public */

    /**
     * @param {string | ImageTexture} p_texture
     */
    set_texture(p_texture: string | ImageTexture) {
        /** @type {ImageTexture} */
        const texture: ImageTexture = (typeof (p_texture) === 'string') ? get_resource_map()[p_texture] : p_texture;

        this.texture = texture;
        this.update();
        this.minimum_size_changed();
    }

    /**
     * @param {boolean} value
     */
    set_expand(value: boolean) {
        this.expand = value;
        this.update();
        this.minimum_size_changed();
    }

    /**
     * @param {number} value
     */
    set_stretch_mode(value: number) {
        this.stretch_mode = value;
        this.update();
    }

    /**
     * @param {boolean} value
     */
    set_flip_h(value: boolean) {
        this.flip_h = value;
        this.update();
    }
    /**
     * @param {boolean} value
     */
    set_flip_v(value: boolean) {
        this.flip_v = value;
        this.update();
    }
}
node_class_map['TextureRect'] = GDCLASS(TextureRect, Control)
