import {
    insert_item,
    remove_item,
} from 'engine/dep/index';
import { node_class_map } from 'engine/registry';
import { MessageQueue } from 'engine/core/message_queue';
import {
    VObject,
    GDCLASS,

    NOTIFICATION_POSTINITIALIZE,
    NOTIFICATION_PREDELETE,
} from 'engine/core/v_object';
import { InputEvent } from 'engine/core/os/input_event';
import { Engine } from 'engine/core/engine';
import { Element as List$Element, List } from 'engine/core/list';
import { memdelete } from 'engine/core/os/memory';


export const PAUSE_MODE_INHERIT = 0;
export const PAUSE_MODE_STOP = 1;
export const PAUSE_MODE_PROCESS = 2;

export const NOTIFICATION_ENTER_TREE = 10;
export const NOTIFICATION_EXIT_TREE = 11;
export const NOTIFICATION_MOVED_IN_PARENT = 12;
export const NOTIFICATION_READY = 13;
export const NOTIFICATION_PAUSED = 14;
export const NOTIFICATION_UNPAUSED = 15;
export const NOTIFICATION_PHYSICS_PROCESS = 16;
export const NOTIFICATION_PROCESS = 17;
export const NOTIFICATION_PARENTED = 18;
export const NOTIFICATION_UNPARENTED = 19;
export const NOTIFICATION_INSTANCED = 20;
export const NOTIFICATION_DRAG_BEGIN = 21;
export const NOTIFICATION_DRAG_END = 22;
export const NOTIFICATION_PATH_CHANGED = 23;
export const NOTIFICATION_INTERNAL_PROCESS = 25;
export const NOTIFICATION_INTERNAL_PHYSICS_PROCESS = 26;
export const NOTIFICATION_POST_ENTER_TREE = 27;

const this_stack: number[] = [];
const that_stack: number[] = [];

class GroupData {
    persistent = false;
    group: import('./scene_tree').Group = null;
}

class Data {
    filename: string;

    parent: Node;
    owner: Node;
    children: Node[] = [];
    pos: number;
    depth: number;
    name: string;
    tree: import('./scene_tree').SceneTree;
    inside_tree: boolean;
    ready_notified: boolean;
    ready_first: boolean;

    viewport: import('./viewport').Viewport;

    grouped: { [name: string]: GroupData } = Object.create(null);
    OW: List$Element<Node>;
    owned: List<Node> = new List;

    pause_mode: number;
    pause_owner: Node;

    physics_process: boolean;
    idle_process: boolean;

    physics_process_internal: boolean;
    idle_process_internal: boolean;

    input: boolean;
    unhandled_input: boolean;
    unhandled_key_input: boolean;

    parent_owned: boolean;
    in_constructor: boolean;
    use_placeholder: boolean;

    path_cache: string;
}


export class Node extends VObject {
    static instance() { return new Node }

    static new() {
        const inst = new this;
        inst._init();
        return inst;
    }

    get class() { return 'Node' }

    get filename() { return this.data.filename }
    set_filename(name: string) {
        this.data.filename = name;
    }

    get name() { return this.data.name }
    set_name(p_name: string) {
        this.data.name = p_name;
        if (this.data.parent) {
            this.data.parent._validate_child_name(this);
        }

        this.propagate_notification(NOTIFICATION_PATH_CHANGED);

        if (this.is_inside_tree()) {
            this.emit_signal('renamed');
            this.get_tree().node_renamed(this);
            this.get_tree().tree_changed();
        }
    }

    get owner() { return this.data.owner }
    /**
     * @param {Node} p_owner
     */
    set_owner(p_owner: Node) {
        if (this.data.owner) {
            this.data.owner.data.owned.erase(this.data.OW);
            this.data.OW = null;
            this.data.owner = null;
        }

        if (!p_owner) {
            return;
        }

        let check = this.get_parent();

        while (check) {
            if (check === p_owner) {
                break;
            }

            check = check.data.parent;
        }

        this._set_owner_no_check(p_owner);
    }

    get pause_mode() { return this.data.pause_mode }
    /**
     * @param {number} mode
     */
    set_pause_mode(mode: number) {
        if (this.data.pause_mode === mode) {
            return;
        }
        const prev_inherits = this.data.pause_mode === PAUSE_MODE_INHERIT;
        this.data.pause_mode = mode;
        if (!this.is_inside_tree()) {
            return;
        }
        if ((this.data.pause_mode === PAUSE_MODE_INHERIT) === prev_inherits) {
            return;
        }

        let owner: Node = null;

        if (this.data.pause_mode === PAUSE_MODE_INHERIT) {
            if (this.data.parent) {
                owner = this.data.parent.data.pause_owner;
            }
        } else {
            owner = this;
        }

        this._propagate_pause_owner(owner);
    }

    // Flags to avoid call of `instanceof` for better performance
    is_node = true;
    is_viewport = false;
    is_canvas_item = false;
    is_node_2d = false;
    is_control = false;
    is_spatial = false;
    is_skeleton = false;
    is_collision_object = false;

    _script_ = false;

    data = new Data;

    /* virtuals */

    _init() {
        this.data.pos = -1;
        this.data.depth = -1;
        this.data.parent = null;
        this.data.tree = null;
        this.data.physics_process = false;
        this.data.idle_process = false;
        this.data.physics_process_internal = false;
        this.data.idle_process_internal = false;
        this.data.inside_tree = false;
        this.data.ready_notified = false;

        this.data.owner = null;
        this.data.OW = null;
        this.data.input = false;
        this.data.unhandled_input = false;
        this.data.unhandled_key_input = false;
        this.data.pause_mode = PAUSE_MODE_INHERIT;
        this.data.pause_owner = null;
        this.data.path_cache = null;
        this.data.parent_owned = false;
        this.data.in_constructor = true;
        this.data.viewport = null;
        this.data.use_placeholder = false;
        this.data.ready_first = true;

        orphan_node_count++;
    }
    _free() {
        this.data.grouped = Object.create(null);
        this.data.owned.clear();
        this.data.children.length = 0;

        orphan_node_count--;

        super._free();
    }

    /**
     * @param {any} data
     */
    _load_data(data: any) {
        if (data.filename !== undefined) {
            this.set_filename(data.filename);
        }
        if (data.name !== undefined) {
            this.set_name(data.name);
        }
        if (data.pause_mode !== undefined) {
            this.set_pause_mode(data.pause_mode);
        }

        if (data.groups !== undefined) {
            for (const g of data.groups) {
                this.add_to_group(g);
            }
        }

        return this;
    }

    _enter_tree() { }
    _ready() { }
    _input(event: InputEvent) { }
    _unhandled_input(event: InputEvent) { }
    _unhandled_key_input(event: InputEvent) { }
    _process(delta: number) { }
    _physics_process(delta: number) { }
    _exit_tree() { }

    /* public */

    /**
     * @param {Node} p_node
     */
    is_greater_than(p_node: Node) {
        this_stack.length = this.data.depth;
        that_stack.length = p_node.data.depth;

        /** @type {Node} */
        let n: Node = this;
        let idx = this.data.depth - 1;
        while (n) {
            this_stack[idx--] = n.data.pos;
            n = n.data.parent;
        }
        n = p_node;
        idx = p_node.data.depth - 1;
        while (n) {
            that_stack[idx--] = n.data.pos;
            n = n.data.parent;
        }
        idx = 0;

        let res = false;
        while (true) {
            const this_idx = (idx >= this.data.depth) ? -2 : this_stack[idx];
            const that_idx = (idx >= p_node.data.depth) ? -2 : that_stack[idx];

            if (this_idx > that_idx) {
                res = true;
                break;
            } else if (this_idx < that_idx) {
                res = false;
                break;
            } else if (this_idx === -2) {
                res = false;
                break;
            }
            idx++;
        }

        return res;
    }

    /* private */

    /**
     * @param {Node} p_child
     */
    _validate_child_name(p_child: Node) {
        let unique = true;

        for (let c of this.data.children) {
            if (c === p_child) continue;
            if (c.data.name === p_child.data.name) {
                unique = false;
                break;
            }
        }

        if (!unique) {
            p_child.data.name = `@${p_child.data.name}@${node_hrcr_count++}`;
        }
    }

    _propagate_reverse_notification(p_notification: number) {
        for (let i = this.data.children.length; i >= 0; i--) {
            this.data.children[i]._propagate_reverse_notification(p_notification);
        }

        this.notification(p_notification, true);
    }
    _propagate_deferred_notification(p_notification: number, p_reverse: boolean) {
        if (!p_reverse) {
            MessageQueue.get_singleton().push_notification(this, p_notification);
        }

        for (let c of this.data.children) {
            c._propagate_deferred_notification(p_notification, p_reverse);
        }

        if (p_reverse) {
            MessageQueue.get_singleton().push_notification(this, p_notification);
        }
    }
    _propagate_enter_tree() {
        if (this.data.parent) {
            this.data.tree = this.data.parent.data.tree;
            this.data.depth = this.data.parent.data.depth + 1;
        } else {
            this.data.depth = 1;
        }

        // @ts-ignore
        this.data.viewport = this.is_viewport ? (this as import('./viewport').Viewport) : null;
        if (!this.data.viewport && this.data.parent) {
            this.data.viewport = this.data.parent.data.viewport;
        }

        this.data.inside_tree = true;

        // add to group
        for (let g in this.data.grouped) {
            this.data.grouped[g].group = this.data.tree.add_to_group(g, this);
        }

        this.notification(NOTIFICATION_ENTER_TREE);

        this._enter_tree();

        this.emit_signal('tree_entered', this);

        this.data.tree.node_added(this);

        for (let c of this.data.children) {
            if (!c.is_inside_tree()) {
                c._propagate_enter_tree();
            }
        }
    }
    _propagate_ready() {
        this.data.ready_notified = true;
        for (let c of this.data.children) {
            c._propagate_ready();
        }

        this.notification(NOTIFICATION_POST_ENTER_TREE);

        if (this.data.ready_first) {
            this.data.ready_first = false;
            this.notification(NOTIFICATION_READY);
            this.emit_signal('ready');
        }
    }
    _propagate_exit_tree() {
        for (let i = this.data.children.length - 1; i >= 0; i--) {
            this.data.children[i]._propagate_exit_tree();
        }

        this._exit_tree();

        this.emit_signal('tree_exiting', this);

        this.notification(NOTIFICATION_EXIT_TREE, true);

        if (this.data.tree) {
            this.data.tree.node_removed(this);
        }

        // exit groups
        for (let g in this.data.grouped) {
            this.data.tree.remove_from_group(g, this);
            this.data.grouped[g].group = null;
        }

        this.data.viewport = null;

        if (this.data.tree) {
            this.data.tree.tree_changed();
        }

        this.data.inside_tree = false;
        this.data.ready_notified = false;
        this.data.tree = null;
        this.data.depth = -1;
    }
    _propagate_after_exit_tree() {
        for (let c of this.data.children) {
            c._propagate_after_exit_tree();
        }
        this.emit_signal('tree_exited');
    }
    _propagate_validate_owner() {
        if (this.data.owner) {
            let found = false;
            let parent = this.data.parent;

            while (parent) {
                if (parent === this.data.owner) {
                    found = true;
                    break;
                }
                parent = parent.data.parent;
            }

            if (!found) {
                this.data.owner.data.owned.erase(this.data.OW);
                this.data.owner = null;
            }
        }

        for (const c of this.data.children) {
            c._propagate_validate_owner();
        }
    }

    /**
     * @param {Node} p_owner
     */
    _propagate_pause_owner(p_owner: Node) {
        if (this !== p_owner && this.data.pause_mode !== PAUSE_MODE_INHERIT) {
            return;
        }
        this.data.pause_owner = p_owner;
        for (let c of this.data.children) {
            c._propagate_pause_owner(p_owner);
        }
    }

    _get_children() {
        return this.data.children.slice(0);
    }

    /**
     * @param {string} p_name
     */
    _get_child_by_name(p_name: string) {
        for (let c of this.data.children) {
            if (c.data.name === p_name) return c;
        }
        return null;
    }

    /**
     * @param {import('./scene_tree').SceneTree} p_tree
     */
    _set_tree(p_tree: import('./scene_tree').SceneTree) {
        let tree_changed_a = null;
        let tree_changed_b = null;

        if (this.data.tree) {
            this._propagate_exit_tree();

            tree_changed_a = this.data.tree;
        }

        this.data.tree = p_tree;

        if (this.data.tree) {
            this._propagate_enter_tree();
            if (!this.data.parent || this.data.parent.data.ready_notified) {
                this._propagate_ready();
            }

            tree_changed_b = this.data.tree;
        }

        if (tree_changed_a) {
            tree_changed_a.tree_changed();
        }
        if (tree_changed_b) {
            tree_changed_b.tree_changed();
        }
    }

    /**
     * @virtual
     * @param {number} p_notification
     */
    _notification(p_notification: number) {
        switch (p_notification) {
            case NOTIFICATION_PROCESS: {
                this._process(this.get_process_delta_time());
            } break;
            case NOTIFICATION_PHYSICS_PROCESS: {
                this._physics_process(this.get_physics_process_delta_time());
            } break;
            case NOTIFICATION_ENTER_TREE: {
                if (this.data.pause_mode === PAUSE_MODE_INHERIT) {
                    if (this.data.parent) {
                        this.data.pause_owner = this.data.parent.data.pause_owner;
                    } else {
                        this.data.pause_owner = null;
                    }
                } else {
                    this.data.pause_owner = this;
                }

                if (this.data.input) {
                    this.add_to_group(`_vp_input${this.get_viewport().instance_id}`);
                }
                if (this.data.unhandled_input) {
                    this.add_to_group(`_vp_unhandled_input${this.get_viewport().instance_id}`);
                }
                if (this.data.unhandled_key_input) {
                    this.add_to_group(`_vp_unhandled_key_input${this.get_viewport().instance_id}`);
                }

                this.get_tree().node_count++;
                orphan_node_count--;
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this.get_tree().node_count--;
                orphan_node_count++;

                if (this.data.input) {
                    this.remove_from_group(`_vp_input${this.get_viewport().instance_id}`);
                }
                if (this.data.unhandled_input) {
                    this.remove_from_group(`_vp_unhandled_input${this.get_viewport().instance_id}`);
                }
                if (this.data.unhandled_key_input) {
                    this.remove_from_group(`_vp_unhandled_key_input${this.get_viewport().instance_id}`);
                }

                this.data.pause_owner = null;
                this.data.path_cache = null;
            } break;
            case NOTIFICATION_PATH_CHANGED: {
                this.data.path_cache = null;
            } break;
            case NOTIFICATION_READY: {
                this._ready();
            } break;
            case NOTIFICATION_POSTINITIALIZE: {
                this.data.in_constructor = false;
            } break;
            case NOTIFICATION_PREDELETE: {
                this.set_owner(null);

                while (this.data.owned.size()) {
                    this.data.owned.front().value.set_owner(null);
                }

                if (this.data.parent) {
                    this.data.parent.remove_child(this);
                }

                let children = this.data.children;
                while (children.length > 0) {
                    let child = children[children.length - 1];
                    this.remove_child(child);
                    memdelete(child);
                }
            } break;
        }
    }

    /**
     * @param {Node} p_owner
     * @param {Node} p_by_owner
     */
    _propagate_replace_owner(p_owner: Node, p_by_owner: Node) {
        if (this.owner === p_owner) {
            this.set_owner(p_by_owner);
        }

        for (let c of this.data.children) {
            c._propagate_replace_owner(p_owner, p_by_owner);
        }
    }

    /**
     * @param {Node} p_child
     * @param {string} p_name
     */
    _add_child_no_check(p_child: Node, p_name: string) {
        p_child.data.name = p_name;
        p_child.data.pos = this.data.children.length;
        this.data.children.push(p_child);
        p_child.data.parent = this;
        p_child.notification(NOTIFICATION_PARENTED);

        if (this.data.tree) {
            p_child._set_tree(this.data.tree);
        }

        p_child.data.parent_owned = this.data.in_constructor;
        this.add_child_notify(p_child);
    }
    /**
     * @param {Node} p_owner
     */
    _set_owner_no_check(p_owner: Node) {
        if (this.data.owner === p_owner) {
            return;
        }

        this.data.owner = p_owner;
        p_owner.data.owned.push_back(this);
        this.data.OW = this.data.owner.data.owned.back();
    }
    /**
     * @param {string} p_name
     */
    _set_name_no_check(p_name: string) {
        this.data.name = p_name;
    }

    /**
     * @param {Node} p_child
     */
    add_child(p_child: Node) {
        this._validate_child_name(p_child);
        this._add_child_no_check(p_child, p_child.data.name);
    }
    /**
     * @param {Node} p_node
     * @param {Node} p_child
     */
    add_child_below_node(p_node: Node, p_child: Node) {
        this.add_child(p_child);

        if (p_node.data.parent === this) {
            this.move_child(p_child, p_node.get_position_in_parent() + 1);
        } else {
            console.warn(`Cannot move under node ${p_node.name} as ${p_child.name} does not share a parent.`);
        }
    }
    /**
     * @param {Node} p_child
     */
    remove_child(p_child: Node) {
        const children = this.data.children;
        let child_count = children.length;
        let idx = -1;

        if (p_child.data.pos >= 0 && p_child.data.pos < child_count) {
            if (children[p_child.data.pos] === p_child) {
                idx = p_child.data.pos;
            }
        }

        if (idx === -1) {
            idx = children.indexOf(p_child);
        }

        p_child._set_tree(null);

        this.remove_child_notify(p_child);
        p_child.notification(NOTIFICATION_UNPARENTED);

        remove_item(children, idx);

        // update pointer and size
        child_count = children.length;

        for (let i = idx; i < child_count; i++) {
            children[i].data.pos = i;
            children[i].notification(NOTIFICATION_MOVED_IN_PARENT);
        }

        p_child.data.parent = null;
        p_child.data.pos = -1;

        // validate owner
        p_child._propagate_validate_owner();

        if (this.data.inside_tree) {
            p_child._propagate_after_exit_tree();
        }
    }
    remove_and_skip() {
        let new_owner = this.owner;
        /** @type {List<Node>} */
        let children: List<Node> = new List;

        while (true) {
            let clear = true;
            for (let c_node of this.data.children) {
                if (!c_node.owner) {
                    continue;
                }

                this.remove_child(c_node);
                c_node._propagate_replace_owner(this, null);
                children.push_back(c_node);
                clear = false;
                break;
            }

            if (clear) {
                break;
            }
        }

        while (!children.empty()) {
            let c_node = children.front().value;
            this.data.parent.add_child(c_node);
            c_node._propagate_replace_owner(null, new_owner);
            children.pop_front();
        }

        this.data.parent.remove_child(this);
    }

    get_child_count() {
        return this.data.children.length;
    }
    /**
     * @param {number} p_index
     */
    get_child(p_index: number) {
        return this.data.children[p_index];
    }

    /**
     * @param {string} path
     */
    has_node(path: string) {
        return !!this.get_node_or_null(path);
    }
    /**
     * @param {string} path
     */
    get_node_or_null(path: string) {
        if (!path) return null;

        const list = path.split('/');

        // Find the base node
        let node: Node = /** @type {Node} */ (this);

        let i = 0, l = list.length, name;

        // '/absolute/node/path' start from current scene
        if (list[0].length === 0) {
            node = this.data.tree.current_scene;
            i = 1;
        }

        for (; i < l; i++) {
            name = list[i];
            switch (name) {
                case '.': break;
                case '..': {
                    node = node.data.parent;
                    if (!node) {
                        return null;
                    }
                } break;
                default: {
                    node = node._get_child_by_name(name);
                    if (!node) {
                        return null;
                    }
                } break;
            }
        }

        return node;
    }
    /**
     * @param {string} path
     */
    get_node(path: string) {
        const node = this.get_node_or_null(path);
        if (!node) {
            console.error(`Node not found: ${path}`);
        }
        return node;
    }
    /**
     * @param {string} p_mask
     * @param {boolean} [p_recursive]
     * @param {boolean} [p_owned]
     */
    find_node(p_mask: string, p_recursive: boolean = true, p_owned: boolean = true) {
        // TODO: support Godot like `find_node` behavior
        let ret = this._get_child_by_name(p_mask);
        if (ret) {
            return ret;
        }
        if (p_recursive) {
            for (let c of this.data.children) {
                ret = c.find_node(p_mask, true, p_owned);
                if (ret) {
                    return ret;
                }
            }
        }
        return null;
    }

    get_parent() {
        return this.data.parent;
    }

    get_tree() {
        return this.data.tree;
    }

    is_inside_tree() {
        return this.data.inside_tree;
    }

    /**
     * @param {Node} p_node
     */
    is_a_parent_of(p_node: Node) {
        let p = p_node.data.parent;
        while (p) {
            if (p === this) {
                return true;
            }
            p = p.data.parent;
        }
        return false;
    }

    get_path() {
        if (!this.data.path_cache) {
            return this.data.path_cache;
        }

        /** @type {Node} */
        let n: Node = this;

        /** @type {string[]} */
        let path: string[] = [];

        while (n) {
            path.push(n.name);
            n = n.data.parent;
        }

        path.reverse();

        this.data.path_cache = path.join('/');
    }

    /**
     * @param {string} p_identifier
     * @param {boolean} [p_persistent]
     */
    add_to_group(p_identifier: string, p_persistent: boolean = false) {
        if (p_identifier in this.data.grouped) {
            return;
        }

        let gd = new GroupData;

        if (this.data.tree) {
            gd.group = this.data.tree.add_to_group(p_identifier, this);
        } else {
            gd.group = null;
        }

        gd.persistent = p_persistent;

        this.data.grouped[p_identifier] = gd;
    }
    /**
     * @param {string} p_identifier
     */
    remove_from_group(p_identifier: string) {
        if (this.data.tree) {
            this.data.tree.remove_from_group(p_identifier, this);
        }

        delete this.data.grouped[p_identifier];
    }
    /**
     * @param {string} p_identifier
     */
    is_in_group(p_identifier: string) {
        return p_identifier in this.data.grouped;
    }
    get_groups() {
        return Object.keys(this.data.grouped);
    }
    get_persistent_group_count() {
        let count = 0;
        for (let g in this.data.grouped) {
            if (this.data.grouped[g].persistent) {
                count += 1;
            }
        }
        return count;
    }

    /**
     * @param {Node} p_child
     * @param {number} p_pos
     */
    move_child(p_child: Node, p_pos: number) {
        if (p_pos === this.data.children.length) {
            p_pos--;
        }

        if (p_child.data.pos === p_pos) {
            return;
        }

        const motion_from = Math.min(p_pos, p_child.data.pos);
        const motion_to = Math.max(p_pos, p_child.data.pos);

        remove_item(this.data.children, p_child.data.pos);
        insert_item(this.data.children, p_pos, p_child);

        if (this.data.tree) {
            this.data.tree.tree_changed();
        }

        for (let i = motion_from; i <= motion_to; i++) {
            this.data.children[i].data.pos = i;
        }
        this.move_child_notify(p_child);
        for (let i = motion_from; i <= motion_to; i++) {
            this.data.children[i].notification(NOTIFICATION_MOVED_IN_PARENT);
        }
        for (let g in this.data.grouped) {
            if (this.data.grouped[g] && this.data.grouped[g].group) {
                this.data.grouped[g].group.changed = true;
            }
        }
    }

    raise() {
        if (!this.data.parent) {
            return;
        }
        this.data.parent.move_child(this, this.data.parent.data.children.length - 1);
    }

    /**
     * @param {Node} p_child
     */
    add_child_notify(p_child: Node) { }

    /**
     * @param {Node} p_child
     */
    remove_child_notify(p_child: Node) { }

    /**
     * @param {Node} p_child
     */
    move_child_notify(p_child: Node) { }

    /**
     * @param {Node} p_by
     * @param {List<Node>} p_owned
     */
    get_owned_by(p_by: Node, p_owned: List<Node>) {
        if (this.data.owner === p_by) {
            p_owned.push_back(this);
        }

        for (let c of this.data.children) {
            c.get_owned_by(p_by, p_owned);
        }
    }

    get_index() {
        return this.data.pos;
    }

    /* NOTIFICATION */
    /**
     * @param {number} p_notification
     */
    propagate_notification(p_notification: number) {
        this.notification(p_notification);

        for (let c of this.data.children) {
            c.propagate_notification(p_notification);
        }
    }

    /**
    * @param {string} p_method
    * @param {Array} [p_args]
    * @param {boolean} [p_parent_first]
    */
    propagate_call(p_method: string, p_args: Array<any>, p_parent_first: boolean = false) {
        // @ts-ignore
        if (p_parent_first && this[p_method]) {
            if (p_args) {
                // @ts-ignore
                this[p_method].apply(this, p_args);
            } else {
                // @ts-ignore
                this[p_method]();
            }
        }

        for (let c of this.data.children) {
            c.propagate_call(p_method, p_args, p_parent_first);
        }

        // @ts-ignore
        if (!p_parent_first && this[p_method]) {
            if (p_args) {
                // @ts-ignore
                this[p_method].apply(this, p_args);
            } else {
                // @ts-ignore
                this[p_method]();
            }
        }
    }

    /* PROCESING */

    /**
     * @param {boolean} p_process
     */
    set_physics_process(p_process: boolean) {
        if (this.data.physics_process === p_process) {
            return;
        }

        this.data.physics_process = p_process;

        if (this.data.physics_process) {
            this.add_to_group('physics_process', false);
        } else {
            this.remove_from_group('physics_process');
        }
    }
    get_physics_process_delta_time() {
        if (this.data.tree) {
            return this.data.tree.physics_process_time;
        } else {
            return 0;
        }
    }
    is_physics_processing() {
        return this.data.physics_process;
    }

    /**
     * @param {boolean} p_process
     */
    set_process(p_process: boolean) {
        if (this.data.idle_process === p_process) {
            return;
        }
        this.data.idle_process = p_process;

        if (this.data.idle_process) {
            this.add_to_group('idle_process', false);
        } else {
            this.remove_from_group('idle_process');
        }
    }
    get_process_delta_time() {
        if (this.data.tree) {
            return this.data.tree.idle_process_time;
        } else {
            return 0;
        }
    }
    is_processing() {
        return this.data.idle_process;
    }

    /**
     * @param {boolean} p_process
     */
    set_physics_process_internal(p_process: boolean) {
        if (this.data.physics_process_internal === p_process) {
            return;
        }

        this.data.physics_process_internal = p_process;

        if (this.data.physics_process_internal) {
            this.add_to_group('physics_process_internal', false);
        } else {
            this.remove_from_group('physics_process_internal');
        }
    }
    is_physics_processing_internal() {
        return this.data.physics_process_internal;
    }

    /**
     * @param {boolean} p_process
     */
    set_process_internal(p_process: boolean) {
        if (this.data.idle_process_internal === p_process) {
            return;
        }
        this.data.idle_process_internal = p_process;

        if (this.data.idle_process_internal) {
            this.add_to_group('idle_process_internal', false);
        } else {
            this.remove_from_group('idle_process_internal');
        }
    }
    is_processing_internal() {
        return this.data.idle_process_internal;
    }

    /**
     * @param {boolean} p_enable
     */
    set_process_input(p_enable: boolean) {
        if (this.data.input === p_enable) {
            return;
        }

        this.data.input = p_enable;
        if (!this.is_inside_tree()) {
            return;
        }

        if (p_enable) {
            this.add_to_group(`_vp_input${this.get_viewport().instance_id}`);
        } else {
            this.remove_from_group(`_vp_input${this.get_viewport().instance_id}`);
        }
    }
    is_processing_input() {
        return this.data.input;
    }

    /**
     * @param {boolean} p_enable
     */
    set_process_unhandled_input(p_enable: boolean) {
        if (this.data.unhandled_input === p_enable) {
            return;
        }

        this.data.unhandled_input = p_enable;
        if (!this.is_inside_tree()) {
            return;
        }

        if (p_enable) {
            this.add_to_group(`_vp_unhandled_input${this.get_viewport().instance_id}`);
        } else {
            this.remove_from_group(`_vp_unhandled_input${this.get_viewport().instance_id}`);
        }
    }
    is_processing_unhandled_input() {
        return this.data.unhandled_input;
    }

    /**
     * @param {boolean} p_enable
     */
    set_process_unhandled_key_input(p_enable: boolean) {
        if (this.data.unhandled_key_input === p_enable) {
            return;
        }

        this.data.unhandled_key_input = p_enable;
        if (!this.is_inside_tree()) {
            return;
        }

        if (p_enable) {
            this.add_to_group(`_vp_unhandled_key_input${this.get_viewport().instance_id}`);
        } else {
            this.remove_from_group(`_vp_unhandled_key_input${this.get_viewport().instance_id}`);
        }
    }
    is_processing_unhandled_key_input() {
        return this.data.unhandled_key_input;
    }

    get_position_in_parent() {
        return this.data.pos;
    }

    can_process() {
        if (this.get_tree().paused) {
            if (this.data.pause_mode === PAUSE_MODE_STOP) {
                return false;
            }
            if (this.data.pause_mode === PAUSE_MODE_PROCESS) {
                return true;
            }
            if (this.data.pause_mode === PAUSE_MODE_INHERIT) {
                if (!this.data.pause_owner) {
                    return false;
                }

                if (this.data.pause_owner.data.pause_mode === PAUSE_MODE_PROCESS) {
                    return true;
                }

                if (this.data.pause_owner.data.pause_mode === PAUSE_MODE_STOP) {
                    return false;
                }
            }
        }

        return true;
    }
    /**
     * @param {number} p_what
     */
    can_process_notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_PROCESS: return this.data.idle_process;
            case NOTIFICATION_PHYSICS_PROCESS: return this.data.physics_process;
            case NOTIFICATION_INTERNAL_PROCESS: return this.data.idle_process_internal;
            case NOTIFICATION_INTERNAL_PHYSICS_PROCESS: return this.data.physics_process_internal;
        }
        return true;
    }

    request_ready() {
        this.data.ready_first = true;
    }

    queue_free() {
        if (this.is_inside_tree()) {
            this.get_tree().queue_delete(this);
        } else {
            Engine.get_singleton().get_main_loop().queue_delete(this);
        }
    }

    is_owned_by_parent() {
        return this.data.parent_owned;
    }

    get_viewport() {
        return this.data.viewport;
    }
}
node_class_map['Node'] = GDCLASS(Node, VObject)

let orphan_node_count = 0;
let node_hrcr_count = 1;
