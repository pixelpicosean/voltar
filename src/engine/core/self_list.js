/**
 * @template T
 */
export class List {
    constructor() {
        /**
         * @type {SelfList<T>}
         */
        this._first = null;
        /**
         * @type {SelfList<T>}
         */
        this._last = null;
    }

    /**
     * @param {SelfList<T>} p_elem
     */
    add(p_elem) {
        p_elem._root = this;
        p_elem._next = this._first;
        p_elem._prev = null;

        if (this._first) {
            this._first._prev = p_elem;
        } else {
            this._last = p_elem;
        }

        this._first = p_elem;
    }

    /**
     * @param {SelfList<T>} p_elem
     */
    add_last(p_elem) {
        p_elem._root = this;
        p_elem._next = null;
        p_elem._prev = this._last;

        if (this._last) {
            this._last._next = p_elem;
        } else {
            this._first = p_elem;
        }

        this._last = p_elem;
    }

    /**
     * @param {SelfList<T>} p_elem
     */
    remove(p_elem) {
        if (p_elem._next) {
            p_elem._next._prev = p_elem._prev;
        }

        if (p_elem._prev) {
            p_elem._prev._next = p_elem._next;
        }

        if (this._first === p_elem) {
            this._first = p_elem._next;
        }

        if (this._last === p_elem) {
            this._last = p_elem._prev;
        }

        p_elem._next = null;
        p_elem._prev = null;
        p_elem._root = null;
    }

    first() {
        return this._first;
    }
}

/**
 * @template T
 */
export class SelfList {
    /**
     * @param {T} p_self
     */
    constructor(p_self) {
        /**
         * @type {List}
         */
        this._root = null;
        /**
         * @type {T}
         */
        this._self = p_self;
        /**
         * @type {SelfList<T>}
         */
        this._next = null;
        /**
         * @type {SelfList<T>}
         */
        this._prev = null;
    }
    free() {
        if (this._root) {
            this._root.remove(this);
        }
    }

    /**
     * @returns {boolean}
     */
    in_list() {
        return !!this._root;
    }
    next() {
        return this._next;
    }
    prev() {
        return this._prev;
    }
    self() {
        return this._self;
    }
}
