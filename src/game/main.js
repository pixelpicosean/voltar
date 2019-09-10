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


class Preloader extends Node {
    static instance() { return new Preloader() }
    constructor() {
        super();

        console.log('init Preloader')
    }
    _enter_tree() {
        console.log('_enter_tree')
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
