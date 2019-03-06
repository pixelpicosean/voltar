import Node2D from './node_2d';
import { node_class_map } from 'engine/registry';

export default class Timer extends Node2D {
    constructor() {
        super();

        // Properties
        this.wait_time = 1;
        this.autostart = false;
        this.one_shot = false;
        this.processing = false;
        this.paused = false;
        this.time_left = -1;

        this.has_transform = false;
    }

    /**
     * @param {number} time
     */
    set_wait_time(time) {
        this.wait_time = time;
    }
    get_wait_time() {
        return this.wait_time;
    }

    /**
     * @param {boolean} one_shot
     */
    set_one_shot(one_shot) {
        this.one_shot = one_shot;
    }
    is_one_shot() {
        return this.one_shot;
    }

    /**
     * @param {boolean} autostart
     */
    set_autostart(autostart) {
        this.autostart = autostart;
    }
    has_autostart() {
        return this.autostart;
    }

    start() {
        this.time_left = this.wait_time;
        this.processing = true;
    }
    stop() {
        this.time_left = -1;
        this.processing = false;
        this.autostart = false;
    }

    /**
     * @param {boolean} paused
     */
    set_paused(paused) {
        if (this.paused === paused) {
            return;
        }

        this.paused = paused;
        this.processing = paused;
    }
    is_paused() {
        return this.paused;
    }

    is_stopped() {
        return this.get_time_left() <= 0;
    }

    get_time_left() {
        return this.time_left > 0 ? this.time_left : 0;
    }

    _propagate_ready() {
        for (let i = 0, l = this.children.length; i < l; i++) {
            this.children[i]._propagate_ready();
        }

        if (this.autostart) {
            this.start();
            this.autostart = false;
        }

        this._ready();
    }
    /**
     * @param {number} delta
     */
    _propagate_process(delta) {
        if (this.processing) {
            this.time_left -= delta;

            if (this.time_left < 0) {
                if (!this.one_shot) {
                    this.time_left += this.wait_time;
                }
                else {
                    this.stop();
                }

                this.emit_signal('timeout');
            }
        }

        if (this.idle_process) this._process(delta);

        for (let i = 0, l = this.children.length; i < l; i++) {
            this.children[i]._propagate_process(delta);
        }
    }
}

node_class_map['Timer'] = Timer;
