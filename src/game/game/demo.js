import * as v from 'engine/index';

export default class Demo extends v.Node2D {
    static instance() {
        return new Demo();
    }
    _enter_tree() {
        this.add_child(new v.Sprite())
            .set_texture('progress')
            .set_position(100, 100)
    }
}

v.attach_script('res://scene/Demo.tscn', Demo);
