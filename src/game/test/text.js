import * as v from 'engine/index';

export default class TextScene extends v.Node2D {
    static instance() {
        return new TextScene();
    }

    _enter_tree() {
        this.add_child(new v.Text('Hello from Sean', {
            fontFamily: 'Arial',
        }));
        const bt = this.add_child(new v.BitmapText('Hello from Sean', {
            font: {
                name: '04b03',
                size: 16,
            },
        }));
        bt.y = 100
    }
    _ready() {}
    _process(delta) {}
    _exit_tree() {}
}
