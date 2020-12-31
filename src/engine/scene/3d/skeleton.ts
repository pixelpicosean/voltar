import { node_class_map } from "engine/registry";
import { CMP_EPSILON } from "engine/core/math/math_defs";
import { Transform } from "engine/core/math/transform";
import { GDCLASS } from "engine/core/v_object";
import { MessageQueue } from "engine/core/message_queue";

import { VSG } from "engine/servers/visual/visual_server_globals";

import {
    NOTIFICATION_UPDATE_SKELETON,
} from "../const";
import { Skin } from "../resources/skin";
import {
    Spatial,
} from "./spatial";

export class SkinReference {
    skeleton_node: Skeleton = null;

    skeleton: import('engine/drivers/webgl/rasterizer_storage').Skeleton_t = null;
    skin: Skin = null;

    bind_count = 0;
    skeleton_version = 0;
    skin_bone_indices: number[] = [];

    _skin_changed() {
        if (this.skeleton_node) {
            this.skeleton_node._make_dirty();
        }
        this.skeleton_version = 0;
    }
}

class Bone {
    static create() {
        let b = Bone_pool.pop();
        if (!b) b = new Bone;
        return b.init();
    }
    /** @param {Bone} b */
    static free(b: Bone) {
        Bone_pool.push(b);
    }

    rest = new Transform;
    custom_pose = new Transform;
    pose = new Transform;
    pose_global = new Transform;
    global_pose_override = new Transform;

    nodes_bound: Spatial[] = [];

    name = '';

    enabled = true;
    parent = -1;
    sort_index = 0;

    disable_rest = false;

    custom_pose_enable = false;
    global_pose_override_amount = 0;
    global_pose_override_rest = false;

    init() {
        this.name = '';

        this.enabled = true;
        this.parent = -1;
        this.sort_index = 0;

        this.disable_rest = false;
        this.rest.set(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0);

        this.pose.set(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0);
        this.pose_global.set(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0);

        this.custom_pose_enable = false;
        this.global_pose_override_amount = 0;
        this.global_pose_override_rest = false;
        this.global_pose_override.set(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0);

        this.nodes_bound.length = 0;

        return this;
    }
}
/** @type {Bone[]} */
const Bone_pool: Bone[] = [];

export class Skeleton extends Spatial {
    get class() { return "Skeleton" }

    is_skeleton = true;

    skin_bindings: SkinReference[] = [];

    bones: Bone[] = [];
    process_order: number[] = [];
    process_order_dirty = false;

    dirty = false;

    version = 0;

    set_bone_pose(p_bone: number, p_pose: Transform) {
        this.bones[p_bone].pose.copy(p_pose);
        if (this.is_inside_tree()) {
            this._make_dirty();
        }
    }

    /**
     * @param {string} p_name
     */
    find_bone(p_name: string) {
        for (let i = 0; i < this.bones.length; i++) {
            if (this.bones[i].name === p_name) return i;
        }
        return -1;
    }

    /**
     * @param {Skin} p_skin
     */
    register_skin(p_skin: Skin) {
        for (let E of this.skin_bindings) {
            if (E.skin === p_skin) {
                return E;
            }
        }

        if (!p_skin) {
            p_skin = new Skin;
            p_skin.set_bind_count(this.bones.length);
            this._update_process_order();

            let len = this.bones.length;
            let order = this.process_order;

            let pose = Transform.create();

            for (let i = 0; i < len; i++) {
                let b = this.bones[order[i]];
                if (b.parent >= 0) {
                    pose.copy(p_skin.binds[b.parent].pose);
                    p_skin.set_bind_pose(order[i], pose.append(b.rest));
                } else {
                    p_skin.set_bind_pose(order[i], b.rest);
                }
            }

            for (let i = 0; i < len; i++) {
                p_skin.set_bind_bone(i, i);
                pose.copy(p_skin.binds[i].pose);
                p_skin.set_bind_pose(i, pose.affine_invert());
            }

            Transform.free(pose);
        }

        let skin_ref = new SkinReference;
        skin_ref.skeleton_node = this;
        skin_ref.bind_count = 0;
        skin_ref.skeleton = VSG.storage.skeleton_create();
        skin_ref.skin = p_skin;

        this.skin_bindings.push(skin_ref);
        this._make_dirty();
        return skin_ref;
    }

    /* virtual method */

    _load_data(data: any) {
        super._load_data(data);

        if (data.bones) {
            for (let i = 0; i < data.bones.length; i++) {
                let b_data = data.bones[i];

                let b = Bone.create();

                b.name = b_data.name;
                b.parent = b_data.parent;
                b.enabled = b_data.enabled;
                b.rest.from_array(b_data.rest);
                if (b_data.pose) {
                    b.pose.from_array(b_data.pose);
                }

                let children = b_data.bound_children;
                for (let i = 0; i < children.length; i++) {
                    let node = this.get_node_or_null(children[i]) as Spatial;
                    if (node && b.nodes_bound.indexOf(node) < 0) {
                        b.nodes_bound.push(node);
                    }
                }

                this.bones.push(b);
                this.version++;
            }

            this.process_order_dirty = true;
            this._make_dirty();
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
        if (p_what === NOTIFICATION_UPDATE_SKELETON) {
            this._update_process_order();

            let len = this.bones.length;

            let pose = Transform.create();
            let t = Transform.create();
            for (let i = 0; i < len; i++) {
                let b = this.bones[this.process_order[i]];

                if (b.global_pose_override_amount >= 0.999) {
                    b.pose_global.copy(b.global_pose_override);
                } else {
                    if (b.disable_rest) {
                        if (b.enabled) {
                            if (b.custom_pose_enable) {
                                pose.copy(b.custom_pose).append(b.pose);
                            } else {
                                pose.copy(b.pose);
                            }
                            if (b.parent >= 0) {
                                b.pose_global.copy(this.bones[b.parent].pose_global).append(pose);
                            } else {
                                b.pose_global.copy(pose);
                            }
                        } else {
                            if (b.parent >= 0) {
                                b.pose_global.copy(this.bones[b.parent].pose_global);
                            } else {
                                b.pose_global.identity();
                            }
                        }
                    } else {
                        if (b.enabled) {
                            if (b.custom_pose_enable) {
                                pose.copy(b.custom_pose).append(b.pose);
                            } else {
                                pose.copy(b.pose);
                            }
                            if (b.parent >= 0) {
                                t.copy(b.rest).append(pose);
                                b.pose_global.copy(this.bones[b.parent].pose_global).append(t);
                            } else {
                                b.pose_global.copy(b.rest).append(pose);
                            }
                        } else {
                            if (b.parent >= 0) {
                                b.pose_global.copy(this.bones[b.parent].pose_global).append(b.rest);
                            } else {
                                b.pose_global.copy(b.rest);
                            }
                        }
                    }

                    if (b.global_pose_override_amount >= CMP_EPSILON) {
                        b.pose_global.interpolate_with(b.global_pose_override, b.global_pose_override_amount);
                    }
                }

                if (b.global_pose_override_rest) {
                    b.global_pose_override_amount = 0;
                }

                for (let i = 0; i < b.nodes_bound.length; i++) {
                    b.nodes_bound[i].set_transform(b.pose_global);
                }
            }

            // update skins
            for (let i = 0; i < this.skin_bindings.length; i++) {
                let skin_ref = this.skin_bindings[i];
                let skin = skin_ref.skin;
                let skeleton = skin_ref.skeleton;
                let bind_count = skin.binds.length;

                if (skin_ref.bind_count !== bind_count) {
                    VSG.storage.skeleton_allocate(skeleton, bind_count);
                    skin_ref.bind_count = bind_count;
                    skin_ref.skin_bone_indices.length = bind_count;
                }

                if (skin_ref.skeleton_version !== this.version) {
                    for (let i = 0; i < bind_count; i++) {
                        let bind_name = skin.binds[i].name;
                        if (bind_name) {
                            let found = false;
                            for (let j = 0; j < len; j++) {
                                if (this.bones[j].name === bind_name) {
                                    skin_ref.skin_bone_indices[i] = j;
                                    found = true;
                                    break;
                                }
                            }

                            if (!found) {
                                console.error(`Skin bind #${i} contains named bind "${bind_name}" but Skeleton has no bone by that name.`);
                                skin_ref.skin_bone_indices[i] = 0;
                            }
                        } else if (skin.binds[i].bone >= 0) {
                            let bind_index = skin.binds[i].bone;
                            if (bind_index >= len) {
                                console.error(`Skin bind #${i} contains bone index bind: ${bind_index}, which is greater than the skeleton bone count: ${len}.`);
                                skin_ref.skin_bone_indices[i] = 0;
                            } else {
                                skin_ref.skin_bone_indices[i] = bind_index;
                            }
                        } else {
                            console.error(`Skin bind #${i} does not contain a name nor a bone index.`);
                            skin_ref.skin_bone_indices[i] = 0;
                        }
                    }

                    skin_ref.skeleton_version = this.version;
                }

                let xform = Transform.create();
                for (let i = 0; i < bind_count; i++) {
                    let bone_index = skin_ref.skin_bone_indices[i];
                    xform.copy(this.bones[bone_index].pose_global).append(skin.binds[i].pose);
                    VSG.storage.skeleton_bone_set_transform(skeleton, i, xform);
                }
                Transform.free(xform);
            }

            this.dirty = false;

            Transform.free(t);
            Transform.free(pose);
        }
    }

    _make_dirty() {
        if (this.dirty) return;

        MessageQueue.get_singleton().push_notification(this, NOTIFICATION_UPDATE_SKELETON);
        this.dirty = true;
    }

    _update_process_order() {
        if (!this.process_order_dirty) return;

        let bones = this.bones;
        let len = bones.length;

        this.process_order.length = len;
        let order = this.process_order;
        for (let i = 0; i < len; i++) {
            if (bones[i].parent >= len) {
                console.error(`Bone ${i} has invalid parent: ${bones[i].parent}`);
                bones[i].parent = -1;
            }
            order[i] = i;
            bones[i].sort_index = i;
        }

        let pass_count = 0;
        while (pass_count < len * len) {
            let swapped = false;
            for (let i = 0; i < len; i++) {
                let parent_idx = bones[order[i]].parent;
                if (parent_idx < 0) {
                    continue;
                }
                let parent_order = bones[parent_idx].sort_index;
                if (parent_order > i) {
                    bones[order[i]].sort_index = parent_order;
                    bones[parent_idx].sort_index = i;
                    let t = order[i];
                    order[i] = order[parent_order];
                    order[parent_order] = t;
                    swapped = true;
                }
            }

            if (!swapped) break;
            pass_count++;
        }

        if (pass_count == len * len) {
            console.error('Skeleton parenthood graph is cyclic');
        }

        this.process_order_dirty = false;
    }
}
node_class_map["Skeleton"] = GDCLASS(Skeleton, Spatial);
