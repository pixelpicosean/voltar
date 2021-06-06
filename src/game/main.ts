import * as v from 'engine/index';

import 'extension/2d/vector_graphic';


import { Preloader } from 'game/preloader';
import 'game/demo/demo';
import 'game/demo/platformer';


v.preload({
    type: "atlas",
    url: 'media/sprites-0.json',
    params: { FILTER: true },
});


import Settings from 'gen/project.json';


class Test extends v.Spatial {
    _ready() {
        const c = this.get_node("camera") as v.Camera;
        let x = new v.Transform;
        x.origin.set(4, 0.8, 0);
        x.looking_at_n(0, 0.8, 0, 0, 1, 0);
        c.set_transform(x);

        const a = this.get_node("AnimationPlayer") as v.AnimationPlayer;
        a.play("run");
    }
}
v.attach_script("res://scene/test.tscn", Test);


v.Main.setup(Settings, {
    display: {
        antialias: false,
        resizable: false,
        stretch_mode: v.STRETCH_MODE_VIEWPORT,
        stretch_aspect: v.STRETCH_ASPECT_KEEP,
    },
    application: {
        // main_scene: Preloader("res://scene/demo.tscn"),
        // main_scene: Preloader("res://scene/rigidbody.tscn"),
        // main_scene: Preloader("res://scene/platformer.tscn"),

        // main_scene: Preloader("res://scene/multi_mat.tscn"),
        main_scene: Preloader("res://scene/demo_3d.tscn"),
        // main_scene: Preloader("res://scene/test.tscn"),
        // main_scene: Preloader("res://scene/baked_light.tscn"),
        // main_scene: Preloader("res://scene/transparent.tscn"),
    },
});
