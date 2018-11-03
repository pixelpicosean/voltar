import * as v from 'engine/index';

import TitleData from 'scene/Position.json';

v.preload('media/Foo.fnt')

export default class ControlTest extends v.Node2D {
    static instance() {
        const s = new ControlTest();
        v.assemble_scene(s, TitleData);
        return s;
    }

    _ready() {
    }
}
