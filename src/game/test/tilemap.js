import * as v from 'engine';


v.loader.add('collisiontiles', 'media/collisiontiles-64.png');
v.loader.add('hero', 'media/hero.png');


const SOLID = 1;
const HERO = 2;
const ENEMY = 3;


class Me extends v.PhysicsBody2D {
    constructor() {
        super();

        this.set_shape(new v.RectangleShape2D(8, 12));
        this.set_collision_layer_bit(HERO, true);
        this.set_collision_mask_bit(SOLID, true);

        this.gfx = new v.AnimatedSprite({
            idle: {
                speed: 1,
                loop: false,
                frames: {
                    sheet: 'hero',
                    width: 24,
                    height: 24,
                    sequence: [0],
                },
            },
            walk: {
                speed: 10,
                loop: true,
                frames: {
                    sheet: 'hero',
                    width: 24,
                    height: 24,
                    sequence: [0,1,2],
                },
            },
        });
        this.gfx.anchor.set(0.5);
        this.add_child(this.gfx);

        this.velocity = new v.Vector();
        this.motion = new v.Vector();
    }
    _ready() {
        this.set_process(true);

        v.input.bind('A', 'left');
        v.input.bind('D', 'right');
        v.input.bind('W', 'jump');
        v.input.bind('S', 'down');

        this.gfx.play('idle');
    }
    _process(delta) {
        if (v.input.is_action_just_pressed('jump')) {
            this.velocity.y = -280;
        }
        else {
            this.velocity.y = Math.min(this.velocity.y + 800 * delta, 800);
        }

        this.velocity.x = 0;
        if (v.input.is_action_pressed('left')) {
            this.velocity.x -= 80;
        }
        if (v.input.is_action_pressed('right')) {
            this.velocity.x += 80;
        }
        if (this.velocity.x < 0) {
            this.gfx.scale.x = -1;
            this.gfx.play('walk');
        }
        else if (this.velocity.x > 0) {
            this.gfx.scale.x = 1;
            this.gfx.play('walk');
        }
        else {
            this.gfx.play('idle');
        }

        this.move(this.motion.copy(this.velocity).scale(delta));
    }
    _collide_map(res) {
        if (res.collision.slope || res.collision.y) {
            res.remainder.y = 0;
            this.velocity.y = 0;
        }
        this.position.copy(res.position)
            .add(res.remainder.slide(res.normal));

        if (v.input.is_action_pressed('down') && res.tile.y === 12) {
            this.position.y += 1;
        }
    }
}


export default class TilemapScene extends v.Node2D {
    static instance() {
        return new TilemapScene();
    }

    _enter_tree() {
        const data = [
            [  1,  1,  1,  1,  1,  1,  1,  1 ],
            [  1, 35,  0,  0,  0,  0, 13,  1 ],
            [  1,  0,  0,  0,  0,  0,  0,  1 ],
            [  1,  0,  0,  0,  0,  0,  0,  1 ],
            [  1,  0,  0, 12, 12,  0,  0,  1 ],
            [  1,  0,  0,  0,  0,  0,  0,  1 ],
            [  1,  0,  3,  4, 25, 26,  0,  1 ],
            [  1,  1,  1,  1,  1,  1,  1,  1 ],
        ];

        const t = new v.BackgroundMap(64, 64, data, 'collisiontiles');
        t.scale.set(0.5);
        this.add_child(t);

        const c = new v.CollisionMap(32, data);
        c.set_collision_layer_bit(SOLID, true);
        this.add_child(c);

        this.s = new Me();
        this.s.position.set(128, 64);
        this.add_child(this.s);
    }
    _ready() {}
    _process(delta) {}
    _exit_tree() {}
}
