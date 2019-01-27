import * as v from 'engine/index';
import layout from 'scene/Demo.json';

v.preload('media/collisiontiles-64.png');

export default class Demo extends v.Node2D {
    static instance() {
        return v.assemble_scene(new Demo(), layout);
    }
}
