import { AABB } from "./aabb";
import { Plane } from "./plane";
import { Vector3Like } from "./vector3";

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

        this.subindex = 0;
        this.last_pass = 0;

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

        this.subindex = 0;
        this.last_pass = 0;

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
    }
    reset() {
        this.aabb.set(0, 0, 0, 0, 0, 0);
        this.last_pass = 0;
        this.parent = null;
        for (let i = 0; i < 8; i++) this.children[i] = null;

        this.children_count = 0;
        this.parent_index = -1;

        this.elements.length = 0;

        return this;
    }
}

/**
 * @template T
 */
export class Octree {
    constructor(unit_size = 1.0) {
        this.last_element_id = 0;
        this.octant_count = 0;
        this.pass = 0;

        this.unit_size = unit_size;

        /** @type {Octant} */
        this.root = null;

        /** @type {Element[]} */
        this.element_map = [];
    }

    /**
     * @param {T} p_userdata
     */
    create(p_userdata, p_aabb = new AABB, p_subindex = 0, p_pairable = false, p_pairable_type = 0, p_pairable_mask = 1) {
        let e = this.element_map[this.last_element_id] = Element_new();

        this.last_element_id++;

        e.aabb.copy(p_aabb);
        e.userdata = p_userdata;
        e.subindex = p_subindex;
        e.last_pass = 0;
        e.octree = this;
        e.id = this.last_element_id - 1;

        if (!e.aabb.has_no_surface()) {
            this._ensure_valid_root(p_aabb);
            this._insert_element(e, this.root);
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

        e.common_parent = null;
        e.aabb.copy(p_aabb);

        this._insert_element(e, common_parent);

        this.pass++;

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
     */
    cull_segment(p_from, p_to, p_result_array, p_result_max) {
        if (!this.root) return 0;

        this.pass++;
        let result = {
            index: 0,
            array: p_result_array,
        };
        this._cull_segment(this.root, p_from, p_to, p_result_max, result);

        return result.index;
    }

    /**
     * @param {AABB} p_aabb
     * @param {T[]} p_result_array
     * @param {number} p_result_max
     */
    cull_aabb(p_aabb, p_result_array, p_result_max) {
        if (!this.root) return 0;

        this.pass++;
        let result = {
            index: 0,
            array: p_result_array,
        };
        this._cull_aabb(this.root, p_aabb, p_result_max, result);
        return result.index;
    }

    /**
     * @param {Plane[]} p_convex
     * @param {T[]} p_result_array
     * @param {number} p_result_max
     */
    cull_convex(p_convex, p_result_array, p_result_max) {
        if (!this.root) return 0;

        this.pass++;
        let result = {
            index: 0,
            planes: p_convex,
            array: p_result_array,
            result_max: p_result_max,
        };
        this._cull_convex(this.root, result);
        return result.index;
    }

    /**
     * @param {Octant} p_octant
     * @param {Vector3Like} p_from
     * @param {Vector3Like} p_to
     * @param {{ array: T[], index: number }} result
     */
    _cull_segment(p_octant, p_from, p_to, p_result_max, result) {
        if (p_result_max === result.index) return;

        if (p_octant.elements.length > 0) {
            for (let e of p_octant.elements) {
                if (e.last_pass === this.pass) {
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
     * @param {{ array: T[], index: number }} result
     */
    _cull_aabb(p_octant, p_aabb, p_result_max, result) {
        if (p_result_max === result.index) return;

        if (p_octant.elements.length > 0) {
            for (let e of p_octant.elements) {
                if (e.last_pass === this.pass) {
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
     * @param {{ array: T[], index: number, result_max: number, planes: Plane[] }} p_cull
     */
    _cull_convex(p_octant, p_cull) {
        if (p_cull.result_max === p_cull.index) return;

        if (p_octant.elements.length > 0) {
            for (let e of p_octant.elements) {
                if (e.last_pass === this.pass) {
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
     * @param {Element} p_element
     * @param {Octant} p_octant
     */
    _insert_element(p_element, p_octant) {
        let element_size = p_element.aabb.get_longest_axis_size() * 1.01;

        if (p_octant.aabb.size.x / OCTREE_DIVISOR < element_size) {
            let owner = {
                octant: p_octant,
                E: null,
            };

            p_octant.elements.push(p_element);
            owner.E = p_element;

            p_element.octant_owners.push(owner);

            if (!p_element.common_parent) {
                p_element.common_parent = p_octant;
                p_element.container_aabb.copy(p_octant.aabb);
            } else {
                p_element.container_aabb.merge_with(p_octant.aabb);
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
    }

    /**
     * @param {Element} p_element
     */
    _remove_element(p_element) {
        this.pass++;

        let owners = p_element.octant_owners;
        for (let owner of owners) {
            owner.octant.elements.splice(owner.octant.elements.indexOf(owner.E), 1);
            this._remove_element_from_octant(p_element, owner.octant);
        }

        p_element.octant_owners.length = 0;
    }

    /**
     * @param {Element} p_element
     * @param {Octant} p_octant
     */
    _remove_element_from_octant(p_element, p_octant) {
        let octant_removed = false;
        while (true) {
            if (!p_octant) {
                return octant_removed;
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

            if (!removed) {
                return octant_removed;
            }

            p_octant = parent;
        }

        return octant_removed;
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
