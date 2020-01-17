import * as v from 'engine/index';

export class MainScene extends v.Node2D {
    static instance() { return new MainScene }

    _ready() {
        this.update();
    }
    _draw() {
        this.draw_polyline([
            40, 0,
            40, 80,
            80, 80,
            // 120, 120,
        ], { r: 1, g: 1, b: 1, a: 1 }, 20);
        // this.draw_rect(new v.Rect2(0, 0, 20, 20), new v.Color(0, 1, 1, 1), true);
    }
}

v.attach_script('res://scene/demo.tscn', MainScene);
