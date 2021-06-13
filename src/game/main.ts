import * as v from 'engine/index';
import Settings from 'gen/project.json';

import { Preloader } from 'game/preloader';

v.preload({
    type: "atlas",
    url: 'media/sprites-0.json',
    params: { FILTER: true },
});


class Demo2D extends v.Control {
    // _init() {
    //     super._init();
    //     console.log("Demo2D._init()");
    // }
    async _ready() {
        console.log("Demo2D is ready!");

        await v.yield(this.get_tree().create_timer(2), "timeout");

        this.get_tree().change_scene("res://scene/demo_3d.tscn");
    }
}
v.attach_script("res://scene/demo_2d.tscn", Demo2D);

class Demo3D extends v.Spatial {
    // _init() {
    //     super._init();
    //     console.log("Demo3D._init()");
    // }
    async _ready() {
        console.log("Demo3D is ready!");

        await v.yield(this.get_tree().create_timer(2), "timeout");

        this.get_tree().change_scene("res://scene/demo_2d.tscn");
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
