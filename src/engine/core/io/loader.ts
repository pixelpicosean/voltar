import { VObject } from "engine/core/v_object";
import { get_resource_map } from "engine/registry";
import { ImageTexture } from "engine/scene/resources/texture";

import { LoadTypes } from "./const";
import { decompress } from "./z";

class Task<T> {
    id = Task_uid++;

    type: LoadTypes = "invalid";
    ended: boolean = false;
    failed: boolean = false;

    loaded: number = 0;
    total: number = 1024;
    progress: number = 0.0;

    key: string = "";
    url: string = "";

    data: T = null;
}
let Task_uid = 1;

let queue: Task<any>[] = [];
let waiting_for_load = false;

export const loading_events = new VObject;

export function get_loading_progress(): number {
    if (queue.length === 0) return 1;

    let total = 0;
    let loaded = 0;

    let ended_tasks = 0;
    for (let task of queue) {
        total += task.total;
        loaded += task.loaded;

        if (task.ended) {
            ended_tasks += 1;
        }
    }

    if (total === 0) {
        /* cannot get any real load number, so count with file numbers */
        return ended_tasks / queue.length;
    } else {
        return loaded / total;
    }
}

export function prepare_for_load() {
    queue.length = 0;
}

export function start_to_load() {
    waiting_for_load = true;
}

export function clear_loading_queue() {
    queue.length = 0;
}

function check_queue_completion() {
    for (let task of queue) {
        if (!task.ended) return;
    }

    loading_events.emit_signal("load_all_completed");
}

function on_task_ended(task: Task<any>) {
    task.ended = true;

    if (waiting_for_load) {
        check_queue_completion();
    }
}

export function load_image(url: string, key?: string, load_callback?: (image: HTMLImageElement) => void): HTMLImageElement {
    let task: Task<HTMLImageElement> = new Task;
    task.key = key;
    task.url = url;
    task.type = "image";

    let img = new Image;
    img.src = url;
    task.data = img;
    img.addEventListener("load", () => {
        load_callback && load_callback(task.data);

        task.loaded = task.total;
        task.progress = 1;

        on_task_ended(task);
    }, false);
    img.addEventListener("progress", (e) => {
        task.loaded = e.loaded;
        task.total = e.total;
        task.progress = e.loaded / e.total;
    }, false);
    img.addEventListener("error", () => {
        task.failed = true;
        console.error(`Failed to load image "${url}"`);

        task.loaded = task.total;
        task.progress = 1;

        on_task_ended(task);
    }, false);

    let resources = get_resource_map();
    resources[key || url] = task.data;

    queue.push(task);

    return task.data;
}

export function load_texture(url: string, key?: string, flags?: { FILTER?: boolean, REPEAT?: boolean, MIPMAPS?: boolean }, load_callback?: (tex: ImageTexture) => void): ImageTexture {
    let task: Task<ImageTexture> = new Task;
    task.key = key;
    task.url = url;
    task.type = "image";

    let img = new Image;
    img.src = url;
    task.data = new ImageTexture;
    img.addEventListener("load", () => {
        task.data.create_from_image(img, flags);
        load_callback && load_callback(task.data);

        task.loaded = task.total;
        task.progress = 1;

        on_task_ended(task);
    }, false);
    img.addEventListener("progress", (e) => {
        task.loaded = e.loaded;
        task.total = e.total;
        task.progress = e.loaded / e.total;
    }, false);
    img.addEventListener("error", () => {
        task.failed = true;
        console.error(`Failed to load texture "${url}"`);

        task.loaded = task.total;
        task.progress = 1;

        on_task_ended(task);
    }, false);

    let resources = get_resource_map();
    resources[key || url] = task.data;

    queue.push(task);

    return task.data;
}

function create_xhr_task<T>(type: LoadTypes, response_type: XMLHttpRequestResponseType, onload: (value: T) => void, url: string, key?: string): Task<T> {
    let task: Task<T> = new Task;
    task.key = key;
    task.url = url;
    task.type = type;

    let xhr = new XMLHttpRequest;
    xhr.open("GET", url, true);

    xhr.responseType = response_type;
    xhr.addEventListener("error", () => {
        task.failed = true;
        console.error(`Failed to load ${type} file "${url}", code: ${xhr.status}, error: ${xhr.statusText}`);

        task.loaded = task.total;
        task.progress = 1;

        on_task_ended(task);
    }, false);
    xhr.addEventListener("timeout", () => {
        task.failed = true;
        console.error(`Loading of ${type} file "${url}" is timeout`);

        task.loaded = task.total;
        task.progress = 1;

        on_task_ended(task);
    }, false);
    xhr.addEventListener("abort", () => {
        task.failed = true;
        console.warn(`Loading of ${type} file "${url}" is abort by user`);

        task.loaded = task.total;
        task.progress = 1;

        on_task_ended(task);
    }, false);
    xhr.addEventListener("progress", (e) => {
        if (e && e.lengthComputable) {
            task.loaded = e.loaded;
            task.total = e.total;
            task.progress = e.loaded / e.total;
        }
    }, false);
    xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
            task.loaded = task.total;
            task.progress = 1;

            if (response_type === "text") {
                onload(xhr.responseText as any);
            } else {
                onload(xhr.response);
            }

            on_task_ended(task);
        }
    }, false);

    xhr.send();

    queue.push(task);

    return task;
}

export function load_json(url: string, key?: string): any {
    let task = create_xhr_task("json", "text", (text: string) => {
        try {
            let data = JSON.parse(text);
            Object.assign(task.data, data);
        } catch (e) {
            task.failed = true;
            console.error(`Failed to parse loaded JSON "${url}"`);
        }
    }, url, key);

    // create a placeholder object, real JSON data will be merged
    // while available
    task.data = Object.create(null);

    let resources = get_resource_map();
    resources[key || url] = task.data;

    return task.data;
}

/**
 * Load JSON data packed as `.tres` file
 */
export function load_tres(url: string, key?: string): any {
    let task = create_xhr_task("text", "text", (text: string) => {
        try {
            let data = JSON.parse(decompress(text));
            Object.assign(task.data, data);
        } catch (e) {
            task.failed = true;
            console.error(`Failed to parse loaded TRES "${url}"`);
        }
    }, url, key);

    // create a placeholder object, real JSON data will be merged
    // while available
    task.data = Object.create(null);

    let resources = get_resource_map();
    resources[key || url] = task.data;

    return task.data;
}

/**
 * Load binary data packed as `.res` file
 */
export function load_res(url: string, key?: string): any {
    let resources = get_resource_map();

    let task = create_xhr_task("res", "arraybuffer", (buffer: ArrayBuffer) => {
        resources[key || url] = buffer;
    }, url, key);

    resources[key || url] = null;

    return task.data;
}

interface Atlas {
    frames: {
        [key: string]: {
            frame: { x: number, y: number, w: number, h: number },
            rotated: boolean,
            trimmed: boolean,
        },
    },
    meta: {
        image: string,
        format: "RGBA8888" | "RGBA4444",
        size: { w: number, h: number },
        scale: string,
    },
}

export function load_atlas(url: string, flags?: { FILTER?: boolean, REPEAT?: boolean, MIPMAPS?: boolean }): any {
    let resources = get_resource_map();

    let atlas_task = create_xhr_task("json", "text", (text: string) => {
        try {
            let atlas: Atlas = JSON.parse(text);

            let atlas_name = url.match(/[^\\/]+$/)[0];
            load_texture(url.replace(atlas_name, atlas.meta.image), null, flags, (base_texture: ImageTexture) => {
                for (let key in atlas.frames) {
                    let frame = atlas.frames[key];

                    let tex = new ImageTexture;
                    tex.create_from_region(base_texture, frame.frame.x, frame.frame.y, frame.frame.w, frame.frame.h);

                    resources[key] = tex;
                }
            });

            Object.assign(atlas_task.data, atlas);
        } catch (e) {
            atlas_task.failed = true;
            console.error(`Failed to parse loaded atlas "${url}"`);
        }
    }, url);

    // create a placeholder object, real JSON data will be merged
    // while available
    atlas_task.data = Object.create(null);
    resources[url] = atlas_task.data;

    return atlas_task.data;
}
