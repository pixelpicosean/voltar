import VObject from "engine/core/v_object";

/**
 * @param {VObject} obj
 * @param {string | Symbol} event
 */
export default function(obj, event) {
    return new Promise(res => obj.connect_once(event, res));
}
