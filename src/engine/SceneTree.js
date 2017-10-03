import VisualServer from './VisualServer';
import PhysicsServer from './PhysicsServer';
import MessageQueue from './MessageQueue';
import { Node2D, Vector } from './core';

import { outer_box_resize } from './resize';
import remove_items from 'remove-array-items';


const DefaultSettings = {
    application: {
        name: 'Voltar',
        main_scene: undefined,
    },
    display: {
        view: 'game',
        container: 'container',

        width: 400,
        height: 250,
        resolution: 1,

        background_color: 0x000000,

        force_canvas: false,
        antialias: false,
        pixel_snap: true,
        scale_mode: 'linear',


        FPS: 60,

        stretch_mode: 'viewport',
        stretch_aspect: 'keep',
    },
};


export default class SceneTree {
    constructor(input) {
        this.paused = false;
        this.debug_collisions_hint = false;

        this.grouped_nodes = Object.create(null);
        this.delete_queue = [];

        this.current_scene = null;
        this.viewport = new Node2D();
        this.viewport.scene_tree = this;
        this.viewport.is_inside_tree = true;
        this.viewport._is_ready = true;
        this.viewport_rect = {
            position: new Vector(0, 0),
            size: new Vector(1, 1),
        };

        this.stretch_mode = 'viewport';
        this.stretch_aspect = 'keep';

        this.view = null;
        this.container = null;

        this.time_scale = 1;

        this.visual_server = new VisualServer();
        this.physics_server = new PhysicsServer();
        this.message_queue = new MessageQueue();
        this.input = input;

        this._settings = {};
        this._tick_bind = this._tick.bind(this);
        this._loop_id = 0;
        this._initialize = this._initialize.bind(this);
        this._next_scene_ctor = null;
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
    init(settings) {
        this._settings = Object.assign(this._settings, DefaultSettings, settings);

        this.change_scene_to(this._settings.application.main_scene);

        window.addEventListener('load', this._initialize, false);
        document.addEventListener('DOMContentLoaded', this._initialize, false);
    }

    is_paused() {}
    is_debugging_collisions_hint() {}

    queue_delete(node) {
        node.is_queued_for_deletion = true;
        this.delete_queue.push(node);
    }
    get_nodes_in_group(group) {
        return this.grouped_nodes[group];
    }
    add_node_to_group(node, group_p) {
        let group = this.grouped_nodes[group_p];
        if (!group) {
            group = this.grouped_nodes[group_p] = [];
        }
        if (group.indexOf(node) < 0) {
            group.push(node);
        }
    }
    remove_node_from_group(node, group_p) {
        let group = this.grouped_nodes[group_p];
        if (group) {
            let idx = group.indexOf(node);
            if (idx >= 0) {
                remove_items(group, idx, 1);
            }
        }
    }

    get_root() {
        return this.viewport;
    }

    change_scene_to(scene_ctor) {
        this._next_scene_ctor = scene_ctor;
    }
    get_current_scene() {
        return this.current_scene;
    }
    reload_current_scene() {
        this._next_scene_ctor = this._current_scene_ctor;
    }

    set_pause(pause) {}
    set_time_scale(scale) {
        this.time_scale = Math.max(0, scale);
    }

    set_screen_stretch(mode, aspect, minsize) {}

    set_debug_collisions_hint(enable) {}

    // Private
    _initialize() {
        window.removeEventListener('load', this._initialize);
        document.removeEventListener('DOMContentLoaded', this._initialize);

        this.view = document.getElementById(this._settings.display.view);
        this.container = document.getElementById(this._settings.display.container);

        // TODO: move all these configs to project settings, the same as Godot
        this.visual_server.init({
            view: this.view,

            width: this._settings.display.width,
            height: this._settings.display.height,
            resolution: this._settings.display.resolution,

            background_color: this._settings.display.background_color,

            force_canvas: this._settings.display.force_canvas,
            antialias: this._settings.display.antialias,
            pixel_snap: this._settings.display.pixel_snap,

            auto_resize: false,
            transparent: false,
            force_fxaa: false,
            clear_before_render: true,
            preserve_drawing_buffer: false,
        });

        this.physics_server.init();

        // Listen to the resize and orientation events
        const on_window_resize = () => {
            let result;
            switch (this._settings.display.stretch_mode) {
                case 'disabled':
                    this.visual_server.renderer.resize(window.innerWidth, window.innerHeight);
                    this.view.width = window.innerWidth * this.visual_server.renderer.resolution;
                    this.view.height = window.innerHeight * this.visual_server.renderer.resolution;
                    this.view.style.width = `${window.innerWidth}px`;
                    this.view.style.height = `${window.innerHeight}px`;
                    this.viewport_rect.size.set(window.innerWidth, window.innerHeight);
                    this.viewport_rect.position.set(0, 0);
                    break;
                case '2D':
                    switch (this._settings.display.stretch_aspect) {
                        case 'ignore':
                            this.visual_server.renderer.resize(window.innerWidth, window.innerHeight);
                            this.view.width = window.innerWidth * this.visual_server.renderer.resolution;
                            this.view.height = window.innerHeight * this.visual_server.renderer.resolution;
                            this.viewport.scale.set(window.innerWidth / this._settings.display.width, window.innerHeight / this._settings.display.height);
                            this.view.style.width = `${window.innerWidth}px`;
                            this.view.style.height = `${window.innerHeight}px`;
                            this.viewport_rect.size.set(this._settings.display.width, this._settings.display.height);
                            this.viewport_rect.position.set(0, 0);
                            break;
                        case 'keep':
                            result = outer_box_resize(window.innerWidth, window.innerHeight, this._settings.display.width, this._settings.display.height);
                            let width = (this._settings.display.width * result.scale) | 0;
                            let height = (this._settings.display.height * result.scale) | 0;
                            this.visual_server.renderer.resize(width, height);
                            this.viewport.scale.set(result.scale, result.scale);
                            this.view.width = width * this.visual_server.renderer.resolution;
                            this.view.height = height * this.visual_server.renderer.resolution;
                            this.view.style.width = `${width}px`;
                            this.view.style.height = `${height}px`;
                            this.view.style.marginLeft = `${result.left}px`;
                            this.view.style.marginTop = `${result.top}px`;
                            this.viewport_rect.size.set(width, height);
                            this.viewport_rect.position.set(result.left, result.top);
                            break;
                        case 'keep_width':
                            if (window.innerWidth / window.innerHeight > this._settings.display.width / this._settings.display.height) {
                                let scale = window.innerHeight / this._settings.display.height;
                                let width = (this._settings.display.width * scale) | 0;
                                let height = (width * (this._settings.display.height / this._settings.display.width)) | 0;
                                this.visual_server.renderer.resize(width, height);
                                this.viewport.scale.set(scale, scale);
                                this.view.width = width * this.visual_server.renderer.resolution;
                                this.view.height = height * this.visual_server.renderer.resolution;
                                this.view.style.width = `${width}px`;
                                this.view.style.height = `${height}px`;
                                this.view.style.marginLeft = `${((window.innerWidth - width) * 0.5) | 0}px`;
                                this.viewport_rect.size.set(width, height);
                                this.viewport_rect.position.set(((window.innerWidth - width) * 0.5) | 0, 0);
                            }
                            else {
                                let scale = window.innerWidth / this._settings.display.width;
                                let width = window.innerWidth;
                                let height = window.innerHeight;
                                this.visual_server.renderer.resize(width, height);
                                this.viewport.scale.set(scale, scale);
                                this.view.width = width * this.visual_server.renderer.resolution;
                                this.view.height = height * this.visual_server.renderer.resolution;
                                this.view.style.width = `${width}px`;
                                this.view.style.height = `${height}px`;
                                this.view.style.marginLeft = `0px`;
                                this.view.style.marginTop = `0px`;
                                this.viewport_rect.size.set(width, height);
                                this.viewport_rect.position.set(0, 0);
                            }
                            break;
                        case 'keep_height':
                            if (window.innerWidth / window.innerHeight < this._settings.display.width / this._settings.display.height) {
                                let scale = window.innerWidth / this._settings.display.width;
                                let height = (this._settings.display.height * scale) | 0;
                                let width = (height * (this._settings.display.height / this._settings.display.width)) | 0;
                                this.visual_server.renderer.resize(width, height);
                                this.viewport.scale.set(scale, scale);
                                this.view.style.width = `${width}px`;
                                this.view.style.height = `${height}px`;
                                this.view.style.marginTop = `${((window.innerHeight - height) * 0.5) | 0}px`;
                                this.viewport_rect.size.set(width, height);
                                this.viewport_rect.position.set(0, ((window.innerHeight - height) * 0.5) | 0);
                            }
                            else {
                                let scale = window.innerHeight / this._settings.display.height;
                                let height = window.innerHeight;
                                let width = window.innerWidth;
                                this.visual_server.renderer.resize(width, height);
                                this.viewport.scale.set(scale, scale);
                                this.view.width = width * this.visual_server.renderer.resolution;
                                this.view.height = height * this.visual_server.renderer.resolution;
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
                    switch (this._settings.display.stretch_aspect) {
                        case 'ignore':
                            this.view.style.width = `${window.innerWidth}px`;
                            this.view.style.height = `${window.innerHeight}px`;
                            this.view.style.marginLeft = `0`;
                            this.view.style.marginTop = `0`;
                            this.viewport_rect.size.set(this._settings.display.width, this._settings.display.height);
                            this.viewport_rect.position.set(0, 0);
                            break;
                        case 'keep':
                            result = outer_box_resize(window.innerWidth, window.innerHeight, this._settings.display.width, this._settings.display.height);
                            this.view.style.width = `${(this._settings.display.width * result.scale) | 0}px`;
                            this.view.style.height = `${(this._settings.display.height * result.scale) | 0}px`;
                            this.view.style.marginLeft = `${result.left | 0}px`;
                            this.view.style.marginTop = `${result.top | 0}px`;
                            this.viewport_rect.size.set(this._settings.display.width, this._settings.display.height);
                            this.viewport_rect.position.set(result.left | 0, result.top | 0);
                            break;
                        case 'keep_width':
                            if (window.innerWidth / window.innerHeight > this._settings.display.width / this._settings.display.height) {
                                let scale = window.innerHeight / this._settings.display.height;
                                let width = (this._settings.display.width * scale) | 0;
                                this.view.style.width = `${width}px`;
                                this.view.style.height = `${(width * (this._settings.display.height / this._settings.display.width)) | 0}px`;
                                this.view.style.marginLeft = `${(window.innerWidth - width) * 0.5}px`;
                            this.viewport_rect.size.set(this._settings.display.width, this._settings.display.height);
                                this.viewport_rect.position.set(((window.innerWidth - width) * 0.5) | 0, 0);
                            }
                            else {
                                let scale = this._settings.display.width / window.innerWidth;
                                this.visual_server.renderer.resize(this._settings.display.width, (window.innerHeight * scale) | 0);
                                this.view.style.width = `${window.innerWidth}px`;
                                this.view.style.height = `${window.innerHeight}px`;
                                this.view.style.marginLeft = `0px`;
                                this.view.style.marginTop = `0px`;
                                this.viewport_rect.size.set(this._settings.display.width, (window.innerHeight * scale) | 0);
                                this.viewport_rect.position.set(0, 0);
                            }
                            break;
                        case 'keep_height':
                            if (window.innerWidth / window.innerHeight < this._settings.display.width / this._settings.display.height) {
                                let scale = window.innerWidth / this._settings.display.width;
                                let height = (this._settings.display.height * scale) | 0;
                                this.view.style.width = `${(height * (this._settings.display.height / this._settings.display.width)) | 0}px`;
                                this.view.style.height = `${height}px`;
                                this.view.style.marginTop = `${((window.innerHeight - height) * 0.5) | 0}px`;
                                this.viewport_rect.size.set(this._settings.display.width, this._settings.display.height);
                                this.viewport_rect.position.set(0, ((window.innerHeight - health) * 0.5) | 0);
                            }
                            else {
                                let scale = this._settings.display.height / window.innerHeight;
                                this.visual_server.renderer.resize((window.innerWidth * scale) | 0, this._settings.display.height);
                                this.view.style.width = `${window.innerWidth}px`;
                                this.view.style.height = `${window.innerHeight}px`;
                                this.view.style.marginLeft = `0px`;
                                this.view.style.marginTop = `0px`;
                                this.viewport_rect.size.set((window.innerWidth * scale) | 0, this._settings.display.height);
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
        setTimeout(on_window_resize, 1);

        // Init input
        this.input._init(this.viewport);

        // Start the main loop
        this._start_loop();
    }
    _start_loop() {
        this._loop_id = requestAnimationFrame(this._tick_bind);
    }
    _tick(timestamp) {
        this._loop_id = requestAnimationFrame(this._tick_bind);

        if (this._next_scene_ctor) {
            if (this.current_scene) {
                this.viewport.remove_children();
                this.current_scene = null;
            }

            this.current_scene = this._next_scene_ctor.instance();
            this.current_scene.scene_tree = this;
            this.viewport.add_child(this.current_scene);

            this._current_scene_ctor = this._next_scene_ctor;
            this._next_scene_ctor = null;
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
              _process_tmp.step = 1000.0 / this._settings.display.FPS;
              _process_tmp.slow_step = _process_tmp.step * this.time_scale;
              _process_tmp.slow_step_sec = _process_tmp.step * 0.001 * this.time_scale;

              // Accumulate time until the step threshold is met or exceeded... up to a limit of 3 catch-up frames at step intervals
              _process_tmp.delta_time += Math.max(Math.min(_process_tmp.step * 3, _process_tmp.real_delta), 0);

              // Call the game update logic multiple times if necessary to "catch up" with dropped frames
              // unless forceSingleUpdate is true
              _process_tmp.count = 0;

              while (_process_tmp.delta_time >= _process_tmp.step) {
                _process_tmp.delta_time -= _process_tmp.step;

                // Fixed update
                // - update transforms
                this.viewport.parent = this.viewport._tempNode2DParent;
                this.viewport.update_transform();
                this.viewport.parent = null;
                // - process nodes
                this.current_scene._propagate_process(_process_tmp.slow_step_sec);
                // - solve collision
                this.physics_server.solve_collision(this.current_scene);
                // - message queue
                this.message_queue.flush();

                this._flush_delete_queue();

                // - input
                this.input._process(_process_tmp.slow_step_sec);

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
            // FIX ME: do we need this process method?
            // this.current_scene._process(_process_tmp.real_delta * 0.001);

            // Render
            this.visual_server.render(this.viewport);
        }
    }
    _end_loop() {
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
