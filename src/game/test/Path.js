import * as v from 'engine/index';
import layout from 'scene/PathSample.json';

export default class PathTest extends v.Node2D {
    static instance() {
        return v.assemble_scene(new PathTest(), layout);
    }
    _ready() {}
}
