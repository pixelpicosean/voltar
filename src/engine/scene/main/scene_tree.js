import { assemble_scene, settings, SCALE_MODES } from 'engine/index';
import { outer_box_resize } from 'engine/resize';
import { mixins, deep_merge } from 'engine/utils/index';
import { optional, scene_class_map, node_class_map, res_procs } from 'engine/registry';

import MessageQueue from 'engine/core/message_queue';
import Vector from 'engine/core/math/vector2';
import Loader from 'engine/core/io/Loader';
import VObject from 'engine/core/v_object';

import { shared as shared_ticker } from 'engine/ticker/index';

import Input from 'engine/input/index';
import VisualServer from 'engine/servers/visual/visual_server';
import PhysicsServer from 'engine/servers/physics_2d/physics_server';

import { registered_bitmap_fonts } from '../text/res';
import World2D from '../resources/world_2d';
import Theme, { default_font_name } from '../resources/theme';

import Viewport from './viewport';
import Node2D from '../node_2d';
import { remove_items } from 'engine/dep/index';

/**
 * @typedef ApplicationSettings
 * @prop {string} name
 * @prop {typeof Node2D} preloader
 * @prop {string|typeof Node2D} main_scene
 */

/**
  * @typedef DisplaySettings
  * @prop {string} view
  * @prop {string} container
  * @prop {number} width
  * @prop {number} height
  * @prop {number} resolution
  * @prop {number} background_color
  * @prop {boolean} antialias
  * @prop {boolean} pixel_snap
  * @prop {string} scale_mode
  * @prop {string} stretch_mode
  * @prop {string} stretch_aspect
  */

/**
 * @typedef Gravity
 * @prop {number} x
 * @prop {number} y
 */
/**
  * @typedef PhysicsSettings
  * @prop {number} physics_fps
  * @prop {number} sleep_threshold_linear
  * @prop {number} sleep_threshold_angular
  * @prop {number} time_before_sleep
  * @prop {number} default_angular_damp
  * @prop {number} default_linear_damp
  * @prop {Gravity} gravity
  */

/**
 * @typedef LayerMap
 * @prop {Object<string, number>} physics
 */

/**
 * @typedef Settings
 * @prop {ApplicationSettings} application
 * @prop {DisplaySettings} display
 * @prop {PhysicsSettings} physics
 * @prop {LayerMap} layer_map
 */

/**
 * @type {Settings}
 */
const DefaultSettings = {
    application: {
        name: 'Voltar',
        preloader: undefined,
        main_scene: undefined,
    },
    display: {
        view: 'game',
        container: 'container',

        width: 1024,
        height: 600,
        resolution: 1,

        background_color: 0x4C4C4C,

        antialias: false,
        pixel_snap: false,
        scale_mode: 'linear',

        stretch_mode: 'viewport',
        stretch_aspect: 'keep',
    },
    physics: {
        physics_fps: 60,
        sleep_threshold_linear: 2,
        sleep_threshold_angular: 8.0 / 180.0 * Math.PI,
        time_before_sleep: 0.5,
        default_linear_damp: 0.1,
        default_angular_damp: 1,
        gravity: { x: 0, y: 98 },
    },
    layer_map: {
        physics: {},
    },
};

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
         * @type {Node2D[]}
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

export default class SceneTree {
    get paused() {
        return this._paused;
    }
    set paused(p_enabled) {
        if (p_enabled === this._paused) {
            return;
        }
        this._paused = p_enabled;
        PhysicsServer.singleton.set_active(!p_enabled);
    }

    /**
     * @param {Input} input
     * @param {{ is_complete: boolean, queue: (string|Object)[][]}} preload_queue
     * @param {Object<string, FoldedResource|any>} resource_map
     */
    constructor(input, preload_queue, resource_map) {
        this.tree_version = 1;
        this.physics_process_time = 1;
        this.idle_process_time = 1;

        this.root = null;
        this.current_frame = 0;
        this.current_event = 0;
        this.call_lock = 0;
        this.root_lock = 0;
        this.node_count = 0;

        this._paused = false;

        this.debug_collisions_hint = false;

        this.resource_map = resource_map;

        /**
         * @type {Map<string, Group>}
         * @private
         */
        this.group_map = new Map();

        /**
         * @type {Array<Node2D>}
         * @private
         */
        this.delete_queue = [];

        /**
         * @type {SceneTreeTimer[]}
         * @private
         */
        this.timers = [];

        /**
         * Currently running scene
         *
         * @type {Node2D}
         */
        this.current_scene = null;

        this.viewport = new Viewport();
        this.viewport.scene_tree = this;
        this.viewport_rect = {
            position: new Vector(0, 0),
            size: new Vector(1, 1),
        };

        this.world_2d = new World2D();
        this.viewport.world_2d = this.world_2d;

        this.stretch_mode = 'viewport';
        this.stretch_aspect = 'keep';

        /** @type {HTMLCanvasElement} */
        this.view = null;
        /** @type {HTMLElement} */
        this.container = null;

        /**
         * Global time scale
         * @default 1.0
         */
        this.time_scale = 1;

        /**
         * A premade instance of the loader that can be used to load resources.
         * @type {Loader}
         */
        this.loader = null;
        this.preload_queue = preload_queue;
        this.visual_server = new VisualServer();
        /**
         * @type {import('engine/extract/webgl_extract').default}
         */
        this.extract = null;
        this.physics_server = PhysicsServer.get_singleton();
        this.message_queue = MessageQueue.get_singleton();
        this.input = input;

        /** @type {Settings} */
        this.settings = null;
        this._iteration_bind = this.iteration.bind(this);
        this._loop_id = 0;
        this._initialize = this._initialize.bind(this);
        this._next_scene = null;
        this._current_scene_ctor = null;
        this._process_tmp = {
            spiraling: 0,
            last: -1,
            real_delta: 0,
            delta_time: 0,
            last_count: 0,
            step: 0,
            slow_step: 0,
            slow_step_sec: 0,
            count: 0,
        };
    }
    /**
     * @param {Settings} settings
     */
    init(settings) {
        // Handle mixins now, after all code has been added
        mixins.perform_mixins();

        this.settings = deep_merge({}, DefaultSettings, settings);

        document.title = this.settings.application.name;

        // Initialize loader here since our plugins are all
        // registered now
        this.loader = new Loader();

        // Load resources marked as preload
        this.preload_queue.queue.unshift([`media/${default_font_name}.fnt`]);
        for (const settings of this.preload_queue.queue) {
            this.loader.add.call(this.loader, ...settings);
        }

        // Set default font after loader is complete
        this.loader.connect_once('complete', () => {
            this.preload_queue.is_complete = true;
            Theme.set_default_font(registered_bitmap_fonts[default_font_name]);

            // Process imported resources
            const has = Object.prototype.hasOwnProperty;
            const resource_map = this.resource_map;
            const type_key = '@type#';
            for (let k in resource_map) {
                if (has.call(resource_map[k], type_key)) {
                    resource_map[k] = res_procs[resource_map[k][type_key]](k, resource_map[k].data, resource_map);
                }
            }
            resource_map;
        });

        window.addEventListener('load', this._initialize, false);
        document.addEventListener('DOMContentLoaded', this._initialize, false);
    }

    is_paused() { }
    is_debugging_collisions_hint() { }

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
     * @param {Node2D} node
     */
    queue_delete(node) {
        node.is_queued_for_deletion = true;
        this.delete_queue.push(node);
    }

    /**
     * @param {string} p_group
     * @param {Node2D} p_node
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
     * @param {Node2D} p_node
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
     * @param {Array<Node2D>} [p_list]
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
            // TODO
        }

        this._update_group_order(g);

        if (p_call_flags & GroupCallFlags.REVERSE) {
            for (let i = g.nodes.length - 1; i >= 0; i--) {
                const node = g.nodes[i];
                if (p_call_flags & GroupCallFlags.REALTIME) {
                    // TODO: call_multilevel
                    if (p_function in node) {
                        node[p_function](...p_args);
                    }
                } else {
                    this.message_queue.push_call(node, p_function, ...p_args);
                }
            }
        } else {
            for (let i = 0, len = g.nodes.length; i < len; i++) {
                const node = g.nodes[i];
                if (p_call_flags & GroupCallFlags.REALTIME) {
                    // TODO: call_multilevel
                    if (p_function in node) {
                        node[p_function](...p_args);
                    }
                } else {
                    this.message_queue.push_call(node, p_function, ...p_args);
                }
            }
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

    get_root() {
        return this.viewport;
    }

    /**
     * Changes to the scene at the given path
     *
     * @param {String} path
     */
    change_scene(path) {
        this._next_scene = scene_class_map[path];

        if (!this._next_scene) {
            this._next_scene = this.resource_map[path];
        }
    }
    /**
     * Change to the given scene
     *
     * @param {typeof Node2D} scene_ctor Scene class
     */
    change_scene_to(scene_ctor) {
        this._next_scene = scene_ctor;
    }
    get_current_scene() {
        return this.current_scene;
    }
    reload_current_scene() {
        this._next_scene = this._current_scene_ctor;
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
     * @param {number} minsize
     */
    set_screen_stretch(mode, aspect, minsize) { }

    /**
     * @param {boolean} enable
     */
    set_debug_collisions_hint(enable) { }

    // Private
    _initialize() {
        window.removeEventListener('load', this._initialize);
        document.removeEventListener('DOMContentLoaded', this._initialize);

        this.view = /** @type {HTMLCanvasElement} */(document.getElementById(this.settings.display.view));
        this.container = document.getElementById(this.settings.display.container);

        // TODO: move all these configs to project settings, the same as Godot
        this.visual_server.init({
            view: this.view,

            width: this.settings.display.width,
            height: this.settings.display.height,
            resolution: this.settings.display.resolution,

            background_color: this.settings.display.background_color,

            antialias: this.settings.display.antialias,
            pixel_snap: this.settings.display.pixel_snap,

            auto_resize: false,
            transparent: false,
            clear_before_render: true,
            preserve_drawing_buffer: false,
        });
        if (this.settings.display.scale_mode === 'linear') {
            settings.SCALE_MODE = SCALE_MODES.LINEAR;
        } else {
            settings.SCALE_MODE = SCALE_MODES.NEAREST;
        }
        if (optional.Extract) {
            this.extract = new optional.Extract(this.visual_server.renderer);
        }

        this.physics_server.init(this.settings.physics);

        // Listen to the resize and orientation events
        const on_window_resize = () => {
            let result;
            switch (this.settings.display.stretch_mode) {
                case 'disabled':
                    this.visual_server.renderer.resize(window.innerWidth, window.innerHeight);
                    this.view.style.width = `${window.innerWidth}px`;
                    this.view.style.height = `${window.innerHeight}px`;
                    this.viewport_rect.size.set(window.innerWidth, window.innerHeight);
                    this.viewport_rect.position.set(0, 0);
                    break;
                case '2D':
                    switch (this.settings.display.stretch_aspect) {
                        case 'ignore':
                            this.visual_server.renderer.resize(window.innerWidth, window.innerHeight);
                            this.viewport.scale.set(window.innerWidth / this.settings.display.width, window.innerHeight / this.settings.display.height);
                            this.view.style.width = `${window.innerWidth}px`;
                            this.view.style.height = `${window.innerHeight}px`;
                            this.viewport_rect.size.set(this.settings.display.width, this.settings.display.height);
                            this.viewport_rect.position.set(0, 0);
                            break;
                        case 'keep':
                            result = outer_box_resize(window.innerWidth, window.innerHeight, this.settings.display.width, this.settings.display.height);
                            let width = Math.floor(this.settings.display.width * result.scale);
                            let height = Math.floor(this.settings.display.height * result.scale);
                            this.visual_server.renderer.resize(width, height);
                            this.viewport.scale.set(result.scale, result.scale);
                            this.view.style.width = `${width}px`;
                            this.view.style.height = `${height}px`;
                            this.view.style.marginLeft = `${result.left}px`;
                            this.view.style.marginTop = `${result.top}px`;
                            this.viewport_rect.size.set(width, height);
                            this.viewport_rect.position.set(result.left, result.top);
                            break;
                        case 'keep_width':
                            if (window.innerWidth / window.innerHeight > this.settings.display.width / this.settings.display.height) {
                                let scale = window.innerHeight / this.settings.display.height;
                                let width = (this.settings.display.width * scale) | 0;
                                let height = (width * (this.settings.display.height / this.settings.display.width)) | 0;
                                this.visual_server.renderer.resize(width, height);
                                this.viewport.scale.set(scale, scale);
                                this.view.style.width = `${width}px`;
                                this.view.style.height = `${height}px`;
                                this.view.style.marginLeft = `${((window.innerWidth - width) * 0.5) | 0}px`;
                                this.viewport_rect.size.set(width, height);
                                this.viewport_rect.position.set(((window.innerWidth - width) * 0.5) | 0, 0);
                            }
                            else {
                                let scale = window.innerWidth / this.settings.display.width;
                                let width = window.innerWidth;
                                let height = window.innerHeight;
                                this.visual_server.renderer.resize(width, height);
                                this.viewport.scale.set(scale, scale);
                                this.view.style.width = `${width}px`;
                                this.view.style.height = `${height}px`;
                                this.view.style.marginLeft = `0px`;
                                this.view.style.marginTop = `0px`;
                                this.viewport_rect.size.set(width, height);
                                this.viewport_rect.position.set(0, 0);
                            }
                            break;
                        case 'keep_height':
                            if (window.innerWidth / window.innerHeight < this.settings.display.width / this.settings.display.height) {
                                let scale = window.innerWidth / this.settings.display.width;
                                let height = (this.settings.display.height * scale) | 0;
                                let width = (height * (this.settings.display.height / this.settings.display.width)) | 0;
                                this.visual_server.renderer.resize(width, height);
                                this.viewport.scale.set(scale, scale);
                                this.view.style.width = `${width}px`;
                                this.view.style.height = `${height}px`;
                                this.view.style.marginTop = `${((window.innerHeight - height) * 0.5) | 0}px`;
                                this.viewport_rect.size.set(width, height);
                                this.viewport_rect.position.set(0, ((window.innerHeight - height) * 0.5) | 0);
                            }
                            else {
                                let scale = window.innerHeight / this.settings.display.height;
                                let height = window.innerHeight;
                                let width = window.innerWidth;
                                this.visual_server.renderer.resize(width, height);
                                this.viewport.scale.set(scale, scale);
                                this.view.style.width = `${width}px`;
                                this.view.style.height = `${height}px`;
                                this.view.style.marginLeft = `0px`;
                                this.view.style.marginTop = `0px`;
                                this.viewport_rect.size.set(width, height);
                                this.viewport_rect.position.set(0, 0);
                            }
                            break;
                    }
                    break;
                case 'viewport':
                    switch (this.settings.display.stretch_aspect) {
                        case 'ignore':
                            this.view.style.width = `${window.innerWidth}px`;
                            this.view.style.height = `${window.innerHeight}px`;
                            this.view.style.marginLeft = `0`;
                            this.view.style.marginTop = `0`;
                            this.viewport_rect.size.set(this.settings.display.width, this.settings.display.height);
                            this.viewport_rect.position.set(0, 0);
                            break;
                        case 'keep':
                            result = outer_box_resize(window.innerWidth, window.innerHeight, this.settings.display.width, this.settings.display.height);
                            this.view.style.width = `${(this.settings.display.width * result.scale) | 0}px`;
                            this.view.style.height = `${(this.settings.display.height * result.scale) | 0}px`;
                            this.view.style.marginLeft = `${result.left | 0}px`;
                            this.view.style.marginTop = `${result.top | 0}px`;
                            this.viewport_rect.size.set(this.settings.display.width, this.settings.display.height);
                            this.viewport_rect.position.set(result.left | 0, result.top | 0);
                            break;
                        case 'keep_width':
                            if (window.innerWidth / window.innerHeight > this.settings.display.width / this.settings.display.height) {
                                let scale = window.innerHeight / this.settings.display.height;
                                let width = (this.settings.display.width * scale) | 0;
                                this.view.style.width = `${width}px`;
                                this.view.style.height = `${(width * (this.settings.display.height / this.settings.display.width)) | 0}px`;
                                this.view.style.marginLeft = `${(window.innerWidth - width) * 0.5}px`;
                                this.viewport_rect.size.set(this.settings.display.width, this.settings.display.height);
                                this.viewport_rect.position.set(((window.innerWidth - width) * 0.5) | 0, 0);
                            }
                            else {
                                let scale = this.settings.display.width / window.innerWidth;
                                this.visual_server.renderer.resize(this.settings.display.width, (window.innerHeight * scale) | 0);
                                this.view.style.width = `${window.innerWidth}px`;
                                this.view.style.height = `${window.innerHeight}px`;
                                this.view.style.marginLeft = `0px`;
                                this.view.style.marginTop = `0px`;
                                this.viewport_rect.size.set(this.settings.display.width, (window.innerHeight * scale) | 0);
                                this.viewport_rect.position.set(0, 0);
                            }
                            break;
                        case 'keep_height':
                            if (window.innerWidth / window.innerHeight < this.settings.display.width / this.settings.display.height) {
                                let scale = window.innerWidth / this.settings.display.width;
                                let height = (this.settings.display.height * scale) | 0;
                                this.view.style.width = `${(height * (this.settings.display.height / this.settings.display.width)) | 0}px`;
                                this.view.style.height = `${height}px`;
                                this.view.style.marginTop = `${((window.innerHeight - height) * 0.5) | 0}px`;
                                this.viewport_rect.size.set(this.settings.display.width, this.settings.display.height);
                                this.viewport_rect.position.set(0, ((window.innerHeight - height) * 0.5) | 0);
                            }
                            else {
                                let scale = this.settings.display.height / window.innerHeight;
                                this.visual_server.renderer.resize((window.innerWidth * scale) | 0, this.settings.display.height);
                                this.view.style.width = `${window.innerWidth}px`;
                                this.view.style.height = `${window.innerHeight}px`;
                                this.view.style.marginLeft = `0px`;
                                this.view.style.marginTop = `0px`;
                                this.viewport_rect.size.set((window.innerWidth * scale) | 0, this.settings.display.height);
                                this.viewport_rect.position.set(0, 0);
                            }
                            break;
                    }
                    break;
            }
        };
        window.addEventListener('resize', on_window_resize, false);
        window.addEventListener('orientationchange', on_window_resize, false);

        // Resize for the first tiem
        setTimeout(() => {
            // Resize window for the first time
            on_window_resize();

            // Boot the first scene
            this.change_scene_to(this.settings.application.preloader);
        }, 1);

        // Init input
        this.input._init(this.viewport);

        // Start the main loop
        this._start_loop();
    }
    _start_loop() {
        shared_ticker.start();
        this._loop_id = requestAnimationFrame(this._iteration_bind);
    }
    /**
     * @param {number} timestamp
     */
    iteration(timestamp) {
        this._loop_id = requestAnimationFrame(this._iteration_bind);

        if (this._next_scene) {
            if (this.current_scene) {
                this.viewport.remove_children();

                this.current_scene = null;
            }

            // Instance from scene with class(script)
            if (typeof (this._next_scene.instance) === 'function') {
                this.current_scene = this._next_scene.instance();
            }
            // Instance from pure scene data?
            else {
                this.current_scene = new (node_class_map[this._next_scene.type])();
                this.current_scene._load_data(this._next_scene);
                assemble_scene(this.current_scene, this._next_scene);
            }
            this.current_scene.scene_tree = this;
            this.current_scene.toplevel = true;
            this._current_scene_ctor = this._next_scene;
            this._next_scene = null;

            this.viewport.add_child(this.current_scene);
        }

        if (this.current_scene) {
            const _process_tmp = this._process_tmp;

            if (_process_tmp.last > 0) {
                _process_tmp.real_delta = timestamp - _process_tmp.last;

                // limit max delta to 1/20 second, larger than that would be out of control
                _process_tmp.real_delta = Math.min(_process_tmp.real_delta, 1000 / 20) | 0;
            }
            _process_tmp.last = timestamp;

            /* Physics update */

            this.physics_process_time = _process_tmp.real_delta * 0.001;

            // - flush_transform_notifications
            this.viewport.parent = this.viewport._temp_node_2d_parent;
            this.viewport.update_transform();
            this.viewport.parent = null;

            // - update physics server
            this.physics_server.sync();
            this.physics_server.flush_queries();

            // - process nodes
            this.current_scene._propagate_physics_process(this.physics_process_time);

            this.message_queue.flush();

            this.physics_server.end_sync();
            this.physics_server.step(this.physics_process_time);

            // - flush_transform_notifications
            this.viewport.parent = this.viewport._temp_node_2d_parent;
            this.viewport.update_transform();
            this.viewport.update_worlds(this.physics_process_time);
            this.viewport.parent = null;

            this._flush_delete_queue();

            this.message_queue.flush();

            /* Idle update */

            this.idle_process_time = _process_tmp.real_delta * 0.001;

            // - flush_transform_notifications
            this.viewport.parent = this.viewport._temp_node_2d_parent;
            this.viewport.update_transform();
            this.viewport.parent = null;

            // - process nodes
            this.current_scene._propagate_process(this.idle_process_time);

            // - update shared ticker
            shared_ticker.update(_process_tmp.real_delta);

            this.message_queue.flush();

            // - flush_transform_notifications
            this.viewport.parent = this.viewport._temp_node_2d_parent;
            this.viewport.update_transform();
            this.viewport.parent = null;

            // - remove nodes to be freed
            this._flush_delete_queue();

            // - update inputs
            this.input._process(this.idle_process_time);

            this.message_queue.flush();

            // - go through timers
            let L = null;
            if (this.timers.length > 0) {
                L = this.timers[0];
            }
            for (let i = this.timers.length - 1; i >= 0; i--) {
                const t = this.timers[i];
                if (this.paused && !t.process_pause) {
                    continue;
                }
                t.time_left -= this.idle_process_time;

                if (t.time_left < 0) {
                    t.emit_signal('timeout');
                    this.timers.splice(i, 1);
                    SceneTreeTimer.free(t);
                }
            }

            // Render
            this.visual_server.render(this.viewport);
        }
    }
    _end_loop() {
        shared_ticker.stop();
        cancelAnimationFrame(this._loop_id);
    }

    _flush_delete_queue() {
        let i, n;
        for (i = 0; i < this.delete_queue.length; i++) {
            n = this.delete_queue[i];
            if (n.parent) {
                n.parent.remove_child(n);
                n.free();
            }
        }
        this.delete_queue.length = 0;
    }
}
