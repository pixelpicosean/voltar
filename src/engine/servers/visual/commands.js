import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2.js";
import { Color } from "engine/core/color";

import { Texture } from "engine/scene/resources/texture.js";
import { Transform2D } from "engine/core/math/transform_2d.js";

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

export class Command {
    get type() { return -1 }
    static instance() { return new Command() }
    constructor() {
        /** @type {Texture} */
        this.texture = null;
    }
    init() {
        this.texture = null;
        return this;
    }
    free() { pool_map[this.type].push(this) }
}

export class CommandLine extends Command {
    get type() { return TYPE_LINE }
    static instance() { return new CommandLine() } // for TypeScript type checking

    constructor() {
        super();

        this.color = new Color();
        this.from = new Vector2();
        this.to = new Vector2();
        this.width = 1.0;
        this.antialiased = false;
    }
    init() {
        super.init();
        this.color.set(1, 1, 1, 1);
        this.from.set(0, 0);
        this.to.set(0, 0);
        this.width = 1.0;
        this.antialiased = false;
        return this;
    }
}
create_pool(TYPE_LINE, CommandLine)

export class CommandPolyLine extends Command {
    get type() { return TYPE_POLYLINE }
    static instance() { return new CommandPolyLine() } // for TypeScript type checking

    constructor() {
        super();

        this.width = 1.0;
        this.antialiased = false;
        /** @type {number[]} */
        this.triangles = [];
        /** @type {number[]} */
        this.triangle_colors = [];
        /** @type {number[]} */
        // this.lines = [];
        /** @type {number[]} */
        // this.line_colors = [];
    }
    init() {
        super.init();
        this.width = 1.0;
        this.antialiased = false;
        this.triangles.length = 0;
        this.triangle_colors.length = 0;
        // this.lines.length = 0;
        // this.line_colors.length = 0;
        return this;
    }
}
create_pool(TYPE_POLYLINE, CommandPolyLine)

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

export class CommandPolygon extends Command {
    get type() { return TYPE_POLYGON }
    static instance() { return new CommandPolygon() } // for TypeScript type checking

    constructor() {
        super();

        /** @type {number[]} */
        this.points = [];
        /** @type {number[]} */
        this.bones = [];
        /** @type {number[]} */
        this.weights = [];
        /** @type {number[]} */
        this.uvs = [];
        /** @type {number[]} */
        this.colors = [];
        /** @type {number[]} */
        this.indices = [];
    }
    init() {
        super.init();
        this.points.length = 0;
        this.bones.length = 0;
        this.weights.length = 0;
        this.uvs.length = 0;
        this.colors.length = 0;
        this.indices.length = 0;
        return this;
    }
    get_vert_count() { return (this.points.length / 2) | 0 }
}
create_pool(TYPE_POLYGON, CommandPolygon)

export class CommandMultiMesh extends Command {
    get type() { return TYPE_MULTIMESH }
    static instance() { return new CommandMultiMesh() } // for TypeScript type checking
    constructor() {
        super();

        /** @type {import('engine/drivers/webgl/rasterizer_storage').MultiMesh_t} */
        this.multimesh = null;
    }
}
create_pool(TYPE_MULTIMESH, CommandMultiMesh)

export class CommandTransform extends Command {
    get type() { return TYPE_TRANSFORM }
    static instance() { return new CommandTransform() } // for TypeScript type checking
    constructor() {
        super();

        this.xform = new Transform2D;
    }
    init() {
        this.xform.identity();
        return this;
    }
}
create_pool(TYPE_TRANSFORM, CommandTransform)
