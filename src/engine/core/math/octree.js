import { AABB } from "./aabb.js";
import { Plane } from "./plane.js";
import { Vector3Like } from "./vector3.js";

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

/** @type {Element[]} */
let el_pool = [];
function Element_new() {
    let e = el_pool.pop();
    if (!e) e = new Element;
    return e.reset();
}
/**
 * @param {Element} e
 */
function Element_free(e) {
    el_pool.push(e);
}

/**
 * @template T
 */
class Element {
    constructor() {
        this.id = 0;

        this.aabb = new AABB;
        this.container_aabb = new AABB;

        /** @type {T} */
        this.userdata = null;

        this.last_pass = 0;

        this.pairable = false;
        this.pairable_type = 0;
        this.pairable_mask = 0;
        /** @type {PairData<T>[]} */
        this.pair_list = [];

        /** @type {Octree} */
        this.octree = null;

        /** @type {Octant} */
        this.common_parent = null;

        /** @type {{ octant: Octant, E: Element }[]} */
        this.octant_owners = [];
    }
    reset() {
        this.id = 0;
        this.aabb.set(0, 0, 0, 0, 0, 0);
        this.container_aabb.set(0, 0, 0, 0, 0, 0);

        this.userdata = null;

        this.last_pass = 0;

        this.pairable = false;
        this.pairable_type = 0;
        this.pairable_mask = 0;

        this.octree = null;

        return this;
    }
}

/** @type {Octant[]} */
let ot_pool = [];
function Octant_new() {
    let e = ot_pool.pop();
    if (!e) e = new Octant;
    return e.reset();
}
/**
 * @param {Octant} ot
 */
function Octant_free(ot) {
    ot_pool.push(ot);
}

/**
 * @template T
 */
class PairData {
    constructor() {
        this.intersect = false;
        /** @type {Element<T>} */
        this.A = null;
        /** @type {Element<T>} */
        this.B = null;
        /** @type {any} */
        this.ud = null;

        this.rc = 0;
    }
}

class Octant {
    constructor() {
        this.aabb = new AABB;

        this.last_pass = 0;
        /** @type {Octant} */
        this.parent = null;
        /** @type {Octant[]} */
        this.children = [
            null, null, null, null,
            null, null, null, null,
        ];

        this.children_count = 0;
        this.parent_index = -1;

        /** @type {Element[]} */
        this.elements = [];
        /** @type {Element[]} */
        this.pairable_elements = [];
    }
    reset() {
        this.aabb.set(0, 0, 0, 0, 0, 0);
        this.last_pass = 0;
        this.parent = null;
        for (let i = 0; i < 8; i++) this.children[i] = null;

        this.children_count = 0;
        this.parent_index = -1;

        this.elements.length = 0;
        this.pairable_elements.length = 0;

        return this;
    }
}

/**
 * @template T
 */
export class Octree {
    /**
     * @param {boolean} use_pairs
     * @param {number} [unit_size]
     */
    constructor(use_pairs, unit_size = 1.0) {
        this.last_element_id = 0;
        this.pass = 0;

        this.octant_count = 0;
        this.pair_count = 0;

        this.use_pairs = use_pairs;
        this.unit_size = unit_size;

        /** @type {Octant} */
        this.root = null;

        /** @type {Element[]} */
        this.element_map = [];
        /** @type {{ [key: string]: PairData<T> }} */
        this.pair_map = {};

        /** @type {(ud: any, a_id: number, a_ud: any, b_id: number, b_ud: any) => any} */
        this.pair_callback = (ud, a_id, a_ud, b_id, b_ud) => { };
        /** @type {(ud: any, a_id: number, a_ud: any, b_id: number, b_ud: any) => void} */
        this.unpair_callback = (ud, a_id, a_ud, b_id, b_ud) => { };
        this.pair_callback_userdata = null;
        this.unpair_callback_userdata = null;
    }

    /**
     * @param {T} p_userdata
     */
    create(p_userdata, p_aabb = new AABB, p_pairable = false, p_pairable_type = 0, p_pairable_mask = 1) {
        let e = this.element_map[this.last_element_id] = Element_new();

        this.last_element_id++;

        e.aabb.copy(p_aabb);
        e.userdata = p_userdata;
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

        return e.id;
    }

    /**
     * @param {number} p_id
     * @param {AABB} p_aabb
     */
    move(p_id, p_aabb) {
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
            }

            return;
        }

        if (!old_has_surf) {
            return;
        }

        if (e.container_aabb.encloses(p_aabb)) {
            e.aabb.copy(p_aabb);
            return;
        }

        let combined = e.aabb.merge(p_aabb);
        this._ensure_valid_root(combined);

        this.pass++;

        let common_parent = e.common_parent;

        while (common_parent && !common_parent.aabb.encloses(p_aabb)) {
            common_parent = common_parent.parent;
        }

        e.octant_owners.length = 0;
        e.common_parent = null;
        e.aabb.copy(p_aabb);

        this._insert_element(e, common_parent);

        this.pass++;

        for (let i = 0; i < e.octant_owners.length; i++) {
            let owner = e.octant_owners[i];
            let o = owner.octant;

            if (this.use_pairs && e.pairable) {
                o.pairable_elements.splice(o.pairable_elements.indexOf(owner.E), 1);
            } else {
                o.elements.splice(o.elements.indexOf(owner.E), 1);
            }

            if (this._remove_element_from_octant(e, o, common_parent.parent)) {
                e.octant_owners.splice(i, 1);
                i--;
            }
        }

        if (this.use_pairs) {
            for (let i = 0; i < e.octant_owners.length; i++) {
                let o = e.octant_owners[i].octant;

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
    erase(p_id) {
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
     * @param {number} p_mask
     */
    cull_segment(p_from, p_to, p_result_array, p_result_max, p_mask = 0xFFFFFFFF) {
        if (!this.root) return 0;

        this.pass++;
        let result = {
            index: 0,
            array: p_result_array,
            mask: p_mask,
        };
        this._cull_segment(this.root, p_from, p_to, p_result_max, result);

        return result.index;
    }

    /**
     * @param {AABB} p_aabb
     * @param {T[]} p_result_array
     * @param {number} p_result_max
     * @param {number} p_mask
     */
    cull_aabb(p_aabb, p_result_array, p_result_max, p_mask = 0xFFFFFFFF) {
        if (!this.root) return 0;

        this.pass++;
        let result = {
            index: 0,
            array: p_result_array,
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
    cull_convex(p_convex, p_result_array, p_result_max, p_mask = 0xFFFFFFFF) {
        if (!this.root || p_convex.length == 0) return 0;

        this.pass++;
        let result = {
            index: 0,
            planes: p_convex,
            array: p_result_array,
            result_max: p_result_max,
            mask: p_mask,
        };
        this._cull_convex(this.root, result);
        return result.index;
    }

    /**
     * @param {number} p_id
     * @param {boolean} p_pairable
     * @param {number} p_pairable_type
     * @param {number} p_pairable_mask
     */
    set_pairable(p_id, p_pairable, p_pairable_type, p_pairable_mask) {
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

    /**
     * @param {Octant} p_octant
     * @param {Vector3Like} p_from
     * @param {Vector3Like} p_to
     * @param {{ array: T[], index: number, mask: number }} result
     */
    _cull_segment(p_octant, p_from, p_to, p_result_max, result) {
        if (p_result_max === result.index) return;

        if (p_octant.elements.length > 0) {
            for (let e of p_octant.elements) {
                if (e.last_pass === this.pass || (this.use_pairs && !(e.pairable_type & result.mask))) {
                    continue;
                }
                e.last_pass = this.pass;

                if (e.aabb.intersects_segment(p_from, p_to)) {
                    if (result.index < p_result_max) {
                        result.array[result.index] = e.userdata;
                        result.index++;
                    } else {
                        return;
                    }
                }
            }
        }

        if (this.use_pairs && p_octant.pairable_elements.length > 0) {
            for (let e of p_octant.pairable_elements) {
                if (e.last_pass === this.pass || (this.use_pairs && !(e.pairable_type & result.mask))) {
                    continue;
                }
                e.last_pass = this.pass;

                if (e.aabb.intersects_segment(p_from, p_to)) {
                    if (result.index < p_result_max) {
                        result.array[result.index] = e.userdata;
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
     * @param {{ array: T[], index: number, mask: number }} result
     */
    _cull_aabb(p_octant, p_aabb, p_result_max, result) {
        if (p_result_max === result.index) return;

        if (p_octant.elements.length > 0) {
            for (let e of p_octant.elements) {
                if (e.last_pass === this.pass || (this.use_pairs && !(e.pairable_type & result.mask))) {
                    continue;
                }
                e.last_pass = this.pass;

                if (p_aabb.intersects_inclusive(e.aabb)) {
                    if (result.index < p_result_max) {
                        result.array[result.index] = e.userdata;
                        result.index++;
                    } else {
                        return;
                    }
                }
            }
        }

        if (this.use_pairs && p_octant.pairable_elements.length > 0) {
            for (let e of p_octant.pairable_elements) {
                if (e.last_pass === this.pass || (this.use_pairs && !(e.pairable_type & result.mask))) {
                    continue;
                }
                e.last_pass = this.pass;

                if (p_aabb.intersects_inclusive(e.aabb)) {
                    if (result.index < p_result_max) {
                        result.array[result.index] = e.userdata;
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

    /**
     * @param {Octant} p_octant
     * @param {{ array: T[], index: number, result_max: number, planes: Plane[], mask: number }} p_cull
     */
    _cull_convex(p_octant, p_cull) {
        if (p_cull.result_max === p_cull.index) return;

        if (p_octant.elements.length > 0) {
            for (let e of p_octant.elements) {
                if (e.last_pass === this.pass || (this.use_pairs && !(e.pairable_type & p_cull.mask))) {
                    continue;
                }
                e.last_pass = this.pass;

                if (e.aabb.intersects_convex_shape(p_cull.planes)) {
                    if (p_cull.index < p_cull.result_max) {
                        p_cull.array[p_cull.index] = e.userdata;
                        p_cull.index++;
                    } else {
                        return;
                    }
                }
            }
        }

        if (this.use_pairs && p_octant.pairable_elements.length > 0) {
            for (let e of p_octant.pairable_elements) {
                if (e.last_pass === this.pass || (this.use_pairs && !(e.pairable_type & p_cull.mask))) {
                    continue;
                }
                e.last_pass = this.pass;

                if (e.aabb.intersects_convex_shape(p_cull.planes)) {
                    if (p_cull.index < p_cull.result_max) {
                        p_cull.array[p_cull.index] = e.userdata;
                        p_cull.index++;
                    } else {
                        return;
                    }
                }
            }
        }

        for (let i = 0; i < 8; i++) {
            if (p_octant.children[i] && p_octant.children[i].aabb.intersects_convex_shape(p_cull.planes)) {
                this._cull_convex(p_octant.children[i], p_cull);
            }
        }
    }

    /**
     * @param {AABB} p_aabb
     */
    _ensure_valid_root(p_aabb) {
        let base = AABB.new();

        if (!this.root) {
            base.set(
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
            base.copy(this.root.aabb);

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
     * @param {Element<T>} p_element
     * @param {Octant} p_octant
     */
    _insert_element(p_element, p_octant) {
        let element_size = p_element.aabb.get_longest_axis_size() * 1.01;

        if (p_octant.aabb.size.x / OCTREE_DIVISOR < element_size) {
            let owner = {
                octant: p_octant,
                E: null,
            };

            if (this.use_pairs && p_element.pairable) {
                p_octant.pairable_elements.push(p_element);
                owner.E = p_element;
            } else {
                p_octant.elements.push(p_element);
                owner.E = p_element;
            }

            p_element.octant_owners.push(owner);

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
                }
            }

            if (candidate && splits > 1) {
                p_element.common_parent = p_octant;
            }
        }

        if (this.use_pairs) {
            for (let e of p_octant.pairable_elements) {
                this._pair_reference(p_element, e);
            }

            if (p_element.pairable) {
                for (let e of p_octant.elements) {
                    this._pair_reference(p_element, e);
                }
            }
        }
    }

    /**
     * @param {Element<T>} p_element
     */
    _remove_element(p_element) {
        this.pass++;

        let owners = p_element.octant_owners;
        for (let owner of owners) {
            owner.octant.elements.splice(owner.octant.elements.indexOf(owner.E), 1);
            this._remove_element_from_octant(p_element, owner.octant);
        }

        if (this.use_pairs) {
            for (let owner of owners) {
                let o = owner.octant;

                this.pass++;
                for (let i = 0; i < 8; i++) {
                    if (o.children[i]) {
                        this._unpair_element(p_element, o.children[i]);
                    }
                }

                if (p_element.pairable) {
                    o.pairable_elements.splice(o.pairable_elements.indexOf(owner.E), 1);
                } else {
                    o.elements.splice(o.elements.indexOf(owner.E), 1);
                }
            }
        }

        p_element.octant_owners.length = 0;
    }

    /**
     * @param {Element<T>} p_element
     * @param {Octant} p_octant
     * @param {Octant} [p_limit]
     */
    _remove_element_from_octant(p_element, p_octant, p_limit = null) {
        let octant_removed = false;
        while (true) {
            if (p_octant == p_limit) {
                return octant_removed;
            }

            let unpaired = false;

            if (this.use_pairs && p_octant.last_pass !== this.pass) {
                for (let e of p_octant.pairable_elements) {
                    this._pair_unreference(p_element, e);
                }
                if (p_element.pairable) {
                    for (let e of p_octant.elements) {
                        this._pair_unreference(p_element, e);
                    }
                }
                p_octant.last_pass = this.pass;
                unpaired = true;
            }

            let removed = false;

            let parent = p_octant.parent;

            if (p_octant.children_count === 0 && p_octant.elements.length === 0) {
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
    _pair_check(p_pair) {
        let intersect = p_pair.A.aabb.intersects_inclusive(p_pair.B.aabb);

        if (intersect !== p_pair.intersect) {
            if (intersect) {
                if (this.pair_callback) {
                    p_pair.ud = this.pair_callback(this.pair_callback_userdata, p_pair.A.id, p_pair.A.userdata, p_pair.B.id, p_pair.B.userdata);
                }
                this.pair_count++;
            } else {
                if (this.unpair_callback) {
                    this.unpair_callback(this.pair_callback_userdata, p_pair.A.id, p_pair.A.userdata, p_pair.B.id, p_pair.B.userdata);
                }
                this.pair_count--;
            }

            p_pair.intersect = intersect;
        }
    }

    /**
     * @param {Element<T>} p_A
     * @param {Element<T>} p_B
     */
    _pair_reference(p_A, p_B) {
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

        let key = `${p_A.id}.${p_B.id}`;
        let e = this.pair_map[key];

        if (!e) {
            e = new PairData;
            e.rc = 1;
            e.A = p_A;
            e.B = p_B;
            e.intersect = false;
            this.pair_map[key] = e;
            p_A.pair_list.push(e);
            p_B.pair_list.push(e);
        } else {
            e.rc++;
        }
    }

    /**
     * @param {Element<T>} p_A
     * @param {Element<T>} p_B
     */
    _pair_unreference(p_A, p_B) {
        if (p_A == p_B) return;

        let key = `${p_A.id}.${p_B.id}`;
        let e = this.pair_map[key];
        if (!e) return;

        e.rc--;

        if (e.rc === 0) {
            if (e.intersect) {
                if (this.unpair_callback) {
                    this.unpair_callback(this.pair_callback_userdata, p_A.id, p_A.userdata, p_B.id, p_B.userdata);
                }

                this.pair_count--;
            }

            if (p_A === e.B) {
                let t = p_A;
                p_A = p_B;
                p_B = t;
            }

            p_A.pair_list.splice(p_A.pair_list.indexOf(e), 1);
            p_B.pair_list.splice(p_A.pair_list.indexOf(e), 1);
            this.pair_map[key] = null;
        }
    }

    /**
     * @param {Element<T>} p_element
     */
    _element_check_pairs(p_element) {
        for (let e of p_element.pair_list) {
            this._pair_check(e);
        }
    }

    /**
     * @param {Element<T>} p_element
     * @param {Octant} p_octant
     */
    _pair_element(p_element, p_octant) {
        for (let e of p_octant.pairable_elements) {
            if (e.last_pass !== this.pass) {
                this._pair_reference(p_element, e);
                e.last_pass = this.pass;
            }
        }

        if (p_element.pairable) {
            for (let e of p_octant.elements) {
                if (e.last_pass !== this.pass) {
                    this._pair_reference(p_element, e);
                    e.last_pass = this.pass;
                }
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
     * @param {Element<T>} p_element
     * @param {Octant} p_octant
     */
    _unpair_element(p_element, p_octant) {
        for (let e of p_octant.pairable_elements) {
            if (e.last_pass !== this.pass) {
                this._pair_unreference(p_element, e);
                e.last_pass = this.pass;
            }
        }

        if (p_element.pairable) {
            for (let e of p_octant.elements) {
                if (e.last_pass !== this.pass) {
                    this._pair_unreference(p_element, e);
                    e.last_pass = this.pass;
                }
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
        while (this.root && this.root.children_count < 2 && !this.root.elements.length) {
            /** @type {Octant} */
            let new_root = null;
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
