import * as v from 'engine/index';
import layout from 'scene/Demo.json';

export default class Demo extends v.Node2D {
    static instance() {
        return v.assemble_scene(new Demo(), layout);
    }
    _enter_tree() {
        this.add_child(new v.Sprite())
            .set_texture('progress')
            .set_position(100, 100)
    }
}
