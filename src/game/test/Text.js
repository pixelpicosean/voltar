import * as v from 'engine/index';

export default class TextScene extends v.Node2D {
    static instance() {
        return new TextScene();
    }

    _enter_tree() {
        const text = this.add_child(new v.Text('Hello from Sean', {
            fontFamily: 'Arial',
            fontSize: 48,
        }));
        const bt = this.add_child(new v.BitmapText('Welcome to Voltar!', {
            font: {
                name: '04b03',
                size: 32,
            },
        }));
        bt.tint = 0xF0FF00;
        bt.y = 100
    }
}
