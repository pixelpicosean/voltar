import * as v from 'engine/index';

v.preload('collisiontiles', 'media/collisiontiles-64.png');

export default class TilemapScene extends v.Node2D {
    static instance() {
        return new TilemapScene();
    }

    _enter_tree() {
        const data = [
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 35, 0, 0, 0, 0, 13, 1],
            [1, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 12, 12, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 3, 4, 25, 26, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
        ];

        this.add_child(new v.BackgroundMap(64, 64, data, 'collisiontiles'))
            .set_scale(0.5, 0.5);
    }
}
