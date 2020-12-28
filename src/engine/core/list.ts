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
    pop_front() {
        if (this.data && this.data.first) {
            this.erase(this.data.first);
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

    clone() {
        let list = new List<T>();
        let it = this.front();
        while (it) {
            list.push_back(it.value);
            it = it.next;
        }
        return list;
    }

    empty(): boolean {
        return (!this.data || !this.data.size_cache);
    }

    size(): number {
        return this.data ? this.data.size_cache : 0;
    }

    sort(func: (a: Element<T>, b: Element<T>) => number) {
        let s = this.size();

        if (s < 2) return;

        let buffer: Element<T>[] = array_create(s);

        let idx = 0;
        for (let E = this.front(); E; E = E.next) {
            buffer[idx] = E;
            idx++;
        }
        buffer.sort(func);

        this.data.first = buffer[0];
        buffer[0].prev = null;
        buffer[0].next = buffer[1];

        this.data.last = buffer[s - 1];
        buffer[s - 1].prev = buffer[s - 2]
        buffer[s - 1].next = null;

        for (let i = 1; i < s - 1; i++) {
            buffer[i].prev = buffer[i - 1];
            buffer[i].next = buffer[i + 1];
        }

        array_free(buffer);
    }
}

let array_pool: { [len: number]: any[][] } = Object.create(null);
function array_create<T>(len: number): T[] {
    let pool = array_pool[len];
    if (pool) {
        return pool.pop();
    }
    return [];
}
function array_free<T>(arr: T[]) {
    let pool = array_pool[arr.length];
    if (!pool) {
        pool = [];
    }
    pool.push(arr);
}
