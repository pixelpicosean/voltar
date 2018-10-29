import * as v from 'engine/index';

export default class ControlTest extends v.Node2D {
    static instance() {
        return new ControlTest();
    }

    _enter_tree() {
        let rect = this.add_child(new v.ColorRect());
        rect.set_position(100, 100)
            .set_rect_size(40, 20)
            .set_color(0xFFFFFF)
    }
}
