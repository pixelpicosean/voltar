import { Main } from 'engine/main/main';

import Settings from 'project.json';

import { deep_merge } from 'engine/utils/deep_merge';
import { Node } from 'engine/scene/main/node';
import { GDCLASS } from 'engine/core/v_object';
import {
    InputEvent,
    InputEventMouseButton,
    InputEventMouseMotion,
} from 'engine/core/os/input_event';
import { load, STRETCH_MODE_VIEWPORT, STRETCH_ASPECT_KEEP } from 'engine/index';
import { Sprite } from 'engine/scene/2d/sprite';
import { ColorRect } from 'engine/scene/controls/color_rect';
import { rand_range, randf } from 'engine/core/math/math_funcs';
import { OS } from 'engine/core/os/os';
import { CenterContainer } from 'engine/scene/controls/center_container';
import { GridContainer } from 'engine/scene/controls/grid_container';


class Preloader extends Node {
    static instance() { return new Preloader() }
    constructor() {
        super();

        this.spr = null;
        console.log('init Preloader')
    }
    _enter_tree() {
        console.log('_enter_tree')
        load(['media/sprites.png'])
            .connect_once('complete', (loader) => {
                console.log('load completed')
                const tex = loader.resources['media/sprites.png'];
                const sprite = new Sprite();
                sprite.set_texture(tex.texture);
                // this.add_child(sprite);
                sprite.set_position_n(100, 100);
                sprite.set_self_modulate_n(0, 0, 0);
                this.spr = sprite;
            })


        const center_container = new CenterContainer()
        this.add_child(center_container)
        center_container.set_anchor_right(1);
        center_container.set_anchor_bottom(1);
        center_container.set_margin_left(0);
        center_container.set_margin_right(0);
        center_container.set_margin_top(0);
        center_container.set_margin_bottom(0);

        const rect = new ColorRect();
        center_container.add_child(rect);
        rect.set_rect_min_size_n(100, 100);
        rect.set_color_n(0, 1, 1);

        const grid = new GridContainer();
        this.add_child(grid);
        grid.set_columns(3);
        grid.add_constant_override('hseparation', 5);
        grid.add_constant_override('vseparation', 5);

        for (let i = 0; i < 3 * 4 + 2; i++) {
            let rect = new ColorRect();
            rect.set_rect_min_size_n(20, 20);
            rect.set_color_n(randf(), randf(), randf());
            grid.add_child(rect);
        }
    }
    _ready() {
        console.log('_ready')
        this.set_process(true)
        this.set_process_input(true)
        this.set_process_unhandled_input(true)
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
    }

    /**
     * @param {InputEvent} event
     */
    _input(event) {
        if (event.class === 'InputEventMouseButton') {
            const e = /** @type {InputEventMouseButton} */(event);
            console.log('input -> ' + (e.is_pressed() ? 'press' : 'release'));
        }
    }
    /**
     * @param {InputEvent} event
     */
    _unhandled_input(event) {
        if (event.class === 'InputEventMouseButton') {
            const e = /** @type {InputEventMouseButton} */(event);
            console.log('unhandled_input -> ' + (e.is_pressed() ? 'press' : 'release'));
        } else if (event.class === 'InputEventMouseMotion') {
            const e = /** @type {InputEventMouseMotion} */(event);
            // console.log(`mouse pos=(${e.position.x}, ${e.position.y})`);
        }
    }
}
GDCLASS(Preloader, Node)

Main.setup(deep_merge({
    display: {
        resizable: false,
        stretch_mode: STRETCH_MODE_VIEWPORT,
        stretch_aspect: STRETCH_ASPECT_KEEP,
    },
    application: {
        preloader: Preloader,
    },
}, Settings));
