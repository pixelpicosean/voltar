import * as v from 'engine/index';
import * as filters from 'engine/filters/index';

export default class SpriteTest extends v.Node2D {
    static instance() {
        return new SpriteTest();
    }

    _enter_tree() {
        let spr = this.add_child(new v.Sprite('hero/2'));
        spr.position.set(200, 200);
        spr.anchor.set(0.5, 0.5);
        spr.scale.set(8);
        spr.filters = [
            new filters.Noise(0.3),
            new filters.Blur(0.2, 1, 1),
        ];

        let mask = this.add_child(new v.Graphics())
            .begin_fill(0xFFFFFF)
            .draw_circle(200, 170, 100)
            .end_fill()
        spr.mask = mask;
    }
}
