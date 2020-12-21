import {
    preload_queue,
    res_class_map,
    set_resource_map,
    set_raw_resource_map,
    get_resource_map,
    get_raw_resource_map,
    set_binary_pack_list,
    set_json_pack_list,
    scene_class_map,
} from 'engine/registry';

import { VSG } from 'engine/servers/visual/visual_server_globals.js';

import { ResourceLoader } from './io/resource_loader.js';
import { decompress } from './io/z.js';

import { default_font_name, Theme } from 'engine/scene/resources/theme.js';
import { registered_bitmap_fonts } from 'engine/scene/resources/font.js';
import { PackedScene } from 'engine/scene/resources/packed_scene';

import meta from 'gen/meta.json';

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
        preload_queue.queue.unshift([`media/data.tres`]);
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

            let res_str = decompress(loader.resources['media/data.tres'].data);
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
            set_json_pack_list(meta["json_files"].map(url => JSON.parse(decompress(raw_resource_map[url].data))));
            set_binary_pack_list(meta["binary_files"].map(url => raw_resource_map[url].data));

            /** @type {string[]} */
            const resource_check_ignores = meta['resource_check_ignores'];

            // create real resources from data imported from Godot
            const res_head = 'res://';
            for (const key in resource_map) {
                let res = resource_map[key];
                if (key.startsWith(res_head)) {
                    res.ext = res.ext || Object.create(null);
                    res.sub = res.sub || [];

                    if (res.ext) {
                        // replace ext index with real values
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

                            res.ext[id] = resource;
                        }
                    }

                    if (res.sub) {
                        // create sub resources if they are registered types
                        let sub_map = Object.create(null);

                        for (let i = 0; i < res.sub.length; i++) {
                            let data = res.sub[i];
                            let id = data.id;

                            data = normalize_resource_object(data, res.ext, sub_map);

                            const ctor = res_class_map[data.type];
                            if (ctor) {
                                data = (new ctor)._load_data(data);
                            }

                            sub_map[id] = data;
                        }

                        res.sub = sub_map;
                    }

                    if (res.resource && res.resource.type) {
                        /* Resource: { ext, sub, resource } */

                        res.resource = normalize_resource_object(res.resource, res.ext, res.sub);

                        const ctor = res_class_map[res.resource.type];
                        if (ctor) {
                            resource_map[key] = (new ctor)._load_data(res.resource);
                        }
                    } else if (res.type === "PackedScene" && res.nodes) {
                        /* PackedScene: { ext, sub, nodes } */

                        res.nodes = normalize_resource_array(res.nodes, res.ext, res.sub);

                        res = new PackedScene()._load_data(res);
                        res.filename = key;

                        // find script attached
                        let script = scene_class_map[key];
                        if (script) {
                            res.script = script;
                        }

                        resource_map[key] = res;
                    } else {
                        /* the res is pure data */

                        const ctor = res_class_map[res.type];
                        if (ctor) {
                            resource_map[key] = (new ctor)._load_data(res);
                        }
                    }
                }
            }

            for (let k in loader.resources) {
                if (!raw_resource_map[k]) {
                    raw_resource_map[k] = loader.resources[k];
                }
            }

            complete_callback && complete_callback();

            VSG.storage.update_onload_update_list();
        });
    }
}

/** @type {Engine} */
let singleton = null;


const sub_head = '@sub#';
const ext_head = '@ext#';
/**
 * @param {any} obj
 * @param {any} ext
 * @param {any} sub
 */
function normalize_resource_object(obj, ext, sub) {
    for (const k in obj) {
        const value = obj[k];
        if (Array.isArray(value)) {
            if (value.length > 0) {
                if (value[0] === sub_head) {
                    obj[k] = sub[value[1]];
                } else if (value[0] === ext_head) {
                    obj[k] = ext[value[1]];
                } else {
                    obj[k] = normalize_resource_array(value, ext, sub);
                }
            }
        } else if (typeof (value) === 'object') {
            obj[k] = normalize_resource_object(value, ext, sub);
        }
    }
    return obj;
}
/**
 * @param {any[]} arr
 * @param {any} ext
 * @param {any} sub
 */
function normalize_resource_array(arr, ext, sub) {
    for (let i = 0; i < arr.length; i++) {
        const value = arr[i];
        if (Array.isArray(value)) {
            if (value.length > 0) {
                if (value[0] === sub_head) {
                    arr[i] = sub[value[1]];
                } else if (value[0] === ext_head) {
                    arr[i] = ext[value[1]];
                } else {
                    arr[i] = normalize_resource_array(value, ext, sub);
                }
            }
        } else if (typeof (value) === 'object') {
            arr[i] = normalize_resource_object(value, ext, sub);
        }
    }
    return arr;
}
