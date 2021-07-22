export class Behavior<T> {
    name: string;

    runner: BehaviorRunner<T>;
    target: T;

    _begin_play() { }
    _update(delta: number) { }
}

type BehaviorConstructor<T> = new () => Behavior<T>;

export class BehaviorRunner<T> {
    target: T;

    behaviors = new Map<BehaviorConstructor<T>, Behavior<T>>();

    constructor(target: T, behaviors: BehaviorConstructor<T>[]) {
        this.target = target;

        for (let c of behaviors) {
            this.add(c);
        }
    }

    add<B extends Behavior<T>>(behv: new () => B): B {
        const inst = new behv;
        inst.runner = this;
        inst.target = this.target;
        this.behaviors.set(behv, inst);
        return inst;
    }
    has<B extends Behavior<T>>(behv: new () => B): boolean {
        return this.behaviors.has(behv);
    }
    get<B extends Behavior<T>>(behv: new () => B): B {
        return this.behaviors.get(behv) as B;
    }

    begin_play() {
        for (let [_, c] of this.behaviors) {
            c._begin_play();
        }
    }
    update(delta: number) {
        for (let [_, c] of this.behaviors) {
            c._update(delta);
        }
    }
}
