import * as v from 'engine/index';

v.preload('sprites', 'media/sprites.png')
v.preload('button', 'media/green_button.png')

export class MainScene extends v.Node {
    static instance() { return new MainScene() }

    constructor() {
        super();

        this.spr = null;
    }

    _enter_tree() {
        const tex = v.resource_map['media/sprites.png'];
        const sprite = new v.Sprite();
        sprite.set_texture(tex);
        this.add_child(sprite);
        sprite.set_position_n(400, 120);
        sprite.set_self_modulate_n(0, 0, 0);
        sprite.set_scale_n(0.3, 0.3)
        this.spr = sprite;

        const center_container = new v.CenterContainer()
        this.add_child(center_container)
        center_container.set_anchor_right(1);
        center_container.set_anchor_bottom(1);
        center_container.set_margin_left(0);
        center_container.set_margin_right(0);
        center_container.set_margin_top(0);
        center_container.set_margin_bottom(0);

        const rect = new v.ColorRect();
        center_container.add_child(rect);
        rect.set_rect_min_size_n(100, 100);
        rect.set_color_n(0, 1, 1);

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
        console.log('_ready')
        this.set_process(true)
        // this.set_process_input(true)
        // this.set_process_unhandled_input(true)

        v.InputMap.add_action('left');
        const mouse_left = new v.InputEventMouseButton();
        mouse_left.button_index = 1;
        v.InputMap.action_add_event('left', mouse_left);
    }
    _exit_tree() {
        console.log('_exit_tree')
    }

    /**
     * @param {number} delta
     */
    _process(delta) {
        if (this.spr) {
            this.spr.set_rotation(this.spr.rotation + Math.PI * delta)
        }

        if (v.Input.is_action_just_pressed('left')) {
            console.log('pressed left')
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
