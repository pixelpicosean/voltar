import { larger_prime } from "engine/core/math/math_funcs";
import { Rect2 } from "engine/core/math/rect2";
import { Vector2 } from "engine/core/math/vector2";
import { CollisionObject2DSW } from "./collision_object_2d_sw";


const LARGE_ELEMENT_FI = 1.01239812;

class PairData {
    colliding = false;
    rc = 1;
    ud: any = null;

    static create() {
        let pd = pool_PairData.pop();
        if (!pd) return new PairData;
        return pd;
    }
    static free(pd: PairData) {
        pool_PairData.push(pd);
    }
}
const pool_PairData: PairData[] = [];

class Element {
    self = 0;
    owner: CollisionObject2DSW = null;
    _static = false;
    aabb = new Rect2;
    subindex = 0;
    pass = 0;
    paired: Map<Element, PairData> = new Map;

    static create() {
        let el = pool_Element.pop();
        if (!el) return new Element;
        return el;
    }
    static free(el: Element) {
        pool_Element.push(el);
    }
}
const pool_Element: Element[] = [];

class RC {
    ref = 0;
    inc(): number {
        this.ref++;
        return this.ref;
    }
    dec(): number {
        this.ref--;
        return this.ref;
    }

    static create() {
        let rc = pool_RC.pop();
        if (!rc) return new RC;
        return rc;
    }
    static free(rc: RC) {
        pool_RC.push(rc);
    }
}
let pool_RC: RC[] = [];

function PosKey(x: number, y: number): number {
    let k = 0;
    k = (~k) + (k << 18); // k = (k << 18) - k - 1;
    k = k ^ (k >> 31);
    k = k * 21; // k = (k + (k << 2)) + (k << 4);
    k = k ^ (k >> 11);
    k = k + (k << 6);
    k = k ^ (k >> 22);
    return k;
}

const PosBinPool: PosBin[] = [];
class PosBin {
    static create() {
        const p = PosBinPool.pop();
        if (!p) {
            return new PosBin;
        } else {
            return p.reset();
        }
    }
    /**
     * @param {PosBin} p
     */
    static free(p: PosBin) {
        if (p && PosBinPool.length < 2019) {
            PosBinPool.push(p);
        }
        return PosBin;
    }

    key = 0;
    object_set: Map<Element, RC> = new Map;
    static_object_set: Map<Element, RC> = new Map;
    next: PosBin = null;

    reset() {
        this.key = 0;
        this.object_set.clear();
        this.static_object_set.clear();
        return this;
    }
}

type PairCallback = (A: CollisionObject2DSW, p_sub_index_A: number, B: CollisionObject2DSW, p_sub_index_B: number, userdata: any) => void;
type UnpairCallback = (A: CollisionObject2DSW, p_sub_index_A: number, B: CollisionObject2DSW, p_sub_index_B: number, data: any, userdata: any) => void;

export class BroadPhase2D {
    element_map: Map<number, Element> = new Map;
    large_elements: Map<Element, RC> = new Map;

    current = 0;
    pass = 1;

    // @Incomplete: load from project settings
    cell_size = 128;
    // @Incomplete: load from project settings
    large_object_min_surface = 512;

    pair_callback: PairCallback = null;
    pair_userdata: any = null;
    unpair_callback: UnpairCallback = null;
    unpair_userdata: any = null;

    pair_map: Map<string, PairData> = new Map;

    hash_table_size = 4096;
    hash_table: PosBin[] = null;

    constructor() {
        // @Incomplete: load from project settings
        this.hash_table_size = larger_prime(this.hash_table_size);
        this.hash_table = Array(this.hash_table_size);
    }

    _predelete() {
        return true;
    }
    _free() {
        for (let i = 0; i < this.hash_table_size; i++) {
            while (this.hash_table[i]) {
                let pb: PosBin = this.hash_table[i];
                this.hash_table[i] = pb.next;
                PosBin.free(pb);
            }
        }
        this.hash_table = [];
    }

    create(p_object: CollisionObject2DSW, p_subindex: number = 0) {
        this.current++;

        let e = Element.create();
        e.owner = p_object;
        e._static = false;
        e.subindex = p_subindex;
        e.self = this.current;
        e.pass = 0;

        this.element_map.set(this.current, e);
        return this.current;
    }

    move(p_id: number, p_aabb: Rect2) {
        let e = this.element_map.get(p_id);

        if (!p_aabb.equals(e.aabb)) {
            if (!p_aabb.is_zero()) {
                this._enter_grid(e, p_aabb, e._static);
            }

            if (!e.aabb.is_zero()) {
                this._exit_grid(e, e.aabb, e._static);
            }

            e.aabb.copy(p_aabb);
        }

        this._check_motion(e);
    }

    set_static(p_id: number, p_static: boolean) {
        let e = this.element_map.get(p_id);

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

    remove(p_id: number) {
        let e = this.element_map.get(p_id);

        if (!e.aabb.is_zero()) {
            this._exit_grid(e, e.aabb, e._static);
        }

        this.element_map.delete(p_id);
    }

    get_object(p_id: number) {
        return this.element_map.get(p_id).owner;
    }

    is_static(p_id: number) {
        return this.element_map.get(p_id)._static;
    }

    get_subindex(p_id: number) {
        return this.element_map.get(p_id).subindex;
    }

    cull_segment(p_from: Vector2, p_to: Vector2, p_results: CollisionObject2DSW[], p_max_results: number, p_result_indices: number[] = null) {
        this.pass++;

        let dir = p_to.clone().subtract(p_from);
        if (dir.is_zero()) {
            Vector2.free(dir);
            return 0;
        }
        // avoid divisions by zero
        dir.normalize();
        if (dir.x === 0) {
            dir.x = 0.000001;
        }
        if (dir.y === 0) {
            dir.y = 0.000001;
        }
        let delta = dir.clone().abs();

        delta.x = this.cell_size / delta.x;
        delta.y = this.cell_size / delta.y;

        let pos = p_from.clone().scale(1 / this.cell_size).floor();
        let end = p_to.clone().scale(1 / this.cell_size).floor();

        let step = Vector2.new(Math.sign(dir.x), Math.sign(dir.y));

        let max = Vector2.new();

        if (dir.x < 0) {
            max.x = (Math.floor(pos.x) * this.cell_size - p_from.x) / dir.x;
            max.x = (Math.floor(pos.x + 1) * this.cell_size - p_from.x) / dir.x;
        }

        if (dir.y < 0) {
            max.y = (Math.floor(pos.y) * this.cell_size - p_from.y) / dir.y;
            max.y = (Math.floor(pos.y + 1) * this.cell_size - p_from.y) / dir.y;
        }

        let cullcount = 0
        cullcount = this._cull(false, true,
            pos, Rect2.EMPTY, p_from, p_to, p_results, p_max_results, p_result_indices, cullcount
        );

        let reached_x = false;
        let reached_y = false;

        while (true) {
            if (max.x < max.y) {
                max.x += delta.x;
                pos.x += step.x;
            } else {
                max.y += delta.y;
                pos.y += step.y;
            }

            if (step.x > 0) {
                if (pos.x >= end.x) {
                    reached_x = true;
                }
            } else if (pos.x <= end.x) {
                reached_x = true;
            }

            if (step.y > 0) {
                if (pos.y >= end.y) {
                    reached_y = true;
                }
            } else if (pos.y <= end.y) {
                reached_y = true;
            }

            cullcount = this._cull(false, true,
                pos, Rect2.EMPTY, p_from, p_to, p_results, p_max_results, p_result_indices, cullcount
            );

            if (reached_x && reached_y) {
                break;
            }
        }

        for (let [e] of this.large_elements) {
            if (cullcount >= p_max_results) {
                break;
            }
            if (e.pass === this.pass) {
                continue;
            }

            e.pass = this.pass;

            if (!e.aabb.intersects_segment(p_from, p_to)) {
                continue;
            }

            p_results[cullcount] = e.owner;
            p_result_indices[cullcount] = e.subindex;
            cullcount++;
        }

        Vector2.free(max);
        Vector2.free(step);
        Vector2.free(end);
        Vector2.free(pos);
        Vector2.free(delta);
        Vector2.free(dir);
        return cullcount;
    }

    cull_aabb(p_aabb: Rect2, p_results: CollisionObject2DSW[], p_max_results: number, p_result_indices: number[] = null) {
        this.pass++;

        let from = Vector2.new(p_aabb.x / this.cell_size, p_aabb.y / this.cell_size).floor();
        let to = Vector2.new((p_aabb.x + p_aabb.width) / this.cell_size, (p_aabb.y + p_aabb.height) / this.cell_size).floor();
        let cullcount = 0;

        let point = Vector2.new();
        let tmp_vec_1 = Vector2.new();
        let tmp_vec_2 = Vector2.new();
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

        Vector2.free(tmp_vec_2);
        Vector2.free(tmp_vec_1);
        Vector2.free(point);
        Vector2.free(to);
        Vector2.free(from);
        return cullcount;
    }

    set_pair_callback(p_pair_callback: PairCallback, p_userdata: any) {
        this.pair_callback = p_pair_callback;
        this.pair_userdata = p_userdata;
    }
    set_unpair_callback(p_unpair_callback: UnpairCallback, p_userdata: any) {
        this.unpair_callback = p_unpair_callback;
        this.unpair_userdata = p_userdata;
    }

    update() { }

    _enter_grid(p_elem: Element, p_rect: Rect2, p_static: boolean) {
        // use magic number to avoid floating point issues
        let sz = Vector2.new(
            p_rect.width / this.cell_size * LARGE_ELEMENT_FI,
            p_rect.height / this.cell_size * LARGE_ELEMENT_FI
        )
        if (sz.width * sz.height > this.large_object_min_surface) {
            // large object, do not use grid, must check against all elements
            for (let [id, elem] of this.element_map) {
                if (id === p_elem.self) {
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
                E = RC.create();
                this.large_elements.set(p_elem, E);
            }
            E.inc();

            Vector2.free(sz);
            return;
        }

        let from = Vector2.new(p_rect.x / this.cell_size, p_rect.y / this.cell_size).floor();
        let to = Vector2.new((p_rect.x + p_rect.width) / this.cell_size, (p_rect.y + p_rect.height) / this.cell_size).floor();

        for (let i = from.x; i <= to.x; i++) {
            for (let j = from.y; j <= to.y; j++) {
                let pk = PosKey(i, j);
                let idx = pk % this.hash_table_size;
                let pb: PosBin = this.hash_table[idx];

                while (pb) {
                    if (pb.key === pk) {
                        break;
                    }

                    pb = pb.next;
                }

                let entered = false;

                if (!pb) {
                    pb = PosBin.create();
                    pb.key = pk;
                    pb.next = this.hash_table[idx];
                    this.hash_table[idx] = pb;
                }

                if (p_static) {
                    let E = pb.static_object_set.get(p_elem);
                    if (!E) {
                        E = RC.create();
                        pb.static_object_set.set(p_elem, E);
                    }

                    if (E.inc() === 1) {
                        entered = true;
                    }
                } else {
                    let E = pb.object_set.get(p_elem);
                    if (!E) {
                        E = RC.create();
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

            this._pair_attempt(elem, p_elem);
        }

        Vector2.free(sz);
        Vector2.free(from);
        Vector2.free(to);
    }
    _exit_grid(p_elem: Element, p_rect: Rect2, p_static: boolean) {
        // use magic number to avoid floating point issues
        let sz = Vector2.new(
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
            Vector2.free(sz);
            return;
        }

        let from = Vector2.new(p_rect.x / this.cell_size, p_rect.y / this.cell_size);
        let to = Vector2.new((p_rect.x + p_rect.width) / this.cell_size, (p_rect.y + p_rect.height) / this.cell_size);

        for (let i = from.x; i <= to.x; i++) {
            for (let j = from.y; j <= to.y; j++) {
                let pk = PosKey(i, j);
                let idx = pk % this.hash_table_size;
                let pb: PosBin = this.hash_table[idx];

                while (pb) {
                    if (pb.key === pk) {
                        break;
                    }

                    pb = pb.next;
                }

                let exited = false;

                if (p_static) {
                    let E = pb.static_object_set.get(p_elem);
                    if (!E) {
                        E = RC.create();
                        pb.static_object_set.set(p_elem, E);
                    }

                    if (E.dec() === 0) {
                        pb.static_object_set.delete(p_elem);
                        exited = true;
                    }
                } else {
                    let E = pb.object_set.get(p_elem);
                    if (!E) {
                        E = RC.create();
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
                    if (this.hash_table[idx] === pb) {
                        this.hash_table[idx] = pb.next;
                    } else {
                        let px = this.hash_table[idx];

                        while (px) {
                            if (px.next === pb) {
                                px.next = pb.next;
                                break;
                            }

                            px = px.next;
                        }
                    }

                    PosBin.free(pb);
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

        Vector2.free(sz);
        Vector2.free(from);
        Vector2.free(to);
    }

    _cull(use_aabb: boolean, use_segment: boolean, p_cell: Vector2, p_aabb: Rect2, p_from: Vector2, p_to: Vector2, p_results: CollisionObject2DSW[], p_max_results: number, p_result_indices: number[], index: number): number {
        let pk = PosKey(p_cell.x, p_cell.y);
        let idx = pk % this.hash_table_size;
        let pb: PosBin = this.hash_table[idx];

        while (pb) {
            if (pb.key === pk) {
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

    _pair_attempt(p_elem: Element, p_with: Element) {
        let pair_data = p_elem.paired.get(p_with);

        if (!pair_data) {
            let pd = PairData.create();
            p_elem.paired.set(p_with, pd);
            p_with.paired.set(p_elem, pd);
        } else {
            pair_data.rc++;
        }
    }
    _unpair_attempt(p_elem: Element, p_with: Element) {
        let pair_data = p_elem.paired.get(p_with);

        pair_data.rc--;

        if (pair_data.rc === 0) {
            if (pair_data.colliding) {
                // uncollide
                if (this.unpair_callback) {
                    this.unpair_callback(p_elem.owner, p_elem.subindex, p_with.owner, p_with.subindex, pair_data.ud, this.unpair_userdata);
                }
            }

            PairData.free(pair_data);
            p_elem.paired.delete(p_with);
            p_with.paired.delete(p_elem);
        }
    }

    _check_motion(p_elem: Element) {
        for (let [elem, pair_data] of p_elem.paired) {
            let physical_collision = p_elem.aabb.intersects(elem.aabb);
            let logical_collision = p_elem.owner.test_collision_mask(elem.owner);

            if (physical_collision) {
                if (!pair_data.colliding || (logical_collision && !pair_data.ud && this.pair_callback)) {
                    pair_data.ud = this.pair_callback(p_elem.owner, p_elem.subindex, elem.owner, elem.subindex, this.pair_userdata);
                } else if (pair_data.colliding && !logical_collision && pair_data.ud && this.unpair_callback) {
                    this.unpair_callback(p_elem.owner, p_elem.subindex, elem.owner, elem.subindex, pair_data.ud, this.unpair_userdata);
                    pair_data.ud = null;
                }
                pair_data.colliding = true;
            } else {
                if (pair_data.colliding && this.unpair_callback) {
                    this.unpair_callback(p_elem.owner, p_elem.subindex, elem.owner, elem.subindex, pair_data.ud, this.unpair_userdata);
                }
                pair_data.colliding = false;
            }
        }
    }
}
