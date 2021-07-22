import * as v from "engine/index";

export function create_instance(url: string): v.Node {
    const pool = inst_pool.get(url);
    if (!pool || pool.length === 0) {
        const inst = v.instanciate_scene(url);
        inst.set_filename(url);
        return inst;
    }

    const inst = pool.pop();
    inst.request_ready();

    return inst;
}

export function destroy_instance(inst: v.Node) {
    const parent = inst.get_parent();
    if (parent) {
        parent.remove_child(inst);
    }

    if (!inst.filename) return;

    let pool = inst_pool.get(inst.filename);
    if (!pool) {
        pool = new v.NoShrinkArray<v.Node>();
        inst_pool.set(inst.filename, pool);
    }

    pool.push(inst);
}

const inst_pool = new Map<string, v.NoShrinkArray<v.Node>>();
