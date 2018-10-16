import * as v from 'engine/index';
import * as filters from 'engine/filters/index';

export default class GraphicsTest extends v.Node2D {
    static instance() {
        return new GraphicsTest();
    }

    _enter_tree() {
        const rect = this.add_child(new v.Graphics())
        rect.begin_fill(0xFFFFFF, 0.6)
            .draw_rect(50, 100, 200, 100)
            .draw_circle(30, 30, 20)
            .draw_rounded_rect(150, 30, 60, 40, 12)
            .draw_ellipse(100, 60, 40, 20)
            .end_fill()
        rect.filters = [
            new filters.Noise(),
        ]
    }
}
