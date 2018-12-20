import { VObject } from "engine/dep/index";

const pool = [];
class FakePromise {
    /**
     * @returns {FakePromise}
     */
    static new() {
        const p = pool.pop();
        if (!p) {
            return new FakePromise();
        } else {
            return p;
        }
    }
    /**
     * @param {FakePromise} p
     */
    static free(p) {
        if (p) {
            p.callback = null;
            pool.push(p);
        }
    }
    constructor() {
        /**
         * @type {Function}
         */
        this.callback = null;
    }
    /**
     * @param {Function} func
     */
    then(func) {
        this.callback = func;
        return null;
    }
    invoke() {
        this.callback.call(null);
        FakePromise.free(this);
    }
}

/**
 * @param {VObject} obj
 * @param {string} event
 */
export default function(obj, event) {
    // Fake promise implementation
    // const p = FakePromise.new();
    // node.connect_once(event, p.invoke, p);
    // return p;

    // Real promise implementation
    return new Promise(res => obj.connect_once(event, res));
};
