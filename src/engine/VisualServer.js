import { isWebGLSupported } from './core/utils';
import CanvasRenderer from './core/renderers/canvas/CanvasRenderer';
import WebGLRenderer from './core/renderers/webgl/WebGLRenderer';

const DefaultConfig = {
    width: 640,
    height: 480,
    resolution: 1,

    view: null,

    antialias: false,
    transparent: false,
    roundPixels: true,

    force_canvas: false,
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

        if (!this._config.force_canvas && isWebGLSupported()) {
            this.renderer = new WebGLRenderer(this._config);
        }
        else {
            this.renderer = new CanvasRenderer(this._config);
        }
    }
    render(scene) {
        this.renderer.render(scene);
    }
}
