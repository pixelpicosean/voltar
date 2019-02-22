import * as v from 'engine/index';

export default class Demo extends v.Node2D {
    _ready() {
        console.log('Demo is ready!');
    }
}

v.attach_script('res://scene/Demo.tscn', Demo);
