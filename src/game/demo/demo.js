import * as v from 'engine/index';

export class MainScene extends v.Node2D {
    static instance() { return new MainScene }

    _ready() { }
}

v.attach_script('res://scene/demo.tscn', MainScene);
