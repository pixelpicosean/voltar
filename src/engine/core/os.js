export default class OS {
    static get_singleton() {
        return OS.singleton;
    }
    constructor() {
        this.start_date = performance.now();
    }
    get_ticks_msec() {
        return performance.now() - this.start_date;
    }
    get_ticks_usec() {
        return this.get_ticks_msec() * 1000;
    }
}
OS.singleton = new OS();
