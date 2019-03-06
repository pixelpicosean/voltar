import * as v from 'engine/index';

export default class Demo extends v.Node2D {
    _ready() {
        console.log('Demo is ready!');
    }
    /**
     * @param {number} delta
     */
    _process(delta) { }
}

v.attach_script('res://scene/Demo.tscn', Demo);
