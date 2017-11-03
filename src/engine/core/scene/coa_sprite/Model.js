import { linear, angle_linear } from './math';

const DegToRad = Math.PI / 180;

export const ObjectType = {
    sprite: 0,
    bone: 1,
    box: 2,
    point: 3,
    sound: 4,
    entity: 5,
    variable: 6,
};

export const CurveType = {
    linear: 0,
    instant: 1,
    quadratic: 2,
    cubic: 3,
    quartic: 4,
    quintic: 5,
    bezier: 6,
};

export class Model {
    constructor(data) {
        /**
         * @type {Array<Folder>}
         */
        this.folder = new Array(data.folder.length);
        /**
         * @type {Array<Entity>}
         */
        this.entity = new Array(data.entity.length);

        let i = 0, list;
        list = data.folder;
        for (i = 0; i < list.length; i++) {
            this.folder[i] = new Folder().load(list[i]);
        }
        list = data.entity;
        for (i = 0; i < list.length; i++) {
            this.entity[i] = new Entity(this).load(list[i]);
        }
    }
}

export class Element {
    constructor() {
        this.id = -1;
        this.name = '';
    }
    /**
     * @returns {Element}
     */
    load(data) {
        this.id = data.id;
        this.name = data.name;
        return this;
    }
}

export class Folder extends Element {
    constructor() {
        super();

        /**
         * @type {Array<File>}
         */
        this.file = [];
    }
    /**
     * @returns {Folder}
     */
    load(data) {
        super.load(data);
        let i = 0, list = data.file;
        for (i = 0; i < list.length; i++) {
            this.file.push(new File().load(list[i]));
        }
        return this;
    }
}

export class File extends Element {
    constructor() {
        super();

        /**
         * @type {number}
         */
        this.pivot_x = 0;
        /**
         * @type {number}
         */
        this.pivot_y = 1;

        /**
         * @type {number}
         */
        this.width = 0;
        /**
         * @type {number}
         */
        this.height = 0;
    }
    /**
     * @returns {File}
     */
    load(data) {
        super.load(data);
        this.pivot_x = data.pivot_x;
        this.pivot_y = data.pivot_y;
        this.width = data.width;
        this.height = data.height;
        return this;
    }
}

export class Entity extends Element {
    constructor(spriter) {
        super();

        /**
         * @type {Model}
         */
        this.spriter = spriter;

        /**
         * @type {Array<ObjectInfo>}
         */
        this.obj_info = [];

        /**
         * @type {Array<CharacterMap>}
         */
        this.character_map = [];

        /**
         * @type {Array<Animation>}
         */
        this.animation = [];
        this.animation_tabel = {};
    }
    /**
     * @returns {Entity}
     */
    load(data) {
        super.load(data);
        let i = 0, list = data.obj_info;
        for (i = 0; i < list.length; i++) {
            this.obj_info.push(new ObjectInfo().load(list[i]));
        }
        list = data.character_map;
        for (i = 0; i < list.length; i++) {
            this.character_map.push(new CharacterMap().load(list[i]));
        }
        list = data.animation; let anim;
        for (i = 0; i < list.length; i++) {
            anim = new Animation(this).load(list[i]);
            this.animation.push(anim);
            this.animation_tabel[anim.name] = anim;
        }
        return this;
    }
    /**
     * @returns {any}
     */
    get_animations() {
        return this.animation_tabel;
    }
}

export class ObjectInfo extends Element {
    constructor() {
        super();

        /**
         * @type {number}
         */
        this.type = ObjectType.sprite;

        /**
         * @type {number}
         */
        this.w = 0;

        /**
         * @type {number}
         */
        this.h = 0;

        /**
         * @type {number}
         */
        this.pivot_x = 0;

        /**
         * @type {number}
         */
        this.pivot_y = 0;
    }
    /**
     * @returns {ObjectInfo}
     */
    load(data) {
        super.load(data);
        this.type = data.type;
        this.w = data.w;
        this.h = data.h;
        this.pivot_x = data.pivot_x;
        this.pivot_y = data.pivot_y;
        return this;
    }
}

export class Animation extends Element {
    constructor(entity) {
        super();

        /**
         * @type {Entity}
         */
        this.entity = entity;

        /**
         * @type {number}
         */
        this.length = 0;

        /**
         * @type {boolean}
         */
        this.looping = true;

        /**
         * @type {Array<MainlineKey>}
         */
        this.mainline = [];

        /**
         * @type {Array<Timeline>}
         */
        this.timeline = [];
    }
    /**
     * @returns {Animation}
     */
    load(data) {
        super.load(data);
        this.length = data.length;
        if (data.looping !== undefined) {
            this.looping = data.looping;
        }
        let i = 0, list = data.mainline.key;
        for (i = 0; i < list.length; i++) {
            this.mainline.push(new MainlineKey().load(list[i]));
        }
        list = data.timeline;
        for (i = 0; i < list.length; i++) {
            this.timeline.push(new Timeline().load(list[i]));
        }
        return this;
    }
}

export class Key extends Element {
    constructor() {
        super();

        /**
         * @type {number}
         */
        this.time = 0;

        /**
         * @type {number}
         */
        this.curve_type = CurveType.linear;

        /**
         * @type {number}
         */
        this.c1 = 0;

        /**
         * @type {number}
         */
        this.c2 = 0;

        /**
         * @type {number}
         */
        this.c3 = 0;

        /**
         * @type {number}
         */
        this.c4 = 0;
    }
    /**
     * @returns {Key}
     */
    load(data) {
        super.load(data);
        if (data.time !== undefined) {
            this.time = data.time;
        }
        if (data.curve_type !== undefined) {
            this.curve_type = data.curve_type;
        }
        if (data.c1 !== undefined) {
            this.c1 = data.c1;
        }
        if (data.c2 !== undefined) {
            this.c2 = data.c2;
        }
        if (data.c3 !== undefined) {
            this.c3 = data.c3;
        }
        if (data.c4 !== undefined) {
            this.c4 = data.c4;
        }
        return this;
    }
}

export class MainlineKey extends Key {
    constructor() {
        super();

        /**
         * @type {Array<Ref>}
         */
        this.bone_ref = [];

        /**
         * @type {Array<ObjectRef>}
         */
        this.object_ref = [];
    }
    /**
     * @returns {MainlineKey}
     */
    load(data) {
        super.load(data);
        let i = 0, list = data.bone_ref;
        for (i = 0; i < list.length; i++) {
            this.bone_ref.push(new Ref().load(list[i]));
        }
        list = data.object_ref;
        for (i = 0; i < list.length; i++) {
            this.object_ref.push(new ObjectRef().load(list[i]));
        }
        return this;
    }
}

export class Ref extends Element {
    constructor() {
        super();

        /**
         * @type {number}
         */
        this.parent = -1;

        /**
         * @type {number}
         */
        this.timeline = -1;

        /**
         * @type {number}
         */
        this.key = -1;
    }
    /**
     * @returns {Ref}
     */
    load(data) {
        super.load(data);
        this.parent = data.parent;
        this.timeline = data.timeline;
        this.key = data.key;
        return this;
    }
}

export class ObjectRef extends Ref {
    constructor() {
        super();

        this.z_index = 0;
    }
    /**
     * @returns {ObjectRef}
     */
    load(data) {
        super.load(data);
        this.z_index = data.z_index;
        return this;
    }
}

export class Timeline extends Element {
    constructor() {
        super();

        /**
         * @type {number}
         */
        this.object_type = ObjectType.sprite;

        /**
         * @type {number}
         */
        this.obj = -1;

        /**
         * @type {Array<TimelineKey>}
         */
        this.key = [];
    }
    /**
     * @returns {Timeline}
     */
    load(data) {
        super.load(data);
        if (data.object_type) {
            this.object_type = data.object_type;
        }
        this.obj = data.obj;
        let i = 0, list = data.key;
        for (i = 0; i < list.length; i++) {
            this.key.push(new TimelineKey().load(list[i]));
        }
        return this;
    }
}

export class TimelineKey extends Key {
    constructor() {
        super();

        /**
         * @type {number}
         */
        this.spin = 1;

        /**
         * @type {Spatial}
         */
        this.bone = null;

        /**
         * @type {Obj}
         */
        this.object = null;
    }
    /**
     * @returns {TimelineKey}
     */
    load(data) {
        super.load(data);
        this.spin = data.spin;
        if (data.bone) {
            this.bone = new Spatial().load(data.bone);
        }
        if (data.object) {
            this.object = new Obj().load(data.object);
        }
        return this;
    }
}

export class Spatial {
    constructor() {
        /**
         * @type {number}
         */
        this.x = 0;

        /**
         * @type {number}
         */
        this.y = 0;

        /**
         * @type {number}
         */
        this.angle = 0;

        /**
         * @type {number}
         */
        this.scale_x = 1;

        /**
         * @type {number}
         */
        this.scale_y = 1;

        /**
         * @type {number}
         */
        this.a = 1;
    }
    /**
     * @returns {Spatial}
     */
    load(data) {
        if (data.x !== undefined) {
            this.x = data.x;
        }
        if (data.y !== undefined) {
            this.y = data.y;
        }
        if (data.angle !== undefined) {
            this.angle = data.angle;
        }
        if (data.scale_x !== undefined) {
            this.scale_x = data.scale_x;
        }
        if (data.scale_y !== undefined) {
            this.scale_y = data.scale_y;
        }
        if (data.a !== undefined) {
            this.a = data.a;
        }
        return this;
    }
    /**
     * @param {Spatial} a
     * @param {Spatial} b
     * @param {number} factor
     * @param {number} spin
     */
    interpolate(a, b, factor, spin) {
        this.angle = angle_linear(a.angle, b.angle, spin, factor);
        this.x = linear(a.x, b.x, factor);
        this.y = linear(a.y, b.y, factor);
        this.scale_x = linear(a.scale_x, b.scale_x, factor);
        this.scale_y = linear(a.scale_y, b.scale_y, factor);
    }
    /**
     * @param {Spatial} source
     */
    copy_spatial(source) {
        this.a = source.a;
        this.angle = source.angle;
        this.scale_x = source.scale_x;
        this.scale_y = source.scale_y;
        this.x = source.x;
        this.y = source.y;
    }
    /**
     * @param {Spatial} parent
     */
    apply_parent_transform(parent) {
        let px = parent.scale_x * this.x;
        let py = parent.scale_y * this.y;
        let angle_rad = parent.angle * DegToRad;
        let s = Math.sin(angle_rad);
        let c = Math.cos(angle_rad);

        this.x = px * c - py * s + parent.x;
        this.y = px * s + py * c + parent.y;
        this.scale_x *= parent.scale_x;
        this.scale_y *= parent.scale_y;
        this.angle = parent.angle + Math.sign(parent.scale_x * parent.scale_y) * this.angle;
        this.angle %= 360;
    }
}

export class Obj extends Spatial {
    constructor() {
        super();

        /**
         * @type {number}
         */
        this.animation = -1;

        /**
         * @type {number}
         */
        this.entity = 0;

        /**
         * @type {number}
         */
        this.folder = 0;

        /**
         * @type {number}
         */
        this.file = 0;

        /**
         * @type {number}
         */
        this.pivot_x = NaN;

        /**
         * @type {number}
         */
        this.pivot_y = NaN;

        /**
         * @type {number}
         */
        this.t = 0;
    }
    /**
     * @returns {Obj}
     */
    load(data) {
        super.load(data);
        if (data.animation !== undefined) {
            this.animation = data.animation;
        }
        if (data.entity !== undefined) {
            this.entity = data.entity;
        }
        if (data.folder !== undefined) {
            this.folder = data.folder;
        }
        if (data.file !== undefined) {
            this.file = data.file;
        }
        if (data.pivot_x !== undefined) {
            this.pivot_x = data.pivot_x;
        }
        if (data.pivot_y !== undefined) {
            this.pivot_y = data.pivot_y;
        }
        if (data.t !== undefined) {
            this.t = data.t;
        }
        return this;
    }
    /**
     * @param {Obj} a
     * @param {Obj} b
     * @param {number} factor
     * @param {number} spin
     */
    interpolate(a, b, factor, spin) {
        this.angle = angle_linear(a.angle, b.angle, spin, factor);
        this.a = linear(a.a, b.a, factor);
        this.x = linear(a.x, b.x, factor);
        this.y = linear(a.y, b.y, factor);
        this.scale_x = linear(a.scale_x, b.scale_x, factor);
        this.scale_y = linear(a.scale_y, b.scale_y, factor);
        this.pivot_x = a.pivot_x;
        this.pivot_y = a.pivot_y;
        this.file = a.file;
        this.folder = a.folder;
        this.entity = a.entity;
        this.animation = a.animation;
        this.t = linear(a.t, b.t, factor);
    }
    /**
     * @param {Obj} source
     */
    copy_obj(source) {
        this.copy_spatial(source);

        this.animation = source.animation;
        this.entity = source.entity;
        this.file = source.file;
        this.folder = source.folder;
        this.pivot_x = source.pivot_x;
        this.pivot_y = source.pivot_y;
        this.t = source.t;
    }
}

export class CharacterMap extends Element {
    constructor() {
        super();

        /**
         * @type {Array<MapInstruction>}
         */
        this.map = [];
    }
    /**
     * @returns {CharacterMap}
     */
    load(data) {
        super.load(data);
        let i = 0, list = data.map;
        for (i = 0; i < list.length; i++) {
            this.map.push(new MapInstruction().load(list[i]));
        }
        return this;
    }
}

export class MapInstruction {
    constructor() {
        /**
         * @type {number}
         */
        this.folder = -1;

        /**
         * @type {number}
         */
        this.file = -1;

        /**
         * @type {number}
         */
        this.target_folder = -1;

        /**
         * @type {number}
         */
        this.target_file = -1;
    }
    /**
     * @returns {MapInstruction}
     */
    load(data) {
        this.folder = data.folder;
        this.file = data.file;
        this.target_folder = data.target_folder;
        this.target_file = data.target_file;
        return this;
    }
}
