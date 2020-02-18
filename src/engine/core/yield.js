import { VObject } from "engine/core/v_object";

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
