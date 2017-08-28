import VisualServer from './VisualServer';
import PhysicsServer from './PhysicsServer';
import { Node2D } from './core';

import { outer_box_resize } from './resize';


const DefaultSettings = {
    application: {
        name: 'Voltar',
        main_scene: 'boot/scene',
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


const visual_server = new VisualServer();
const physics_server = new PhysicsServer();


export default class SceneTree {
    constructor() {
        this.paused = false;
        this.debug_collisions_hint = false;

        this.grouped_nodes = {};
        this.delete_queue = [];

        this.current_scene = null;
        this.viewport = new Node2D();

        this.stretch_mode = 'viewport';
        this.stretch_aspect = 'keep';

        this.view = null;
        this.container = null;

        this.time_scale = 1;

        this._settings = {};
        this._tick = this._tick.bind(this);
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
    get_nodes_in_group() {}

    get_root() {
        return this.viewport;
    }

    change_scene_to(scene_path) {
        this._next_scene_ctor = require(`game/${scene_path}`).default;
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
        this.container_view = document.getElementById(this._settings.display.container);

        // TODO: move all these configs to project settings, the same as Godot
        visual_server.init({
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

        physics_server.init();

        // Listen to the resize and orientation events
        const on_window_resize = () => {
            let result;
            switch (this._settings.display.stretch_mode) {
                case 'disabled':
                    visual_server.renderer.resize(window.innerWidth, window.innerHeight);
                    this.view.width = window.innerWidth * visual_server.renderer.resolution;
                    this.view.height = window.innerHeight * visual_server.renderer.resolution;
                    this.view.style.width = `${window.innerWidth}px`;
                    this.view.style.height = `${window.innerHeight}px`;
                    break;
                case '2D':
                    switch (this._settings.display.stretch_aspect) {
                        case 'ignore':
                            visual_server.renderer.resize(window.innerWidth, window.innerHeight);
                            this.view.width = window.innerWidth * visual_server.renderer.resolution;
                            this.view.height = window.innerHeight * visual_server.renderer.resolution;
                            this.viewport.scale.set(window.innerWidth / this._settings.display.width, window.innerHeight / this._settings.display.height);
                            this.view.style.width = `${window.innerWidth}px`;
                            this.view.style.height = `${window.innerHeight}px`;
                            break;
                        case 'keep':
                            result = outer_box_resize(window.innerWidth, window.innerHeight, this._settings.display.width, this._settings.display.height);
                            let width = this._settings.display.width * result.scale;
                            let height = this._settings.display.height * result.scale;
                            visual_server.renderer.resize(width, height);
                            this.viewport.scale.set(result.scale, result.scale);
                            this.view.width = width * visual_server.renderer.resolution;
                            this.view.height = height * visual_server.renderer.resolution;
                            this.view.style.width = `${width}px`;
                            this.view.style.height = `${height}px`;
                            this.view.style.marginLeft = `${result.left}px`;
                            this.view.style.marginTop = `${result.top}px`;
                            break;
                        case 'keep_width':
                            if (window.innerWidth / window.innerHeight > this._settings.display.width / this._settings.display.height) {
                                let scale = window.innerHeight / this._settings.display.height;
                                let width = this._settings.display.width * scale;
                                let height = width * (this._settings.display.height / this._settings.display.width);
                                visual_server.renderer.resize(width, height);
                                this.viewport.scale.set(scale, scale);
                                this.view.width = width * visual_server.renderer.resolution;
                                this.view.height = height * visual_server.renderer.resolution;
                                this.view.style.width = `${width}px`;
                                this.view.style.height = `${height}px`;
                                this.view.style.marginLeft = `${(window.innerWidth - width) * 0.5}px`;
                            }
                            else {
                                let scale = window.innerWidth / this._settings.display.width;
                                let width = window.innerWidth;
                                let height = window.innerHeight;
                                visual_server.renderer.resize(width, height);
                                this.viewport.scale.set(scale, scale);
                                this.view.width = width * visual_server.renderer.resolution;
                                this.view.height = height * visual_server.renderer.resolution;
                                this.view.style.width = `${width}px`;
                                this.view.style.height = `${height}px`;
                                this.view.style.marginLeft = `0px`;
                                this.view.style.marginTop = `0px`;
                            }
                            break;
                        case 'keep_height':
                            if (window.innerWidth / window.innerHeight < this._settings.display.width / this._settings.display.height) {
                                let scale = window.innerWidth / this._settings.display.width;
                                let height = this._settings.display.height * scale;
                                let width = height * (this._settings.display.height / this._settings.display.width);
                                visual_server.renderer.resize(width, height);
                                this.viewport.scale.set(scale, scale);
                                this.view.style.width = `${width}px`;
                                this.view.style.height = `${height}px`;
                                this.view.style.marginTop = `${(window.innerHeight - height) * 0.5}px`;
                            }
                            else {
                                let scale = window.innerHeight / this._settings.display.height;
                                let height = window.innerHeight;
                                let width = window.innerWidth;
                                visual_server.renderer.resize(width, height);
                                this.viewport.scale.set(scale, scale);
                                this.view.width = width * visual_server.renderer.resolution;
                                this.view.height = height * visual_server.renderer.resolution;
                                this.view.style.width = `${width}px`;
                                this.view.style.height = `${height}px`;
                                this.view.style.marginLeft = `0px`;
                                this.view.style.marginTop = `0px`;
                            }
                            break;
                    }
                    break;
                case 'viewport':
                    switch (this._settings.display.stretch_aspect) {
                        case 'ignore':
                            this.view.style.width = `${window.innerWidth}px`;
                            this.view.style.height = `${window.innerHeight}px`;
                            break;
                        case 'keep':
                            result = outer_box_resize(window.innerWidth, window.innerHeight, this._settings.display.width, this._settings.display.height);
                            this.view.style.width = `${this._settings.display.width * result.scale}px`;
                            this.view.style.height = `${this._settings.display.height * result.scale}px`;
                            this.view.style.marginLeft = `${result.left}px`;
                            this.view.style.marginTop = `${result.top}px`;
                            break;
                        case 'keep_width':
                            if (window.innerWidth / window.innerHeight > this._settings.display.width / this._settings.display.height) {
                                let scale = window.innerHeight / this._settings.display.height;
                                let width = this._settings.display.width * scale;
                                this.view.style.width = `${width}px`;
                                this.view.style.height = `${width * (this._settings.display.height / this._settings.display.width)}px`;
                                this.view.style.marginLeft = `${(window.innerWidth - width) * 0.5}px`;
                            }
                            else {
                                let scale = this._settings.display.width / window.innerWidth;
                                visual_server.renderer.resize(this._settings.display.width, window.innerHeight * scale);
                                this.view.style.width = `${window.innerWidth}px`;
                                this.view.style.height = `${window.innerHeight}px`;
                                this.view.style.marginLeft = `0px`;
                                this.view.style.marginTop = `0px`;
                            }
                            break;
                        case 'keep_height':
                            if (window.innerWidth / window.innerHeight < this._settings.display.width / this._settings.display.height) {
                                let scale = window.innerWidth / this._settings.display.width;
                                let height = this._settings.display.height * scale;
                                this.view.style.width = `${height * (this._settings.display.height / this._settings.display.width)}px`;
                                this.view.style.height = `${height}px`;
                                this.view.style.marginTop = `${(window.innerHeight - height) * 0.5}px`;
                            }
                            else {
                                let scale = this._settings.display.height / window.innerHeight;
                                visual_server.renderer.resize(window.innerWidth * scale, this._settings.display.height);
                                this.view.style.width = `${window.innerWidth}px`;
                                this.view.style.height = `${window.innerHeight}px`;
                                this.view.style.marginLeft = `0px`;
                                this.view.style.marginTop = `0px`;
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

        // Start the main loop
        this._start_loop();
    }
    _start_loop() {
        this._loop_id = requestAnimationFrame(this._tick);
    }
    _tick(timestamp) {
        this._loop_id = requestAnimationFrame(this._tick);

        if (this._next_scene_ctor) {
            if (this.current_scene) {
                this.current_scene._propagate_exit_tree();
                this.current_scene.scene_tree = null;
                this.viewport.remove_children();
                this.current_scene = null;
            }

            this.current_scene = this._next_scene_ctor.instance();
            this.current_scene.scene_tree = this;
            this.viewport.add_child(this.current_scene);
            this.current_scene._propagate_enter_tree();
            this.current_scene._propagate_ready();

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
                // - process nodes
                this.current_scene._propagate_process(_process_tmp.slow_step_sec);
                // - update transforms
                this.viewport.parent = this.viewport._tempNode2DParent;
                this.viewport.update_transform();
                this.viewport.parent = null;
                // - solve collision
                physics_server.solve_collision(this.current_scene);

                this._flush_delete_queue();

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
            visual_server.render(this.viewport);
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
