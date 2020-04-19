import { AABB } from "./aabb";
import { Plane } from "./plane";
import { Vector3Like } from "./vector3";

/**
 * @template T
 */
class Element {
    constructor() {
        this._id = 0;

        this.aabb = new AABB;
        /** @type {T} */
        this.userdata = null;
        this.subindex = 0;
        this.last_pass = 0;
        /** @type {Octree} */
        this.octree = null;
        this.pairable = false;
        this.pairable_type = 0;
        this.pairable_mask = 0;
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
        this.pairable_elements = [];
        /** @type {Element[]} */
        this.elements = [];
    }
}

/**
 * @template T
 */
export class Octree {
    constructor(use_pairs = false) {
        /** @type {{ [id: number]: Element<T> }} */
        this.element_map = {};

        this.last_element_id = 0;
        this.pass = 0;

        this.use_pairs = use_pairs;
        /** @type {Octant} */
        this.root = null;

        /** @type {Element[]} */
        this._elements = [];
    }

    /**
     * @param {T} p_userdata
     */
    create(p_userdata, p_aabb = new AABB, p_subindex = 0, p_pairable = false, p_pairable_type = 0, p_pairable_mask = 1) {
        this.last_element_id++;

        let e = new Element;

        e.aabb.copy(p_aabb);
        e.userdata = p_userdata;
        e.subindex = p_subindex;
        e.last_pass = 0;
        e.octree = this;
        e.pairable = p_pairable;
        e.pairable_type = p_pairable_type;
        e.pairable_mask = p_pairable_mask;
        e._id = this.last_element_id - 1;

        if (!e.aabb.has_no_surface()) {
            this._ensure_valid_root(p_aabb);
            this._insert_element(e, this.root);
            if (this.use_pairs) {
                this._element_check_pairs(e);
            }
        }

        return e._id;
    }

    /**
     * @param {number} p_id
     * @param {AABB} p_aabb
     */
    move(p_id, p_aabb) { }

    /**
     * @param {number} p_id
     */
    erase(p_id) {
        for (let i = 0; i < this._elements.length; i++) {
            if (this._elements[i]._id === p_id) {
                this._elements.splice(i, 1);
                break;
            }
        }
    }

    /**
     * @param {Vector3Like} p_from
     * @param {Vector3Like} p_to
     * @param {T[]} p_result_array
     * @param {number} p_result_max
     */
    cull_segment(p_from, p_to, p_result_array, p_result_max) {
        let len = Math.min(p_result_max, this._elements.length);
        for (let i = 0; i < len; i++) {
            p_result_array[i] = this._elements[i].userdata;
        }
        return len;
    }

    /**
     * @param {AABB} p_aabb
     * @param {T[]} p_result_array
     * @param {number} p_result_max
     */
    cull_aabb(p_aabb, p_result_array, p_result_max) {
        let len = Math.min(p_result_max, this._elements.length);
        for (let i = 0; i < len; i++) {
            p_result_array[i] = this._elements[i].userdata;
        }
        return len;
    }

    /**
     * @param {Plane[]} p_convex
     * @param {T[]} p_result_array
     * @param {number} p_result_max
     */
    cull_convex(p_convex, p_result_array, p_result_max) {
        let len = Math.min(p_result_max, this._elements.length);
        for (let i = 0; i < len; i++) {
            p_result_array[i] = this._elements[i].userdata;
        }
        return len;
    }

    /**
     * @param {Function} p_callback
     * @param {any} p_userdata
     */
    set_pair_callback(p_callback, p_userdata) { }

    /**
     * @param {Function} p_callback
     * @param {any} p_userdata
     */
    set_unpair_callback(p_callback, p_userdata) { }

    /**
     * @param {number} p_id
     */
    set_pairable(p_id, p_pairable = false, p_pairable_type = 0, p_pairable_mask = 1) { }

    /**
     * @param {AABB} p_aabb
     */
    _ensure_valid_root(p_aabb) {  }

    /**
     * @param {Element} p_element
     * @param {Octant} p_octant
     */
    _insert_element(p_element, p_octant) {
        this._elements.push(p_element);
    }

    /**
     * @param {Element} p_element
     */
    _element_check_pairs(p_element) { }
}
