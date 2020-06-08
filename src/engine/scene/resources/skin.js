import { GDCLASS } from "engine/core/v_object";
import { Resource } from "engine/core/resource";
import { Transform } from "engine/core/math/transform";

class Bind {
    constructor() {
        this.pose = new Transform;
        this.reset();
    }
    reset() {
        this.bone = -1;
        this.name = "";
        this.pose.identity();
        return this;
    }
}

/** @type {Bind[]} */
const Bind_pool = [];
function Bind_new() {
    let bind = Bind_pool.pop();
    if (!bind) {
        bind = new Bind;
    }
    return bind.reset();
}
/**
 * @param {Bind} bind
 */
function Bind_free(bind) {
    Bind_pool.push(bind);
}

export class Skin extends Resource {
    get class() { return "Skin" }
    constructor() {
        super();

        /** @type {Bind[]} */
        this.binds = [];
    }

    /**
     * @param {number} p_size
     */
    set_bind_count(p_size) {
        this.binds.length = p_size;
        for (let i = 0; i < p_size; i++) {
            if (!this.binds[i]) {
                this.binds[i] = Bind_new();
            }
        }
    }

    /**
     * @param {number} p_index
     * @param {number} p_bone
     */
    set_bind_bone(p_index, p_bone) {
        this.binds[p_index].bone = p_bone;
    }

    /**
     * @param {number} p_index
     * @param {Transform} p_pose
     */
    set_bind_pose(p_index, p_pose) {
        this.binds[p_index].pose.copy(p_pose);
    }
}

GDCLASS(Skin, Resource)
