import { get_resource_map } from "engine/registry";
import { ImageTexture } from "engine/scene/resources/texture";

enum LoadTypes {
    IMAGE,
    JSON,
    TEXT,
    BIN,
}

class Task<T> {
    id = Task_uid++;

    type: LoadTypes = -1;
    ended: boolean = false;
    failed: boolean = false;
    progress: number = 0.0;

    key: string = "";
    url: string = "";

    data: T = null;
}
let Task_uid = 1;

let queue: Task<any>[] = [];

export function get_current_progress(): number {
    if (queue.length === 0) return 1;

    let progress = 0;
    for (let task of queue) {
        progress += task.progress;
    }
    return progress / queue.length;
}

export function load_image(url: string, key?: string): HTMLImageElement {
    let task: Task<HTMLImageElement> = new Task;
    task.key = key;
    task.url = url;
    task.type = LoadTypes.IMAGE;

    let img = new Image;
    img.src = url;
    task.data = img;
    img.addEventListener("load", () => {
        task.ended = true;
        task.progress = 1;
    }, false);
    img.addEventListener("progress", (e) => {
        task.progress = e.loaded / e.total;
    }, false);
    img.addEventListener("error", () => {
        task.failed = true;
        task.ended = true;
        task.progress = 1;
    }, false);

    let resources = get_resource_map();
    resources[key || url] = task.data;

    return task.data;
}

export function load_texture(url: string, key?: string, flags?: { FILTER?: boolean, REPEAT?: boolean, MIPMAPS?: boolean }): ImageTexture {
    let task: Task<ImageTexture> = new Task;
    task.key = key;
    task.url = url;
    task.type = LoadTypes.IMAGE;

    let img = new Image;
    img.src = url;
    task.data = new ImageTexture;
    img.addEventListener("load", () => {
        task.data.create_from_image(img, flags);
        task.ended = true;
    }, false);
    img.addEventListener("progress", (e) => {
        task.progress = e.loaded / e.total;
    }, false);
    img.addEventListener("error", () => {
        task.ended = true;
        task.failed = true;
        task.progress = 1;
    }, false);

    let resources = get_resource_map();
    resources[key || url] = task.data;

    return task.data;
}

export function load_json(url: string, key?: string): any {
    let task: Task<any> = new Task;
    task.key = key;
    task.url = url;
    task.type = LoadTypes.JSON;
    task.data = Object.create(null);

    let xhr = new XMLHttpRequest;
    xhr.open("GET", url, true);

    xhr.responseType = "text";
    xhr.addEventListener("error", () => {
        task.ended = true;
        task.failed = true;
        task.progress = 1;

        console.error(`Failed to load JSON "${url}", code: ${xhr.status}, error: ${xhr.statusText}`);
    }, false);
    xhr.addEventListener("timeout", () => {
        task.ended = true;
        task.failed = true;
        task.progress = 1;

        console.warn(`JSON loading of "${url}" is timeout`);
    }, false);
    xhr.addEventListener("abort", () => {
        task.ended = true;
        task.failed = true;
        task.progress = 1;

        console.warn(`JSON loading of "${url}" is abort by user`);
    }, false);
    xhr.addEventListener("progress", (e) => {
        if (e && e.lengthComputable) {
            task.progress = e.loaded / e.total;
        }
    }, false);
    xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
            task.ended = true;
            task.progress = 1;

            let text = xhr.responseText;
            try {
                let data = JSON.parse(text);
                Object.assign(task.data, data);
            } catch (e) {
                task.failed = true;
                console.error(`Failed to parse loaded JSON "${url}"`);
            }
        }
    }, false);

    xhr.send();

    let resources = get_resource_map();
    resources[key || url] = task.data;

    return task.data;
}
