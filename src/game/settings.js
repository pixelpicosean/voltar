import * as V from 'engine';

export default {
    application: {
        name: 'Voltar',
        main_scene: null,
    },
    rendering: {
        resolution: 1,

        antialias: false,
        forceFXAA: false,
        autoResize: false,
        transparent: false,
        backgroundColor: 0x000000,
        clearBeforeRender: true,
        preserveDrawingBuffer: false,

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
