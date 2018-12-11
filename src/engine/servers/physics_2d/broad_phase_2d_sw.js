import { Rectangle, Vector2 } from "engine/math/index";
import CollisionObject2DSW from "./collision_object_2d_sw";

const LARGE_ELEMENT_FI = 1.01239812;

class PairData {
    constructor() {
        this.colliding = false;
        this.rc = 1;
        this.ud = null;
    }
}

class Element {
    constructor() {
        this.self = 0;
        this.owner = null;
        this._static = false;
        this.aabb = new Rectangle();
        this.subindex = 0;
        this.pass = 0;
        /**
         * @type {Map<Element, PairData>}
         */
        this.paired = new Map();
    }
}

class RC {
    constructor() {
        this.ref = 0;
    }
    inc() {
        this.ref++;
        return this.ref;
    }
    dec() {
        this.ref--;
        return this.ref;
    }
}

class PosKey {
    constructor() {
        this.key = 0;
    }
    /**
     * @param {PosKey} key
     */
    copy(key) {
        this.key = key.key;
        return this;
    }

    hash() {
        let k = this.key;
        k = (~k) + (k << 18); // k = (k << 18) - k - 1;
        k = k ^ (k >> 31);
        k = k * 21; // k = (k + (k << 2)) + (k << 4);
        k = k ^ (k >> 11);
        k = k + (k << 6);
        k = k ^ (k >> 22);
        return k;
    }
    /**
     * @param {PosKey} p_key
     * @returns {boolean}
     */
    equal(p_key) { return this.key === p_key.key }
}

class PosBin {
    constructor() {
        this.key = new Vector2();

        /**
         * @type {Map<Element, RC>}
         */
        this.object_set = new Map();
        /**
         * @type {Map<Element, RC>}
         */
        this.static_object_set = new Map();

        /**
         * @type {PosBin}
         */
        this.next = null;
    }
}

/** @typedef {(A: CollisionObject2DSW, p_sub_index_A: number, B: CollisionObject2DSW, p_sub_index_B: number, userdata: any) => void} PairCallback */
/** @typedef {(A: CollisionObject2DSW, p_sub_index_A: number, B: CollisionObject2DSW, p_sub_index_B: number, data: any, userdata: any) => void} UnpairCallback */

export default class BroadPhase2D {
    constructor() {
        /**
         * @type {Map<number, Element>}
         */
        this.element_map = new Map();
        /**
         * @type {Map<Element, RC>}
         */
        this.large_elements = new Map();

        this.current = 0;
        this.pass = 1;

        // TODO: load config data from project file
        this.cell_size = 128;
        // TODO: load config data from project file
        this.large_object_min_surface = 512;

        /**
         * @type {PairCallback}
         */
        this.pair_callback = null;
        this.pair_userdata = null;
        /**
         * @type {UnpairCallback}
         */
        this.unpair_callback = null;
        this.unpair_userdata = null;

        /**
         * @type {Map<number, PairData>}
         */
        this.pair_map = new Map();

        /**
         * @type {Map<number, Map<number, PosBin>>}
         */
        this.hash_table = new Map();
    }

    /**
     *
     * @param {CollisionObject2DSW} p_object
     * @param {number} [p_subindex]
     */
    create(p_object, p_subindex = 0) {
        this.current++;

        const e = new Element();
        e.owner = p_object;
        e._static = false;
        e.subindex = p_subindex;
        e.self = this.current;
        e.pass = 0;

        this.element_map.set(this.current, e);
        return this.current;
    }
    /**
     * @param {number} p_id
     * @param {Rectangle} p_aabb
     */
    move(p_id, p_aabb) {
        const e = this.element_map.get(p_id);

        if (p_aabb.equals(e.aabb)) {
            return;
        }

        if (!p_aabb.is_zero()) {
            this._enter_grid(e, p_aabb, e._static);
        }

        if (!e.aabb.is_zero()) {
            this._exit_grid(e, e.aabb, e._static);
        }

        e.aabb.copy(p_aabb);

        this._check_motion(e);

        e.aabb.copy(p_aabb);
    }
    /**
     * @param {number} p_id
     * @param {boolean} p_static
     */
    set_static(p_id, p_static) {
        const e = this.element_map.get(p_id);

        if (e._static == p_static) {
            return;
        }

        if (!e.aabb.is_zero()) {
            this._exit_grid(e, e.aabb, e._static);
        }

        e._static = p_static;

        if (!e.aabb.is_zero()) {
            this._enter_grid(e, e.aabb, e._static);
            this._check_motion(e);
        }
    }
    /**
     * @param {number} p_id
     */
    remove(p_id) {
        const e = this.element_map.get(p_id);

        if (!e.aabb.is_zero()) {
            this._exit_grid(e, e.aabb, e._static);
        }

        this.element_map.delete(p_id);
    }

    /**
     * @param {number} p_id
     */
    get_object(p_id) {
        return this.element_map.get(p_id).owner;
    }
    /**
     * @param {number} p_id
     */
    is_static(p_id) {
        return this.element_map.get(p_id)._static;
    }
    /**
     * @param {number} p_id
     */
    get_subindex(p_id) {
        return this.element_map.get(p_id).subindex;
    }

    /**
     * @param {Vector2} p_from
     * @param {Vector2} p_to
     * @param {CollisionObject2DSW[]} p_results
     * @param {number} p_max_results
     * @param {number[]} p_result_indices
     */
    cull_segment(p_from, p_to, p_results, p_max_results, p_result_indices = null) { }
    /**
     * @param {Rectangle} p_aabb
     * @param {CollisionObject2DSW[]} p_results
     * @param {number} p_max_results
     * @param {number[]} p_result_indices
     */
    cull_aabb(p_aabb, p_results, p_max_results, p_result_indices = null) {
        this.pass++;

        const from = new Vector2(Math.floor(p_aabb.x / this.cell_size), Math.floor(p_aabb.y / this.cell_size));
        const to = new Vector2(Math.floor((p_aabb.x + p_aabb.width) / this.cell_size), Math.floor((p_aabb.y + p_aabb.height) / this.cell_size));
        let cullcount = 0;

        const point = new Vector2();
        const tmp_vec_1 = new Vector2();
        const tmp_vec_2 = new Vector2();
        for (let i = from.x; i <= to.x; i++) {
            for (let j = from.y; j <= to.y; j++) {
                cullcount = this._cull(
                    true, false,
                    point.set(i, j), p_aabb, tmp_vec_1, tmp_vec_2, p_results, p_max_results, p_result_indices, cullcount
                )
            }
        }

        for (let [elem] of this.large_elements) {
            if (cullcount >= p_max_results) {
                break;
            }
            if (elem.pass === this.pass) {
                continue;
            }

            elem.pass = this.pass;

            if (!p_aabb.intersects(elem.aabb)) {
                continue;
            }

            p_results[cullcount] = elem.owner;
            p_result_indices[cullcount] = elem.subindex;
            cullcount++;
        }
        return cullcount;
    }

    /**
     * @param {PairCallback} p_pair_callback
     * @param {any} p_userdata
     */
    set_pair_callback(p_pair_callback, p_userdata) {
        this.pair_callback = p_pair_callback;
        this.pair_userdata = p_userdata;
    }
    /**
     * @param {UnpairCallback} p_unpair_callback
     * @param {any} p_userdata
     */
    set_unpair_callback(p_unpair_callback, p_userdata) {
        this.unpair_callback = p_unpair_callback;
        this.unpair_userdata = p_userdata;
    }

    update() { }

    /**
     * @param {Element} p_elem
     * @param {Rectangle} p_rect
     * @param {boolean} p_static
     */
    _enter_grid(p_elem, p_rect, p_static) {
        // use magic number to avoid floating point issues
        const sz = Vector2.create(
            p_rect.width / this.cell_size * LARGE_ELEMENT_FI,
            p_rect.height / this.cell_size * LARGE_ELEMENT_FI
        )
        if (sz.width * sz.height > this.large_object_min_surface) {
            // large object, do not use grid, must check against all elements
            for (let [_, elem] of this.element_map) {
                if (elem === p_elem) {
                    continue;
                }
                if (elem.owner === p_elem.owner) {
                    continue;
                }
                if (elem._static && p_static) {
                    continue;
                }

                this._pair_attempt(p_elem, elem);
            }

            let E = this.large_elements.get(p_elem);
            if (!E) {
                E = new RC();
                this.large_elements.set(p_elem, E);
            }
            E.inc();
            return;
        }

        const from = Vector2.create(Math.floor(p_rect.x / this.cell_size), Math.floor(p_rect.y / this.cell_size));
        const to = Vector2.create(Math.floor((p_rect.x + p_rect.width) / this.cell_size), Math.floor((p_rect.y + p_rect.height) / this.cell_size));

        for (let i = from.x; i <= to.x; i++) {
            for (let j = from.y; j <= to.y; j++) {
                let r = this.hash_table.get(i);
                if (!r) {
                    r = new Map();
                    this.hash_table.set(i, r);
                }
                let pb = r.get(j);

                while (pb) {
                    if (pb.key.x === i && pb.key.y === j) {
                        break;
                    }

                    pb = pb.next;
                }

                let entered = false;

                if (!pb) {
                    pb = new PosBin();
                    pb.key.set(i, j);
                    pb.next = r.get(j);
                    r.set(j, pb);
                }

                if (p_static) {
                    let E = pb.static_object_set.get(p_elem);
                    if (!E) {
                        E = new RC();
                        pb.static_object_set.set(p_elem, E);
                    }

                    if (E.inc() === 1) {
                        entered = true;
                    }
                } else {
                    let E = pb.object_set.get(p_elem);
                    if (!E) {
                        E = new RC();
                        pb.object_set.set(p_elem, E);
                    }

                    if (E.inc() === 1) {
                        entered = true;
                    }
                }

                if (entered) {
                    for (let [elem] of pb.object_set) {
                        if (elem.owner === p_elem.owner) {
                            continue;
                        }
                        this._pair_attempt(p_elem, elem);
                    }

                    if (!p_static) {
                        for (let [elem] of pb.static_object_set) {
                            if (elem.owner === p_elem.owner) {
                                continue;
                            }
                            this._pair_attempt(p_elem, elem);
                        }
                    }
                }
            }
        }

        // pair sepqratedly with large elements

        for (let [elem, _] of this.large_elements) {
            if (elem === p_elem) {
                continue;
            }
            if (elem.owner === p_elem.owner) {
                continue;
            }
            if (elem._static && p_static) {
                continue;
            }

            this._pair_attempt(elem, p_elem);
        }

        Vector2.delete(sz);
        Vector2.delete(from);
        Vector2.delete(to);
    }
    /**
     * @param {Element} p_elem
     * @param {Rectangle} p_rect
     * @param {boolean} p_static
     */
    _exit_grid(p_elem, p_rect, p_static) {
        // use magic number to avoid floating point issues
        const sz = Vector2.create(
            p_rect.width / this.cell_size * LARGE_ELEMENT_FI,
            p_rect.height / this.cell_size * LARGE_ELEMENT_FI
        )
        if (sz.width * sz.height > this.large_object_min_surface) {
            // unpair all elements, instead of checking all, just check what is already paired
            // so we at least save from checking static vs static
            // FIXME: Godot uses `while` here, so this may not work properly
            for (let [elem] of p_elem.paired) {
                this._unpair_attempt(p_elem, elem);
            }

            if (this.large_elements.get(p_elem).dec() === 0) {
                this.large_elements.delete(p_elem);
            }
            return;
        }

        const from = Vector2.create(Math.floor(p_rect.x / this.cell_size), Math.floor(p_rect.y / this.cell_size));
        const to = Vector2.create(Math.floor((p_rect.x + p_rect.width) / this.cell_size), Math.floor((p_rect.y + p_rect.height) / this.cell_size));

        for (let i = from.x; i <= to.x; i++) {
            for (let j = from.y; j <= to.y; j++) {
                let r = this.hash_table.get(i);
                if (!r) {
                    r = new Map();
                    this.hash_table.set(i, r);
                }
                let pb = r.get(j);

                while (pb) {
                    if (pb.key.x === i && pb.key.y === j) {
                        break;
                    }

                    pb = pb.next;
                }

                let exited = false;

                if (p_static) {
                    let E = pb.static_object_set.get(p_elem);
                    if (!E) {
                        E = new RC();
                        pb.static_object_set.set(p_elem, E);
                    }

                    if (E.dec() === 0) {
                        pb.static_object_set.delete(p_elem);
                        exited = true;
                    }
                } else {
                    let E = pb.object_set.get(p_elem);
                    if (!E) {
                        E = new RC();
                        pb.object_set.set(p_elem, E);
                    }

                    if (E.dec() === 0) {
                        pb.object_set.delete(p_elem);
                        exited = true;
                    }
                }

                if (exited) {
                    for (let [elem] of pb.object_set) {
                        if (elem.owner === p_elem.owner) {
                            continue;
                        }
                        this._unpair_attempt(p_elem, elem);
                    }

                    if (!p_static) {
                        for (let [elem] of pb.static_object_set) {
                            if (elem.owner === p_elem.owner) {
                                continue;
                            }
                            this._unpair_attempt(p_elem, elem);
                        }
                    }
                }

                if (pb.object_set.size === 0 && pb.static_object_set.size === 0) {
                    if (r.get(j) === pb) {
                        r.set(j, pb.next);
                    } else {
                        let px = r.get(j);

                        while (px) {
                            if (px.next === pb) {
                                px.next = pb.next;
                                break;
                            }

                            px = px.next;
                        }
                    }
                }
            }
        }

        for (let [elem] of this.large_elements) {
            if (elem === p_elem) {
                continue;
            }
            if (elem.owner === p_elem.owner) {
                continue;
            }
            if (elem._static && p_static) {
                continue;
            }

            this._unpair_attempt(p_elem, elem);
        }

        Vector2.delete(sz);
        Vector2.delete(from);
        Vector2.delete(to);
    }
    /**
     *
     * @param {boolean} use_aabb
     * @param {boolean} use_segment
     * @param {Vector2} p_cell
     * @param {Rectangle} p_aabb
     * @param {Vector2} p_from
     * @param {Vector2} p_to
     * @param {CollisionObject2DSW[]} p_results
     * @param {number} p_max_results
     * @param {number[]} p_result_indices
     * @param {number} index
     * @returns {number}
     */
    _cull(use_aabb, use_segment, p_cell, p_aabb, p_from, p_to, p_results, p_max_results, p_result_indices, index) {
        let row = this.hash_table.get(p_cell.x);
        if (!row) {
            row = new Map();
            this.hash_table.set(p_cell.x, row);
        }
        let pb = row.get(p_cell.y);

        while (pb) {
            if (pb.key.equals(p_cell)) {
                break;
            }

            pb = pb.next;
        }

        if (!pb) {
            return index;
        }

        for (let [elem] of pb.object_set) {
            if (index >= p_max_results) {
                break;
            }
            if (elem.pass === this.pass) {
                continue;
            }

            elem.pass = this.pass;

            if (use_aabb && !p_aabb.intersects(elem.aabb)) {
                continue;
            }

            if (use_segment && !elem.aabb.intersects_segment(p_from, p_to)) {
                continue;
            }

            p_results[index] = elem.owner;
            p_result_indices[index] = elem.subindex;
            index++;
        }

        for (let [elem] of pb.static_object_set) {
            if (index >= p_max_results) {
                break;
            }
            if (elem.pass === this.pass) {
                continue;
            }

            if (use_aabb && !p_aabb.intersects(elem.aabb)) {
                continue;
            }

            if (use_segment && !elem.aabb.intersects_segment(p_from, p_to)) {
                continue;
            }

            elem.pass = this.pass;
            p_results[index] = elem.owner;
            p_result_indices[index] = elem.subindex;
            index++;
        }

        return index;
    }

    /**
     * @param {Element} p_elem
     * @param {Element} p_with
     */
    _pair_attempt(p_elem, p_with) {
        const pair_data = p_elem.paired.get(p_with);

        if (!pair_data) {
            const pd = new PairData();
            p_elem.paired.set(p_with, pd);
            p_with.paired.set(p_elem, pd);
        } else {
            pair_data.rc++;
        }
    }
    /**
     * @param {Element} p_elem
     * @param {Element} p_with
     */
    _unpair_attempt(p_elem, p_with) {
        const pair_data = p_elem.paired.get(p_with);

        pair_data.rc--;

        if (pair_data.rc === 0) {
            if (pair_data.colliding) {
                // uncollide
                if (this.unpair_callback) {
                    this.unpair_callback(p_elem.owner, p_elem.subindex, p_with.owner, p_with.subindex, pair_data.ud, this.unpair_userdata);
                }
            }

            p_elem.paired.delete(p_with);
            p_with.paired.delete(p_elem);
        }
    }
    /**
     * @param {Element} p_elem
     */
    _check_motion(p_elem) {
        for (let [elem, pair_data] of p_elem.paired) {
            const pairing = p_elem.aabb.intersects(elem.aabb);

            if (pairing !== pair_data.colliding) {
                if (pairing) {
                    if (this.pair_callback) {
                        pair_data.ud = this.pair_callback(p_elem.owner, p_elem.subindex, elem.owner, elem.subindex, this.pair_userdata);
                    }
                } else {
                    if (this.unpair_callback) {
                        this.unpair_callback(p_elem.owner, p_elem.subindex, elem.owner, elem.subindex, pair_data.ud, this.unpair_userdata);
                    }
                }

                pair_data.colliding = pairing;
            }
        }
    }
}
