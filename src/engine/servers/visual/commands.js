import { Rect2 } from "engine/core/math/rect2";
import { Color } from "engine/core/color";
import { Transform2D } from "engine/core/math/transform_2d";

import { Vector2 } from "engine/core/math/vector2";
import {
    MARGIN_LEFT,
    MARGIN_RIGHT,
    MARGIN_TOP,
    MARGIN_BOTTOM,
} from "engine/core/math/math_defs";

import { ImageTexture } from "engine/scene/resources/texture";


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
export const TYPE_CUSTOM = 100;

export const NINE_PATCH_STRETCH = 0;
export const NINE_PATCH_TILE = 1;
export const NINE_PATCH_TILE_FIT = 2;

/** @type {Object<number, Command[]>} */
const pool_map = {};

/**
 * @param {number} type
 * @param {typeof Command} ctor
 */
function create_pool(type, ctor) {
    pool_map[type] = [];

    ctor.instance = () => {
        let inst = pool_map[type].pop();
        if (!inst)
            return new ctor();
        return inst.init();
    }
}

const nine_patch_indices = new Uint16Array([
    0, 1, 5,
    0, 5, 4,

    1, 2, 6,
    1, 6, 5,

    2, 3, 7,
    2, 7, 6,

    4, 5, 9,
    4, 9, 8,

    5, 6, 10,
    5, 10, 9,

    6, 7, 11,
    6, 11, 10,

    8, 9, 13,
    8, 13, 12,

    9, 10, 14,
    9, 14, 13,

    10, 11, 15,
    10, 15, 14,
])

export class Command {
    get type() { return -1 }
    static instance() { return new Command() }
    constructor() {
        /** @type {ImageTexture} */
        this.texture = null;
    }
    init() {
        this.texture = null;
        return this;
    }
    free() { pool_map[this.type].push(this) }
}

export class CommandRect extends Command {
    get type() { return TYPE_RECT }
    static instance() { return new CommandRect() } // for TypeScript type checking

    constructor() {
        super();

        this.modulate = new Color();
        this.source = new Rect2();
        this.rect = new Rect2();
        this.flags = 0;
    }
    init() {
        super.init();
        this.modulate.set(1, 1, 1, 1);
        this.rect.set(0, 0, 0, 0);
        this.source.set(0, 0, 0, 0);
        this.flags = 0;
        return this;
    }
}
create_pool(TYPE_RECT, CommandRect)

export class CommandNinePatch extends Command {
    get type() { return TYPE_NINEPATCH }
    static instance() { return new CommandNinePatch() } // for TypeScript type checking
    constructor() {
        super();

        this.vertex_data = new Float32Array(16 * 2);
        this.indices = nine_patch_indices;
        this.uvs = new Float32Array(16 * 2);

        this.rect = new Rect2();
        this.source = new Rect2();
        this.color = new Color();
        this.margin = [0, 0, 0, 0];
        this.draw_center = true;
        this.axis_x = NINE_PATCH_STRETCH;
        this.axis_y = NINE_PATCH_STRETCH;
    }
    init() {
        super.init();
        this.rect.set(0, 0, 0, 0);
        this.source.set(0, 0, 0, 0);
        this.color.set(1, 1, 1, 1);
        this.margin[0] = this.margin[1] = this.margin[2] = this.margin[3] = 0;
        this.draw_cente = true;
        this.axis_x = NINE_PATCH_STRETCH;
        this.axis_y = NINE_PATCH_STRETCH;
        return this;
    }
    /**
     * @param {Transform2D} transform
     * @param {Color} modulate
     */
    /* render(transform, modulate) {
        // vertex and uv
        const wt = transform;
        const a = wt.a;
        const b = wt.b;
        const c = wt.c;
        const d = wt.d;
        const tx = wt.tx;
        const ty = wt.ty;

        const x0 = this.rect.x;
        const y0 = this.rect.y;
        const x1 = x0 + this.rect.width;
        const y1 = y0 + this.rect.height;

        const m_l = this.margin[MARGIN_LEFT];
        const m_r = this.margin[MARGIN_RIGHT];
        const m_t = this.margin[MARGIN_TOP];
        const m_b = this.margin[MARGIN_BOTTOM];

        const s_w = this.source.width || this.texture.width;
        const s_h = this.source.height || this.texture.height;

        get_uvs_of_sub_rect(
            nine_patch_uvs_cache, this.texture._uvs.uvsFloat32,
            this.texture.width, this.texture.height,
            this.source.x, this.source.y,
            s_w, s_h
        )

        const uv_x0 = nine_patch_uvs_cache[0];
        const uv_y0 = nine_patch_uvs_cache[1];
        const uv_x1 = nine_patch_uvs_cache[4];
        const uv_y1 = nine_patch_uvs_cache[5];

        const uv_m_l = (uv_x1 - uv_x0) * (m_l / s_w);
        const uv_m_r = (uv_x1 - uv_x0) * (m_r / s_w);
        const uv_m_t = (uv_y1 - uv_y0) * (m_t / s_h);
        const uv_m_b = (uv_y1 - uv_y0) * (m_b / s_h);

        const vertex_data = this.vertex_data;
        const uv = this.uvs;

        // - first row

        vertex_data[0 + 0] = (a * x0) + (c * y0) + tx;
        vertex_data[0 + 1] = (d * y0) + (b * x0) + ty;

        uv[0 + 0] = uv_x0;
        uv[0 + 1] = uv_y0;

        vertex_data[0 + 2] = (a * (x0 + m_l)) + (c * y0) + tx;
        vertex_data[0 + 3] = (d * y0) + (b * (x0 + m_l)) + ty;

        uv[0 + 2] = uv_x0 + uv_m_l;
        uv[0 + 3] = uv_y0;

        vertex_data[0 + 4] = (a * (x1 - m_r)) + (c * y0) + tx;
        vertex_data[0 + 5] = (d * y0) + (b * (x1 - m_r)) + ty;

        uv[0 + 4] = uv_x1 - uv_m_r;
        uv[0 + 5] = uv_y0;

        vertex_data[0 + 6] = (a * x1) + (c * y0) + tx;
        vertex_data[0 + 7] = (d * y0) + (b * x1) + ty;

        uv[0 + 6] = uv_x1;
        uv[0 + 7] = uv_y0;

        // - second row

        vertex_data[8 + 0] = (a * x0) + (c * (y0 + m_t)) + tx;
        vertex_data[8 + 1] = (d * (y0 + m_t)) + (b * x0) + ty;

        uv[8 + 0] = uv_x0;
        uv[8 + 1] = uv_y0 + uv_m_t;

        vertex_data[8 + 2] = (a * (x0 + m_l)) + (c * (y0 + m_t)) + tx;
        vertex_data[8 + 3] = (d * (y0 + m_t)) + (b * (x0 + m_l)) + ty;

        uv[8 + 2] = uv_x0 + uv_m_l;
        uv[8 + 3] = uv_y0 + uv_m_t;

        vertex_data[8 + 4] = (a * (x1 - m_r)) + (c * (y0 + m_t)) + tx;
        vertex_data[8 + 5] = (d * (y0 + m_t)) + (b * (x1 - m_r)) + ty;

        uv[8 + 4] = uv_x1 - uv_m_r;
        uv[8 + 5] = uv_y0 + uv_m_t;

        vertex_data[8 + 6] = (a * x1) + (c * (y0 + m_t)) + tx;
        vertex_data[8 + 7] = (d * (y0 + m_t)) + (b * x1) + ty;

        uv[8 + 6] = uv_x1;
        uv[8 + 7] = uv_y0 + uv_m_t;

        // - third row

        vertex_data[16 + 0] = (a * x0) + (c * (y1 - m_b)) + tx;
        vertex_data[16 + 1] = (d * (y1 - m_b)) + (b * x0) + ty;

        uv[16 + 0] = uv_x0;
        uv[16 + 1] = uv_y1 - uv_m_b;

        vertex_data[16 + 2] = (a * (x0 + m_l)) + (c * (y1 - m_b)) + tx;
        vertex_data[16 + 3] = (d * (y1 - m_b)) + (b * (x0 + m_l)) + ty;

        uv[16 + 2] = uv_x0 + uv_m_l;
        uv[16 + 3] = uv_y1 - uv_m_b;

        vertex_data[16 + 4] = (a * (x1 - m_r)) + (c * (y1 - m_b)) + tx;
        vertex_data[16 + 5] = (d * (y1 - m_b)) + (b * (x1 - m_r)) + ty;

        uv[16 + 4] = uv_x1 - uv_m_r;
        uv[16 + 5] = uv_y1 - uv_m_b;

        vertex_data[16 + 6] = (a * x1) + (c * (y1 - m_b)) + tx;
        vertex_data[16 + 7] = (d * (y1 - m_b)) + (b * x1) + ty;

        uv[16 + 6] = uv_x1;
        uv[16 + 7] = uv_y1 - uv_m_b;

        // - forth row

        vertex_data[24 + 0] = (a * x0) + (c * y1) + tx;
        vertex_data[24 + 1] = (d * y1) + (b * x0) + ty;

        uv[24 + 0] = uv_x0;
        uv[24 + 1] = uv_y1;

        vertex_data[24 + 2] = (a * (x0 + m_l)) + (c * y1) + tx;
        vertex_data[24 + 3] = (d * y1) + (b * (x0 + m_l)) + ty;

        uv[24 + 2] = uv_x0 + uv_m_l;
        uv[24 + 3] = uv_y1;

        vertex_data[24 + 4] = (a * (x1 - m_r)) + (c * y1) + tx;
        vertex_data[24 + 5] = (d * y1) + (b * (x1 - m_r)) + ty;

        uv[24 + 4] = uv_x1 - uv_m_r;
        uv[24 + 5] = uv_y1;

        vertex_data[24 + 6] = (a * x1) + (c * y1) + tx;
        vertex_data[24 + 7] = (d * y1) + (b * x1) + ty;

        uv[24 + 6] = uv_x1;
        uv[24 + 7] = uv_y1;

        // color
        this.final_modulate.copy(this.color).multiply(modulate);
    } */
}
create_pool(TYPE_NINEPATCH, CommandNinePatch)

export class CommandCircle extends Command {
    get type() { return TYPE_CIRCLE }
    static instance() { return new CommandCircle() } // for TypeScript type checking
    constructor() {
        super();

        this.pos = new Vector2();
        this.radius = 0;
        this.color = new Color();
    }
    init() {
        this.pos.set(0, 0);
        this.radius = 0;
        this.color.set(1, 1, 1, 1);
        return this;
    }
}
create_pool(TYPE_CIRCLE, CommandCircle)

export class CommandMultiMesh extends Command {
    get type() { return TYPE_MULTIMESH }
    static instance() { return new CommandMultiMesh() } // for TypeScript type checking
    constructor() {
        super();

        this.multimesh = null;
    }
}
create_pool(TYPE_MULTIMESH, CommandMultiMesh)

export class CommandTransform extends Command {
    get type() { return TYPE_TRANSFORM }
    static instance() { return new CommandTransform() } // for TypeScript type checking
    constructor() {
        super();

        this.xform = new Transform2D();
    }
    init() {
        this.xform.reset();
        return this;
    }
}
create_pool(TYPE_TRANSFORM, CommandTransform)
