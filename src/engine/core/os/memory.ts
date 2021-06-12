import { node_class_map } from "engine/registry";

interface VtObjectInterface {
    class: string;
    _script_?: boolean;

    _init(): void;

    _predelete(): boolean;
    _free(): void;
}

// @Incomplete: move this option to global settings
const RECYCLE_OBJECTS = false;

// @Incomplete: object recycling
export function memnew(m_class: string): any {
    if (!RECYCLE_OBJECTS) {
        const inst: VtObjectInterface = new (node_class_map[m_class]);
        inst._init();
        return inst;
    }

    let pool = Pool[m_class];
    if (!pool) {
        pool = Pool[m_class] = [];
    }

    let inst = pool.pop();
    if (!inst) {
        inst = new (node_class_map[m_class]);
    }

    inst._init();

    return inst;
}

export function memdelete(obj: VtObjectInterface) {
    if (!obj._predelete()) {
        return;
    }

    obj._free();

    if (!RECYCLE_OBJECTS || obj._script_) return;

    let pool = Pool[obj.class];
    if (!pool) {
        pool = Pool[obj.class] = [];
    }
    pool.push(obj);
}

const Pool: { [m_class: string]: VtObjectInterface[] } = Object.create(null);
