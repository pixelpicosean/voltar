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
import { load } from 'engine/index';
import { Sprite } from 'engine/scene/2d/sprite';


class Preloader extends Node {
    static instance() { return new Preloader() }
    constructor() {
        super();

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
                this.add_child(sprite);
                // sprite.set_position({ x: 100, y: 100 });
            })
    }
    _ready() {
        console.log('_ready')
        this.set_process_input(true)
        this.set_process_unhandled_input(true)
    }
    _exit_tree() {
        console.log('_exit_tree')
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
    application: {
        preloader: Preloader,
    },
}, Settings));
