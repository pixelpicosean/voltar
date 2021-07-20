import { GDCLASS } from "engine/core/v_object";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Color, ColorLike } from "engine/core/color";
import { Resource } from "engine/core/resource";
import { Rect2 } from "engine/core/math/rect2";

import { VSG } from "engine/servers/visual/visual_server_globals";
import { Item } from "engine/servers/visual/visual_server_canvas";

const TEXTURE_TYPE_2D = WebGLRenderingContext.TEXTURE_2D;

export const PIXEL_FORMAT_NONE = 0;
export const PIXEL_FORMAT_L8 = 1;
export const PIXEL_FORMAT_LA8 = 2;
export const PIXEL_FORMAT_R8 = 3;
export const PIXEL_FORMAT_RGB8 = 4;
export const PIXEL_FORMAT_RGBA8 = 5;
export const PIXEL_FORMAT_RGBA4 = 6;
export const PIXEL_FORMAT_RGBA5551 = 7;
export const PIXEL_FORMAT_DXT1 = 8;
export const PIXEL_FORMAT_DXT3 = 9;
export const PIXEL_FORMAT_DXT5 = 10;
export const PIXEL_FORMAT_PVRTC2 = 11;
export const PIXEL_FORMAT_PVRTC2A = 12;
export const PIXEL_FORMAT_PVRTC4 = 13;
export const PIXEL_FORMAT_PVRTC4A = 14;
export const PIXEL_FORMAT_ETC = 15;

export type DOMImageData = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
export type RawImageData = Uint8Array | Uint16Array | Float32Array;

export interface ImageFlags {
    FILTER?: boolean;
    MIPMAPS?: boolean;
    REPEAT?: 0|1|2;
}

const WHITE = new Color(1, 1, 1, 1);

export class Texture extends Resource {
    get class() { return 'Texture' }

    flags: ImageFlags = {
        FILTER: false,
        MIPMAPS: false,
        REPEAT: 0,
    };

    uvs = [0, 0, 1, 1];

    set_flags(value: ImageFlags) {
        Object.assign(this.flags, value);
    }

    /** @return {DOMImageData | RawImageData} */
    get_data(): DOMImageData | RawImageData { return null }

    get_width() { return 0 }
    get_height() { return 0 }
    get_size() { return Vector2.ZERO }
    /**
     * @param {Rect2} p_rect
     * @param {Rect2} p_src_rect
     * @param {Rect2} r_rect
     * @param {Rect2} r_src_rect
     */
    get_rect_region(p_rect: Rect2, p_src_rect: Rect2, r_rect: Rect2, r_src_rect: Rect2) {
        r_rect.copy(p_rect);
        r_src_rect.copy(p_src_rect);
        return true;
    }

    has_alpha() { return false }

    /**
     * @param {Item} p_canvas_item
     * @param {Vector2Like} p_pos
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose]
     */
    draw(p_canvas_item: Item, p_pos: Vector2Like, p_modulate: ColorLike = WHITE, p_transpose: boolean = false) {
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
    draw_rect(p_canvas_item: Item, p_rect: Rect2, p_tile: boolean = false, p_modulate: ColorLike = WHITE, p_transpose: boolean = false) {
        VSG.canvas.canvas_item_add_texture_rect(p_canvas_item, p_rect, this, p_tile, p_modulate, p_transpose);
    }

    /**
     * @param {Item} p_canvas_item
     * @param {Rect2} p_rect
     * @param {Rect2} p_src_rect
     * @param {ColorLike} [p_modulate]
     * @param {boolean} [p_transpose]
     */
    draw_rect_region(p_canvas_item: Item, p_rect: Rect2, p_src_rect: Rect2, p_modulate: ColorLike = WHITE, p_transpose: boolean = false) {
        VSG.canvas.canvas_item_add_texture_rect_region(p_canvas_item, p_rect, this, p_src_rect, p_modulate, p_transpose);
    }
}
GDCLASS(Texture, Resource)


export const STORAGE_RAW = 0;
export const STORAGE_COMPRESS_LOSSY = 1;
export const STORAGE_COMPRESS_LOSSLESS = 2;

export class ImageTexture extends Texture {
    get class() { return 'ImageTexture' }

    get_width() { return this.width }
    get_height() { return this.height }

    width = 0;
    height = 0;

    texture: import('engine/drivers/webgl/rasterizer_storage').Texture_t = null;
    format = PIXEL_FORMAT_RGBA8;

    /** for atlas texture only */
    x = 0;
    /** for atlas texture only */
    y = 0;

    get_rid() {
        return this.texture.self();
    }

    get_format() {
        return this.format;
    }
    get_size(r_out?: Vector2) {
        return (r_out || Vector2.new()).set(this.width, this.height);
    }

    /**
     * @param {DOMImageData} p_image
     * @param {ImageFlags} [p_flags]
     */
    create_from_image(p_image: DOMImageData, p_flags: ImageFlags = {}) {
        this.set_flags(p_flags);
        this.width = p_image.width;
        this.height = p_image.height;
        if (!this.texture) {
            this.texture = VSG.storage.texture_create();
        }
        VSG.storage.texture_allocate(this.texture, this.width, this.height, 0, PIXEL_FORMAT_RGBA8, TEXTURE_TYPE_2D, this.flags);
        VSG.storage.texture_set_image(this.texture, p_image);
    }

    /**
     * @param {RawImageData} p_data
     * @param {number} p_width
     * @param {number} p_height
     * @param {ImageFlags} [p_flags]
     */
    create_from_data(p_data: RawImageData, p_width: number, p_height: number, p_flags: ImageFlags = {}) {
        this.set_flags(p_flags);
        this.width = p_width;
        this.height = p_height;
        if (!this.texture) {
            this.texture = VSG.storage.texture_create();
        }
        VSG.storage.texture_allocate(this.texture, this.width, this.height, 0, PIXEL_FORMAT_RGBA8, TEXTURE_TYPE_2D, this.flags);
        VSG.storage.texture_set_data(this.texture, p_data);
    }

    /**
     * @param {ImageTexture} p_texture
     * @param {number} p_x
     * @param {number} p_y
     * @param {number} p_width
     * @param {number} p_height
     */
    create_from_region(p_texture: ImageTexture, p_x: number, p_y: number, p_width: number, p_height: number) {
        this.flags = p_texture.flags;
        this.x = p_x;
        this.y = p_y;
        this.width = p_width;
        this.height = p_height;
        this.texture = p_texture.texture.self();

        this.uvs[0] = this.x / this.texture.width;
        this.uvs[1] = this.y / this.texture.height;
        this.uvs[2] = (this.x + this.width) / this.texture.width;
        this.uvs[3] = (this.y + this.height) / this.texture.height;
    }

    /**
     * @param {DOMImageData} p_image
     */
    set_image(p_image: DOMImageData) {
        VSG.storage.texture_set_image(this.texture, p_image);
    }

    /**
     * @param {RawImageData} p_data
     */
    set_data(p_data: RawImageData) {
        VSG.storage.texture_set_data(this.texture, p_data);
    }
}
GDCLASS(ImageTexture, Texture)
