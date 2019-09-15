import { Rect2 } from "engine/core/math/rect2";
import { Color } from "engine/core/color";
import { Transform2D } from "engine/core/math/transform_2d";

import Texture from "engine/drivers/textures/Texture";
import { BLEND_MODES } from "engine/drivers/constants";

export const CANVAS_RECT_REGION = 1;
export const CANVAS_RECT_TILE = 2;
export const CANVAS_RECT_FLIP_H = 4;
export const CANVAS_RECT_FLIP_V = 8;
export const CANVAS_RECT_TRANSPOSE = 16;
export const CANVAS_RECT_CLIP_UV = 32;

export const TYPE_LINE = 0;
export const TYPE_POLYLINE = 1;
export const TYPE_RECT = 2;
export const TYPE_NINEPATCH = 3;
export const TYPE_PRIMITIVE = 4;
export const TYPE_POLYGON = 5;
export const TYPE_MESH = 6;
export const TYPE_MULTIMESH = 7;
export const TYPE_PARTICLES = 8;
export const TYPE_CIRCLE = 9;
export const TYPE_TRANSFORM = 10;
export const TYPE_CLIP_IGNORE = 11;

const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

export class CommandRect {
    constructor() {
        this.type = TYPE_RECT;

        this.rect = new Rect2();
        /** @type {Texture} */
        this._texture = null;
        this.normal_map = null;
        this.modulate = new Color();
        this.source = new Rect2();
        this.flags = 0;
        this.vertex_data = new Float32Array(8);
        this.indices = indices;
        /** @type {Float32Array} */
        this.uvs = null;
        this.blendMode = BLEND_MODES.NORMAL;
    }
    /**
     * @param {Transform2D} transform
     */
    calculate_vertices(transform) {
        const texture = this._texture;
        const wt = transform;
        const a = wt.a;
        const b = wt.b;
        const c = wt.c;
        const d = wt.d;
        const tx = wt.tx;
        const ty = wt.ty;
        const vertex_data = this.vertex_data;
        const trim = texture.trim;
        const orig = texture.orig;

        let w0 = 0;
        let w1 = 0;
        let h0 = 0;
        let h1 = 0;

        if (trim) {
            // if the sprite is trimmed and is not a tilingsprite then we need to add the extra
            // space before transforming the sprite coords.
            w1 = trim.x + this.rect.x;
            w0 = w1 + trim.width;

            h1 = trim.y + this.rect.y;
            h0 = h1 + trim.height;
        } else {
            w1 = this.rect.x;
            w0 = w1 + orig.width;

            h1 = this.rect.y;
            h0 = h1 + orig.height;
        }

        // xy
        vertex_data[0] = (a * w1) + (c * h1) + tx;
        vertex_data[1] = (d * h1) + (b * w1) + ty;

        // xy
        vertex_data[2] = (a * w0) + (c * h1) + tx;
        vertex_data[3] = (d * h1) + (b * w0) + ty;

        // xy
        vertex_data[4] = (a * w0) + (c * h0) + tx;
        vertex_data[5] = (d * h0) + (b * w0) + ty;

        // xy
        vertex_data[6] = (a * w1) + (c * h0) + tx;
        vertex_data[7] = (d * h0) + (b * w1) + ty;

        this.uvs = texture._uvs.uvsFloat32;
    }
}
