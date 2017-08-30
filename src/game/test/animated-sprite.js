import * as v from 'engine';

v.loader.add('mask', 'media/mask-sheet.png');
for (let i = 0; i < 12; i++) {
    v.loader.add(`mask_${i}`, `media/mask/${i}.png`);
}


const ImageAnimData = {
    i: {
        speed: 16,
        loop: true,
        frames: [
            'mask_0',
            'mask_1',
            'mask_2',
            'mask_3',
            'mask_4',
            'mask_5',
            'mask_6',
            'mask_7',
            'mask_8',
            'mask_9',
            'mask_10',
            'mask_11',
        ],
    },
};
const SpriteSheetAnimData = {
    i: {
        speed: 16,
        loop: true,
        frames: {
            sheet: 'mask',
            width: 16,
            height: 16,
            sequence: [0,1,2,3,4,5,6,7,8,9,10,11],
        },
    },
};


export default class AnimatedSpriteScene extends v.Node2D {
    static instance() {
        return new AnimatedSpriteScene();
    }

    _enter_tree() {
        const datas = [ImageAnimData, SpriteSheetAnimData];

        let r, q;
        for (r = 0; r < 16; r++) {
            for (q = 0; q < 16; q++) {
                let spr = new v.AnimatedSprite(v.pick(datas));
                spr.position.set(q * 16, r * 16);
                spr.play('i');
                spr.set_frame(Math.floor((r + q) * 0.25) % 12);
                this.add_child(spr);
            }
        }
    }
    _ready() {}
    _process(delta) {}
    _exit_tree() {}
}
