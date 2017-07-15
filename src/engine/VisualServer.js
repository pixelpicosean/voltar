import { autoDetectRenderer } from './core/autoDetectRenderer';

const DefaultConfig = {
    width: 640,
    height: 480,
    resolution: 1,

    view: null,

    antialias: false,
    transparent: false,
    roundPixels: true,
};

export default class VisualServer {
    constructor() {
        this._config = {};
        this.is_initialized = false;

        this.renderer = null;
    }

    init(config) {
        if (this.is_initialized) {
            return;
        }
        this.is_initialized = true;

        this._config = Object.assign(this._config, DefaultConfig, config);

        this.renderer = autoDetectRenderer(this._config);
    }
    render(scene) {
        this.renderer.render(scene);
    }
}
