import * as v from 'engine';
import data from './data.json';


export default class Loading extends v.Node2D {
    static instance() {
        return v.assemble_scene(new Loading(), data);
    }

    _enter_tree() {}
    _ready() {}
    _process(delta) {}
    _exit_tree() {}
}
