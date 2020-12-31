import { List, Element as List$Element } from "../list";

import { AABB } from "./aabb";
import { CMP_EPSILON } from "./math_defs";
import { clamp } from "./math_funcs";
import { Plane } from "./plane";
import { Vector3, Vector3Like } from "./vector3";

const OCTREE_DIVISOR = 4;

const NEG = 0;
const POS = 1;

const OCTANT_NX_NY_NZ = 0;
const OCTANT_PX_NY_NZ = 1;
const OCTANT_NX_PY_NZ = 2;
const OCTANT_PX_PY_NZ = 3;
const OCTANT_NX_NY_PZ = 4;
const OCTANT_PX_NY_PZ = 5;
const OCTANT_NX_PY_PZ = 6;
const OCTANT_PX_PY_PZ = 7;

let el_pool: Element<any>[] = [];
function Element_new() {
    let e = el_pool.pop();
    if (!e) e = new Element;
    return e.reset();
}
function Element_free(e: Element<any>) {
    el_pool.push(e);
}

class Element<T> {
    octree: Octree<T> = null;

    userdata: T = null;
    subindex = 0;
    pairable = false;
    pairable_mask = 0;
    pairable_type = 0;

    last_pass = 0;
    id = 0;
    common_parent: Octant<T> = null;

    aabb = new AABB;
    container_aabb = new AABB;

    pair_list: List<PairData<T>> = new List;

    octant_owners: List<{ octant: Octant<T>, E: List$Element<Element<T>> }> = new List;

    reset() {
        this.id = 0;
        this.aabb.set(0, 0, 0, 0, 0, 0);
        this.container_aabb.set(0, 0, 0, 0, 0, 0);

        this.subindex = 0;
        this.userdata = null;

        this.last_pass = 0;

        this.pairable = false;
        this.pairable_type = 0;
        this.pairable_mask = 0;

        this.octree = null;
        this.common_parent = null;

        return this;
    }

    moving() {
        for (let F = this.octant_owners.front(); F;) {
            F.value.octant.dirty = true;
            F = F.next;
        }
    }
}

/** @type {Octant[]} */
let ot_pool: Octant<any>[] = [];
function Octant_new() {
    let e = ot_pool.pop();
    if (!e) e = new Octant;
    return e.reset();
}
/**
 * @param {Octant} ot
 */
function Octant_free(ot: Octant<any>) {
    ot_pool.push(ot);
}

class PairData<T> {
    A: Element<T> = null;
    B: Element<T> = null;
    /** @type {any} */
    ud: any = null;

    eA: List$Element<PairData<T>> = null;
    eB: List$Element<PairData<T>> = null;

    refcount = 0;
    intersect = false;
}

class CachedList<T> {
    aabbs: AABB[] = [];
    elements: Element<T>[] = [];

    update(eles: List<Element<T>>) {
        this.aabbs.length = 0;
        this.elements.length = 0;

        let E = eles.front();
        while (E) {
            let e = E.value;
            this.aabbs.push(e.aabb);
            this.elements.push(e);
            E = E.next;
        }
    }
}

class Octant<T> {
    aabb = new AABB;

    last_pass = 0;
    parent: Octant<T> = null;
    children: Octant<T>[] = [
        null, null, null, null,
        null, null, null, null,
    ];

    children_count = 0;
    parent_index = -1;

    elements: List<Element<T>> = new List;
    pairable_elements: List<Element<T>> = new List;

    clist = new CachedList<T>();
    clist_pairable = new CachedList<T>();

    dirty = true;

    reset() {
        this.aabb.set(0, 0, 0, 0, 0, 0);
        this.last_pass = 0;
        this.parent = null;
        for (let i = 0; i < 8; i++) this.children[i] = null;

        this.children_count = 0;
        this.parent_index = -1;

        this.elements = new List;
        this.pairable_elements = new List;

        this.dirty = true;

        return this;
    }

    update_cached_lists() {
        if (!this.dirty) return;

        this.clist_pairable.update(this.pairable_elements);
        this.clist.update(this.elements);
        this.dirty = false;
    }
}

export class Octree<T> {
    last_element_id = 1;
    pass = 1;

    octant_count = 0;
    pair_count = 0;
    octant_elements_limit = 0;

    use_pairs: boolean;
    unit_size: number;

    root: Octant<T> = null;

    element_map: { [id: number]: Element<T> } = Object.create(null);
    pair_map: { [key: string]: PairData<T> } = Object.create(null);

    pair_callback: (ud: any, a_id: number, a_ud: any, a_sub: number, b_id: number, b_ud: any, b_sub: number, pair_ud: any) => any = (ud, a_id, a_ud, a_sub, b_id, b_ud, b_sub, pair_ud): any => { };
    unpair_callback: (ud: any, a_id: number, a_ud: any, a_sub: number, b_id: number, b_ud: any, b_sub: number, pair_ud: any) => void = (ud, a_id, a_ud, a_sub, b_id, b_ud, b_sub, pair_ud): void => { };
    pair_callback_userdata: any = null;
    unpair_callback_userdata: any = null;

    constructor(use_pairs: boolean, unit_size: number = 1.0) {
        this.use_pairs = use_pairs;
        this.unit_size = unit_size;
    }

    /**
     * @param {T} p_userdata
     * @param {AABB} p_aabb
     */
    create(p_userdata: T, p_aabb: AABB, p_subindex = 0, p_pairable = false, p_pairable_type = 0, p_pairable_mask = 1) {
        let e = this.element_map[this.last_element_id++] = Element_new();

        e.aabb.copy(p_aabb);
        e.userdata = p_userdata;
        e.subindex = p_subindex;
        e.last_pass = 0;
        e.octree = this;
        e.pairable = p_pairable;
        e.pairable_type = p_pairable_type;
        e.pairable_mask = p_pairable_mask;
        e.id = this.last_element_id - 1;

        if (!e.aabb.has_no_surface()) {
            this._ensure_valid_root(p_aabb);
            this._insert_element(e, this.root);
            if (this.use_pairs) {
                this._element_check_pairs(e);
            }
        }

        return this.last_element_id - 1;
    }

    /**
     * @param {number} p_id
     * @param {AABB} p_aabb
     */
    move(p_id: number, p_aabb: AABB) {
        let e = this.element_map[p_id];

        let old_has_surf = !e.aabb.has_no_surface();
        let new_has_surf = !p_aabb.has_no_surface();

        if (old_has_surf !== new_has_surf) {
            if (old_has_surf) {
                this._remove_element(e);
                e.common_parent = null;
                e.aabb.set(0, 0, 0, 0, 0, 0);
                this._optimize();
            } else {
                this._ensure_valid_root(p_aabb);
                e.common_parent = null;
                e.aabb = p_aabb;
                this._insert_element(e, this.root);
                if (this.use_pairs) {
                    this._element_check_pairs(e);
                }
            }

            return;
        }

        if (!old_has_surf) {
            return;
        }

        if (e.container_aabb.encloses(p_aabb)) {
            e.aabb.copy(p_aabb);
            if (this.use_pairs) {
                this._element_check_pairs(e);
            }

            e.moving();

            return;
        }

        let combined = e.aabb.merged(p_aabb);
        this._ensure_valid_root(combined);

        let owners = e.octant_owners.clone();
        let common_parent = e.common_parent;

        this.pass++;

        while (common_parent && !common_parent.aabb.encloses(p_aabb)) {
            common_parent = common_parent.parent;
        }

        e.octant_owners.clear();
        e.common_parent = null;
        e.aabb.copy(p_aabb);

        this._insert_element(e, common_parent);

        this.pass++;

        for (let F = owners.front(); F;) {
            let o = F.value.octant;
            let N = F.next;

            if (this.use_pairs && e.pairable) {
                o.pairable_elements.erase(F.value.E);
            } else {
                o.elements.erase(F.value.E);
            }

            o.dirty = true;

            if (this._remove_element_pair_and_remove_empty_octants(e, o, common_parent.parent)) {
                owners.erase(F);
            }

            F = N;
        }

        if (this.use_pairs) {
            for (let F = owners.front(); F; F = F.next) {
                let o = F.value.octant;

                this.pass++;
                for (let i = 0; i < 8; i++) {
                    if (o.children[i]) {
                        this._unpair_element(e, o.children[i]);
                    }
                }
            }

            this._element_check_pairs(e);
        }

        this._optimize();
    }

    /**
     * @param {number} p_id
     */
    erase(p_id: number) {
        let e = this.element_map[p_id];

        if (!e.aabb.has_no_surface()) {
            this._remove_element(e);
        }

        this.element_map[p_id] = null;
        this._optimize();

        Element_free(e);
    }

    /**
     * @param {Vector3Like} p_from
     * @param {Vector3Like} p_to
     * @param {T[]} p_result_array
     * @param {number} p_result_max
     * @param {number[]} [p_subindex_array]
     * @param {number} [p_mask]
     */
    cull_segment(p_from: Vector3Like, p_to: Vector3Like, p_result_array: T[], p_result_max: number, p_subindex_array: number[], p_mask: number = 0xFFFFFFFF) {
        if (!this.root) return 0;

        this.pass++;
        let result = {
            index: 0,
            array: p_result_array,
            subindex_array: p_subindex_array,
            mask: p_mask,
        };
        this._cull_segment(this.root, p_from, p_to, p_result_max, result);

        return result.index;
    }

    /**
     * @param {AABB} p_aabb
     * @param {T[]} p_result_array
     * @param {number} p_result_max
     * @param {number[]} [p_subindex_array]
     * @param {number} [p_mask]
     */
    cull_aabb(p_aabb: AABB, p_result_array: T[], p_result_max: number, p_subindex_array: number[], p_mask: number = 0xFFFFFFFF) {
        if (!this.root) return 0;

        this.pass++;
        let result = {
            index: 0,
            array: p_result_array,
            subindex_array: p_subindex_array,
            mask: p_mask,
        };
        this._cull_aabb(this.root, p_aabb, p_result_max, result);
        return result.index;
    }

    /**
     * @param {Plane[]} p_convex
     * @param {T[]} p_result_array
     * @param {number} p_result_max
     * @param {number} p_mask
     */
    cull_convex(p_convex: Plane[], p_result_array: T[], p_result_max: number, p_mask: number = 0xFFFFFFFF) {
        if (!this.root || p_convex.length == 0) return 0;

        let convex_points = compute_convex_mesh_points(p_convex);
        if (convex_points.length === 0) return 0;

        this.pass++;
        let cdata = {
            planes: p_convex,
            points: convex_points,
            result_array: p_result_array,
            result_max: p_result_max,
            result_idx: 0,
            mask: p_mask,
        };
        this._cull_convex(this.root, cdata);

        // recycle Vector3 objects
        for (let p of convex_points) {
            pool_Vector3.push(p);
        }

        return cdata.result_idx;
    }

    /**
     * TODO: load balance value from project settings
     * @param {number} p_bal
     */
    set_balance(p_bal: number) {
        let v = clamp(p_bal, 0, 1);
        v *= v;
        v *= v;
        v *= 8096;
        this.octant_elements_limit = Math.floor(v);
    }

    set_pairable(p_id: number, p_pairable: boolean, p_pairable_type: number, p_pairable_mask: number) {
        let e = this.element_map[p_id];

        if (p_pairable === e.pairable && e.pairable_type === p_pairable_type && e.pairable_mask === p_pairable_mask) {
            return;
        }

        if (!e.aabb.has_no_surface()) {
            this._remove_element(e);
        }

        e.pairable = p_pairable;
        e.pairable_type = p_pairable_type;
        e.pairable_mask = p_pairable_mask;
        e.common_parent = null;

        if (!e.aabb.has_no_surface()) {
            this._ensure_valid_root(e.aabb);
            this._insert_element(e, this.root);
            if (this.use_pairs) {
                this._element_check_pairs(e);
            }
        }
    }

    _cull_segment(p_octant: Octant<T>, p_from: Vector3Like, p_to: Vector3Like, p_result_max: number, result: { array: T[]; subindex_array: number[]; index: number; mask: number; }) {
        if (p_result_max === result.index) return;

        if (!p_octant.elements.empty()) {
            p_octant.update_cached_lists();

            let num_elements = p_octant.clist.elements.length;
            for (let n = 0; n < num_elements; n++) {
                let aabb = p_octant.clist.aabbs[n];
                let e = p_octant.clist.elements[n];

                if (e.last_pass === this.pass || (this.use_pairs && !(e.pairable_type & result.mask))) {
                    continue;
                }
                e.last_pass = this.pass;

                if (aabb.intersects_segment(p_from, p_to)) {
                    if (result.index < p_result_max) {
                        result.array[result.index] = e.userdata;
                        if (result.subindex_array) {
                            result.subindex_array[result.index] = e.subindex;
                        }
                        result.index++;
                    } else {
                        return;
                    }
                }
            }
        }

        if (this.use_pairs && !p_octant.pairable_elements.empty()) {
            p_octant.update_cached_lists();

            let num_elements = p_octant.clist_pairable.elements.length;
            for (let n = 0; n < num_elements; n++) {
                let aabb = p_octant.clist_pairable.aabbs[n];
                let e = p_octant.clist_pairable.elements[n];

                if (e.last_pass === this.pass || (this.use_pairs && !(e.pairable_type & result.mask))) {
                    continue;
                }
                e.last_pass = this.pass;

                if (aabb.intersects_segment(p_from, p_to)) {
                    if (result.index < p_result_max) {
                        result.array[result.index] = e.userdata;
                        if (result.subindex_array) {
                            result.subindex_array[result.index] = e.subindex;
                        }
                        result.index++;
                    } else {
                        return;
                    }
                }
            }
        }

        for (let i = 0; i < 8; i++) {
            if (p_octant.children[i] && p_octant.children[i].aabb.intersects_segment(p_from, p_to)) {
                this._cull_segment(p_octant.children[i], p_from, p_to, p_result_max, result);
            }
        }
    }

    /**
     * @param {Octant} p_octant
     * @param {AABB} p_aabb
     * @param {number} p_result_max
     * @param {{ array: T[], subindex_array: number[], index: number, mask: number }} result
     */
    _cull_aabb(p_octant: Octant<T>, p_aabb: AABB, p_result_max: number, result: { array: T[]; subindex_array: number[]; index: number; mask: number; }) {
        if (p_result_max === result.index) return;

        if (!p_octant.elements.empty()) {
            p_octant.update_cached_lists();

            let num_elements = p_octant.clist.elements.length;
            for (let n = 0; n < num_elements; n++) {
                let aabb = p_octant.clist.aabbs[n];
                let e = p_octant.clist.elements[n];

                if (p_aabb.intersects_inclusive(aabb)) {
                    if (e.last_pass === this.pass || (this.use_pairs && !(e.pairable_type & result.mask))) {
                        continue;
                    }
                    e.last_pass = this.pass;

                    if (result.index < p_result_max) {
                        result.array[result.index] = e.userdata;
                        if (result.subindex_array) {
                            result.subindex_array[result.index] = e.subindex;
                        }
                        result.index++;
                    } else {
                        return;
                    }
                }
            }
        }

        if (this.use_pairs && !p_octant.pairable_elements.empty()) {
            p_octant.update_cached_lists();

            let num_elements = p_octant.clist_pairable.elements.length;
            for (let n = 0; n < num_elements; n++) {
                let aabb = p_octant.clist_pairable.aabbs[n];
                let e = p_octant.clist_pairable.elements[n];

                if (p_aabb.intersects_inclusive(aabb)) {
                    if (e.last_pass === this.pass || (this.use_pairs && !(e.pairable_type & result.mask))) {
                        continue;
                    }
                    e.last_pass = this.pass;

                    if (result.index < p_result_max) {
                        result.array[result.index] = e.userdata;
                        if (result.subindex_array) {
                            result.subindex_array[result.index] = e.subindex;
                        }
                        result.index++;
                    } else {
                        return;
                    }
                }
            }
        }

        for (let i = 0; i < 8; i++) {
            if (p_octant.children[i] && p_octant.children[i].aabb.intersects_inclusive(p_aabb)) {
                this._cull_aabb(p_octant.children[i], p_aabb, p_result_max, result);
            }
        }
    }

    _cull_convex(p_octant: Octant<T>, p_cull: { result_array: T[]; result_idx: number; result_max: number; planes: Plane[]; points: Vector3[]; mask: number; }) {
        if (p_cull.result_max === p_cull.result_idx) return;

        if (!p_octant.elements.empty()) {
            p_octant.update_cached_lists();

            let num_elements = p_octant.clist.elements.length;
            for (let n = 0; n < num_elements; n++) {
                let aabb = p_octant.clist.aabbs[n];
                let e = p_octant.clist.elements[n];

                if (aabb.intersects_convex_shape(p_cull.planes, p_cull.points)) {
                    if (e.last_pass === this.pass || (this.use_pairs && !(e.pairable_type & p_cull.mask))) {
                        continue;
                    }
                    e.last_pass = this.pass;

                    if (p_cull.result_idx < p_cull.result_max) {
                        p_cull.result_array[p_cull.result_idx] = e.userdata;
                        p_cull.result_idx++;
                    } else {
                        return;
                    }
                }
            }
        }

        if (this.use_pairs && !p_octant.pairable_elements.empty()) {
            p_octant.update_cached_lists();

            let num_elements = p_octant.clist_pairable.elements.length;
            for (let n = 0; n < num_elements; n++) {
                let aabb = p_octant.clist_pairable.aabbs[n];
                let e = p_octant.clist_pairable.elements[n];

                if (aabb.intersects_convex_shape(p_cull.planes, p_cull.points)) {
                    if (e.last_pass === this.pass || (this.use_pairs && !(e.pairable_type & p_cull.mask))) {
                        continue;
                    }
                    e.last_pass = this.pass;

                    if (p_cull.result_idx < p_cull.result_max) {
                        p_cull.result_array[p_cull.result_idx] = e.userdata;
                        p_cull.result_idx++;
                    } else {
                        return;
                    }
                }
            }
        }

        for (let i = 0; i < 8; i++) {
            if (p_octant.children[i] && p_octant.children[i].aabb.intersects_convex_shape(p_cull.planes, p_cull.points)) {
                this._cull_convex(p_octant.children[i], p_cull);
            }
        }
    }

    /**
     * @param {AABB} p_aabb
     */
    _ensure_valid_root(p_aabb: AABB) {
        if (!this.root) {
            let base = new AABB().set(
                0, 0, 0,
                this.unit_size, this.unit_size, this.unit_size
            );

            while (!base.encloses(p_aabb)) {
                if (Math.abs(base.position.x + base.size.x) <= Math.abs(base.position.x)) {
                    base.size.scale(2);
                } else {
                    base.position.subtract(base.size);
                    base.size.scale(2);
                }
            }

            this.root = Octant_new();

            this.root.parent = null;
            this.root.parent_index = -1;
            this.root.aabb.copy(base);

            this.octant_count++;
        } else {
            let base = new AABB().copy(this.root.aabb);

            while (!base.encloses(p_aabb)) {
                let gp = Octant_new();
                this.octant_count++;
                this.root.parent = gp;

                if (Math.abs(base.position.x + base.size.x) <= Math.abs(base.position.x)) {
                    base.size.scale(2);
                    gp.aabb.copy(base);
                    gp.children[0] = this.root;
                    this.root.parent_index = 0;
                } else {
                    base.position.subtract(base.size);
                    base.size.scale(2);
                    gp.aabb.copy(base);
                    gp.children[(1 << 0) | (1 << 1) | (1 << 2)] = this.root;
                    this.root.parent_index = (1 << 0) | (1 << 1) | (1 << 2);
                }

                gp.children_count = 1;
                this.root = gp;
            }
        }
    }



    /**
     * @param {Element} p_element
     * @param {Octant} p_octant
     */
    _insert_element(p_element: Element<T>, p_octant: Octant<T>) {
        let element_size = p_element.aabb.get_longest_axis_size() * 1.01;

        let can_split = true;

        if (p_element.pairable) {
            if (p_octant.pairable_elements.size() < this.octant_elements_limit) {
                can_split = false;
            }
        } else {
            if (p_octant.elements.size() < this.octant_elements_limit) {
                can_split = false;
            }
        }

        if (!can_split || (p_octant.aabb.size.x / OCTREE_DIVISOR < element_size)) {
            let owner = {
                octant: p_octant,
                E: null as List$Element<Element<T>>,
            };

            if (this.use_pairs && p_element.pairable) {
                p_octant.pairable_elements.push_back(p_element);
                owner.E = p_octant.pairable_elements.back();
            } else {
                p_octant.elements.push_back(p_element);
                owner.E = p_octant.elements.back();
            }

            p_octant.dirty = true;

            p_element.octant_owners.push_back(owner);

            if (!p_element.common_parent) {
                p_element.common_parent = p_octant;
                p_element.container_aabb.copy(p_octant.aabb);
            } else {
                p_element.container_aabb.merge_with(p_octant.aabb);
            }

            if (this.use_pairs && p_octant.children_count > 0) {
                this.pass++;

                for (let i = 0; i < 8; i++) {
                    if (p_octant.children[i]) {
                        this._pair_element(p_element, p_octant.children[i]);
                    }
                }
            }
        } else {
            /* not big enough, send it to sub items */
            let splits = 0;
            let candidate = !p_element.common_parent;

            for (let i = 0; i < 8; i++) {
                if (p_octant.children[i]) {
                    if (p_octant.children[i].aabb.intersects_inclusive(p_element.aabb)) {
                        this._insert_element(p_element, p_octant.children[i]);
                        splits++;
                    }
                } else {
                    let aabb = p_octant.aabb.clone();
                    aabb.size.scale(0.5);

                    if (i & 1) aabb.position.x += aabb.size.x;
                    if (i & 2) aabb.position.y += aabb.size.y;
                    if (i & 4) aabb.position.z += aabb.size.z;

                    if (aabb.intersects_inclusive(p_element.aabb)) {
                        let child = Octant_new();
                        p_octant.children[i] = child;
                        child.parent = p_octant;
                        child.parent_index = i;

                        child.aabb.copy(aabb);

                        p_octant.children_count++;

                        this._insert_element(p_element, child);
                        this.octant_count++;
                        splits++;
                    }

                    AABB.free(aabb);
                }
            }

            if (candidate && splits > 1) {
                p_element.common_parent = p_octant;
            }
        }

        if (this.use_pairs) {
            let E = p_octant.pairable_elements.front();
            while (E) {
                this._pair_reference(p_element, E.value);
                E = E.next;
            }

            if (p_element.pairable) {
                E = p_octant.elements.front();
                while (E) {
                    this._pair_reference(p_element, E.value);
                    E = E.next;
                }
            }
        }
    }

    _remove_element(p_element: Element<T>) {
        this.pass++;

        let I = p_element.octant_owners.front();
        for (; I; I = I.next) {
            let o = I.value.octant;

            if (!this.use_pairs) {
                o.elements.erase(I.value.E);
            } else {
                this.pass++;
                for (let i = 0; i < 8; i++) {
                    if (o.children[i]) {
                        this._unpair_element(p_element, o.children[i]);
                    }
                }

                if (p_element.pairable) {
                    o.pairable_elements.erase(I.value.E);
                } else {
                    o.elements.erase(I.value.E);
                }

                o.dirty = true;

                this._remove_element_pair_and_remove_empty_octants(p_element, o);
            }
        }

        p_element.octant_owners.clear();
    }

    /**
     * @param {Element} p_element
     * @param {Octant} p_octant
     * @param {Octant} [p_limit]
     */
    _remove_element_pair_and_remove_empty_octants(p_element: Element<T>, p_octant: Octant<T>, p_limit: Octant<T> = null) {
        let octant_removed = false;

        while (true) {
            if (p_octant == p_limit) {
                return octant_removed;
            }

            let unpaired = false;

            if (this.use_pairs && p_octant.last_pass !== this.pass) {
                let E = p_octant.pairable_elements.front();
                while (E) {
                    this._pair_unreference(p_element, E.value);
                    E = E.next;
                }
                if (p_element.pairable) {
                    E = p_octant.elements.front();
                    while (E) {
                        this._pair_unreference(p_element, E.value);
                        E = E.next;
                    }
                }
                p_octant.last_pass = this.pass;
                unpaired = true;
            }

            let removed = false;

            let parent = p_octant.parent;

            if (p_octant.children_count === 0 && p_octant.elements.empty()) {
                // erase octant

                if (p_octant === this.root) {
                    this.root = null;
                } else {
                    parent.children[p_octant.parent_index] = null;
                    parent.children_count--;
                }

                Octant_free(p_octant);
                this.octant_count--;
                removed = true;
                octant_removed = true;
            }

            if (!removed && !unpaired) {
                return octant_removed;
            }

            p_octant = parent;
        }

        return octant_removed;
    }

    /**
     * @param {PairData} p_pair
     */
    _pair_check(p_pair: PairData<T>) {
        let intersect = p_pair.A.aabb.intersects_inclusive(p_pair.B.aabb);

        if (intersect !== p_pair.intersect) {
            if (intersect) {
                if (this.pair_callback) {
                    p_pair.ud = this.pair_callback(this.pair_callback_userdata, p_pair.A.id, p_pair.A.userdata, p_pair.A.subindex, p_pair.B.id, p_pair.B.userdata, p_pair.B.subindex, p_pair.ud);
                }
                this.pair_count++;
            } else {
                if (this.unpair_callback) {
                    this.unpair_callback(this.pair_callback_userdata, p_pair.A.id, p_pair.A.userdata, p_pair.A.subindex, p_pair.B.id, p_pair.B.userdata, p_pair.B.subindex, p_pair.ud);
                }
                this.pair_count--;
            }

            p_pair.intersect = intersect;
        }
    }

    /**
     * @param {Element} p_A
     * @param {Element} p_B
     */
    _pair_reference(p_A: Element<T>, p_B: Element<T>) {
        if (p_A === p_B || (p_A.userdata === p_B.userdata && p_A.userdata)) {
            return;
        }

        if (
            !(p_A.pairable_type & p_B.pairable_mask)
            &&
            !(p_B.pairable_type & p_A.pairable_mask)
        ) {
            return;
        }

        let key = create_pair_key(p_A.id, p_B.id);
        let e = this.pair_map[key];

        if (!e) {
            e = new PairData;
            e.refcount = 1;
            e.A = p_A;
            e.B = p_B;
            e.intersect = false;
            this.pair_map[key] = e;
            e.eA = p_A.pair_list.push_back(e);
            e.eB = p_B.pair_list.push_back(e);
        } else {
            e.refcount++;
        }
    }

    /**
     * @param {Element} p_A
     * @param {Element} p_B
     */
    _pair_unreference(p_A: Element<T>, p_B: Element<T>) {
        if (p_A == p_B) return;

        let key = create_pair_key(p_A.id, p_B.id);
        let e = this.pair_map[key];
        if (!e) return;

        e.refcount--;

        if (e.refcount === 0) {
            if (e.intersect) {
                if (this.unpair_callback) {
                    this.unpair_callback(this.pair_callback_userdata, p_A.id, p_A.userdata, p_A.subindex, p_B.id, p_B.userdata, p_B.subindex, e.ud);
                }

                this.pair_count--;
            }

            if (p_A === e.B) {
                let t = p_A;
                p_A = p_B;
                p_B = t;
            }

            p_A.pair_list.erase(e.eA);
            p_B.pair_list.erase(e.eB);
            this.pair_map[key] = null;
        }
    }

    /**
     * @param {Element} p_element
     */
    _element_check_pairs(p_element: Element<T>) {
        let E = p_element.pair_list.front();
        while (E) {
            this._pair_check(E.value);
            E = E.next;
        }
    }

    /**
     * @param {Octant} p_octant
     */
    _remove_tree(p_octant: Octant<T>) {
        if (!p_octant) return;

        for (let i = 0; i < 8; i++) {
            if (p_octant.children[i]) {
                this._remove_tree(p_octant.children[i]);
            }
        }

        Octant_free(p_octant);
    }

    /**
     * @param {Element} p_element
     * @param {Octant} p_octant
     */
    _pair_element(p_element: Element<T>, p_octant: Octant<T>) {
        let E = p_octant.pairable_elements.front();
        while (E) {
            if (E.value.last_pass !== this.pass) {
                this._pair_reference(p_element, E.value);
                E.value.last_pass = this.pass;
            }
            E = E.next;
        }

        if (p_element.pairable) {
            E = p_octant.elements.front();
            while (E) {
                if (E.value.last_pass !== this.pass) {
                    this._pair_reference(p_element, E.value);
                    E.value.last_pass = this.pass;
                }
                E = E.next;
            }
        }
        p_octant.last_pass = this.pass;

        if (p_octant.children_count === 0) {
            return;
        }

        for (let i = 0; i < 8; i++) {
            if (p_octant.children[i]) {
                this._pair_element(p_element, p_octant.children[i]);
            }
        }
    }
    /**
     * @param {Element} p_element
     * @param {Octant} p_octant
     */
    _unpair_element(p_element: Element<T>, p_octant: Octant<T>) {
        let E = p_octant.pairable_elements.front();
        while (E) {
            if (E.value.last_pass !== this.pass) {
                this._pair_unreference(p_element, E.value);
                E.value.last_pass = this.pass;
            }
            E = E.next;
        }

        if (p_element.pairable) {
            E = p_octant.elements.front();
            while (E) {
                if (E.value.last_pass !== this.pass) {
                    this._pair_unreference(p_element, E.value);
                    E.value.last_pass = this.pass;
                }
                E = E.next;
            }
        }

        p_octant.last_pass = this.pass;

        if (p_octant.children_count === 0) {
            return;
        }

        for (let i = 0; i < 8; i++) {
            if (p_octant.children[i]) {
                this._unpair_element(p_element, p_octant.children[i]);
            }
        }
    }

    _optimize() {
        while (this.root && this.root.children_count < 2 && !this.root.elements.size() && !(this.use_pairs && this.root.pairable_elements.size())) {
            let new_root: Octant<T> = null;
            if (this.root.children_count === 1) {
                for (let i = 0; i < 8; i++) {
                    if (this.root.children[i]) {
                        new_root = this.root.children[i];
                        this.root.children[i] = null;
                        break;
                    }
                }
                new_root.parent = null;
                new_root.parent_index = -1;
            }

            Octant_free(this.root);
            this.octant_count--;
            this.root = new_root;
        }
    }
}

/** @type {Vector3[]} */
let pool_Vector3: Vector3[] = [];

/**
 * TODO: move `compute_convex_mesh_points` to geometry module
 * @param {Plane[]} planes
 */
function compute_convex_mesh_points(planes: Plane[]) {
    /** @type {Vector3[]} */
    let points: Vector3[] = [];

    for (let i = planes.length - 1; i >= 0; i--) {
        for (let j = i - 1; j >= 0; j--) {
            for (let k = j - 1; k >= 0; k--) {
                let convex_shape_point = pool_Vector3.pop();
                if (!convex_shape_point) convex_shape_point = new Vector3;

                if (planes[i].intersect_3(planes[j], planes[k], convex_shape_point)) {
                    let excluded = false;
                    for (let n = 0; n < planes.length; n++) {
                        if (n !== i && n !== j && n !== k) {
                            let dp = planes[n].normal.dot(convex_shape_point);
                            if (dp - planes[n].d > CMP_EPSILON) {
                                excluded = true;
                                break;
                            }
                        }
                    }

                    if (!excluded) {
                        points.push(convex_shape_point);
                    }
                }
            }
        }
    }

    return points;
}

/**
 * @param {number} a_id
 * @param {number} b_id
 */
function create_pair_key(a_id: number, b_id: number) {
    return (a_id <= b_id) ? `${a_id}.${b_id}` : `${b_id}.${a_id}`;
}
