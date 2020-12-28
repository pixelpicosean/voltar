import { node_class_map } from "engine/registry";

import { VObject } from "../v_object";

// @Incomplete: move this option to global settings
const RECYCLE_OBJECTS = false;

// @Incomplete: object recycling
export function memnew(m_class: string) {
    if (!RECYCLE_OBJECTS) {
        let ctor = node_class_map[m_class];
        return new ctor;
    }

    let pool = Pool[m_class];
    if (!pool) {
        pool = Pool[m_class] = [];
    }

    let inst = pool.pop();

    if (!inst) {
        let ctor = node_class_map[m_class];
        inst = new ctor;
    } else {
        inst._init();
    }

    return inst;
}

export function memdelete(obj: VObject) {
    obj.free();

    if (!RECYCLE_OBJECTS) return;

    let pool = Pool[obj.class];
    if (!pool) {
        pool = Pool[obj.class] = [];
    }
    pool.push(obj);
}

const Pool: { [m_class: string]: VObject[] } = Object.create(null);
