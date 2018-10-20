import * as v from 'engine/index';

export default class SpriteTest extends v.Node2D {
    static instance() {
        return new SpriteTest();
    }

    constructor() {
        super();

        this.a = 0;

        /**
         * @type {Array<v.Point>}
         */
        this.points = [];
        for (let i = 0; i < 20; i++) {
            this.points.push(new v.Point(228, 128));
        };

        this.rope = null;
    }

    _enter_tree() {
        this.rope = this.add_child(new v.Rope(v.Texture.from_image('hero/1'), this.points));
        this.set_process(true)
    }
    _process(delta) {
        this.a += Math.PI * delta;

        this.points[0].set(100, 0).rotate(this.a).add(128, 128)
        for (let i = 1; i < this.points.length; i++) {
            this.points[i].x = v.lerp(this.points[i].x, this.points[i - 1].x, 0.3);
            this.points[i].y = v.lerp(this.points[i].y, this.points[i - 1].y, 0.3);
        }

        this.rope.refresh();
    }
}
