import { default_font_name } from 'engine/scene/resources/theme';
import { preload_queue, resource_map, res_procs } from 'engine/registry';
import { ResourceLoader } from './io/resource_loader';

/**
 * @typedef {(percent: number) => any} ProgressCallback
 * @typedef {Function} CompleteCallback
 */

export class Engine {
    static get_singleton() { return singleton }

    constructor() {
        singleton = this;

        /* public */

        this.iterations_per_second = 60;
        this.physics_jitter_fix = 0.5;
        this.time_scale = 1.0;

        this.use_pixel_snap = false;

        /* private */

        this.in_physics_frame = false;
        this.physics_frames = 0;
        this.idle_frames = 0;

        /** @type {import('engine/scene/main/scene_tree').SceneTree} */
        this.main_loop = null;

        /** @type {(progress: number, full: number) => any} */
        this._progress_callback = null;
    }

    is_in_physics_frame() { return this.in_physics_frame }

    get_main_loop() { return this.main_loop }
    set_main_loop(value) {
        this.main_loop = value;
    }

    /**
     * @param {(percent: number) => any} progress_callback
     * @param {Function} complete_callback
     */
    start_preload(progress_callback, complete_callback) {
        // Initialize loader here since our plugins are all
        // registered now
        const loader = new ResourceLoader();
        preload_queue.is_start = true;

        // Load resources marked as preload
        preload_queue.queue.unshift([`media/${default_font_name}.fnt`]);
        for (const settings of preload_queue.queue) {
            loader.add.call(loader, ...settings);
        }

        if (progress_callback) {
            loader.connect('progress', () => {
                progress_callback(loader.progress);
            })
        }

        loader.load(() => {
            preload_queue.is_complete = true;
            // Theme.set_default_font(registered_bitmap_fonts[default_font_name]);

            // Process imported resources
            const has = Object.prototype.hasOwnProperty;
            const type_key = '@type#';
            for (let k in resource_map) {
                if (has.call(resource_map[k], type_key)) {
                    resource_map[k] = res_procs[resource_map[k][type_key]](k, resource_map[k].data, resource_map);
                }
            }
            resource_map;

            complete_callback && complete_callback();
        });
    }
}

/** @type {Engine} */
let singleton = null;
