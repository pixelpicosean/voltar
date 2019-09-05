import { is_webgl_supported } from 'engine/utils/index';
import { loader_use_procs } from 'engine/registry';
import { Matrix } from 'engine/core/math/index';
import WebGLRenderer from 'engine/servers/visual/webgl_renderer';
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

        this.config = null;
    }

    /**
     * @param {import('engine/servers/visual/system_renderer').RendererDesc} config
     */
    init(config) {
        if (this.is_initialized) {
            return;
        }
        this.is_initialized = true;

        if (!is_webgl_supported()) {
            throw 'Voltar only support WebGL rendering!';
        }

        this.config = config;
        this.renderer = new WebGLRenderer(config);
    }
    /**
     * @param {import('../../scene/main/viewport').default} viewport
     */
    render(viewport) {
        // TODO: transform should be stretch_transform * global_canvas_transform * canvas_transform

        // FIXME: should we force integer transform here?
        if (this.config.pixel_snap) {
            viewport.canvas_transform.tx = viewport.canvas_transform.tx | 0;
            viewport.canvas_transform.ty = viewport.canvas_transform.ty | 0;
        }

        const scene = /** @type {import('engine/scene/node_2d').default} */(viewport.data.children[viewport.data.children.length - 1]);
        const xform = viewport.canvas_transform.clone().append(viewport.stretch_transform);
        this.renderer.render(scene, undefined, true, xform, true);
        Matrix.free(xform);
    }
}
