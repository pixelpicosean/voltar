import { is_webgl_supported } from 'engine/utils/index';
import { loader_use_procs } from 'engine/registry';
import WebGLRenderer from 'engine/renderers/WebGLRenderer';
import texture_parser from 'engine/scene/resources/textures/texture_parser';
import spritesheet_parser from 'engine/scene/resources/textures/spritesheet_parser';

// Texture and spritesheet parsers are mandatory
loader_use_procs.push(texture_parser);
loader_use_procs.push(spritesheet_parser);

export default class VisualServer {
    constructor() {
        this.is_initialized = false;

        this.renderer = null;

        /**
         * Collection of methods for extracting data (image, pixels, etc.) from a display object or render texture
         *
         * @type {import('../../extract/webgl_extract').default}
         */
        this.extract = null;
    }

    /**
     * @param {import('engine/renderers/SystemRenderer').RendererDesc} config
     */
    init(config) {
        if (this.is_initialized) {
            return;
        }
        this.is_initialized = true;

        if (!is_webgl_supported()) {
            throw 'Voltar only support WebGL rendering!';
        }

        this.renderer = new WebGLRenderer(config);
    }
    /**
     * @param {import('../../scene/main/viewport').default} viewport
     */
    render(viewport) {
        // TODO: transform should be stretch_transform * global_canvas_transform * canvas_transform
        this.renderer.render(viewport, undefined, true, viewport.canvas_transform, true);
    }
}
