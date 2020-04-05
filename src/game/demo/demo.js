import * as v from 'engine/index';

export class MainScene extends v.Node2D {
    static instance() { return new MainScene }

    _ready() {
        const sprite = this.get_node("shader");
    }
}

v.attach_script('res://scene/demo.tscn', MainScene);
