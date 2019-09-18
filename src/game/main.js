import * as v from 'engine/index';

import Settings from 'project.json';

import { Preloader } from 'game/preloader';
import { MainScene } from 'game/demo/demo';

v.Main.setup(Settings, {
    display: {
        resizable: false,
        stretch_mode: v.STRETCH_MODE_VIEWPORT,
        stretch_aspect: v.STRETCH_ASPECT_KEEP,
    },
    application: {
        main_scene: Preloader(MainScene),
    },
});
