export class RasterizerSceneThree {
    constructor() {
        /** @type {import('./rasterizer_storage_three').RasterizerStorageThree} */
        this.storage = null;
    }

    initialize() { }

    free_rid(p_rid) {
        return false;
    }
    update() {
        throw new Error("Method not implemented.");
    }

    iteration() {
        throw new Error("Method not implemented.");
    }
}
