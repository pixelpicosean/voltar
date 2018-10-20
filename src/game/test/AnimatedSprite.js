import * as v from 'engine/index';


const datas = [
    {
        i: {
            speed: 16,
            loop: true,
            frames: [
                'mask/0',
                'mask/1',
                'mask/2',
                'mask/3',
                'mask/4',
                'mask/5',
                'mask/6',
                'mask/7',
                'mask/8',
                'mask/9',
                'mask/10',
                'mask/11',
            ],
        },
    },
    {
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
    },
];


export default class AnimatedSpriteScene extends v.Node2D {
    static instance() {
        return new AnimatedSpriteScene();
    }

    _enter_tree() {
        const scale = 1;

        const rows = Math.round(25 / scale);
        const columns = Math.round(25 / scale);

        for (let r = 0; r < rows; r++) {
            for (let q = 0; q < columns; q++) {
                let spr = new v.AnimatedSprite(v.pick(datas));
                spr.position.set(q * 16 * scale, r * 16 * scale);
                spr.scale.set(scale);
                spr.play('i');
                spr.set_frame(12 - Math.round(Math.sqrt(Math.pow(r - rows / 2, 2) + Math.pow(q - columns / 2, 2)) * 1) % 12);
                this.add_child(spr);
            }
        }
    }
}
