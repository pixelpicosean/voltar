import * as v from 'engine/index';
import * as filters from 'engine/filters/index';

v.preload('icon', 'media/icon.png');

export default class SpriteTest extends v.Node2D {
    static instance() {
        return new SpriteTest();
    }

    _enter_tree() {
        let spr = this.add_child(new v.Sprite('icon'));
        spr.position.set(100, 100);
        spr.filters = [
            new filters.Noise(1),
            new filters.Blur(1, 1, 1),
        ];
    }
}
