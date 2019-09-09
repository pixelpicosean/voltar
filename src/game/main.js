import { Main } from 'engine/main/main';

import Settings from 'project.json';

import { deep_merge } from 'engine/utils/deep_merge';
import { Node } from 'engine/scene/main/node';
import { GDCLASS } from 'engine/core/v_object';
import { InputEvent, InputEventMouseButton } from 'engine/core/os/input_event';


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
            console.log(e.is_pressed() ? 'press' : 'release');
        }
    }
}
GDCLASS(Preloader, Node)

Main.setup(deep_merge({
    application: {
        preloader: Preloader,
    },
}, Settings));
