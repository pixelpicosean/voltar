import * as v from 'engine/index';

export default class ParticleTest extends v.Node2D {
    static instance() {
        return new ParticleTest();
    }

    _enter_tree() {
        let spr = this.add_child(new v.ParticleNode2D());
        spr.position.set(100, 100);

        for (let i = 0; i < 100; i++) {
            let p = spr.add_child(new v.Sprite('hero/2'));
            p.position.set(v.rand_range(-128, 128), v.rand_range(-128, 128))
        }
    }
}
