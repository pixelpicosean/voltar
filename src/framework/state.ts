export class State<T> {
    name: string;

    runner: StateRunner<T>;
    target: T;

    _reset() { }

    _enter() { }
    _update(delta: number) { }
    _exit() { }
}

export class StateRunner<T> {
    target: T;

    global: State<T> = null;

    curr: State<T> = null;
    prev: State<T> = null;

    next: new() => State<T> = null;

    state_instances = new Map<new() => State<T>, State<T>>();

    constructor(target: T) {
        this.target = target;
    }

    set_target(target: T) {
        this.target = target;
    }

    set_global_state(state: new() => State<T>) {
        this.global = new state;
        this.global.runner = this;
        this.global.target = this.target;
        this.global._enter();
    }

    change_state(state: new() => State<T>) {
        this.next = state;
    }

    update(delta: number) {
        if (this.global) {
            this.global._update(delta);
        }

        if (this.next) {
            if (this.curr) {
                this.prev = this.curr;
                this.prev._exit();
            }

            this.curr = this.state_instances.get(this.next);
            if (!this.curr) {
                this.curr = new (this.next);
                this.state_instances.set(this.next, this.curr);
            } else {
                this.curr._reset();
            }

            this.curr.runner = this;
            this.curr.target = this.target;
            this.next = null;

            this.curr._enter();
        } else {
            this.curr._update(delta);
        }
    }
}
