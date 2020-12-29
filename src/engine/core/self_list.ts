export class List<T> {
    _first: SelfList<T> = null;
    _last: SelfList<T> = null;

    add(p_elem: SelfList<T>) {
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

    add_last(p_elem: SelfList<T>) {
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

    remove(p_elem: SelfList<T>) {
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

export class SelfList<T> {
    _root: List<T> = null;
    _self: T = null;
    _next: SelfList<T> = null;
    _prev: SelfList<T> = null;

    constructor(p_self: T) {
        this._self = p_self;
    }

    _predelete(): boolean {
        return true;
    }
    _free() {
        if (this._root) {
            this._root.remove(this);
        }
    }

    in_list(): boolean {
        return !!this._root;
    }
    next(): SelfList<T> {
        return this._next;
    }
    prev(): SelfList<T> {
        return this._prev;
    }

    self(): T {
        return this._self;
    }
}
