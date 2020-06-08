import * as v from 'engine/index';

import 'extension/2d/vector_graphic';


import { Preloader } from 'game/preloader';

import { MainScene } from 'game/demo/demo'; // for scene registry side effect


v.preload('media/sprites-0.json');
v.preload('media/house_palette.png');


import Settings from 'project.json';

v.Main.setup(Settings, {
    display: {
        antialias: true,
        resizable: false,
        stretch_mode: v.STRETCH_MODE_VIEWPORT,
        stretch_aspect: v.STRETCH_ASPECT_KEEP,
    },
    application: {
        main_scene: Preloader(MainScene),
    },
});
