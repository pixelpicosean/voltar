/**
 * @template T
 */
class Data {
    constructor() {
        /** @type {Element<T>} */
        this.first = null;
        /** @type {Element<T>} */
        this.last = null;
        this.size_cache = 0;
    }
    /**
     * @param {Element<T>} e
     */
    erase(e) {
        if (this.first === e) this.first = e.next;
        if (this.last === e) this.last = e.prev;
        if (e.prev) e.prev.next = e.next;
        if (e.next) e.next.prev = e.prev;
        this.size_cache--;
        return true;
    }
}

/**
 * @template T
 */
export class Element {
    constructor() {
        /** @type {T} */
        this.value = null;
        /** @type {Element<T>} */
        this.next = null;
        /** @type {Element<T>} */
        this.prev = null;
        /** @type {Data<T>} */
        this.data = null;
    }
    erase() {
        this.data.erase(this);
    }
}

/**
 * @template T
 */
export class List {
    constructor() {
        /** @type {Data<T>} */
        this.data = null;
    }

    front() { return this.data ? this.data.first : null }
    back() { return this.data ? this.data.last : null }

    /**
     * @param {T} value
     */
    push_back(value) {
        if (!this.data) {
            this.data = new Data();
        }

        /** @type {Element<T>} */
        const n = new Element();
        n.value = value;

        n.prev = this.data.last;
        n.data = this.data;

        if (this.data.last) {
            this.data.last.next = n;
        }

        this.data.last = n;

        if (!this.data.first) {
            this.data.first = n;
        }

        this.data.size_cache++;

        return n;
    }
    pop_back() {
        if (this.data && this.data.last) {
            this.erase(this.data.last);
        }
    }

    /**
     * @param {T} value
     */
    find(value) {
        let it = this.front();
        while (it) {
            if (it.value === value) return it;
            it = it.next;
        }
        return null;
    }

    /**
     * @param {Element<T>} element
     */
    erase(element) {
        if (this.data) {
            let ret = this.data.erase(element);

            if (this.data.size_cache === 0) {
                this.data = null;
            }

            return ret;
        }
        return false;
    }

    clear() {
        while (this.front()) {
            this.erase(this.front());
        }
    }
}
