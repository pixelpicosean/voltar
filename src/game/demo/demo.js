import * as v from 'engine/index';

export class MainScene extends v.Spatial {
    static instance() { return new MainScene }

    async _ready() {
        this.bot = this.get_node("ebox");
        this.mesh = this.get_node("cube");

        this.set_process(true);
    }
    _process(delta) {
        this.bot.rotate_y(-Math.PI * 0.3 * delta);
        this.mesh.rotate_y(Math.PI * 0.4 * delta);
    }
}

v.attach_script('res://scene/demo_3d.tscn', MainScene);
