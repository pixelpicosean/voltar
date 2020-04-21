import * as v from 'engine/index';

export class MainScene extends v.Spatial {
    static instance() { return new MainScene }

    _ready() {
        this.mesh = this.get_node("mesh");

        this.set_process(true);
    }
    _process(delta) {
        this.mesh.rotate_y(Math.PI * 0.4 * delta);
    }
}

v.attach_script('res://scene/demo_3d.tscn', MainScene);
