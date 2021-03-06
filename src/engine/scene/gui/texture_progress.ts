import { node_class_map, get_resource_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { clamp } from "engine/core/math/math_funcs";
import {
    MARGIN_BOTTOM,
    MARGIN_LEFT,
    MARGIN_TOP,
    MARGIN_RIGHT,
} from "engine/core/math/math_defs";
import { Vector2Like, Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
import { Color, ColorLike } from "engine/core/color";

import { VSG } from "engine/servers/visual/visual_server_globals";
import { NINE_PATCH_STRETCH } from "engine/servers/visual/commands";

import { ImageTexture } from "../resources/texture";
import { NOTIFICATION_DRAW } from "../2d/canvas_item";
import { Range } from "./range";


export const FILL_LEFT_TO_RIGHT = 0;
export const FILL_RIGHT_TO_LEFT = 1;
export const FILL_TOP_TO_BOTTOM = 2;
export const FILL_BOTTOM_TO_TOP = 3;
export const FILL_CLOCKWISE = 4;
export const FILL_COUNTER_CLOCKWISE = 5;
export const FILL_BILINEAR_LEFT_AND_RIGHT = 6;
export const FILL_BILINEAR_TOP_AND_BOTTOM = 7;
export const FILL_CLOCKWISE_AND_COUNTER_CLOCKWISE = 8;

const corners = [ -0.125, -0.375, -0.625, -0.875, 0.125, 0.375, 0.625, 0.875, 1.125, 1.375, 1.625, 1.875 ];

export class TextureProgress extends Range {
    get class() { return 'TextureProgress' }

    get stretch_margin_bottom() { return this.stretch_margin[MARGIN_BOTTOM] }
    set_stretch_margin_bottom(value: number) { this.stretch_margin[MARGIN_BOTTOM] = value }

    get stretch_margin_left() { return this.stretch_margin[MARGIN_LEFT] }
    set_stretch_margin_left(value: number) { this.stretch_margin[MARGIN_LEFT] = value }

    get stretch_margin_top() { return this.stretch_margin[MARGIN_TOP] }
    set_stretch_margin_top(value: number) { this.stretch_margin[MARGIN_TOP] = value }

    get stretch_margin_right() { return this.stretch_margin[MARGIN_RIGHT] }
    set_stretch_margin_right(value: number) { this.stretch_margin[MARGIN_RIGHT] = value }

    fill_mode = FILL_LEFT_TO_RIGHT;
    nine_patch_stretch = false;

    texture_over: ImageTexture = null;
    texture_progress: ImageTexture = null;
    texture_under: ImageTexture = null;

    radial_initial_angle = 0;
    radial_center_offset = new Vector2;
    radial_fill_degrees = 360;

    stretch_margin = [0, 0, 0, 0];

    tint_under = new Color(1, 1, 1, 1);
    tint_progress = new Color(1, 1, 1, 1);
    tint_over = new Color(1, 1, 1, 1);

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.fill_mode !== undefined)
            this.set_fill_mode(data.fill_mode);

        if (data.nine_patch_stretch !== undefined)
            this.set_nine_patch_stretch(data.nine_patch_stretch);

        if (data.radial_initial_angle !== undefined)
            this.set_radial_initial_angle(data.radial_initial_angle);
        if (data.radial_center_offset !== undefined)
            this.set_radial_center_offset(data.radial_center_offset);
        if (data.radial_fill_degrees !== undefined)
            this.set_radial_fill_degrees(data.radial_fill_degrees);

        if (data.stretch_margin_bottom !== undefined)
            this.set_stretch_margin_bottom(data.stretch_margin_bottom);
        if (data.stretch_margin_left !== undefined)
            this.set_stretch_margin_left(data.stretch_margin_left);
        if (data.stretch_margin_top !== undefined)
            this.set_stretch_margin_top(data.stretch_margin_top);
        if (data.stretch_margin_right !== undefined)
            this.set_stretch_margin_right(data.stretch_margin_right);

        if (data.texture_under !== undefined)
            this.set_texture_under(data.texture_under);
        if (data.texture_progress !== undefined)
            this.set_texture_progress(data.texture_progress);
        if (data.texture_over !== undefined)
            this.set_texture_over(data.texture_over);

        if (data.tint_under !== undefined)
            this.set_tint_under(data.tint_under);
        if (data.tint_progress !== undefined)
            this.set_tint_progress(data.tint_progress);
        if (data.tint_over !== undefined)
            this.set_tint_over(data.tint_over);

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_DRAW: {
                if (this.nine_patch_stretch && (this.fill_mode === FILL_LEFT_TO_RIGHT || this.fill_mode === FILL_RIGHT_TO_LEFT || this.fill_mode === FILL_TOP_TO_BOTTOM || this.fill_mode === FILL_BOTTOM_TO_TOP)) {
                    if (this.texture_under) {
                        this.draw_nine_patch_stretched(this.texture_under, FILL_LEFT_TO_RIGHT, 1.0, this.tint_under);
                    }
                    if (this.texture_progress) {
                        this.draw_nine_patch_stretched(this.texture_progress, this.fill_mode, this.ratio, this.tint_progress);
                    }
                    if (this.texture_over) {
                        this.draw_nine_patch_stretched(this.texture_over, FILL_LEFT_TO_RIGHT, 1.0, this.tint_over);
                    }
                } else {
                    if (this.texture_under) {
                        this.draw_texture(this.texture_under, Vector2.ZERO, this.tint_under);
                    }
                    if (this.texture_progress) {
                        const s = this.texture_progress.get_size();
                        const region = Rect2.new();
                        switch (this.fill_mode) {
                            case FILL_LEFT_TO_RIGHT: {
                                region.set(0, 0, s.x * this.ratio, s.y);
                                this.draw_texture_rect_region(this.texture_progress, region, region, this.tint_progress);
                            } break;
                            case FILL_RIGHT_TO_LEFT: {
                                region.set(s.x - s.x * this.ratio, 0, s.x * this.ratio, s.y);
                                this.draw_texture_rect_region(this.texture_progress, region, region, this.tint_progress);
                            } break;
                            case FILL_TOP_TO_BOTTOM: {
                                region.set(0, 0, s.x, s.y * this.ratio);
                                this.draw_texture_rect_region(this.texture_progress, region, region, this.tint_progress);
                            } break;
                            case FILL_BOTTOM_TO_TOP: {
                                region.set(0, s.y - s.y * this.ratio, s.x, s.y * this.ratio);
                                this.draw_texture_rect_region(this.texture_progress, region, region, this.tint_progress);
                            } break;
                            case FILL_CLOCKWISE:
                            case FILL_COUNTER_CLOCKWISE:
                            case FILL_CLOCKWISE_AND_COUNTER_CLOCKWISE: {
                                const val = this.ratio * this.radial_fill_degrees / 360;
                                if (val === 1) {
                                    region.set(0, 0, s.x, s.y);
                                    this.draw_texture_rect_region(this.texture_progress, region, region, this.tint_progress);
                                } else if (val !== 0) {
                                    // TODO: draw circle progress
                                    break;

                                    const pts = [];
                                    const direction = (this.fill_mode === FILL_COUNTER_CLOCKWISE) ? -1 : 1;
                                    let start = 0.0;
                                    if (this.fill_mode === FILL_CLOCKWISE_AND_COUNTER_CLOCKWISE) {
                                        start = this.radial_initial_angle / 360 - val * 0.5;
                                    } else {
                                        start = this.radial_initial_angle / 360;
                                    }

                                    const end = start + direction * val;
                                    pts.push(start);
                                    pts.push(end);
                                    const from = Math.min(start, end);
                                    const to = Math.max(start, end);
                                    for (let i = 0; i < 12; i++) {
                                        if (corners[i] > from && corners[i] < to) {
                                            pts.push(corners[i]);
                                        }
                                    }
                                    pts.sort();
                                    const uvs = [];
                                    const points = [];
                                }
                            } break;
                            case FILL_BILINEAR_LEFT_AND_RIGHT: {
                                region.set(s.x * 0.5 - s.x * this.ratio * 0.5, 0, s.x * this.ratio, s.y);
                                this.draw_texture_rect_region(this.texture_progress, region, region, this.tint_progress);
                            } break;
                            case FILL_BILINEAR_TOP_AND_BOTTOM: {
                                region.set(0, s.y * 0.5 - s.y * this.ratio * 0.5, s.x, s.y * this.ratio);
                                this.draw_texture_rect_region(this.texture_progress, region, region, this.tint_progress);
                            } break;
                            default: {
                                region.set(0, 0, s.x * this.ratio, s.y);
                                this.draw_texture_rect_region(this.texture_progress, region, region, this.tint_progress);
                            } break;
                        }
                        Rect2.free(region);
                    }
                    if (this.texture_over) {
                        this.draw_texture(this.texture_over, Vector2.ZERO, this.tint_over);
                    }
                }
            } break;
        }
    }

    /**
     * @param {number} margin
     * @param {number} size
     */
    set_stretch_margin(margin: number, size: number) {
        this.stretch_margin[margin] = size;
        this.minimum_size_changed();
    }

    get_minimum_size() {
        const size = Vector2.new();
        if (this.nine_patch_stretch) {
            return size.set(
                this.stretch_margin[MARGIN_LEFT] + this.stretch_margin[MARGIN_RIGHT],
                this.stretch_margin[MARGIN_TOP] + this.stretch_margin[MARGIN_BOTTOM]
            );
        } else if (this.texture_under) {
            return size.set(this.texture_under.width, this.texture_under.height);
        } else if (this.texture_over) {
            return size.set(this.texture_over.width, this.texture_over.height);
        } else if (this.texture_progress) {
            return size.set(this.texture_progress.width, this.texture_progress.height);
        }
        return size.set(1, 1);
    }

    /* public */

    /**
     * @param {number} p_fill
     */
    set_fill_mode(p_fill: number) {
        this.fill_mode = p_fill;
        this.update();
    }

    /**
     * @param {boolean} value
     */
    set_nine_patch_stretch(value: boolean) {
        this.nine_patch_stretch = value;
        this.update();
        this.minimum_size_changed();
    }

    /**
     * @param {Vector2Like} value
     */
    set_radial_center_offset(value: Vector2Like) {
        this.set_radial_center_offset_n(value.x, value.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_radial_center_offset_n(x: number, y: number) {
        this.radial_center_offset.set(x, y);
        this.update();
    }

    /**
     * @param {number} value
     */
    set_radial_fill_degrees(value: number) {
        this.radial_fill_degrees = clamp(value, 0, 360);
        this.update();
    }

    /**
     * @param {number} value
     */
    set_radial_initial_angle(value: number) {
        while (value > 360) {
            value -= 360;
        }
        while (value < 0) {
            value += 360;
        }
        this.radial_initial_angle = value;
        this.update();
    }

    /**
     * @param {ColorLike} value
     */
    set_tint_over(value: ColorLike) {
        this.set_tint_over_n(value.r, value.g, value.b);
    }
    /**
     * @param {number} r
     * @param {number} [g]
     * @param {number} [b]
     */
    set_tint_over_n(r: number, g: number, b: number) {
        if (g !== undefined) {
            this.tint_over.set(r, g, b);
        } else {
            this.tint_over.set_with_hex(r);
        }
        this.update();
    }

    /**
     * @param {Color} value
     */
    set_tint_progress(value: Color) {
        this.set_tint_progress_n(value.r, value.g, value.b);
    }
    /**
     * @param {number} r
     * @param {number} [g]
     * @param {number} [b]
     */
    set_tint_progress_n(r: number, g: number, b: number) {
        if (g !== undefined) {
            this.tint_progress.set(r, g, b);
        } else {
            this.tint_progress.set_with_hex(r);
        }
        this.update();
    }

    /**
     * @param {ColorLike} color
     */
    set_tint_under(color: ColorLike) {
        this.set_tint_under_n(color.r, color.g, color.b);
    }
    /**
     * @param {number} r
     * @param {number} [g]
     * @param {number} [b]
     */
    set_tint_under_n(r: number, g: number, b: number) {
        if (g !== undefined) {
            this.tint_under.set(r, g, b);
        } else {
            this.tint_under.set_with_hex(r);
        }
        this.update();
    }

    /**
     * @param {string | ImageTexture} p_texture
     */
    set_texture_over(p_texture: string | ImageTexture) {
        this.texture_over = (typeof (p_texture) === 'string') ? get_resource_map()[p_texture] : p_texture;
        this.update();
        if (!this.texture_under) {
            this.minimum_size_changed();
        }
    }

    /**
     * @param {string | ImageTexture} p_texture
     */
    set_texture_progress(p_texture: string | ImageTexture) {
        this.texture_progress = (typeof (p_texture) === 'string') ? get_resource_map()[p_texture] : p_texture;
        this.update();
        this.minimum_size_changed();
    }

    /**
     * @param {string | ImageTexture} p_texture
     */
    set_texture_under(p_texture: string | ImageTexture) {
        this.texture_under = (typeof (p_texture) === 'string') ? get_resource_map()[p_texture] : p_texture;
        this.update();
        this.minimum_size_changed();
    }

    /* private */

    /**
     * @param {ImageTexture} p_texture
     * @param {number} p_mode
     * @param {number} p_ratio
     * @param {ColorLike} p_modulate
     */
    draw_nine_patch_stretched(p_texture: ImageTexture, p_mode: number, p_ratio: number, p_modulate: ColorLike) {
        const texture_size = p_texture.get_size();

        const topleft = Vector2.new(this.stretch_margin[MARGIN_LEFT], this.stretch_margin[MARGIN_TOP]);
        const bottomright = Vector2.new(this.stretch_margin[MARGIN_RIGHT], this.stretch_margin[MARGIN_BOTTOM])

        const src_rect = Rect2.new(0, 0, texture_size.x, texture_size.y);
        const dst_rect = Rect2.new(0, 0, this.rect_size.x, this.rect_size.y);

        if (p_ratio < 1) {
            let width_total = 0;
            let width_texture = 0;
            let first_section_size = 0;
            let last_section_size = 0;
            switch (this.fill_mode) {
                case FILL_LEFT_TO_RIGHT:
                case FILL_RIGHT_TO_LEFT: {
                    width_total = dst_rect.width;
                    width_texture = texture_size.x;
                    first_section_size = topleft.x;
                    last_section_size = bottomright.x;
                } break;
                case FILL_TOP_TO_BOTTOM:
                case FILL_BOTTOM_TO_TOP: {
                    width_total = dst_rect.height;
                    width_texture = texture_size.y;
                    first_section_size = topleft.y;
                    last_section_size = bottomright.y;
                } break;
                case FILL_BILINEAR_LEFT_AND_RIGHT: {
                    // TODO: not implemented in Godot yet
                } break;
                case FILL_BILINEAR_TOP_AND_BOTTOM: {
                    // TODO: not implemented in Godot yet
                } break;
            }

            let width_filled = width_total * p_ratio;
            let middle_section_size = Math.max(0, width_texture - first_section_size - last_section_size);

            middle_section_size *= Math.min(1, Math.max(0, width_filled - first_section_size) / Math.max(1, width_total - first_section_size - last_section_size));
            last_section_size = Math.max(0, last_section_size - (width_total - width_filled));
            first_section_size = Math.min(first_section_size, width_filled);
            width_texture = Math.min(width_texture, first_section_size + middle_section_size + last_section_size);

            switch (this.fill_mode) {
                case FILL_LEFT_TO_RIGHT: {
                    src_rect.width = width_texture;
                    dst_rect.width = width_filled;
                    topleft.x = first_section_size;
                    bottomright.x = last_section_size;
                } break;
                case FILL_RIGHT_TO_LEFT: {
                    src_rect.x += (src_rect.width - width_texture);
                    src_rect.width = width_texture;
                    dst_rect.x += (width_total - width_filled);
                    dst_rect.width = width_filled;
                    topleft.x = last_section_size;
                    bottomright.x = first_section_size;
                } break;
                case FILL_TOP_TO_BOTTOM: {
                    src_rect.height = width_texture;
                    dst_rect.height = width_filled;
                    bottomright.y = last_section_size;
                    topleft.y = first_section_size;
                } break;
                case FILL_BOTTOM_TO_TOP: {
                    src_rect.y += (src_rect.height - width_texture);
                    src_rect.height = width_texture;
                    dst_rect.y += (width_total - width_filled);
                    dst_rect.height = width_filled;
                    topleft.y = last_section_size;
                    bottomright.y = first_section_size;
                } break;
                case FILL_BILINEAR_LEFT_AND_RIGHT: {
                    // TODO: not implemented in Godot yet
                } break;
                case FILL_BILINEAR_TOP_AND_BOTTOM: {
                    // TODO: not implemented in Godot yet
                } break;
            }
        }

        p_texture.get_rect_region(dst_rect, src_rect, dst_rect, src_rect);

        VSG.canvas.canvas_item_add_nine_patch(this.canvas_item, dst_rect, src_rect, p_texture, topleft, bottomright, NINE_PATCH_STRETCH, NINE_PATCH_STRETCH, true, p_modulate);

        Rect2.free(dst_rect);
        Rect2.free(src_rect);

        Vector2.free(bottomright);
        Vector2.free(topleft);
    }
}
node_class_map['TextureProgress'] = GDCLASS(TextureProgress, Range)
