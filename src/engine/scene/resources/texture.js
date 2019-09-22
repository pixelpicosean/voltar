import { GDCLASS } from "engine/core/v_object";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Color, ColorLike } from "engine/core/color";
import { Image } from "engine/core/image";
import { Resource } from "engine/core/resource";
import { Rect2 } from "engine/core/math/rect2";
import {
    TEXTURE_TYPE_2D,
} from "engine/servers/visual_server";
import { VSG } from "engine/servers/visual/visual_server_globals";
import { Item } from "engine/servers/visual/visual_server_canvas";


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

        this._flags = 0;
    }

    /**
     * @param {number} value
     */
    set_flags(value) { }

    /** @return {Image} */
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

        this.storage = STORAGE_RAW;
        this.lossy_quality = 0.7;

        this.texture = VSG.storage.texture_2d_create();
        this.format = 0;
        this.size_override = new Vector2();
        this.image_stored = false;
    }

    get_format() {
        return this.format;
    }
    get_size() {
        return Vector2.new(this.width, this.height);
    }

    /**
     * @param {number} p_flags
     */
    set_flags(p_flags) {
        this._flags = p_flags;
        if (this.get_width() === 0 || this.get_height() === 0) {
            return;
        }
        VSG.storage.texture_set_flags(this.texture, this._flags);
    }

    /**
     * @param {Image} p_image
     * @param {number} p_flags
     */
    create_from_image(p_image, p_flags) {
        this._flags = p_flags;
        this.format = p_image.format;
        this.width = p_image.width;
        this.height = p_image.height;
        VSG.storage.texture_allocate(this.texture, this.width, this.height, 0, this.format, TEXTURE_TYPE_2D, this.flags);
        VSG.storage.texture_set_data(this.texture, p_image);

        this.image_stored = true;
    }

    /**
     * @param {any} p_atlas
     * @param {number} p_flags
     */
    create_from_atlas(p_atlas, p_flags) {
        this.texture = p_atlas;
        this.width = this.texture.width;
        this.height = this.texture.height;
        this.set_flags(p_flags);

        this.image_stored = false;
    }

    /**
     * @param {Image} p_image
     */
    set_data(p_image) {
        VSG.storage.texture_set_data(this.texture, p_image);
        this.image_stored = true;
    }

    /**
     * @param {Item} p_canvas_item
     * @param {Vector2Like} p_pos
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose]
     * @param {ImageTexture} [p_normal_map]
     */
    draw(p_canvas_item, p_pos, p_modulate = white, p_transpose = false, p_normal_map = null) {
        const rect = Rect2.new(p_pos.x, p_pos.y, this.get_width(), this.get_height());
        VSG.canvas.canvas_item_add_texture_rect(p_canvas_item, rect, this.texture, false, p_modulate, p_transpose, p_normal_map && p_normal_map.texture);
        Rect2.free(rect);
    }

    /**
     * @param {Item} p_canvas_item
     * @param {Rect2} p_rect
     * @param {boolean} [p_tile]
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose]
     * @param {ImageTexture} [p_normal_map]
     */
    draw_rect(p_canvas_item, p_rect, p_tile = false, p_modulate = white, p_transpose = false, p_normal_map = null) {
        VSG.canvas.canvas_item_add_texture_rect(p_canvas_item, p_rect, this.texture, p_tile, p_modulate, p_transpose, p_normal_map && p_normal_map.texture);
    }

    /**
     * @param {Item} p_canvas_item
     * @param {Rect2} p_rect
     * @param {Rect2} p_src_rect
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose]
     * @param {ImageTexture} [p_normal_map]
     * @param {boolean} [p_clip_uv]
     */
    draw_rect_region(p_canvas_item, p_rect, p_src_rect, p_modulate = white, p_transpose = false, p_normal_map = null, p_clip_uv = true) {
        VSG.canvas.canvas_item_add_texture_rect_region(p_canvas_item, p_rect, this.texture, p_src_rect, p_modulate, p_transpose, p_normal_map && p_normal_map.texture, p_clip_uv);
    }
}
GDCLASS(ImageTexture, Texture)
