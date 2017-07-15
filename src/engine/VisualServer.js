import { isWebGLSupported } from './core/utils';
import CanvasRenderer from './core/renderers/canvas/CanvasRenderer';
import WebGLRenderer from './core/renderers/webgl/WebGLRenderer';

export default class VisualServer {
    constructor() {
        this.is_initialized = false;

        this.renderer = null;
    }

    init(settings) {
        if (this.is_initialized) {
            return;
        }
        this.is_initialized = true;

        if (!settings.force_canvas && isWebGLSupported()) {
            this.renderer = new WebGLRenderer(settings);
        }
        else {
            this.renderer = new CanvasRenderer(settings);
        }
    }
    render(scene) {
        this.renderer.render(scene);
    }
}
