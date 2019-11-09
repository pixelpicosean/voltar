import * as v from 'engine/index';

import Settings from 'project.json';

/* load our own extensions */
import 'extension/vg/vg_line';
import 'extension/vg/vg_rect';

import { Preloader } from 'game/preloader';
import { MainScene } from 'game/demo/demo';


v.preload('media/sprites-0.json')


v.Main.setup(Settings, {
    display: {
        resizable: false,
        stretch_mode: v.STRETCH_MODE_VIEWPORT,
        stretch_aspect: v.STRETCH_ASPECT_KEEP,
    },
    application: {
        main_scene: Preloader('res://scene/demo.tscn'),
    },
});
