import * as v from 'engine/index';
import * as filters from 'engine/filters/index';

v.preload('icon', 'media/icon.png');

export default class ExtractTest extends v.Node2D {
    static instance() {
        return new ExtractTest();
    }

    _enter_tree() {
        let spr = this.add_child(new v.Sprite('icon'));
        spr.position.set(100, 100);
        spr.anchor.set(0.5, 0.5);
        spr.filters = [
            new filters.Noise(1),
            new filters.Blur(1, 1, 1),
        ];

        let mask = this.add_child(new v.Graphics())
            .begin_fill(0xFFFFFF)
            .draw_circle(100, 100, 30)
            .end_fill()
        spr.mask = mask;

        setTimeout(() => {
            const img = v.scene_tree.extract.image(this)
            console.log(img)
        }, 1000)
    }
}
