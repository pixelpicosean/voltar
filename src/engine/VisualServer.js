import { isWebGLSupported } from './core/utils';
import CanvasRenderer from './core/renderers/canvas/CanvasRenderer';
import WebGLRenderer from './core/renderers/webgl/WebGLRenderer';
import settings from './core/settings';
import { SCALE_MODES } from './core/const';


export default class VisualServer {
    constructor() {
        this.is_initialized = false;

        this.renderer = null;
    }

    init(config) {
        if (this.is_initialized) {
            return;
        }
        this.is_initialized = true;

        if (!config.force_canvas && isWebGLSupported()) {
            this.renderer = new WebGLRenderer(config);
        }
        else {
            this.renderer = new CanvasRenderer(config);
        }

        if (config.scale_mode === 'linear') {
            settings.SCALE_MODE = SCALE_MODES.LINEAR;
        }
        else {
            settings.SCALE_MODE = SCALE_MODES.NEAREST;
        }
    }
    render(viewport) {
        this.renderer.render(viewport, undefined, true, undefined, true);
    }
}
