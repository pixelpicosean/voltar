import { node_class_map, get_resource_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import { Vector2Like, Vector2 } from 'engine/core/math/vector2';
import { Rect2 } from 'engine/core/math/rect2';

import { ImageTexture } from '../resources/texture';

import { NOTIFICATION_DRAW } from '../2d/canvas_item';

import {
    BaseButton,
    DRAW_NORMAL,
    DRAW_HOVER,
    DRAW_HOVER_PRESSED,
    DRAW_PRESSED,
    DRAW_DISABLED,
} from './base_button';
import {
    STRETCH_SCALE,
    STRETCH_TILE,
    STRETCH_KEEP_CENTERED,
    STRETCH_KEEP_ASPECT,
    STRETCH_KEEP_ASPECT_CENTERED,
    STRETCH_KEEP_ASPECT_COVERED,
} from './texture_rect';


export class TextureButton extends BaseButton {
    get class() { return 'TextureButton' }

    expand = false;
    stretch_mode = STRETCH_SCALE;

    texture_region = new Rect2;
    position_rect = new Rect2;
    tile = false;

    texture_normal: ImageTexture = null;
    texture_pressed: ImageTexture = null;
    texture_hover: ImageTexture = null;
    texture_disabled: ImageTexture = null;

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.expand !== undefined) {
            this.set_expand(data.expand);
        }
        if (data.stretch_mode !== undefined) {
            this.set_stretch_mode(data.stretch_mode);
        }

        if (data.texture_normal !== undefined) {
            this.set_texture_normal(data.texture_normal);
        }
        if (data.texture_pressed !== undefined) {
            this.set_texture_pressed(data.texture_pressed);
        }
        if (data.texture_hover !== undefined) {
            this.set_texture_hover(data.texture_hover);
        }
        if (data.texture_disabled !== undefined) {
            this.set_texture_disabled(data.texture_disabled);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_DRAW: {
                const draw_mode = this.get_draw_mode();

                /** @type {ImageTexture} */
                let texdraw: ImageTexture = null;

                switch (draw_mode) {
                    case DRAW_NORMAL: {
                        texdraw = this.texture_normal;
                    } break;
                    case DRAW_HOVER_PRESSED:
                    case DRAW_PRESSED: {
                        if (this.texture_pressed) {
                            texdraw = this.texture_pressed;
                        } else if (this.texture_hover) {
                            texdraw = this.texture_hover;
                        } else if (this.texture_normal) {
                            texdraw = this.texture_normal;
                        }
                    } break;
                    case DRAW_HOVER: {
                        if (this.texture_hover) {
                            texdraw = this.texture_hover;
                        } else {
                            if (this.texture_pressed && this.pressed) {
                                texdraw = this.texture_pressed;
                            } else if (this.texture_normal) {
                                texdraw = this.texture_normal;
                            }
                        }
                    } break;
                    case DRAW_DISABLED: {
                        if (this.texture_disabled) {
                            texdraw = this.texture_disabled;
                        } else if (this.texture_normal) {
                            texdraw = this.texture_normal;
                        }
                    } break;
                }

                if (texdraw) {
                    const ofs = Vector2.new(0, 0);
                    const size = texdraw.get_size().clone();
                    this.texture_region.set(0, 0, size.x, size.y);
                    this.tile = false;
                    if (this.expand) {
                        switch (this.stretch_mode) {
                            case STRETCH_SCALE: {
                                size.copy(this.rect_size);
                            } break;
                            case STRETCH_TILE: {
                                size.copy(this.rect_size);
                                this.tile = true;
                            } break;
                            case STRETCH_KEEP_CENTERED: {
                                ofs.set(
                                    (this.rect_size.x - texdraw.get_width()) * 0.5,
                                    (this.rect_size.y - texdraw.get_height()) * 0.5
                                )
                                size.copy(texdraw.get_size());
                            } break;
                            case STRETCH_KEEP_ASPECT_CENTERED:
                            case STRETCH_KEEP_ASPECT: {
                                size.copy(this.rect_size);
                                let tex_width = texdraw.get_width() * size.y / texdraw.get_height();
                                let tex_height = size.y;

                                if (tex_width > size.x) {
                                    tex_width = size.x;
                                    tex_height = texdraw.get_height() * tex_width / texdraw.get_width();
                                }

                                if (this.stretch_mode === STRETCH_KEEP_ASPECT_CENTERED) {
                                    ofs.x = (size.x - tex_width) * 0.5;
                                    ofs.y = (size.y - tex_height) * 0.5;
                                }
                                size.x = tex_width;
                                size.y = tex_height;
                            } break;
                            case STRETCH_KEEP_ASPECT_COVERED: {
                                size.copy(this.rect_size);
                                const tex_size = texdraw.get_size().clone();
                                const scale_size = Vector2.new(size.x / tex_size.x, size.y / tex_size.y);
                                const scale = scale_size.x > scale_size.y ? scale_size.x : scale_size.y;
                                scale_size.scale(scale);
                                this.texture_region.set(
                                    Math.abs((scale_size.x - size.x) / scale),
                                    Math.abs((scale_size.y - size.y) / scale),
                                    size.x / scale,
                                    size.y / scale
                                )
                                Vector2.free(scale_size);
                                Vector2.free(tex_size);
                            } break;
                        }
                    }

                    this.position_rect.set(ofs.x, ofs.y, size.x, size.y);
                    if (this.tile) {
                        this.draw_texture_rect(texdraw, this.position_rect, this.tile);
                    } else {
                        this.draw_texture_rect_region(texdraw, this.position_rect, this.texture_region);
                    }

                    // TODO: focus support

                    Vector2.free(size);
                    Vector2.free(ofs);
                }
            } break;
        }
    }

    get_minimum_size() {
        const rscale = super.get_minimum_size();

        if (!this.expand) {
            if (!this.texture_normal) {
                if (!this.texture_pressed) {
                    if (!this.texture_hover) {
                        rscale.set(0, 0);
                    } else {
                        rscale.copy(this.texture_hover.get_size());
                    }
                } else {
                    rscale.copy(this.texture_pressed.get_size());
                }
            } else {
                rscale.copy(this.texture_normal.get_size());
            }
        }

        return rscale.abs();
    }

    /**
     * @param {Vector2Like} p_point
     */
    _has_point_(p_point: Vector2Like) {
        // TODO: bitmap click mask
        return super._has_point_(p_point);
    }

    /* public */

    /**
     * @param {string|ImageTexture} p_texture
     */
    set_texture_normal(p_texture: string | ImageTexture) {
        this.texture_normal = (typeof (p_texture) === 'string') ? get_resource_map()[p_texture] : p_texture;
        this.minimum_size_changed();
        this.update();
    }

    /**
     * @param {string|ImageTexture} p_texture
     */
    set_texture_hover(p_texture: string | ImageTexture) {
        this.texture_hover = (typeof (p_texture) === 'string') ? get_resource_map()[p_texture] : p_texture;
        this.minimum_size_changed();
        this.update();
    }

    /**
     * @param {string|ImageTexture} p_texture
     */
    set_texture_pressed(p_texture: string | ImageTexture) {
        this.texture_pressed = (typeof (p_texture) === 'string') ? get_resource_map()[p_texture] : p_texture;
        this.minimum_size_changed();
        this.update();
    }

    /**
     * @param {string|ImageTexture} p_texture
     */
    set_texture_disabled(p_texture: string | ImageTexture) {
        this.texture_disabled = (typeof (p_texture) === 'string') ? get_resource_map()[p_texture] : p_texture;
        this.minimum_size_changed();
        this.update();
    }

    /**
     * @param {boolean} value
     */
    set_expand(value: boolean) {
        this.expand = value;
        this.minimum_size_changed();
        this.update();
    }

    /**
     * @param {number} value
     */
    set_stretch_mode(value: number) {
        this.stretch_mode = value;
        this.update();
    }
}
node_class_map['TextureButton'] = GDCLASS(TextureButton, BaseButton)
