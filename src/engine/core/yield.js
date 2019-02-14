import { VObject } from "engine/dep/index";

/**
 * @param {VObject} obj
 * @param {string} event
 */
export default function(obj, event) {
    return new Promise(res => obj.connect_once(event, res));
}
