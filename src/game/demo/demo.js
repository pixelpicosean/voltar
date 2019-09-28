import * as v from 'engine/index';

v.preload('media/sprites-0.json')
v.preload('button', 'media/green_button.png')

export class MainScene extends v.Node {
    static instance() { return new MainScene() }

    constructor() {
        super();

        this.spr = null;
    }

    _enter_tree() {
        const tex = v.resource_map['icon'];
        const sprite = new v.Sprite();
        sprite.set_texture(tex);
        this.add_child(sprite);
        sprite.set_position_n(400, 120);
        sprite.set_self_modulate_n(0, 0, 0);
        sprite.set_scale_n(0.3, 0.3)
        this.spr = sprite;

        const grid = new v.GridContainer();
        this.add_child(grid);
        grid.set_columns(3);
        grid.add_constant_override('hseparation', 5);
        grid.add_constant_override('vseparation', 5);

        for (let i = 0; i < 3 * 4 + 2; i++) {
            let rect = new v.ColorRect();
            rect.set_rect_min_size_n(20, 20);
            rect.set_color_n(v.randf(), v.randf(), v.randf());
            grid.add_child(rect);
        }

        const v_box = new v.VBoxContainer();
        this.add_child(v_box);
        v_box.set_rect_position_n(80, 0);
        v_box.add_constant_override('separation', 10);

        for (let i = 0; i < 10; i++) {
            let rect = new v.ColorRect();
            rect.set_rect_min_size_n(60, 30);
            rect.set_color_n(v.randf(), v.randf(), v.randf());
            v_box.add_child(rect);
        }

        const tex_rect = new v.TextureRect();
        this.add_child(tex_rect);
        tex_rect.set_texture(tex);
        tex_rect.set_flip_v(true);
        tex_rect.mouse_filter = v.MOUSE_FILTER_IGNORE;
        tex_rect.set_rect_position_n(500, 10);

        const nine_tex = v.resource_map['button'];

        const nine_rect = new v.NinePatchRect();
        this.add_child(nine_rect);
        nine_rect.set_rect_position_n(300, 400);
        nine_rect.set_rect_size_n(200, 50);
        nine_rect.set_texture(nine_tex);
        nine_rect.patch_margin_left = 10;
        nine_rect.patch_margin_right = 10;
        nine_rect.patch_margin_top = 10;
        nine_rect.patch_margin_bottom = 10;
    }
    _ready() {
        this.set_process(true)
        // this.set_process_input(true)
        this.set_process_unhandled_input(true)

        v.InputMap.add_action('left');
        const mouse_left = new v.InputEventMouseButton();
        mouse_left.button_index = 1;
        v.InputMap.action_add_event('left', mouse_left);

        const btn = /** @type {v.TextureButton} */(this.get_node('texture_button'))
        btn
            .connect('mouse_entered', () => {
                console.log('button mouse_entered')
            })
            .connect('pressed', () => {
                console.log('button pressed')
            })

        this.get_node('CenterContainer')
            .connect('mouse_entered', () => {
                console.log('mouse entered CenterContainer')
            })
            .connect('mouse_exited', () => {
                console.log('mouse exited CenterContainer')
            })
    }
    _exit_tree() {
        console.log('_exit_tree')
    }

    /**
     * @param {number} delta
     */
    _process(delta) {
        this.spr.rotation += Math.PI * 0.5 * delta;

        if (v.Input.is_action_just_pressed('special')) {
            console.log('"special" is pressed, defined in Godot input map')
        }

        if (v.Input.is_action_just_pressed('ui_accept')) {
            console.log('ui_accept')
        }
    }

    /**
     * @param {v.InputEvent} event
     */
    _input(event) {
        if (event.class === 'InputEventMouseButton') {
            const e = /** @type {v.InputEventMouseButton} */(event);
            console.log('input -> ' + (e.is_pressed() ? 'press' : 'release'));
        }
    }
    /**
     * @param {v.InputEvent} event
     */
    _unhandled_input(event) {
        if (event.class === 'InputEventMouseButton') {
            const e = /** @type {v.InputEventMouseButton} */(event);
            console.log('unhandled_input -> ' + (e.is_pressed() ? 'press' : 'release'));
        } else if (event.class === 'InputEventMouseMotion') {
            const e = /** @type {v.InputEventMouseMotion} */(event);
            // console.log(`mouse pos=(${e.position.x}, ${e.position.y})`);
        }
    }
}
v.GDCLASS(MainScene, v.Node)

v.attach_script('res://scene/demo.tscn', MainScene);
