import * as PIXI from 'engine';
window.PIXI = PIXI;

const DefaultConfig = {
    width: 640,
    height: 480,
    resolution: 1,

    view: null,

    antialias: false,
    transparent: false,
    roundPixels: true,
};

export class VisualServer {
    constructor() {
        this._config = {};

        this.renderer = null;
    }

    init(config) {
        this._config = Object.assign(this._config, DefaultConfig, config);

        this.renderer = PIXI.autoDetectRenderer(this._config);
    }
    render(scene) {
        this.renderer.render(scene);
    }
}

export default new VisualServer();
