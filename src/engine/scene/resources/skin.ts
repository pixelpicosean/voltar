import { GDCLASS } from "engine/core/v_object";
import { res_class_map } from "engine/registry";
import { Resource } from "engine/core/resource";
import { Transform } from "engine/core/math/transform.js";

class Bind {
    pose = new Transform;
    bone = -1;
    name = "";

    reset() {
        this.bone = -1;
        this.name = "";
        this.pose.identity();
        return this;
    }
}

const pool_Bind: Bind[] = [];
function Bind_create() {
    let bind = pool_Bind.pop();
    if (!bind) {
        bind = new Bind;
    }
    return bind.reset();
}
/**
 * @param {Bind} bind
 */
function Bind_free(bind: Bind) {
    pool_Bind.push(bind);
}

export class Skin extends Resource {
    get class() { return "Skin" }

    binds: Bind[] = [];

    _load_data(data: any) {
        for (let i = 0; i < data.binds.length; i++) {
            let b = data.binds[i];

            let bind = this.binds[i] = Bind_create();
            bind.bone = b.bone;
            bind.name = b.name;
            bind.pose.from_array(b.pose);
        }
        return this;
    }

    /**
     * @param {number} p_size
     */
    set_bind_count(p_size: number) {
        this.binds.length = p_size;
        for (let i = 0; i < p_size; i++) {
            if (!this.binds[i]) {
                this.binds[i] = Bind_create();
            }
        }
    }

    /**
     * @param {number} p_index
     * @param {number} p_bone
     */
    set_bind_bone(p_index: number, p_bone: number) {
        this.binds[p_index].bone = p_bone;
    }

    /**
     * @param {number} p_index
     * @param {Transform} p_pose
     */
    set_bind_pose(p_index: number, p_pose: Transform) {
        this.binds[p_index].pose.copy(p_pose);
    }
}

res_class_map["Skin"] = GDCLASS(Skin, Resource);
