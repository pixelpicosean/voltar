import * as v from 'engine/index';

import TitleData from 'scene/Position.json';

export default class SpriteTest extends v.Sprite {
    static instance() {
        const s = new SpriteTest();
        v.assemble_scene(s, TitleData);
        return s;
    }

    _ready() {
        /** @type {v.AnimationPlayer} */
        const anim = this.get_node('AnimationPlayer')
        anim.animation_set_next('position', 'second');
        anim.animation_set_next('second', 'position');

        anim.play('position')
    }
}
