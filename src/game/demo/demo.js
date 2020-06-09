import * as v from 'engine/index';

// export class MainScene extends v.Control {
//     static instance() { return new MainScene }

//     _ready() { }
// }

// v.attach_script('res://scene/demo.tscn', MainScene);





export class MainScene extends v.Spatial {
    static instance() { return new MainScene }

    _ready() {
        this.cube = this.get_node("cube");
        this.set_process(true);
    }
    _process(delta) {
        this.cube.rotate_y(Math.PI * 0.4 * delta);
    }
}

v.attach_script('res://scene/demo_3d.tscn', MainScene);
