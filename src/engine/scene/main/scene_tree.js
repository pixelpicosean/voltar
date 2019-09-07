import { remove_items } from 'engine/dep/index';
import {
    scene_class_map,
    res_procs,
} from 'engine/registry';
import { List } from 'engine/core/self_list';
import { VObject, GDCLASS } from 'engine/core/v_object';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { MessageQueue } from 'engine/core/message_queue';
import {
    MainLoop,
    NOTIFICATION_WM_MOUSE_ENTER,
    NOTIFICATION_WM_MOUSE_EXIT,
    NOTIFICATION_WM_FOCUS_IN,
    NOTIFICATION_WM_FOCUS_OUT,
    NOTIFICATION_TRANSLATION_CHANGED,
    NOTIFICATION_WM_UNFOCUS_REQUEST,
} from 'engine/core/main_loop';

import { World2D } from '../resources/world_2d';
import { Viewport } from './viewport';
import {
    Node,
    NOTIFICATION_INTERNAL_PHYSICS_PROCESS,
    NOTIFICATION_PHYSICS_PROCESS,
    NOTIFICATION_INTERNAL_PROCESS,
    NOTIFICATION_PROCESS,
    NOTIFICATION_PAUSED,
    NOTIFICATION_UNPAUSED,
} from '../main/node';


const NOTIFICATION_TRANSFORM_CHANGED = 2000;


export class SceneTreeTimer extends VObject {
    static new() {
        const p = SceneTreeTimer.pool.pop();
        if (!p) return new SceneTreeTimer();
        else return p;
    }
    /**
     * @param {SceneTreeTimer} t
     */
    static free(t) {
        if (t) {
            t.disconnect_all();
            SceneTreeTimer.pool.push(t);
        }
    }
    constructor() {
        super();

        this.time_left = 0;
        this.process_pause = true;
    }
}
/** @type {SceneTreeTimer[]} */
SceneTreeTimer.pool = [];

/**
 * @enum {string}
 */
export const StretchMode = {
    'DISABLED': 'disabled',
    '2D': '2d',
    'VIEWPORT': 'viewport',
}

/**
 * @enum {string}
 */
export const StretchAspect = {
    'IGNORE': 'disabled',
    'KEEP': 'keep',
    'KEEP_WIDTH': 'keep_width',
    'KEEP_HEIGHT': 'keep_height',
    'EXPAND': 'expand',
}

/**
 * @enum {number}
 */
export const GroupCallFlags = {
    DEFAULT: 0,
    REVERSE: 1,
    REALTIME: 2,
    UNIQUE: 4,
    MULTILEVEL: 8,
}

export class Group {
    constructor() {
        /**
         * @type {Node[]}
         */
        this.nodes = [];
        this.changed = false;
    }
}

const ext_key = '@ext#', ext_len = ext_key.length;
const sub_key = '@sub#', sub_len = sub_key.length;
const url_key = '@url#', url_len = url_key.length;
res_procs['PackedScene'] = (key, data, resource_map) => {
    const ext = data.__meta__.ext;
    const sub = data.__meta__.sub;
    const normalize = (node) => {
        let k, v, res;
        for (k in node) {
            v = node[k];
            if (typeof (v) === 'string' && v[0] === '@') {
                // ext_resource?
                if (v.indexOf(ext_key) >= 0) {
                    res = ext[v.substring(ext_len)];
                    if (typeof (res) === 'string' && res[0] === '@') {
                        if (res.indexOf(url_key) >= 0) {
                            res = resource_map[res.substring(url_len)];
                        }
                    }
                    node[k] = res;
                }
                // sub_resource?
                else if (v.indexOf(sub_key) >= 0 && v[0] === '@') {
                    res = sub[v.substring(sub_len)];
                    if (typeof (res) === 'string' && res[0] === '@') {
                        if (res.indexOf(url_key) >= 0) {
                            res = resource_map[res.substring(url_len)];
                        }
                    }
                    node[k] = res;
                }
            }
        }

        node.inherit = data.__meta__.inherit;

        for (let n of node.children) {
            normalize(n);
        }

        return node;
    }

    // Normalize ext and sub resources of this scene
    const scene = normalize(data);
    delete scene.__meta__;

    // Override scene data back to resource_map
    resource_map[key] = scene;

    return scene;
}

/**
 * @typedef FoldedResource
 * @property {string} type
 * @property {any} data
 */

export class SceneTree extends MainLoop {
    get paused() {
        return this._paused;
    }
    set paused(p_enabled) {
        if (p_enabled === this._paused) {
            return;
        }
        this._paused = p_enabled;
        // PhysicsServer.get_singleton().set_active(!p_enabled);
        if (this.root) {
            this.root.propagate_notification(p_enabled ? NOTIFICATION_PAUSED : NOTIFICATION_UNPAUSED);
        }
    }

    static get_singleton() { return singleton }

    constructor() {
        super();

        if (!singleton) singleton = this;

        this.class = 'SceneTree';

        /** @type {Viewport} */
        this.root = new Viewport();
        this.root.name = 'root';
        this.root.set_handle_input_locally(false);
        if (!this.root.world_2d) {
            // this.root.world_2d = new World2D();
        }

        this.tree_version = 1;
        this.physics_process_time = 1;
        this.idle_process_time = 1;

        this.initialized = false;
        this.input_handled = false;
        this._paused = false;

        this.current_frame = 0;
        this.current_event = 0;

        this.call_lock = 0;
        /** @type {Set<Node>} */
        this.call_skip = new Set();
        this.root_lock = 0;

        this.node_count = 0;

        this.stretch_mode = 'disable';
        this.stretch_aspect = 'ignore';
        this.stretch_min = new Vector2();
        this.stretch_shrink = 1;
        this.last_screen_size = new Vector2(window.innerWidth, window.innerHeight);
        this._update_root_rect();

        /** @type {Map<string, Map<string, Array>>} group -> call -> args */
        this.unique_group_calls = new Map();
        this.ugc_locked = false;

        /**
         * Currently running scene
         * @type {Node}
         */
        this.current_scene = null;

        /** @type {List<Node>} */
        this.xform_change_list = new List();

        /** @type {Function[]} */
        this.idle_callbacks = [];

        /**
         * @type {Map<string, Group>}
         * @private
         */
        this.group_map = new Map();

        /**
         * @type {Array<Node>}
         * @private
         */
        this.delete_queue = [];

        /**
         * @type {SceneTreeTimer[]}
         * @private
         */
        this.timers = [];

        this.world_2d = new World2D();


        this.init = this.init.bind(this);

        /** @type {HTMLCanvasElement} */
        this.view = null;
        /** @type {HTMLElement} */
        this.container = null;

        this._current_packed_scene = null;
    }
    free() {
        if (this.root) {
            this.root._set_tree(null);
            this.root._propagate_after_exit_tree();
            this.root.free();
        }
        if (singleton === this) singleton = null;
        super.free();
        return true;
    }

    is_paused() {
        return this._paused;
    }

    /**
     * @param {number} p_delay_sec
     * @param {boolean} [p_process_pause]
     */
    create_timer(p_delay_sec, p_process_pause = true) {
        const stt = SceneTreeTimer.new();
        stt.process_pause = p_process_pause;
        stt.time_left = p_delay_sec;
        this.timers.push(stt);
        return stt;
    }

    /**
     * @param {Node} node
     */
    queue_delete(node) {
        node.is_queued_for_deletion = true;
        this.delete_queue.push(node);
    }

    /**
     * @param {string} p_group
     * @param {Node} p_node
     */
    add_to_group(p_group, p_node) {
        let E = this.group_map.get(p_group);
        if (!E) {
            E = new Group();
            this.group_map.set(p_group, E);
        }

        if (E.nodes.indexOf(p_node) >= 0) {
            console.error(`Already in group: ${p_group}`);
            return;
        }
        E.nodes.push(p_node);
        E.changed = true;
        return E;
    }
    /**
     * @param {string} p_group
     * @param {Node} p_node
     */
    remove_from_group(p_group, p_node) {
        const E = this.group_map.get(p_group);
        if (!E) {
            return;
        }

        remove_items(E.nodes, E.nodes.indexOf(p_node), 1);
        if (E.nodes.length === 0) {
            this.group_map.delete(p_group);
        }
    }
    /**
     * @param {string} p_identifier
     */
    has_group(p_identifier) {
        return this.group_map.has(p_identifier);
    }
    /**
     * @param {string} p_group
     */
    make_group_changed(p_group) {
        const E = this.group_map.get(p_group);
        if (E) {
            E.changed = true;
        }
    }
    /**
     * @param {string} p_group
     * @param {Array<Node>} [p_list]
     */
    get_nodes_in_group(p_group, p_list = []) {
        p_list.length = 0;

        const E = this.group_map.get(p_group);
        if (!E) {
            return p_list;
        }

        this._update_group_order(E);
        const nc = E.nodes.length;
        if (nc === 0) {
            return p_list;
        }
        for (let n of E.nodes) {
            p_list.push(n);
        }

        return p_list;
    }
    /**
     * @param {number} p_call_flags
     * @param {string} p_group
     * @param {string} p_function
     * @param {any} p_args
     */
    call_group_flags(p_call_flags, p_group, p_function, ...p_args) {
        const g = this.group_map.get(p_group);
        if (!g) {
            return;
        }
        if (g.nodes.length === 0) {
            return;
        }

        if (p_call_flags & GroupCallFlags.UNIQUE && !(p_call_flags & GroupCallFlags.REALTIME)) {
            let call_pack = this.unique_group_calls.get(p_group);
            if (call_pack) {
                if (call_pack.has(p_function)) {
                    return;
                }
            } else {
                call_pack = new Map();
                this.unique_group_calls.set(p_group, call_pack);
            }

            call_pack.set(p_function, p_args);
            return;
        }

        this._update_group_order(g);

        this.call_lock++;

        if (p_call_flags & GroupCallFlags.REVERSE) {
            for (let i = g.nodes.length - 1; i >= 0; i--) {
                const node = g.nodes[i];

                if (this.call_lock && this.call_skip.has(node)) {
                    continue;
                }

                if (p_call_flags & GroupCallFlags.REALTIME) {
                    if (p_function in node) {
                        node[p_function](...p_args);
                    }
                } else {
                    MessageQueue.get_singleton().push_call(node, p_function, ...p_args);
                }
            }
        } else {
            for (let i = 0, len = g.nodes.length; i < len; i++) {
                const node = g.nodes[i];

                if (this.call_lock && this.call_skip.has(node)) {
                    continue;
                }

                if (p_call_flags & GroupCallFlags.REALTIME) {
                    if (p_function in node) {
                        node[p_function](...p_args);
                    }
                } else {
                    MessageQueue.get_singleton().push_call(node, p_function, ...p_args);
                }
            }
        }
        this.call_lock--;
        if (this.call_lock === 0) {
            this.call_skip.clear();
        }
    }
    /**
     * @param {Group} g
     * @param {boolean} [p_use_priority]
     */
    _update_group_order(g, p_use_priority = false) {
        if (!g.changed) {
            return;
        }
        if (g.nodes.length === 0) {
            return;
        }

        if (p_use_priority) {
            // TODO: compare nodes with priority in a group
        } else {
            // TODO: compare nodes in a group
        }

        g.changed = false;
    }

    /**
     * @param {string} p_group
     * @param {number} p_notification
     */
    _notify_group_pause(p_group, p_notification) {
        const g = this.group_map.get(p_group);
        if (!g) {
            return;
        }
        if (g.nodes.length === 0) {
            return;
        }

        this._update_group_order(g, p_notification === NOTIFICATION_PROCESS || p_notification === NOTIFICATION_INTERNAL_PROCESS || p_notification === NOTIFICATION_PHYSICS_PROCESS || p_notification === NOTIFICATION_INTERNAL_PHYSICS_PROCESS);

        this.call_lock++;

        for (const n of g.nodes) {
            if (this.call_lock && this.call_skip.has(n)) {
                continue;
            }

            if (!n.can_process()) {
                continue;
            }
            if (!n.can_process_notification(p_notification)) {
                continue;
            }

            n.notification(p_notification);
        }

        this.call_lock--;
        if (this.call_lock === 0) {
            this.call_skip.clear();
        }
    }

    /**
     * @param {string} p_group
     * @param {string} p_method
     * @param {any} p_args
     */
    call_group(p_group, p_method, ...p_args) {
        this.call_group_flags(0, p_group, p_method, ...p_args);
    }
    /**
     * @param {string} p_group
     * @param {number} p_notification
     */
    notify_group(p_group, p_notification) {
        this.notify_group_flags(0, p_group, p_notification);
    }
    /**
     * @param {string} p_group
     * @param {string} p_name
     * @param {*} p_value
     */
    set_group(p_group, p_name, p_value) {
        this.set_group_flags(0, p_group, p_name, p_value);
    }
    /**
     * @param {number} p_call_flags
     * @param {string} p_group
     * @param {string} p_name
     * @param {*} p_value
     */
    set_group_flags(p_call_flags, p_group, p_name, p_value) {
        // TODO: set_group_flags
    }
    /**
     * @param {number} p_call_flags
     * @param {string} p_group
     * @param {number} p_notification
     */
    notify_group_flags(p_call_flags, p_group, p_notification) {
        const g = this.group_map.get(p_group);
        if (!g) {
            return;
        }
        if (g.nodes.length === 0) {
            return;
        }

        this._update_group_order(g);

        this.call_lock++;

        if (p_call_flags & GroupCallFlags.REVERSE) {
            for (let i = g.nodes.length - 1; i >= 0; i--) {
                const node = g.nodes[i];

                if (this.call_lock && this.call_skip.has(node)) {
                    continue;
                }

                if (p_call_flags & GroupCallFlags.REALTIME) {
                    node.notification(p_notification);
                } else {
                    MessageQueue.get_singleton().push_notification(node, p_notification);
                }
            }
        } else {
            for (let i = 0, len = g.nodes.length; i < len; i++) {
                const node = g.nodes[i];

                if (this.call_lock && this.call_skip.has(node)) {
                    continue;
                }

                if (p_call_flags & GroupCallFlags.REALTIME) {
                    node.notification(p_notification);
                } else {
                    MessageQueue.get_singleton().push_notification(node, p_notification);
                }
            }
        }

        this.call_lock--;
        if (this.call_lock === 0) {
            this.call_skip.clear();
        }
    }

    /**
     * @param {string} p_group
     * @param {string} p_method
     * @param {*} p_input
     */
    _call_input_pause(p_group, p_method, p_input) {
        const g = this.group_map.get(p_group);
        if (!g) {
            return;
        }
        if (g.nodes.length === 0) {
            return;
        }

        this._update_group_order(g);

        this.call_lock++;

        for (let i = g.nodes.length - 1; i >= 0; i--) {
            if (this.input_handled) {
                break;
            }

            const n = g.nodes[i];
            if (this.call_lock && this.call_skip.has(n)) {
                continue;
            }

            if (!n.can_process()) {
                continue;
            }

            n[p_method](p_input);
        }

        this.call_lock--;
        if (this.call_lock === 0) {
            this.call_skip.clear();
        }
    }

    get_root() {
        return this.root;
    }

    /**
     * Changes to the scene at the given path
     *
     * @param {String} path
     */
    change_scene(path) {
        let next_scene;

        next_scene = scene_class_map[path];
        if (!next_scene) {
            next_scene = this.resource_map[path];
        }

        this.change_scene_to(next_scene);
    }
    /**
     * Change to the given scene
     *
     * @param {any} next_scene
     */
    change_scene_to(next_scene) {
        this._current_packed_scene = next_scene;

        /** @type {Node} */
        let new_scene;
        // Instance from scene with class(script)
        if (typeof (next_scene.instance) === 'function') {
            new_scene = next_scene.instance();
        }
        // Instance from pure scene data?
        else {
            // new_scene = new (node_class_map[next_scene.type])();
            // new_scene._load_data(next_scene);
            // assemble_scene(new_scene, next_scene);
        }
        this.call_deferred('_change_scene', new_scene);
    }
    get_current_scene() {
        return this.current_scene;
    }
    reload_current_scene() {
        this.change_scene_to(this._current_packed_scene);
    }
    /**
     * @param {Node} p_current
     */
    add_current_scene(p_current) {
        this.current_scene = p_current;
        this.root.add_child(p_current);
    }

    /**
     * @param {number} scale
     */
    set_time_scale(scale) {
        this.time_scale = Math.max(0, scale);
        return this;
    }

    /**
     * @param {string} mode
     * @param {string} aspect
     * @param {Vector2Like} minsize
     * @param {number} p_shrink
     */
    set_screen_stretch(mode, aspect, minsize, p_shrink = 1) {
        this.stretch_mode = mode;
        this.stretch_aspect = aspect;
        this.stretch_min.copy(minsize);
        this.stretch_shrink = p_shrink;
        this._update_root_rect();
    }

    tree_changed() {
        this.tree_version++;
        this.emit_signal('tree_changed');
    }
    /**
     * @param {Node} p_node
     */
    node_added(p_node) {
        this.emit_signal('node_added', p_node);
    }
    /**
     * @param {Node} p_node
     */
    node_removed(p_node) {
        this.emit_signal('node_removed', p_node);
    }
    /**
     * @param {Node} p_node
     */
    node_renamed(p_node) {
        this.emit_signal('node_renamed', p_node);
    }

    flush_transform_notifications() {
        /** @type {Node} */
        let node = null;
        let n = this.xform_change_list.first();
        while (n) {
            node = n.self();
            let nx = n.next();
            this.xform_change_list.remove(n);
            n = nx;
            node.notification(NOTIFICATION_TRANSFORM_CHANGED);
        }
    }

    set_input_as_handled() {
        this.input_handled = true;
    }
    is_input_handled() {
        return this.input_handled;
    }


    /* virtual */

    /**
     * @param {number} p_notification
     */
    _notification(p_notification) {
        switch (p_notification) {
            case NOTIFICATION_WM_MOUSE_ENTER:
            case NOTIFICATION_WM_MOUSE_EXIT:
            case NOTIFICATION_WM_FOCUS_IN:
            case NOTIFICATION_WM_FOCUS_OUT: {
                // TODO: input ensure_touch_mouse_raised() on gmae focused
                this.root.propagate_notification(p_notification);
            } break;
            case NOTIFICATION_TRANSLATION_CHANGED: {
                this.root.propagate_notification(p_notification);
            } break;
            case NOTIFICATION_WM_UNFOCUS_REQUEST: {
                this.notify_group_flags(GroupCallFlags.REALTIME | GroupCallFlags.MULTILEVEL, 'input', NOTIFICATION_WM_UNFOCUS_REQUEST);
            } break;
            default: {
            } break;
        }
    }

    _initialize() {
        // this.view = /** @type {HTMLCanvasElement} */(document.getElementById(this.settings.display.view));
        // this.container = document.getElementById(this.settings.display.container);
    }

    /* interface */

    init() {
        this.initialized = true;

        this.root._set_tree(this);
        super.init();
    }
    /**
     * @param {number} p_time
     */
    iteration(p_time) {
        this.root_lock++;

        this.current_frame++;

        this.flush_transform_notifications();

        super.iteration(p_time);
        this.physics_process_time = p_time;

        this.emit_signal('physics_frame');

        this._notify_group_pause('physics_process_internal', NOTIFICATION_INTERNAL_PHYSICS_PROCESS);
        this._notify_group_pause('physics_process', NOTIFICATION_PHYSICS_PROCESS);
        this._flush_ugc();
        MessageQueue.get_singleton().flush();
        this.flush_transform_notifications();
        this.call_group_flags(GroupCallFlags.REALTIME, '_viewports', 'update_worlds');
        this.root_lock--;

        this._flush_delete_queue();
        this._call_idle_callbacks();
    }
    /**
     * @param {number} p_time
     */
    idle(p_time) {
        this.root_lock++;

        super.idle(p_time);

        this.idle_process_time = p_time;

        this.emit_signal('idle_frame');

        MessageQueue.get_singleton().flush();

        this.flush_transform_notifications();

        this._notify_group_pause('idle_process_internal', NOTIFICATION_INTERNAL_PROCESS);
        this._notify_group_pause('idle_process', NOTIFICATION_PROCESS);

        // TODO: check weather window size is changed

        this._flush_ugc();
        MessageQueue.get_singleton().flush();
        this.flush_transform_notifications();
        this.call_group_flags(GroupCallFlags.REALTIME, '_viewports', 'update_worlds');

        this.root_lock--;

        this._flush_delete_queue();

        // - go through timers
        if (this.timers.length > 0) {
            const L = this.timers[this.timers.length - 1]; // last element
            let E = this.timers[0];
            /** @type {SceneTreeTimer} */
            let N = null;
            for (let i = 0; E; i++) {
                E = this.timers[i];
                if (this.timers.length > i + 1) {
                    N = this.timers[i + 1];
                } else {
                    N = null;
                }
                if (this.paused && !E.process_pause) {
                    if (E === L) {
                        break; // break on last, so if new timers were added during list traversal, ignore them.
                    }
                    E = N;
                    continue;
                }
                E.time_left -= p_time;

                if (E.time_left < 0) {
                    E.emit_signal('timeout');
                    this.timers.splice(i--, 1);
                    SceneTreeTimer.free(E);
                }
                if (E === L) {
                    break; // break on last, so if new timers were added during list traversal, ignore them.
                }
                E = N;
            }
        }

        this._call_idle_callbacks();
    }
    finish() {
        this._flush_delete_queue();
        this._flush_ugc();

        this.initialized = false;

        super.finish();

        if (this.root) {
            this.root._set_tree(null);
            this.root._propagate_after_exit_tree();
            this.root = null;
        }
    }
    input_event(p_event) {
        this.current_event++;
        this.root_lock++;

        this.input_handled = false;

        super.input_event(p_event);

        this.call_group_flags(GroupCallFlags.REALTIME, '_viewports', '_vp_input', p_event);

        this._flush_ugc();
        this.root_lock--;

        this.root_lock++;
        if (!this.input_handled) {
            this.call_group_flags(GroupCallFlags.REALTIME, '_viewports', '_vp_unhandled_input', p_event);
            this._flush_ugc();
            this.root_lock--;
        } else {
            this.root_lock--;
        }

        this._call_idle_callbacks();
    }
    /**
     * @param {string} p_text
     */
    input_text(p_text) {
        this.root_lock++;
        this.call_group_flags(GroupCallFlags.REALTIME, '_viewports', '_vp_input_text', p_text);
        this.root_lock--;
    }
    /**
     * @param {string[]} p_files
     */
    drop_files(p_files) {
        this.emit_signal('files_dropped', p_files);
        super.drop_files(p_files);
    }

    /* private */

    _flush_delete_queue() {
        for (const n of this.delete_queue) {
            n.free();
        }
        this.delete_queue.length = 0;
    }

    _update_root_rect() {
        // TODO: update root rect for resize
    }

    _flush_ugc() {
        this.ugc_locked = true;

        for (const [group, call_pack] of this.unique_group_calls) {
            for (const [method, args] of call_pack) {
                this.call_group_flags(GroupCallFlags.REALTIME, group, method, ...args);
            }
            call_pack.clear();
        }
        // we better not clear it since group is kinda stable during the game
        // this.unique_group_calls.clear();

        this.ugc_locked = false;
    }
    _update_listener() { }

    /**
     * @param {Node} p_to
     */
    _change_scene(p_to) {
        if (this.current_scene) {
            this.current_scene.free();
            this.current_scene = null;
        }

        if (p_to) {
            this.current_scene = p_to;
            this.root.add_child(p_to);
        }
    }

    _call_idle_callbacks() {
        for (const c of this.idle_callbacks) {
            c();
        }
    }
    /**
     * @param {Function} p_callback
     */
    add_idle_callback(p_callback) {
        this.idle_callbacks.push(p_callback);
    }
}
GDCLASS(SceneTree, MainLoop)

/** @type {SceneTree} */
let singleton = null;
