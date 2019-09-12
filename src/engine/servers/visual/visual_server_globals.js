export const VSG = {
    /** @type {import('engine/drivers/rasterizer_storage').RasterizerStorage} */
    storage: null,
    /** @type {import('engine/drivers/rasterizer_canvas').RasterizerCanvas} */
    canvas_render: null,
    /** @type {import('engine/drivers/rasterizer_scene').RasterizerScene} */
    scene_render: null,
    /** @type {import('engine/drivers/rasterizer').Rasterizer} */
    rasterizer: null,

    /** @type {import('engine/servers/visual/visual_server_canvas').VisualServerCanvas} */
    canvas: null,
    /** @type {import('engine/servers/visual/visual_server_scene').VisualServerScene} */
    scene: null,
    /** @type {import('engine/servers/visual/visual_server_viewport').VisualServerViewport} */
    viewport: null,
}
