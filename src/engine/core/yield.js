import { VObject } from "engine/core/v_object.js";

/**
 * @param {Promise | VObject} obj
 * @param {string | symbol} event
 */
export function _yield(obj, event) {
    if (obj instanceof Promise) {
        return obj.then((target) => _yield(target, event));
    }

    return new Promise(res => obj.connect_once(event, () => res(obj)));
}

/**
 * @param {Promise | VObject} obj
 * @param {string | symbol} event
 * @param {string} [once]
 */
export function _yield_ex(obj, event, once = "connect_once") {
    if (obj instanceof Promise) {
        return obj.then((target) => _yield(target, event));
    }

    return new Promise(res => obj[once](event, () => res(obj)));
}
