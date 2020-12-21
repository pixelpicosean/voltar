import { VObject } from "engine/core/v_object";

export function _yield<T extends VObject>(obj: Promise<T> | VObject, event: string | symbol): Promise<T> {
    if (obj instanceof Promise) {
        return obj.then((target) => _yield(target, event));
    }
    return new Promise(res => obj.connect_once(event, () => res(obj as T)));
}
