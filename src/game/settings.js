import * as v from 'engine';

// v.settings.SCALE_MODE = v.SCALE_MODES.NEAREST;

export default {
    application: {
        name: 'Voltar',
        main_scene: 'boot/scene',
    },
    display: {
        view: 'game',
        container: 'container',

        width: 256,
        height: 256,
        resolution: 1,

        background_color: 0x00AAC9,

        force_canvas: false,
        antialias: false,
        pixel_snap: true,
        scale_mode: 'nearest',

        FPS: 60,

        stretch_mode: 'viewport',
        stretch_aspect: 'keep',
    },
};
