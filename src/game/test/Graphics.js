import * as v from 'engine/index';

export default class GraphicsTest extends v.Node2D {
    static instance() {
        return new GraphicsTest();
    }

    _enter_tree() {
        const rect = this.add_child(new v.Graphics())
        rect.begin_fill(0xFFFFFF, 0.6)
            .draw_rect(50, 100, 200, 100)
            .end_fill()
    }
    _ready() {}
    _process(delta) {}
    _exit_tree() {}
}
