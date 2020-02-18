import { GDCLASS } from "engine/core/v_object";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Color, ColorLike } from "engine/core/color";
import { Resource } from "engine/core/resource";
import { Rect2 } from "engine/core/math/rect2";

import { VSG } from "engine/servers/visual/visual_server_globals";
import { Item } from "engine/servers/visual/visual_server_canvas";


export const PIXEL_FORMAT_NONE = 0;
export const PIXEL_FORMAT_L8 = 1;
export const PIXEL_FORMAT_LA8 = 2;
export const PIXEL_FORMAT_RGB8 = 3;
export const PIXEL_FORMAT_RGBA8 = 4;
export const PIXEL_FORMAT_RGBA4 = 5;
export const PIXEL_FORMAT_RGBA5551 = 6;

/**
 * @typedef {HTMLImageElement | HTMLCanvasElement | HTMLVideoElement} DOMImageData
 * @typedef {Uint8Array | Uint16Array | Float32Array} RawImageData
 *
 * @typedef ImageFlags
 * @property {number} [min_filter]
 * @property {number} [mag_filter]
 * @property {number} [wrap_u]
 * @property {number} [wrap_v]
 */

const white = Object.freeze(new Color(1, 1, 1, 1));

export class Texture extends Resource {
    get class() { return 'Texture' }
    get flags() {
        return this._flags;
    }
    set flags(value) {
        this.set_flags(value);
    }

    constructor() {
        super();

        /** @type {ImageFlags} */
        this._flags = {
            min_filter: WebGLRenderingContext.NEAREST,
            mag_filter: WebGLRenderingContext.NEAREST,
            wrap_u: WebGLRenderingContext.CLAMP_TO_EDGE,
            wrap_v: WebGLRenderingContext.CLAMP_TO_EDGE,
        };
    }

    /**
     * @param {ImageFlags} value
     */
    set_flags(value) { }

    /** @return {DOMImageData | RawImageData} */
    get_data() { return null }

    get_width() { return 0 }
    get_height() { return 0 }
    get_size() { return Vector2.ZERO }
    /**
     * @param {Rect2} p_rect
     * @param {Rect2} p_src_rect
     * @param {Rect2} r_rect
     * @param {Rect2} r_src_rect
     */
    get_rect_region(p_rect, p_src_rect, r_rect, r_src_rect) {
        r_rect.copy(p_rect);
        r_src_rect.copy(p_src_rect);
        return true;
    }

    has_alpha() { return false }

    /**
     * @param {any} p_canvas_item
     * @param {Vector2Like} p_pos
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose]
     * @param {ImageTexture} [p_normal_map]
     */
    draw(p_canvas_item, p_pos, p_modulate = white, p_transpose = false, p_normal_map = null) { }

    /**
     * @param {any} p_canvas_item
     * @param {Vector2Like} p_rect
     * @param {boolean} [p_tile]
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose]
     * @param {ImageTexture} [p_normal_map]
     */
    draw_rect(p_canvas_item, p_rect, p_tile = false, p_modulate = white, p_transpose = false, p_normal_map = null) { }

    /**
     * @param {any} p_canvas_item
     * @param {Rect2} p_rect
     * @param {Rect2} p_src_rect
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose]
     * @param {ImageTexture} [p_normal_map]
     * @param {boolean} [p_clip_uv]
     */
    draw_rect_region(p_canvas_item, p_rect, p_src_rect, p_modulate = white, p_transpose = false, p_normal_map = null, p_clip_uv = true) { }
}
GDCLASS(Texture, Resource)


export const STORAGE_RAW = 0;
export const STORAGE_COMPRESS_LOSSY = 1;
export const STORAGE_COMPRESS_LOSSLESS = 2;

export class ImageTexture extends Texture {
    get class() { return 'ImageTexture' }

    get_width() { return this.width }
    get_height() { return this.height }

    constructor() {
        super();

        this.width = 0;
        this.height = 0;

        /** @type {import('engine/drivers/webgl/rasterizer_storage').Texture_t} */
        this.texture = null;
        this.format = PIXEL_FORMAT_RGBA8;

        /** for atlas texture only */
        this.x = 0;
        /** for atlas texture only */
        this.y = 0;

        this.uvs = [0, 0, 1, 1];
    }

    get_format() {
        return this.format;
    }
    /**
     * returns new Vector2.
     */
    get_size() {
        return Vector2.new(this.width, this.height);
    }

    /**
     * @param {DOMImageData} p_image
     * @param {ImageFlags} [p_flags]
     */
    create_from_image(p_image, p_flags = {}) {
        this._flags = p_flags;
        this.width = p_image.width;
        this.height = p_image.height;
        if (!this.texture) {
            this.texture = VSG.storage.texture_2d_create();
        }
        VSG.storage.texture_allocate(this.texture, this.width, this.height, this.flags);
        VSG.storage.texture_set_image(this.texture, p_image);
    }

    /**
     * @param {RawImageData} p_data
     * @param {number} p_width
     * @param {number} p_height
     * @param {ImageFlags} [p_flags]
     */
    create_from_data(p_data, p_width, p_height, p_flags = {}) {
        this._flags = p_flags;
        this.width = p_width;
        this.height = p_height;
        if (!this.texture) {
            this.texture = VSG.storage.texture_2d_create();
        }
        VSG.storage.texture_allocate(this.texture, this.width, this.height, this.flags);
        VSG.storage.texture_set_data(this.texture, p_data);
    }

    /**
     * @param {ImageTexture} p_texture
     * @param {number} p_x
     * @param {number} p_y
     * @param {number} p_width
     * @param {number} p_height
     */
    create_from_region(p_texture, p_x, p_y, p_width, p_height) {
        this._flags = p_texture._flags;
        this.x = p_x;
        this.y = p_y;
        this.width = p_width;
        this.height = p_height;
        this.texture = p_texture.texture;

        this.uvs[0] = this.x / this.texture.width;
        this.uvs[1] = this.y / this.texture.height;
        this.uvs[2] = (this.x + this.width) / this.texture.width;
        this.uvs[3] = (this.y + this.height) / this.texture.height;
    }

    /**
     * @param {DOMImageData} p_image
     */
    set_image(p_image) {
        VSG.storage.texture_set_image(this.texture, p_image);
    }

    /**
     * @param {RawImageData} p_data
     */
    set_data(p_data) {
        VSG.storage.texture_set_data(this.texture, p_data);
    }

    /**
     * @param {Item} p_canvas_item
     * @param {Vector2Like} p_pos
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose]
     */
    draw(p_canvas_item, p_pos, p_modulate = white, p_transpose = false) {
        const rect = Rect2.new(p_pos.x, p_pos.y, this.get_width(), this.get_height());
        VSG.canvas.canvas_item_add_texture_rect(p_canvas_item, rect, this, false, p_modulate, p_transpose);
        Rect2.free(rect);
    }

    /**
     * @param {Item} p_canvas_item
     * @param {Rect2} p_rect
     * @param {boolean} [p_tile]
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose]
     */
    draw_rect(p_canvas_item, p_rect, p_tile = false, p_modulate = white, p_transpose = false) {
        VSG.canvas.canvas_item_add_texture_rect(p_canvas_item, p_rect, this, p_tile, p_modulate, p_transpose);
    }

    /**
     * @param {Item} p_canvas_item
     * @param {Rect2} p_rect
     * @param {Rect2} p_src_rect
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose]
     */
    draw_rect_region(p_canvas_item, p_rect, p_src_rect, p_modulate = white, p_transpose = false) {
        VSG.canvas.canvas_item_add_texture_rect_region(p_canvas_item, p_rect, this, p_src_rect, p_modulate, p_transpose);
    }
}
GDCLASS(ImageTexture, Texture)
