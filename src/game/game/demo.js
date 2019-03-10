import * as v from 'engine/index';

const velocity = new v.Vector2();

export default class Demo extends v.Node2D {
    _ready() {
        console.log('Demo is ready!');

        this.hero = /** @type {v.KinematicBody2D} */(this.get_node('Hero'));

        this.set_physics_process(true);

        v.input.bind('A', 'left');
        v.input.bind('D', 'right');
        v.input.bind('W', 'up');
        v.input.bind('S', 'down');
    }
    /**
     * @param {number} delta
     */
    _physics_process(delta) {
        const x = v.input.get_action_strength('right') - v.input.get_action_strength('left')
        const y = v.input.get_action_strength('down') - v.input.get_action_strength('up')
        this.hero.move_and_slide(velocity.set(x, y).scale(40));
    }
}

v.attach_script('res://scene/Demo.tscn', Demo);
