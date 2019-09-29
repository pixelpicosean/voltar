import * as v from 'engine/index';

v.preload('media/sprites-0.json')
v.preload('button', 'media/green_button.png')

const content = [
    `I don't like rainy days,\nbut whatever :(`,
    `Oh, my name is Voltar`,
    `Nice to see you :)`,
    `I am 2 years old now`,
    `hmmm...`,
    `I know what you are\nthinking...`,
    `just stop it\nNOW`,
    `I am not a stupid child\nOK?`,
    `Alright, you REALLY are\na good person :)`,
    `Sorry that is how I\nusually talk.`,
    `People just don't\nlike nerds :(`,
    `Whatever\nGlad to talk to you :)`,
]

const filter_len = 20;
let frame_time = 0;
let last_loop = 0;

export class MainScene extends v.Node {
    static instance() { return new MainScene() }

    constructor() {
        super();

        /** @type {v.CPUParticles2D[]} */
        this.drops = [];

        // dialog
        this.label = null;
        this.current_dialog_idx = 0;
        this.pause_timer = -1;

        this.fps = null;
        this.fps_fc = 0;
    }
    _ready() {
        this.drops.push(
            /** @type {v.CPUParticles2D} */(this.get_node('drop_1')),
            /** @type {v.CPUParticles2D} */(this.get_node('drop_2')),
            /** @type {v.CPUParticles2D} */(this.get_node('drop_3'))
        )

        this.label = /** @type {v.Label} */(this.get_node('title/label'));
        this.label.set_text(content[this.current_dialog_idx]);
        this.label.set_visible_characters(0);

        this.fps = /** @type {v.Label} */(this.get_node('fps'));

        const anim = /** @type {v.AnimationPlayer} */(this.get_node('anim'))
        anim.play('anim')

        this.set_process(true);

        // FPS
        last_loop = performance.now();
    }
    /**
     * @param {number} delta
     */
    _process(delta) {
        for (const d of this.drops) {
            if (!d.emitting) {
                // d.set_position_n(v.rand_range(20, 320 - 20), d.position.y);
                // d.emitting = true;
            }
        }

        // update dialog
        if (this.pause_timer > 0) {
            this.pause_timer -= delta;
            if (this.pause_timer < 0) {
                this.current_dialog_idx = (this.current_dialog_idx + 1) % content.length;
                this.label.set_text(content[this.current_dialog_idx]);
                this.label.set_visible_characters(0);
            }
        } else {
            const new_len = this.label.visible_characters + 1;
            if (new_len > this.label.text.length) {
                this.pause_timer = 2;
            } else {
                this.label.set_visible_characters(new_len);
            }
        }

        const curr_loop = performance.now();
        const curr_frame_time = curr_loop - last_loop;
        frame_time += (curr_frame_time - frame_time) / filter_len;
        last_loop = curr_loop;

        this.fps_fc = (this.fps_fc + 1) % 10; // 10 refresh per second
        if (this.fps_fc === 0) {
            this.fps.set_text(`FPS: ${Math.floor(1000 / frame_time)}`)
        }
    }
}
v.GDCLASS(MainScene, v.Node)

v.attach_script('res://scene/demo.tscn', MainScene);
