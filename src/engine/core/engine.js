import {
    preload_queue,
    res_class_map,
    scene_class_map,
    resource_map,
    raw_resource_map,
} from 'engine/registry';
import { default_font_name } from 'engine/scene/resources/theme';
import { ResourceLoader } from './io/resource_loader';
import { instanciate_scene } from 'engine/scene/assembler';
import meta from 'meta.json';

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

        this.frames_drawn = 0;

        /** @type {import('engine/scene/main/scene_tree').SceneTree} */
        this.main_loop = null;

        /** @type {(progress: number, full: number) => any} */
        this._progress_callback = null;
    }

    is_in_physics_frame() { return this.in_physics_frame }

    get_frames_drawn() { return this.frames_drawn }

    get_main_loop() { return this.main_loop }
    set_main_loop(value) { this.main_loop = value }

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

            /** @type {string[]} */
            const resource_lookup_skip_list = meta['resource_lookup_skip_list'];

            // create real resources from data imported from Godot
            const res_head = 'res://';
            for (const key in resource_map) {
                const res = resource_map[key];
                if (key.startsWith(res_head)) {
                    if (res.ext) {
                        // create ext resource objects
                        for (let id in res.ext) {
                            const resource_filename = res.ext[id];
                            const resource = resource_map[resource_filename];

                            if (!resource) {
                                // is this one in our lookup skip list?
                                if (resource_lookup_skip_list.indexOf(resource_filename) < 0) {
                                    console.warn(`Resource with URL [${resource_filename}] not found`);
                                }
                                continue;
                            }

                            // is it a registered scene?
                            if (scene_class_map[resource_filename]) {
                                const self_data = resource.nodes[0];
                                const data_chain = [resource];
                                if (self_data.instance) {
                                    const idx = self_data.instance.substr(ext_offset);
                                    const parent = resource.ext[idx];
                                    for (const d of parent.data) {
                                        data_chain.unshift(d);
                                    }
                                }
                                const data = {
                                    data: data_chain,
                                    ctor: scene_class_map[resource_filename],
                                    filename: resource_filename,
                                };
                                res.ext[id] = data;

                                scene_class_map[resource_filename]['@data'] = data_chain;
                            }
                            // is it a PackedScene, let's make it a object with `instance` factory function
                            else if (resource.type === 'PackedScene') {
                                res.ext[id] = {
                                    instance: () => {
                                        return instanciate_scene(resource, resource_filename);
                                    },
                                };
                            }
                            // ok, it is just a normal one
                            else {
                                res.ext[id] = resource;
                            }
                        }
                    }
                    if (res.sub) {
                        // create sub resource objects
                        for (let id in res.sub) {
                            const data = res.sub[id];
                            normalize_resource_object(data, res.ext, res.sub);

                            const ctor = res_class_map[data.type];
                            if (ctor) {
                                res.sub[id] = (new ctor)._load_data(data);
                            }
                        }
                    }

                    // process resource first
                    if (res.type !== 'PackedScene') {
                        normalize_resource_array(res.resource, res.ext || {}, res.sub || {});

                        const ctor = res_class_map[res.type];
                        if (ctor) {
                            resource_map[key] = (new ctor)._load_data(res);
                        }
                    }
                }
            }

            for (const key in resource_map) {
                const res = resource_map[key];
                if (key.startsWith(res_head) && res.type === 'PackedScene') {
                    // now let's replace ext/sub references inside this resource with real instances
                    normalize_resource_array(res.nodes, res.ext || {}, res.sub || {});
                }
            }

            for (let k in loader.resources) {
                if (!raw_resource_map[k]) {
                    raw_resource_map[k] = loader.resources[k];
                }
            }

            complete_callback && complete_callback();
        });
    }
}

/** @type {Engine} */
let singleton = null;


const sub_head = '@sub#'; const sub_offset = sub_head.length;
const ext_head = '@ext#'; const ext_offset = ext_head.length;
/**
 * @param {string} key
 * @param {any} ext
 * @param {any} sub
 */
function normalize_res(key, ext, sub) {
    if (key.startsWith(sub_head)) {
        return sub[key.substr(sub_offset)];
    } else if (key.startsWith(ext_head)) {
        return ext[key.substr(ext_offset)];
    }
    return key;
}
/**
 * @param {any} obj
 * @param {any} ext
 * @param {any} sub
 */
function normalize_resource_object(obj, ext, sub) {
    for (const k in obj) {
        const value = obj[k];
        if (typeof (value) === 'string') {
            obj[k] = normalize_res(value, ext, sub);
        } else if (typeof (value) === 'object') {
            if (Array.isArray(value)) {
                normalize_resource_array(value, ext, sub);
            } else {
                normalize_resource_object(value, ext, sub);
            }
        }
    }
}
/**
 * @param {any[]} arr
 * @param {any} ext
 * @param {any} sub
 */
function normalize_resource_array(arr, ext, sub) {
    for (let i = 0; i < arr.length; i++) {
        const value = arr[i];
        if (typeof (value) === 'string') {
            arr[i] = normalize_res(value, ext, sub);
        } else if (typeof (value) === 'object') {
            normalize_resource_object(value, ext, sub);
        }
    }
}
