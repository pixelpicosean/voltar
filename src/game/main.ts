import * as v from 'engine/index.js';

import 'extension/2d/vector_graphic';


import { Preloader } from 'game/preloader';
import 'game/demo/demo';


v.preload('media/sprites-0.json');


import Settings from 'gen/project.json';

v.Main.setup(Settings, {
    display: {
        antialias: false,
        resizable: false,
        stretch_mode: v.STRETCH_MODE_VIEWPORT,
        stretch_aspect: v.STRETCH_ASPECT_KEEP,
    },
    application: {
        // main_scene: Preloader("res://scene/demo.tscn"),
        // main_scene: Preloader("res://scene/demo_3d.tscn"),
        main_scene: Preloader("res://scene/baked_light.tscn"),
    },
});
