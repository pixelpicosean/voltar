export const VSG = {
    config: {
        max_vertex_texture_image_units: 0,
        max_texture_image_units: 0,
        max_texture_size: 0,

        s3tc_supported: false,
        etc1_supported: false,
        pvrtc_supported: false,

        support_depth_texture: false,
        support_float_texture: false,

        depth_internalformat: 0,
        depth_type: 0,
        depth_buffer_internalformat: 0,

        use_rgba_3d_shadows: false,
        use_skeleton_software: false,

        vao: false,
    },

    storage: null as import("engine/drivers/webgl/rasterizer_storage").RasterizerStorage,

    rasterizer: null as import("engine/drivers/webgl/rasterizer").Rasterizer,
    canvas_render: null as import("engine/drivers/webgl/rasterizer_canvas").RasterizerCanvas,
    scene_render: null as import("engine/drivers/webgl/rasterizer_scene").RasterizerScene,

    viewport: null as import("engine/servers/visual/visual_server_viewport").VisualServerViewport,
    canvas: null as import("engine/servers/visual/visual_server_canvas").VisualServerCanvas,
    scene: null as import("engine/servers/visual/visual_server_scene").VisualServerScene,
}
