import * as PIXI from 'engine';
import visual_server from './VisualServer';


export const STRETCH_MODE_DISABLED = 0;
export const STRETCH_MODE_2D = 1;
export const STRETCH_MODE_VIEWPORT = 2;

export const STRETCH_ASPECT_IGNORE = 0;
export const STRETCH_ASPECT_KEEP = 1;
export const STRETCH_ASPECT_KEEP_WIDTH = 2;
export const STRETCH_ASPECT_KEEP_HEIGHT = 3;


const DefaultConfig = {
    view: 'game',
    container: 'container',

    width: 256,
    height: 256,

    FPS: 60,

    main_scene: null,
};


export class SceneTree {
    constructor() {
        this.paused = false;
        this.debug_collisions_hint = false;

        this.grouped_nodes = {};

        this.current_scene = null;

        this.stretch_mode = STRETCH_MODE_DISABLED;
        this.stretch_aspect = STRETCH_ASPECT_IGNORE;

        this.view = null;
        this.container = null;

        this._config = {};
        this._tick = this._tick.bind(this);
        this._loop_id = 0;
        this._initialize = this._initialize.bind(this);
        this._next_scene_ctor = null;
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
    init(config) {
        this._config = Object.assign(this._config, DefaultConfig, config);

        this._next_scene_ctor = this._config.main_scene;

        window.addEventListener('load', this._initialize, false);
        document.addEventListener('DOMContentLoaded', this._initialize, false);
    }

    is_paused() {}
    is_debugging_collisions_hint() {}

    get_nodes_in_group() {}

    change_scene_to(scene_class) {}
    get_current_scene() {}
    reload_current_scene() {}

    set_pause(pause) {}

    set_screen_stretch(mode, aspect, minsize) {}

    set_debug_collisions_hint(enable) {}

    // Private
    _initialize() {
        window.removeEventListener('load', this._initialize);
        document.removeEventListener('DOMContentLoaded', this._initialize);

        this.view = document.getElementById(this._config.view);
        this.container_view = document.getElementById(this._config.container);

        // TODO: move all these configs to project settings, the same as Godot
        visual_server.init({
            width: this._config.width,
            height: this._config.height,
            resolution: window.deivcePixelRatio,

            view: this.view,

            antialias: false,
            transparent: false,
            roundPixels: true,
        });

        this._start_loop();
    }
    _start_loop() {
        this._loop_id = requestAnimationFrame(this._tick);
    }
    _tick(timestamp) {
        this._loop_id = requestAnimationFrame(this._tick);

        if (this._next_scene_ctor) {
            if (this.current_scene) {
                this.current_scene._exit_tree();
                this.current_scene.free();
                this.current_scene = null;
            }

            this.current_scene = this._next_scene_ctor.instance();
            this.current_scene._enter_tree();
            this.current_scene._ready();

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
              _process_tmp.step = 1000.0 / this._config.FPS;
              _process_tmp.slow_step = _process_tmp.step * 1;
              _process_tmp.slow_step_sec = _process_tmp.step * 0.001 * 1;

              // Accumulate time until the step threshold is met or exceeded... up to a limit of 3 catch-up frames at step intervals
              _process_tmp.delta_time += Math.max(Math.min(_process_tmp.step * 3, _process_tmp.real_delta), 0);

              // Call the game update logic multiple times if necessary to "catch up" with dropped frames
              // unless forceSingleUpdate is true
              _process_tmp.count = 0;

              while (_process_tmp.delta_time >= _process_tmp.step) {
                _process_tmp.delta_time -= _process_tmp.step;

                // Fixed update
                this.current_scene._process(_process_tmp.slow_step_sec);

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
            visual_server.render(this.current_scene);
        }
    }
    _end_loop() {
        cancelAnimationFrame(this._loop_id);
    }
}


export default new SceneTree();
