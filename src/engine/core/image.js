import { Resource } from "./resource";
import { GDCLASS } from "./v_object";

export const MAX_WIDTH = 16384;
export const MAX_HEIGHT = 16384;

export const FORMAT_RGB8 = 5;
export const FORMAT_RGBA8 = 6;

export class Image extends Resource {
    constructor() {
        super();

        this.class = 'Image';

        this.format = FORMAT_RGBA8;
        /** @type {HTMLImageElement | HTMLCanvasElement | HTMLVideoElement} */
        this.data = null;
        this.width = 0;
        this.height = 0;
        this.mipmaps = false;
    }

    empty() {
        return this.width === 0 && this.height === 0;
    }
}
GDCLASS(Image, Resource)
