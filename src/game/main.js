import * as v from 'engine/index';

import Settings from 'project.json';

import { Preloader } from 'game/preloader';
// import { MainScene } from 'game/demo/demo';

v.preload('media/sprites-0.json')

class TestScene extends v.Node {
    static instance() { return new TestScene }
    constructor() {
        super();
    }
    _enter_tree() {
        for (let q = 0; q < 320 / 16; q++) {
            for (let r = 0; r < 240 / 16; r++) {
                if (q % 2 === 0 && r % 2 !== 0) continue;
                if (q % 2 !== 0 && r % 2 === 0) continue;

                const rect = new v.ColorRect;
                rect.set_rect_position_n(q * 16, r * 16);
                rect.set_rect_size_n(16, 16);
                rect.set_color_n(1, 1, 1, 0.6);
                this.add_child(rect);
            }
        }

        const spr = new v.Sprite;
        spr.set_texture('icon');
        spr.set_position_n(320 / 2, 240 / 2);
        this.add_child(spr);
    }
}

v.Main.setup(Settings, {
    display: {
        resizable: false,
        stretch_mode: v.STRETCH_MODE_VIEWPORT,
        stretch_aspect: v.STRETCH_ASPECT_KEEP,
    },
    application: {
        // main_scene: Preloader('res://scene/demo.tscn'),
        main_scene: Preloader(TestScene),
    },
});
