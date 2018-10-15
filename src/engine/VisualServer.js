import settings from './settings';
import { SCALE_MODES } from './const';
import { is_webgl_supported } from './utils/index';
import { loader_use_procs } from 'engine/registry';
import WebGLRenderer from './renderers/WebGLRenderer';
import texture_parser from 'engine/textures/texture_parser';

// Texture parser is mandatory
loader_use_procs.push(texture_parser);

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

        if (!is_webgl_supported()) {
            throw 'Voltar only support WebGL rendering!';
        } else {
            this.renderer = new WebGLRenderer(config);
        }
    }
    render(viewport) {
        this.renderer.render(viewport, undefined, true, undefined, true);
    }
}
