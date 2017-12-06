import * as v from 'engine';


export default class TextScene extends v.Node2D {
    static instance() {
        return new TextScene();
    }

    _enter_tree() {
        this.add_child(new v.Text('Hello from Sean', {
            fontFamily: 'Arial',
            fill: 'white',
        }));
    }
    _ready() {}
    _process(delta) {}
    _exit_tree() {}
}
