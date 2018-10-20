import * as v from 'engine/index';

import TitleData from 'scene/Position.json';

export default class SpriteTest extends v.Sprite {
    static instance() {
        const s = new SpriteTest();
        v.assemble_scene(s, TitleData);
        return s;
    }

    _ready() {
        this.get_node('AnimationPlayer').play('position')
    }
}
