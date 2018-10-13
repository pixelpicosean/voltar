import settings from './settings';
import { SCALE_MODES } from './const';
import { is_webgl_supported } from './utils/index';
import CanvasRenderer from './renderers/canvas/CanvasRenderer';
import WebGLRenderer from './renderers/webgl/WebGLRenderer';


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

        if (config.scale_mode === 'linear') {
            settings.SCALE_MODE = SCALE_MODES.LINEAR;
        } else {
            settings.SCALE_MODE = SCALE_MODES.NEAREST;
        }

        if (!config.force_canvas && is_webgl_supported()) {
            this.renderer = new WebGLRenderer(config);
        } else {
            this.renderer = new CanvasRenderer(config);
        }
    }
    render(viewport) {
        this.renderer.render(viewport, undefined, true, undefined, true);
    }
}
