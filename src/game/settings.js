import * as V from 'engine';

export default {
    application: {
        name: 'Voltar',
        main_scene: null,
    },
    rendering: {
        resolution: 1,

        antialias: false,
        force_fxaa: false,
        auto_resize: false,
        transparent: false,
        background_color: 0x000000,
        clear_before_render: true,
        preserve_drawing_buffer: false,

        pixel_snap: true,

        force_canvas: false,
    },
    display: {
        view: 'game',
        container: 'container',

        width: 400,
        height: 250,

        FPS: 60,

        stretch_mode: V.STRETCH_MODE_DISABLED,
        stretch_aspect: V.STRETCH_ASPECT_IGNORE,
    },
};
