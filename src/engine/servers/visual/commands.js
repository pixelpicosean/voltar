import { Rect2 } from "engine/core/math/rect2";
import { Color } from "engine/core/color";
import { Transform2D } from "engine/core/math/transform_2d";

import Texture from "engine/drivers/textures/Texture";
import { BLEND_MODES } from "engine/drivers/constants";
import { Vector2 } from "engine/core/math/vector2";


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

export const NINE_PATCH_STRETCH = 0;
export const NINE_PATCH_TILE = 1;
export const NINE_PATCH_TILE_FIT = 2;


const quad_indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

export class Command {
    get type() { return -1 }
}

export class CommandRect {
    get type() { return TYPE_RECT }
    constructor() {
        this.rect = new Rect2();
        /** @type {Texture} */
        this.texture = null;
        /** @type {Texture} */
        this.normal_map = null;
        this.modulate = new Color();
        this.source = new Rect2();
        this.flags = 0;
        this.vertex_data = new Float32Array(8);
        this.indices = quad_indices;
        /** @type {Float32Array} */
        this.uvs = null;
        this.blendMode = BLEND_MODES.NORMAL;
    }
    /**
     * @param {Transform2D} transform
     */
    calculate_vertices(transform) {
        // We don't use orig, trim and rotation from texture atlas,
        // so we'll be able to support more Godot drawing configs.
        // Also we can add a special atlas packer to CLI.

        // Vertex
        const wt = transform;
        const a = wt.a;
        const b = wt.b;
        const c = wt.c;
        const d = wt.d;
        const tx = wt.tx;
        const ty = wt.ty;

        const w1 = this.rect.x;
        const w0 = w1 + this.rect.width;
        const h1 = this.rect.y;
        const h0 = h1 + this.rect.height;

        const vertex_data = this.vertex_data;

        vertex_data[0] = (a * w1) + (c * h1) + tx;
        vertex_data[1] = (d * h1) + (b * w1) + ty;

        vertex_data[2] = (a * w0) + (c * h1) + tx;
        vertex_data[3] = (d * h1) + (b * w0) + ty;

        vertex_data[4] = (a * w0) + (c * h0) + tx;
        vertex_data[5] = (d * h0) + (b * w0) + ty;

        vertex_data[6] = (a * w1) + (c * h0) + tx;
        vertex_data[7] = (d * h0) + (b * w1) + ty;

        // UV
        this.uvs = this.texture._uvs.uvsFloat32;
    }
}

export class CommandNinePatch {
    get type() { return TYPE_NINEPATCH }
    constructor() {
        this.rect = new Rect2();
        this.source = new Rect2();
        this.texture = null;
        this.normal_map = null;
        this.margin = [0, 0, 0, 0];
        this.draw_center = true;
        this.color = new Color();
        this.axis_x = NINE_PATCH_STRETCH;
        this.axis_y = NINE_PATCH_STRETCH;
    }
}

export class CommandCircle {
    get type() { return TYPE_CIRCLE }
    constructor() {
        this.pos = new Vector2();
        this.radius = 0;
        this.color = new Color();
    }
}

export class CommandTransform {
    get type() { return TYPE_TRANSFORM }
    constructor() {
        this.xform = new Transform2D();
    }
}
