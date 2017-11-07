import { linear, angle_linear, PI, PI2, DegToRad } from './math';

export const ObjectType = {
    sprite: 1,
    bone: 2,
    box: 3,
    point: 4,
    sound: 5,
    entity: 6,
    variable: 7,
};

export const CurveType = {
    linear: 1,
    instant: 2,
    quadratic: 3,
    cubic: 4,
    quartic: 5,
    quintic: 6,
    bezier: 7,
};

export class Model {
    constructor(data) {
        /**
         * @type {Array<Folder>}
         */
        this.folder = data.folder.map(d => new Folder(d));
        /**
         * @type {Array<Entity>}
         */
        this.entity = data.entity.map(d => new Entity(this, d));
    }
}

export class Element {
    constructor(data) {
        /**
         * @type {number}
         */
        this.id = data.id;
        /**
         * @type {string}
         */
        this.name = data.name;
    }
}

export class Folder extends Element {
    constructor(data) {
        super(data);

        /**
         * @type {Array<File>}
         */
        this.file = data.file.map(d => new File(d));
    }
}

export class File extends Element {
    constructor(data) {
        super(data);

        /**
         * @type {number}
         */
        this.pivot_x = data.pivot_x;
        /**
         * @type {number}
         */
        this.pivot_y = data.pivot_y;

        /**
         * @type {number}
         */
        this.width = data.width;
        /**
         * @type {number}
         */
        this.height = data.height;
    }
}

export class Entity extends Element {
    constructor(spriter, data) {
        super(data);

        /**
         * @type {Model}
         */
        this.spriter = spriter;

        /**
         * @type {Array<ObjectInfo>}
         */
        this.obj_info = data.obj_info.map(d => new ObjectInfo(d));

        /**
         * @type {Array<CharacterMap>}
         */
        this.character_map = data.character_map.map(d => new CharacterMap(d));

        /**
         * @type {{[name: string]: Animation}}
         */
        this.animation_tabel = {};
        /**
         * @type {Array<Animation>}
         */
        this.animation = data.animation.map(a => {
            let anim = new Animation(this, a);
            this.animation_tabel[anim.name] = anim;
            return anim;
        });
    }
    /**
     * @returns {any}
     */
    get_animations() {
        return this.animation_tabel;
    }
}

export class ObjectInfo extends Element {
    constructor(data) {
        super(data);

        /**
         * @type {number}
         */
        this.type = data.type;

        /**
         * @type {number}
         */
        this.w = data.w;

        /**
         * @type {number}
         */
        this.h = data.h;

        /**
         * @type {number}
         */
        this.pivot_x = data.pivot_x;

        /**
         * @type {number}
         */
        this.pivot_y = data.pivot_y;
    }
}

export class Animation extends Element {
    constructor(entity, data) {
        super(data);

        /**
         * @type {Entity}
         */
        this.entity = entity;

        /**
         * @type {number}
         */
        this.length = data.length;

        /**
         * @type {boolean}
         */
        this.looping = (data.looping !== undefined) ? data.looping : true;

        /**
         * @type {Array<MainlineKey>}
         */
        this.mainline = data.mainline.key.map(d => new MainlineKey(d));

        /**
         * @type {Array<Timeline>}
         */
        this.timeline = data.timeline.map(d => new Timeline(d));
    }
}

export class Key extends Element {
    constructor(data) {
        super(data);

        /**
         * @type {number}
         */
        this.time = (data.time !== undefined) ? data.time : 0;

        /**
         * @type {number}
         */
        this.curve_type = (data.curve_type !== undefined) ? data.curve_type : CurveType.linear;

        /**
         * @type {number}
         */
        this.c1 = (data.c1 !== undefined) ? data.c1 : 0;

        /**
         * @type {number}
         */
        this.c2 = (data.c2 !== undefined) ? data.c2 : 0;

        /**
         * @type {number}
         */
        this.c3 = (data.c3 !== undefined) ? data.c3 : 0;

        /**
         * @type {number}
         */
        this.c4 = (data.c4 !== undefined) ? data.c4 : 0;
    }
}

export class MainlineKey extends Key {
    constructor(data) {
        super(data);

        /**
         * @type {Array<Ref>}
         */
        this.bone_ref = data.bone_ref.map(d => new Ref(d));

        /**
         * @type {Array<ObjectRef>}
         */
        this.object_ref = data.object_ref.map(d => new ObjectRef(d));
    }
}

export class Ref extends Element {
    constructor(data) {
        super(data);

        /**
         * @type {number}
         */
        this.parent = data.parent;

        /**
         * @type {number}
         */
        this.timeline = data.timeline;

        /**
         * @type {number}
         */
        this.key = data.key;
    }
}

export class ObjectRef extends Ref {
    constructor(data) {
        super(data);

        this.z_index = data.z_index;
    }
}

export class Timeline extends Element {
    constructor(data) {
        super(data);

        /**
         * @type {number}
         */
        this.object_type = (data.object_type !== undefined) ? data.object_type : ObjectType.sprite;

        /**
         * @type {number}
         */
        this.obj = data.obj;

        /**
         * @type {Array<TimelineKey>}
         */
        this.key = data.key.map(d => new TimelineKey(d));
    }
}

export class TimelineKey extends Key {
    constructor(data) {
        super(data);

        /**
         * @type {number}
         */
        this.spin = data.spin;

        /**
         * @type {Spatial}
         */
        this.bone = null;
        if (data.bone !== undefined) {
            // Convert angle from degree to radians
            data.bone.angle *= DegToRad;
            this.bone = new Spatial().init(data.bone);
        }

        /**
         * @type {Obj}
         */
        this.object = null;
        if (data.object !== undefined) {
            // Convert angle from degree to radians
            data.object.angle *= DegToRad;
            this.object = new Obj().init(data.object);
        }
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
    init(data = {}) {
        this.x = (data.x !== undefined) ? data.x : 0;
        this.y = (data.y !== undefined) ? data.y : 0;
        this.angle = (data.angle !== undefined) ? data.angle : 0;
        this.scale_x = (data.scale_x !== undefined) ? data.scale_x : 1;
        this.scale_y = (data.scale_y !== undefined) ? data.scale_y : 1;
        this.a = (data.a !== undefined) ? data.a : 1;
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
     * @param {Spatial} parent
     */
    apply_parent_transform(parent) {
        let px = parent.scale_x * this.x;
        let py = parent.scale_y * this.y;
        let c = Math.cos(parent.angle);
        let s = Math.sin(parent.angle);

        this.x = px * c - py * s + parent.x;
        this.y = px * s + py * c + parent.y;
        this.scale_x *= parent.scale_x;
        this.scale_y *= parent.scale_y;
        this.angle = parent.angle + Math.sign(parent.scale_x * parent.scale_y) * this.angle;
        this.angle %= PI2;
    }
    /**
     * @param {Spatial} source
     * @returns {Spatial}
     */
    copy(source) {
        this.x = source.x;
        this.y = source.y;
        this.angle = source.angle;
        this.scale_x = source.scale_x;
        this.scale_y = source.scale_y;
        this.a = source.a;
        return this;
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
        this.pivot_x = 0;

        /**
         * @type {number}
         */
        this.pivot_y = 1;

        /**
         * @type {number}
         */
        this.t = 0;
    }
    init(data = {}) {
        super.init(data);
        this.animation = (data.animation !== undefined) ? data.animation : -1;
        this.entity = (data.entity !== undefined) ? data.entity : 0;
        this.folder = (data.folder !== undefined) ? data.folder : 0;
        this.file = (data.file !== undefined) ? data.file : 0;
        this.pivot_x = (data.pivot_x !== undefined) ? data.pivot_x : 0;
        this.pivot_y = (data.pivot_y !== undefined) ? data.pivot_y : 1;
        this.t = (data.t !== undefined) ? data.t : 0;
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
     * @returns {Obj}
     */
    copy(source) {
        super.copy(source);

        this.animation = source.animation;
        this.entity = source.entity;
        this.file = source.file;
        this.folder = source.folder;
        this.pivot_x = source.pivot_x;
        this.pivot_y = source.pivot_y;
        this.t = source.t;

        return this;
    }
}

export class CharacterMap extends Element {
    constructor(data) {
        super(data);

        /**
         * @type {Array<MapInstruction>}
         */
        this.map = data.map.map(d => new MapInstruction(d));
    }
}

export class MapInstruction {
    constructor(data) {
        /**
         * @type {number}
         */
        this.folder = data.folder;

        /**
         * @type {number}
         */
        this.file = data.file;

        /**
         * @type {number}
         */
        this.target_folder = data.target_folder;

        /**
         * @type {number}
         */
        this.target_file = data.target_file;
    }
}
