import * as v from 'engine';
import data from './data.json';


export default class Loading extends v.Node2D {
    static instance() {
        return v.assemble_scene(new Loading(), data);
    }

    _enter_tree() {
        this.area = this.get_node("area");
    }
    _ready() {
        this.set_process(true);
    }
    _process(delta) {
        this.area.x += 20 * delta;
    }
    _exit_tree() {}
}
