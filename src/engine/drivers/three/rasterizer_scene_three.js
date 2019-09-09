import { WebGLRenderer } from "three/src/renderers/WebGLRenderer";


export class RasterizerSceneThree {
    constructor() {
        /** @type {import('./rasterizer_storage_three').RasterizerStorageThree} */
        this.storage = null;

        // private
        this.renderer = null;
    }

    /**
     * @param {WebGLRenderer} renderer
     */
    initialize(renderer) {
        this.renderer = renderer;
    }

    free_rid(p_rid) {
        return false;
    }
    update() { }

    iteration() { }
}
