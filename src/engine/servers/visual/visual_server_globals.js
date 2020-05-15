export const VSG = {
    config: {
        max_vertex_texture_image_units: 0,
        max_texture_image_units: 0,
        max_texture_size: 0,

        s3tc_supported: false,
        etc1_supported: false,
        pvrtc_supported: false,

        support_depth_texture: false,

        depth_internalformat: 0,
        depth_type: 0,
        depth_buffer_internalformat: 0,

        use_rgba_3d_shadows: false,
    },

    /** @type {import('engine/drivers/webgl/rasterizer_storage').RasterizerStorage} */
    storage: null,
    /** @type {import('engine/drivers/webgl/rasterizer_canvas').RasterizerCanvas} */
    canvas_render: null,
    /** @type {import('engine/drivers/webgl/rasterizer_scene').RasterizerScene} */
    scene_render: null,
    /** @type {import('engine/drivers/webgl/rasterizer').Rasterizer} */
    rasterizer: null,

    /** @type {import('engine/servers/visual/visual_server_canvas').VisualServerCanvas} */
    canvas: null,
    /** @type {import('engine/servers/visual/visual_server_scene').VisualServerScene} */
    scene: null,
    /** @type {import('engine/servers/visual/visual_server_viewport').VisualServerViewport} */
    viewport: null,
}
