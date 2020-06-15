import * as v from 'engine/index';

export class Demo extends v.Control {
    static instance() { return new Demo }

    _ready() { }
}

v.attach_script('res://scene/demo.tscn', Demo);
