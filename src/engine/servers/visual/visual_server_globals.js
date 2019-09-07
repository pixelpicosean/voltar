export const VSG = {
    /** @type {import('engine/drivers/three/rasterizer_storage_three').RasterizerStorageThree} */
    storage: null,
    /** @type {import('engine/drivers/three/rasterizer_canvas_three').RasterizerCanvasThree} */
    canvas_render: null,
    /** @type {import('engine/drivers/three/rasterizer_scene_three').RasterizerSceneThree} */
    scene_render: null,
    /** @type {import('engine/drivers/three/rasterizer_three').RasterizerThree} */
    rasterizer: null,

    /** @type {import('engine/servers/visual/visual_server_canvas').VisualServerCanvas} */
    canvas: null,
    /** @type {import('engine/servers/visual/visual_server_scene').VisualServerScene} */
    scene: null,
    /** @type {import('engine/servers/visual/visual_server_viewport').VisualServerViewport} */
    viewport: null,
}
