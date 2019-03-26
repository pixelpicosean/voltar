import VObject from "engine/core/v_object";

/**
 * @param {Promise | VObject} obj
 * @param {string | Symbol} event
 */
export default function _yield(obj, event) {
    if (obj instanceof Promise) {
        return obj.then((target) => _yield(target, event));
    }

    return new Promise(res => obj.connect_once(event, () => res(obj)));
}
