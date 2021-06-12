import * as v from 'engine/index';

import 'extension/2d/vector_graphic';


import { Preloader } from 'game/preloader';


v.preload({
    type: "atlas",
    url: 'media/sprites-0.json',
    params: { FILTER: true },
});


import Settings from 'gen/project.json';


class Demo2D extends v.Control {
    _ready() {
        console.log("Demo2D is ready!");
    }
}
v.attach_script("res://scene/demo_2d.tscn", Demo2D);

class Demo3D extends v.Spatial {
    _ready() {
        console.log("Demo3D is ready!");
    }
}
v.attach_script("res://scene/demo_3d.tscn", Demo3D);


v.Main.setup(Settings, {
    display: {
        antialias: false,
        resizable: false,
        stretch_mode: v.STRETCH_MODE_VIEWPORT,
        stretch_aspect: v.STRETCH_ASPECT_KEEP,
    },
    application: {
        // main_scene: Preloader("res://scene/demo_2d.tscn"),
        main_scene: Preloader("res://scene/demo_3d.tscn"),
    },
});
