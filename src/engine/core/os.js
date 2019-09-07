export class OS {
    static get_singleton() { return singleton }
    constructor() {
        if (!singleton) singleton = this;

        this.start_date = performance.now();
    }
    get_ticks_msec() {
        return performance.now() - this.start_date;
    }
    get_ticks_usec() {
        return this.get_ticks_msec() * 1000;
    }
}

/** @type {OS} */
let singleton = null;
