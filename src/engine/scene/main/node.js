import { remove_items } from 'engine/dep/index.ts';
import { node_class_map } from 'engine/registry';
import { MessageQueue } from 'engine/core/message_queue.js';
import {
    VObject,
    GDCLASS,
    NOTIFICATION_PREDELETE,
} from 'engine/core/v_object.js';
import { InputEvent } from 'engine/core/os/input_event.js';
import { Engine } from 'engine/core/engine.js';


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

/** @type {number[]} */
const this_stack = [];
/** @type {number[]} */
const that_stack = [];

class Data {
    constructor() {
        this.filename = '';

        /** @type {Node} */
        this.parent = null;
        /** @type {Node} */
        this.owner = null;
        /** @type {Node[]} */
        this.children = [];
        /** @type {Set<string>} */
        this.grouped = new Set();

        this.pos = -1;
        this.depth = -1;
        this.name = '';
        /** @type {import('./scene_tree').SceneTree} */
        this.tree = null;
        this.inside_tree = false;
        this.ready_notified = false;
        this.ready_first = true;

        /** @type {import('./viewport').Viewport} */
        this.viewport = null;

        this.pause_mode = PAUSE_MODE_INHERIT;
        /** @type {Node} */
        this.pause_owner = null;
        /** @type {Node[]} */
        this.owned = [];

        this.physics_process = false;
        this.idle_process = false;
        this.process_priority = 0;

        this.physics_process_internal = false;
        this.idle_process_internal = false;

        this.input = false;
        this.unhandled_input = false;
        this.unhandled_key_input = false;

        this.parent_owned = false;
        this.is_constructor = false;
        this.use_placeholder = false;

        this.path_cache = null;
    }
}


export class Node extends VObject {
    static instance() { return new Node() }

    get class() { return 'Node' }

    get filename() { return this.data.filename }
    set filename(value) { this.data.filename = value }

    get name() { return this.data.name }
    set name(value) { this.set_name(value) }

    get owner() { return this.data.owner }
    set owner(value) { this.set_owner(value) }

    get pause_mode() { return this.data.pause_mode }
    set pause_mode(value) { this.set_pause_mode(value) }

    constructor() {
        super();

        // Flags to avoid call of `instanceof` for better performance
        this.is_node = true;
        this.is_canvas_item = false;
        this.is_node_2d = false;
        this.is_control = false;
        this.is_spatial = false;
        this.is_skeleton = false;
        this.is_collision_object = false;

        this.data = new Data();

        /**
         * Data loaded from `_load_data` method
         * @type {any[]}
         */
        this.instance_data = [];

        /** @type {{ [name: string]: Node }} */
        this.named_children = {};
    }

    /* virtuals */

    /**
     * @param {any} data
     */
    _load_data(data) {
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
    /**
     * @param {InputEvent} event
     */
    _input(event) { }
    /**
     * @param {InputEvent} event
     */
    _unhandled_input(event) { }
    /**
     * @param {InputEvent} event
     */
    _unhandled_key_input(event) { }
    /**
     * @param {number} delta
     */
    _process(delta) { }
    /**
     * @param {number} delta
     */
    _physics_process(delta) { }
    _exit_tree() { }

    /* public */

    /**
     * @param {string} name
     */
    set_filename(name) {
        this.data.filename = name;
    }

    /**
     * @param {string} p_name
     */
    set_name(p_name) {
        if (this.data.name === p_name) return;

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

    /**
     * @param {Node} p_owner
     */
    set_owner(p_owner) {
        if (this.data.owner) {
            this.owner.data.owned.splice(this.owner.data.owned.indexOf(this), 1);
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

    /**
     * @param {number} mode
     */
    set_pause_mode(mode) {
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

        let owner = null;

        if (this.data.pause_mode === PAUSE_MODE_INHERIT) {
            if (this.data.parent) {
                owner = this.data.parent.data.pause_owner;
            }
        } else {
            owner = this;
        }

        this._propagate_pause_owner(owner);
    }

    /**
     * @param {Node} p_node
     */
    is_greater_than(p_node) {
        this_stack.length = this.data.depth;
        that_stack.length = p_node.data.depth;

        /** @type {Node} */
        let n = this;
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
     * @param {any} data
     */
    push_instance_data(data) {
        this.instance_data.push(data);
    }

    /**
     * @param {Node} child
     */
    _validate_child_name(child) {
        const name = child.data.name;

        let n = name;
        let i = 2;
        /** @type {Node} */
        let du_named = this.named_children[n];
        while (du_named && du_named !== child) {
            n = `${name}${i++}`;
            du_named = this.named_children[n];
        }

        child.data.name = n;
    }
    _generate_serial_child_name(p_child, name) { }

    /**
     * @param {number} p_notification
     */
    _propagate_reverse_notification(p_notification) {
        for (let i = this.data.children.length; i >= 0; i--) {
            this.data.children[i]._propagate_reverse_notification(p_notification);
        }

        this.notification(p_notification, true);
    }
    /**
     * @param {number} p_notification
     * @param {boolean} p_reverse
     */
    _propagate_deferred_notification(p_notification, p_reverse) {
        if (!p_reverse) {
            MessageQueue.get_singleton().push_notification(this, p_notification);
        }

        for (const c of this.data.children) {
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

        if (this.class === 'Viewport') {
            this.data.viewport = /** @type {import('./viewport').Viewport} */(/** @type {unknown} */(this));
        } else {
            this.data.viewport = this.data.parent.data.viewport;
        }

        this.data.inside_tree = true;

        // add to group
        if (this.data.grouped && this.data.grouped.size > 0) {
            for (let g of this.data.grouped) {
                this.data.tree.add_to_group(g, this);
            }
        }

        if (this.instance_data.length) {
            for (let i = 0; i < this.instance_data.length; i++) {
                this._load_data(this.instance_data[i]);
            }
            this.instance_data.length = 0;
        }

        this.notification(NOTIFICATION_ENTER_TREE);

        this._enter_tree();

        this.emit_signal('tree_entered', this);

        this.data.tree.node_added(this);

        for (const c of this.data.children) {
            if (!c.is_inside_tree()) {
                c._propagate_enter_tree();
            }
        }
    }
    _propagate_ready() {
        this.data.ready_notified = true;
        for (const c of this.data.children) {
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
        for (const c of this.data.children) {
            c._propagate_exit_tree();
        }

        this._exit_tree();

        this.emit_signal('tree_exiting', this);

        this.notification(NOTIFICATION_EXIT_TREE, true);

        if (this.data.tree) {
            this.data.tree.node_removed(this);
        }

        // exit groups
        if (this.data.grouped && this.data.grouped.size > 0) {
            for (const g of this.data.grouped) {
                this.data.tree.remove_from_group(g, this);
            }
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
        for (const c of this.data.children) {
            c._propagate_after_exit_tree();
        }
        this.emit_signal('tree_exited', this);
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
                remove_items(this.data.owner.data.owned, this.data.owner.data.owned.indexOf(this), 1);
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
    _propagate_pause_owner(p_owner) {
        if (this !== p_owner && this.data.pause_mode !== PAUSE_MODE_INHERIT) {
            return;
        }
        this.pause_owner = p_owner;
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
    _get_child_by_name(p_name) {
        for (const c of this.data.children) {
            if (c.data.name === p_name) return c;
        }
        return null;
    }

    /**
     * @param {import('./scene_tree').SceneTree} p_tree
     */
    _set_tree(p_tree) {
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
    _notification(p_notification) {
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

                // TODO: add to input handling groups

                this.get_tree().node_count++;
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this.get_tree().node_count--;

                // TODO: remove from input handling groups

                this.data.pause_owner = null;
                this.data.path_cache = null;
            } break;
            case NOTIFICATION_PATH_CHANGED: {
                this.data.path_cache = null;
            } break;
            case NOTIFICATION_READY: {
                this._ready();
            } break;
            case /* POSTINITIALIZE */0: {
                this.data.is_constructor = false;
            } break;
            case NOTIFICATION_PREDELETE: {
                this.owner = null;

                while (this.data.owned.length) {
                    this.data.owned[0].owner = null;
                }

                if (this.data.parent) {
                    this.data.parent.remove_child(this);
                }

                const children = this.data.children;
                while (children.length > 0) {
                    this.remove_child(children[children.length - 1]);
                }
            } break;
        }
    }

    /**
     * @param {Node} p_owner
     * @param {Node} p_by_owner
     */
    _propagate_replace_owner(p_owner, p_by_owner) {
        if (this.owner === p_owner) {
            this.owner = p_by_owner;
        }

        for (const c of this.data.children) {
            c._propagate_replace_owner(p_owner, p_by_owner);
        }
    }

    /**
     * @param {Node} p_child
     * @param {string} p_name
     */
    _add_child_no_check(p_child, p_name) {
        if (this.named_children[p_name] === p_child) this.named_children[p_name] = undefined;
        p_child.data.name = p_name;
        this.named_children[p_name] = p_child;

        p_child.data.pos = this.data.children.length;
        this.data.children.push(p_child);
        p_child.data.parent = this;
        p_child.notification(NOTIFICATION_PARENTED);

        if (this.data.tree) {
            p_child._set_tree(this.data.tree);
        }

        p_child.data.parent_owned = this.data.is_constructor;
        this.add_child_notify(p_child);
    }
    /**
     * @param {Node} p_owner
     */
    _set_owner_no_check(p_owner) {
        if (this.data.owner === p_owner) {
            return;
        }

        this.data.owner = p_owner;
        p_owner.data.owned.push(this);
    }
    /**
     * @param {string} p_name
     */
    _set_name_no_check(p_name) {
        this.data.name = p_name;
    }

    /**
     * @param {Node} p_child
     */
    add_child(p_child) {
        // TODO: replace the checks with assertion
        if (p_child === this) {
            return;
        }

        if (p_child === this.data.parent) {
            return;
        }

        this._validate_child_name(p_child);
        this._add_child_no_check(p_child, p_child.data.name);
    }
    /**
     * @param {Node} p_node
     * @param {Node} p_child
     */
    add_child_below_node(p_node, p_child) {
        this.add_child(p_child);

        if (this.is_a_parent_of(p_node)) {
            this.move_child(p_child, p_node.get_position_in_parent() + 1);
        } else {
            console.warn(`Cannot move under node ${p_node.name} as ${p_child.name} does not share a parent.`);
        }
    }
    /**
     * @param {Node} p_child
     */
    remove_child(p_child) {
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

        remove_items(children, idx, 1);
        this.named_children[p_child.data.name] = undefined;

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
        const new_owner = this.owner;
        const children = [];

        while (true) {
            let clear = true;
            for (const c_node of this.data.children) {
                if (!c_node.owner) {
                    continue;
                }

                this.remove_child(c_node);
                c_node._propagate_replace_owner(this, null);
                children.push(c_node);
                clear = false;
                break;
            }

            if (clear) {
                break;
            }
        }

        while (children.length > 0) {
            const c_node = children.shift();
            this.data.parent.add_child(c_node);
            c_node._propagate_replace_owner(null, new_owner);
        }

        this.data.parent.remove_child(this);
    }

    get_child_count() {
        return this.data.children.length;
    }
    /**
     * @param {number} p_index
     */
    get_child(p_index) {
        return this.data.children[p_index];
    }

    /**
     * @param {string} path
     */
    has_node(path) {
        return !!this.get_node(path);
    }
    /**
     * @param {string} path
     */
    get_node_or_null(path) {
        const list = path.split('/');

        // Find the base node
        let node = /** @type {Node} */ (this);

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
    get_node(path) {
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
    find_node(p_mask, p_recursive = true, p_owned = true) {
        // TODO: support Godot like `find_node` behavior
        let ret = this._get_child_by_name(p_mask);
        if (ret) {
            return ret;
        }
        if (p_recursive) {
            for (const c of this.data.children) {
                ret = c.find_node(p_mask, true, p_owned);
                if (ret) {
                    return ret;
                }
            }
        }
        return null;
    }

    /**
     * @returns {import("./node").Node}
     */
    get_parent() {
        return this.data.parent;
    }
    find_parent() {
        // TODO: find_parent
        return null;
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
    is_a_parent_of(p_node) {
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
        let n = this;

        let path = [];

        while (n) {
            path.push(n.name);
            n = n.data.parent;
        }

        path.reverse();

        this.data.path_cache = path.join('/');
    }
    get_path_to() {
        // TODO
    }

    /**
     * @param {string} p_identifier
     * @param {boolean} [p_persistent]
     */
    add_to_group(p_identifier, p_persistent = false) {
        if (!this.data.grouped) {
            this.data.grouped = new Set();
        }

        if (this.data.grouped.has(p_identifier)) {
            return;
        }

        if (this.data.tree) {
            this.data.tree.add_to_group(p_identifier, this);
        }

        this.data.grouped.add(p_identifier);

        return this;
    }
    /**
     * @param {string} p_identifier
     */
    remove_from_group(p_identifier) {
        if (!this.data.grouped) {
            return this;
        }

        if (this.data.tree) {
            this.data.tree.remove_from_group(p_identifier, this);
        }

        if (this.data.grouped.has(p_identifier)) {
            this.data.grouped.delete(p_identifier);
        }

        return this;
    }
    /**
     * @param {string} p_identifier
     */
    is_in_group(p_identifier) {
        return this.data.grouped && this.data.grouped.has(p_identifier);
    }
    get_groups() {
        return this.data.grouped;
    }

    /**
     * @param {Node} p_child
     * @param {number} p_pos
     */
    move_child(p_child, p_pos) {
        if (p_pos === this.data.children.length) {
            p_pos--;
        }

        if (p_child.data.pos === p_pos) {
            return;
        }

        const motion_from = Math.min(p_pos, p_child.data.pos);
        const motion_to = Math.max(p_pos, p_child.data.pos);

        remove_items(this.data.children, p_child.data.pos, 1);
        this.data.children.splice(p_pos, 0, p_child);

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

        // TODO: group changed
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
    add_child_notify(p_child) { }

    /**
     * @param {Node} p_child
     */
    remove_child_notify(p_child) { }

    /**
     * @param {Node} p_child
     */
    move_child_notify(p_child) { }

    get_owned_by() { }

    get_index() {
        return this.data.pos;
    }

    /* NOTIFICATION */
    /**
     * @param {number} p_notification
     */
    propagate_notification(p_notification) {
        this.notification(p_notification);

        for (const c of this.data.children) {
            c.propagate_notification(p_notification);
        }
    }

    /**
    * @param {string} p_method
    * @param {Array} [p_args]
    * @param {boolean} [p_parent_first]
    */
    propagate_call(p_method, p_args, p_parent_first = false) {
        if (p_parent_first && this[p_method]) {
            if (p_args) {
                this[p_method].apply(this, p_args);
            } else {
                this[p_method]();
            }
        }

        for (const c of this.data.children) {
            c.propagate_call(p_method, p_args, p_parent_first);
        }

        if (!p_parent_first && this[p_method]) {
            if (p_args) {
                this[p_method].apply(this, p_args);
            } else {
                this[p_method]();
            }
        }
    }

    /* PROCESING */

    /**
     * @param {boolean} p_process
     */
    set_physics_process(p_process) {
        if (this.data.physics_process === p_process) {
            return;
        }

        this.data.physics_process = p_process;

        if (this.data.physics_process) {
            this.add_to_group('physics_process', false);
        } else {
            this.remove_from_group('physics_process');
        }

        return this;
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
    set_process(p_process) {
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
    set_physics_process_internal(p_process) {
        this.data.physics_process_internal = !!p_process;

        if (this.data.physics_process_internal) {
            this.add_to_group('physics_process_internal', false);
        } else {
            this.remove_from_group('physics_process_internal');
        }

        return this;
    }
    is_physics_process_internal() {
        return this.data.physics_process_internal;
    }

    /**
     * @param {boolean} p_process
     */
    set_process_internal(p_process) {
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
    is_process_internal() {
        return this.data.idle_process_internal;
    }

    /** @param {number} value */
    set_process_priority(value) {
        this._process_priority = value;

        if (this.data.idle_process) {
            this.data.tree.make_group_changed('idle_process')
        }
        if (this.data.idle_process_internal) {
            this.data.tree.make_group_changed('idle_process_internal')
        }
        if (this.data.physics_process) {
            this.data.tree.make_group_changed('physics_process')
        }
        if (this.data.physics_process_internal) {
            this.data.tree.make_group_changed('physics_process_internal')
        }
    }

    /**
     * @param {boolean} p_enable
     */
    set_process_input(p_enable) {
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
    set_process_unhandled_input(p_enable) {
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
    set_process_unhandled_key_input(p_enable) {
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
    can_process_notification(p_what) {
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
