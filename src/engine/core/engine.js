import {
    preload_queue,
    res_class_map,
    scene_class_map,
    set_resource_map,
    set_raw_resource_map,
    get_resource_map,
    get_raw_resource_map,
    set_binary_pack_list,
} from 'engine/registry';

import { ResourceLoader } from './io/resource_loader';
import { decompress } from './io/z';

import { default_font_name, Theme } from 'engine/scene/resources/theme';
import { registered_bitmap_fonts } from 'engine/scene/resources/font';
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
        preload_queue.queue.unshift([`media/data.vt`]);
        for (const settings of preload_queue.queue) {
            loader.add.call(loader, ...settings);
        }
        for (const b of meta["binary_files"]) {
            loader.add.call(loader, b);
        }
        for (const b of meta["json_files"]) {
            loader.add.call(loader, b);
        }

        if (progress_callback) {
            loader.connect('progress', () => {
                progress_callback(loader.progress);
            })
        }

        loader.load(() => {
            preload_queue.is_complete = true;
            Theme.set_default_font(registered_bitmap_fonts[default_font_name]);

            let res_str = decompress(loader.resources['media/data.vt'].data);
            let resources = JSON.parse(res_str);

            // fetch resource map updated by loader
            let resource_map = get_resource_map();
            let raw_resource_map = get_raw_resource_map();

            // merge resources data into our existing resources
            resource_map = Object.assign(resource_map, resources);
            raw_resource_map = Object.assign(raw_resource_map, resources, loader.resources);

            // override
            set_resource_map(resource_map);
            set_raw_resource_map(raw_resource_map);
            set_binary_pack_list(meta["json_files"].map(url => JSON.parse(decompress(raw_resource_map[url].data))));
            set_binary_pack_list(meta["binary_files"].map(url => raw_resource_map[url].data));

            /** @type {string[]} */
            const resource_check_ignores = meta['resource_check_ignores'];

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
                                if (resource_check_ignores.indexOf(resource_filename) < 0) {
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
                        for (let i = 0; i < res.sub.length; i++) {
                            let data = res.sub[i];
                            let id = data.id;
                            normalize_resource_object(data, res.ext, res.sub);

                            const ctor = res_class_map[data.type];
                            if (ctor) {
                                data = (new ctor)._load_data(data);
                                data.__rid__ = `${id}`;
                                res.sub[i] = data;
                            }
                        }
                    }

                    // process resource first
                    if (res.resource && res.resource.type) {
                        /* { ext, sub, resource } */

                        normalize_resource_object(res.resource, res.ext || {}, res.sub || []);

                        const ctor = res_class_map[res.resource.type];
                        if (ctor) {
                            resource_map[key] = (new ctor)._load_data(res.resource);
                        }
                    } else if (res.type != 'PackedScene') {
                        /* the res itself is the data */

                        // FIXME: pure data does not have a resource property?
                        // if (res.resource) {
                        //     normalize_resource_object(res.resource, res.ext || {}, res.sub || []);
                        // }

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
                    normalize_resource_array(res.nodes, res.ext || {}, res.sub || []);
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
 * @param {any[]} sub
 */
function normalize_res(key, ext, sub) {
    if (key.startsWith(sub_head)) {
        let id = key.substr(sub_offset);
        for (let i = 0; i < sub.length; i++) {
            if (sub[i].__rid__ === id) return sub[i];
        }
    } else if (key.startsWith(ext_head)) {
        return ext[key.substr(ext_offset)];
    }
    return key;
}
/**
 * @param {any} obj
 * @param {any} ext
 * @param {any[]} sub
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
 * @param {any[]} sub
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
