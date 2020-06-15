import * as v from 'engine/index';

// export class Demo extends v.Control {
//     static instance() { return new Demo }

//     _ready() { }
// }

// v.attach_script('res://scene/demo.tscn', Demo);





export class Demo extends v.Spatial {
    static instance() { return new Demo }

    _ready() {
        this.cube = this.get_node("cube");
        this.set_process(true);
    }
    _process(delta) {
        this.cube.rotate_y(Math.PI * 0.4 * delta);
    }
}

v.attach_script('res://scene/demo_3d.tscn', Demo);
