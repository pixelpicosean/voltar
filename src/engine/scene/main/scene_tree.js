import VisualServer from '../../VisualServer';
import PhysicsServer from 'engine/servers/physics_2d/physics_server';
import MessageQueue from '../../MessageQueue';
import Node2D from '../Node2D';
import Vector from '../../math/Vector2';
import { shared as shared_ticker } from '../../ticker/index';
import { Loader } from '../../loaders/index';
import { mixins, deep_merge, scene_path_to_key } from '../../utils/index';

import { outer_box_resize } from '../../resize';
import { optional, scene_class_map, node_class_map } from '../../registry';
import Theme, { default_font_name } from '../resources/Theme';
import { registered_bitmap_fonts } from '../text/res';
import { assemble_scene } from '../../index';
import World2D from '../resources/world_2d';
import Viewport from './viewport';

/**
 * @typedef ApplicationSettings
 * @prop {string} name
 * @prop {typeof Node2D} preloader
 * @prop {typeof Node2D} main_scene
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
 * @typedef Settings
 * @prop {ApplicationSettings} application
 * @prop {DisplaySettings} display
 * @prop {PhysicsSettings} physics
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

        width: 400,
        height: 250,
        resolution: 1,

        background_color: 0x4C4C4C,

        antialias: false,
        pixel_snap: true,
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
};

export class SceneTreeTimer {
    constructor() {
        this.time_left = 0;
        this.process_pause = true;
    }
}

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

export class Group {
    constructor() {
        /**
         * @type {Node2D[]}
         */
        this.nodes = [];
        this.changed = false;
    }
}

export default class SceneTree {
    constructor(input, preload_queue) {
        this.tree_version = 1;
        this.physics_process_time = 1;
        this.idle_process_time = 1;

        this.root = null;
        this.current_frame = 0;
        this.current_event = 0;
        this.call_lock = 0;
        this.root_lock = 0;
        this.node_count = 0;

        this.paused = false;

        this.debug_collisions_hint = false;

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

        /** @type {HTMLElement} */
        this.view = null;
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
        /**
         * @type {Array<Array<string>>}
         */
        this.preload_queue = preload_queue;
        this.visual_server = new VisualServer();
        /**
         * @type {import('engine/extract/WebGLExtract').default}
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
        // Prevent the default loader from destroying
        this.loader.destroy = () => { };

        // Load resources marked as preload
        this.preload_queue.unshift([`media/${default_font_name}.fnt`]);
        for (const settings of this.preload_queue) {
            this.loader.add.apply(this.loader, settings);
        }

        // Set default font after loader is complete
        this.loader.onComplete.once(() => {
            Theme.set_default_font(registered_bitmap_fonts[default_font_name]);
        });

        window.addEventListener('load', this._initialize, false);
        document.addEventListener('DOMContentLoaded', this._initialize, false);
    }

    is_paused() { }
    is_debugging_collisions_hint() { }

    queue_delete(node) {
        node.is_queued_for_deletion = true;
        this.delete_queue.push(node);
    }

    /**
     * @param {string} p_identifier
     */
    has_group(p_identifier) {
        return this.group_map.has(p_identifier);
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
        const key = scene_path_to_key(path);

        this._next_scene = scene_class_map[key];

        if (!this._next_scene) {
            this._next_scene = require(`scene/${key}.json`);
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
     * Set pause state of the whole game
     *
     * @param {boolean} pause
     */
    set_pause(pause) { }
    set_time_scale(scale) {
        this.time_scale = Math.max(0, scale);
    }

    set_screen_stretch(mode, aspect, minsize) { }

    set_debug_collisions_hint(enable) { }

    // Private
    _initialize() {
        window.removeEventListener('load', this._initialize);
        document.removeEventListener('DOMContentLoaded', this._initialize);

        this.view = document.getElementById(this.settings.display.view);
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
            scale_mode: this.settings.display.scale_mode,

            auto_resize: false,
            transparent: false,
            force_fxaa: false,
            clear_before_render: true,
            preserve_drawing_buffer: false,
        });
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
    iteration(timestamp) {
        this._loop_id = requestAnimationFrame(this._iteration_bind);

        if (this._next_scene) {
            if (this.current_scene) {
                this.viewport.remove_children();

                // TODO: clean up physics server during scene switching
                // this.physics_server.clean();

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
            }
            _process_tmp.last = timestamp;

            // If the logic time is spiraling upwards, skip a frame entirely
            if (_process_tmp.spiraling > 1) {
                // Reset the delta_time accumulator which will cause all pending dropped frames to be permanently skipped
                _process_tmp.delta_time = 0;
                _process_tmp.spiraling = 0;
            }
            else {
                // Step size
                _process_tmp.step = 1000.0 / this.settings.physics.physics_fps;
                _process_tmp.slow_step = _process_tmp.step * this.time_scale;
                _process_tmp.slow_step_sec = _process_tmp.step * 0.001 * this.time_scale;

                // Accumulate time until the step threshold is met or exceeded... up to a limit of 3 catch-up frames at step intervals
                _process_tmp.delta_time += Math.max(Math.min(_process_tmp.step * 3, _process_tmp.real_delta), 0);

                // Call the game update logic multiple times if necessary to "catch up" with dropped frames
                // unless forceSingleUpdate is true
                _process_tmp.count = 0;

                while (_process_tmp.delta_time >= _process_tmp.step) {
                    _process_tmp.delta_time -= _process_tmp.step;

                    // Physics update

                    // - flush_transform_notifications
                    this.viewport.parent = this.viewport._temp_node_2d_parent;
                    this.viewport.update_transform();
                    this.viewport.parent = null;

                    // - update physics server
                    this.physics_server.sync();
                    this.physics_server.flush_queries();

                    // - process nodes
                    this.current_scene._propagate_physics_process(_process_tmp.slow_step_sec);

                    this.message_queue.flush();

                    this.physics_server.end_sync();
                    this.physics_server.step(_process_tmp.slow_step_sec);

                    // - flush_transform_notifications
                    this.viewport.parent = this.viewport._temp_node_2d_parent;
                    this.viewport.update_transform();
                    this.viewport.update_worlds(_process_tmp.slow_step_sec);
                    this.viewport.parent = null;

                    this._flush_delete_queue();

                    this.message_queue.flush();

                    _process_tmp.count += 1;
                }

                // Detect spiraling (if the catch-up loop isn't fast enough, the number of iterations will increase constantly)
                if (_process_tmp.count > _process_tmp.last_count) {
                    _process_tmp.spiraling += 1;
                }
                else if (_process_tmp.count < _process_tmp.last_count) {
                    // Looks like it caught up successfully, reset the spiral alert counter
                    _process_tmp.spiraling = 0;
                }

                _process_tmp.last_count = _process_tmp.count;
            }

            // Idle update

            // - flush_transform_notifications
            this.viewport.parent = this.viewport._temp_node_2d_parent;
            this.viewport.update_transform();
            this.viewport.parent = null;

            // - process nodes
            this.current_scene._propagate_process(_process_tmp.real_delta * 0.001);

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
            this.input._process(_process_tmp.real_delta * 0.001);

            this.message_queue.flush();

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
            }
        }
        this.delete_queue.length = 0;
    }
}
