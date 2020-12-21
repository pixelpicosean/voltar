class Data<T> {
    first: Element<T> = null;
    last: Element<T> = null;
    size_cache = 0;

    erase(e: Element<T>) {
        if (this.first === e) this.first = e.next;
        if (this.last === e) this.last = e.prev;
        if (e.prev) e.prev.next = e.next;
        if (e.next) e.next.prev = e.prev;
        this.size_cache--;
        return true;
    }
}

export class Element<T> {
    value: T = null;
    next: Element<T> = null;
    prev: Element<T> = null;
    data: Data<T> = null;

    erase() {
        this.data.erase(this);
    }
}

export class List<T> {
    data: Data<T> = null;

    front() { return this.data ? this.data.first : null }
    back() { return this.data ? this.data.last : null }

    push_back(value: T) {
        if (!this.data) {
            this.data = new Data();
        }

        const n: Element<T> = new Element();
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

    find(value: T) {
        let it = this.front();
        while (it) {
            if (it.value === value) return it;
            it = it.next;
        }
        return null;
    }

    erase(element: Element<T>) {
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
