import * as v from 'engine/index';

import 'extension/2d/vector_graphic';

import { Preloader } from 'game/preloader';

import 'game/demo/demo'; // for scene registry side effect


v.preload('media/sprites-0.json');


import Settings from 'project.json';

v.Main.setup(Settings, {
    display: {
        antialias: true,
        resizable: false,
        stretch_mode: v.STRETCH_MODE_VIEWPORT,
        stretch_aspect: v.STRETCH_ASPECT_KEEP,
    },
    application: {
        main_scene: Preloader("res://scene/demo_3d.tscn"),
    },
});
