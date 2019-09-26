import { Rect2 } from "engine/core/math/rect2";
import { Color } from "engine/core/color";
import { Transform2D } from "engine/core/math/transform_2d";

import Texture from "engine/drivers/textures/Texture";
import { BLEND_MODES } from "engine/drivers/constants";
import { Vector2 } from "engine/core/math/vector2";
import {
    MARGIN_LEFT,
    MARGIN_RIGHT,
    MARGIN_TOP,
    MARGIN_BOTTOM,
} from "engine/core/math/math_defs";


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

const quad_indices = new Uint16Array([
    0, 1, 2,
    0, 2, 3,
]);
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
const nine_patch_uvs_cache = new Float32Array(8)

/**
 * Swap values of 2 vertex (position or uv or any 2 component array)
 * @param {Float32Array | Uint8Array | Uint16Array} arr
 * @param {number} idx_a
 * @param {number} idx_b
 */
function swap_vertices(arr, idx_a, idx_b) {
    let v = 0;
    // x
    v = arr[idx_a * 2];
    arr[idx_a * 2] = arr[idx_b * 2];
    arr[idx_b * 2] = v;
    // y
    v = arr[idx_a * 2 + 1];
    arr[idx_a * 2 + 1] = arr[idx_b * 2 + 1];
    arr[idx_b * 2 + 1] = v;
}

/**
 * @param {Float32Array} r_uvs
 * @param {Float32Array} tex_uvs
 * @param {number} tex_width
 * @param {number} tex_height
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 */
function get_uvs_of_sub_rect(r_uvs, tex_uvs, tex_width, tex_height, x, y, width, height) {
    const uv_w = tex_uvs[4] - tex_uvs[0];
    const uv_h = tex_uvs[5] - tex_uvs[1];
    const topleft_x = tex_uvs[0] + uv_w * (x / tex_width);
    const topleft_y = tex_uvs[1] + uv_h * (y / tex_height);
    const bottomright_x = topleft_x + uv_w * (width / tex_width);
    const bottomright_y = topleft_y + uv_h * (height / tex_height);
    r_uvs[0] = topleft_x;
    r_uvs[1] = topleft_y;
    r_uvs[2] = bottomright_x;
    r_uvs[3] = topleft_y;
    r_uvs[4] = bottomright_x;
    r_uvs[5] = bottomright_y;
    r_uvs[6] = topleft_x;
    r_uvs[7] = bottomright_y;
}

export class Command {
    get type() { return -1 }
    static instance() { return new Command() }
    constructor() {
        /** @type {Texture} */
        this.texture = null;
        /** @type {Texture} */
        this.normal_map = null;
        /** @type {Float32Array} */
        this.vertex_data = null;
        /** @type {Uint16Array} */
        this.indices = null;
        /** @type {Float32Array} */
        this.uvs = null;
        this.blendMode = BLEND_MODES.NORMAL;
        this.final_modulate = new Color();
        /** @type {any[]} for custom commands only */
        this.batches = null;
    }
    // FIXME: do we really need this `init` method?
    init() {
        this.texture = null;
        this.normal_map = null;
        this.blendMode = BLEND_MODES.NORMAL;
        this.final_modulate.set(0, 0, 0, 0);
        return this;
    }
    /**
     * Please OVERRIDE, apply item owner transform and color
     * @param {Transform2D} transform
     * @param {Color} modulate
     */
    calculate_vertices(transform, modulate) { }
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
        this.vertex_data = new Float32Array(8);
        this.indices = quad_indices;
        this.uvs = new Float32Array(8);
        this.blendMode = BLEND_MODES.NORMAL;
    }
    init() {
        super.init();
        this.modulate.set(1, 1, 1, 1);
        this.rect.set(0, 0, 0, 0);
        this.source.set(0, 0, 0, 0);
        this.flags = 0;
        return this;
    }
    /**
     * @param {Transform2D} transform
     * @param {Color} modulate
     */
    calculate_vertices(transform, modulate) {
        // vertex
        const wt = transform;
        const a = wt.a;
        const b = wt.b;
        const c = wt.c;
        const d = wt.d;
        const tx = wt.tx;
        const ty = wt.ty;

        const x0 = this.rect.x;
        const x1 = x0 + this.rect.width;
        const y0 = this.rect.y;
        const y1 = y0 + this.rect.height;

        const vertex_data = this.vertex_data;

        vertex_data[0] = (a * x0) + (c * y0) + tx;
        vertex_data[1] = (d * y0) + (b * x0) + ty;

        vertex_data[2] = (a * x1) + (c * y0) + tx;
        vertex_data[3] = (d * y0) + (b * x1) + ty;

        vertex_data[4] = (a * x1) + (c * y1) + tx;
        vertex_data[5] = (d * y1) + (b * x1) + ty;

        vertex_data[6] = (a * x0) + (c * y1) + tx;
        vertex_data[7] = (d * y1) + (b * x0) + ty;

        // uv
        const tex_uvs = this.texture._uvs.uvsFloat32;
        const uvs = this.uvs;
        if (this.flags & CANVAS_RECT_REGION) {
            get_uvs_of_sub_rect(
                uvs, tex_uvs,
                this.texture.width, this.texture.height,
                this.source.x, this.source.y,
                this.source.width, this.source.height
            )
        } else {
            for (let i = 0; i < 8; i++) {
                uvs[i] = tex_uvs[i];
            }
        }

        if (this.flags & CANVAS_RECT_TRANSPOSE) {
            swap_vertices(uvs, 1, 3);
        }
        if (this.flags & CANVAS_RECT_FLIP_H) {
            swap_vertices(uvs, 0, 1);
            swap_vertices(uvs, 2, 3);
        }
        if (this.flags & CANVAS_RECT_FLIP_V) {
            swap_vertices(uvs, 0, 3);
            swap_vertices(uvs, 1, 2);
        }

        // color
        this.final_modulate.copy(this.modulate).multiply(modulate);
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
    calculate_vertices(transform, modulate) {
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
    }
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
