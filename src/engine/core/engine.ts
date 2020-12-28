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
    get_json_data,
} from 'engine/registry';
import { get_extname } from 'engine/utils/string';

import { VSG } from 'engine/servers/visual/visual_server_globals.js';

import { ResourceLoader } from './io/resource_loader.js';
import { decompress } from './io/z.js';

import { default_font_name, Theme } from 'engine/scene/resources/theme.js';
import { registered_bitmap_fonts } from 'engine/scene/resources/font.js';
import { PackedScene } from 'engine/scene/resources/packed_scene';

import meta from 'gen/meta.json';
import { ImageTexture } from 'engine/scene/resources/texture.js';

type ProgressCallback = (percent: number) => any;
type CompleteCallback = Function;

export class Engine {
    static get_singleton() { return singleton }

    /* public */

    iterations_per_second = 60;
    physics_jitter_fix = 0.5;
    time_scale = 1.0;

    use_pixel_snap = false;

    /* private */

    in_physics_frame = false;
    physics_frames = 0;
    idle_frames = 0;

    frames_drawn = 0;

    main_loop: import('engine/scene/main/scene_tree').SceneTree = null;

    _progress_callback: (progress: number, full: number) => any = null;

    constructor() {
        singleton = this;
    }

    is_in_physics_frame() { return this.in_physics_frame }

    get_frames_drawn() { return this.frames_drawn }

    get_main_loop() { return this.main_loop }
    set_main_loop(value: import('engine/scene/main/scene_tree').SceneTree) { this.main_loop = value }

    start_preload(progress_callback: (percent: number) => any, complete_callback: Function) {
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
            loader.resources['media/data.tres'] = undefined;

            // fetch resource map updated by loader
            let resource_map = get_resource_map();
            let raw_resource_map = get_raw_resource_map();

            // merge resources data into our existing resources
            resource_map = Object.assign(resource_map, resources);
            raw_resource_map = Object.assign(raw_resource_map, resources, loader.resources);

            // override
            set_resource_map(resource_map);
            set_raw_resource_map(raw_resource_map);
            set_json_pack_list(meta["json_files"].map((url: string) => {
                let raw = raw_resource_map[url].data;
                raw_resource_map[url] = undefined;
                loader.resources[url] = undefined;
                return JSON.parse(decompress(raw));
            }));
            set_binary_pack_list(meta["binary_files"].map((url: string) => {
                let raw = raw_resource_map[url].data;
                raw_resource_map[url] = undefined;
                loader.resources[url] = undefined;
                return raw;
            }));

            let process_queue: any[] = [];
            const register_task = (e: any) => {
                process_queue.push(e);
            }
            const on_task_done = (e: any) => {
                let idx = process_queue.indexOf(e);
                if (idx >= 0) {
                    process_queue.splice(idx, 1);

                    if (process_queue.length === 0) {
                        on_preload_finished();
                    }
                }
            }
            const on_preload_finished = () => {
                /** @type {string[]} */
                const resource_check_ignores: string[] = meta['resource_check_ignores'];

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

                loader.resources = null;
            }

            // process preload resources
            // - create textures for standalone images
            let standalone_image_meta = meta["standalone_images"] as { pack_id: number, images: { key: string, flags: { FILTER?: boolean, REPEAT?: boolean, MIRROR?: boolean } }[] };
            let image_pack = get_json_data(standalone_image_meta.pack_id) as string[];
            standalone_image_meta.images.forEach(({ key, flags }, i) => {
                let ext = get_extname(key);

                let tex = new ImageTexture;
                tex.resource_path = key;
                tex.resource_name = key;

                let img = new Image;
                img.src = `data:image/${ext};base64,${image_pack[i]}`; // base64
                img.onload = () => {
                    tex.create_from_image(img, flags);
                    on_task_done(tex);
                }
                resource_map[key] = tex;

                register_task(tex);
            });

            // no longer need raw image data
            image_pack.length = 0;

            // no tasks to process
            if (process_queue.length === 0) {
                on_preload_finished();
            }
        });
    }
}

let singleton: Engine = null;


const sub_head = '@sub#';
const ext_head = '@ext#';

function normalize_resource_object(obj: any, ext: any, sub: any) {
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

function normalize_resource_array(arr: any[], ext: any, sub: any) {
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
