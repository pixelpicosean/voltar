import * as v from 'engine/index.js';

export class Demo extends v.Control {
    _ready() {
        console.log('Demo._ready')
    }
}

v.attach_script('res://scene/demo.tscn', Demo);
