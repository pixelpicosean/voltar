import * as v from 'engine/index';

export default class Demo extends v.Node2D {
    _ready() {
        console.log('Demo is ready!');

        const process = function(delta) {
            this.rotation += Math.PI * delta;
        }

        const icon_stop = this.get_node('stop/icon_s');
        icon_stop._process = process;
        icon_stop.set_process(true);

        const icon_process = this.get_node('process/icon_p');
        icon_process._process = process;
        icon_process.set_process(true);

        setTimeout(() => {
            this.scene_tree.paused = true;
        }, 2000);
    }
    /**
     * @param {number} delta
     */
    _process(delta) { }
}

v.attach_script('res://scene/Demo.tscn', Demo);
