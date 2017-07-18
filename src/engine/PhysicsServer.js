import { Vector } from './core';

export default class PhysicsServer {
    constructor() {
        this.is_initialized = false;
    }

    init() {
        if (this.is_initialized) {
            return;
        }
        this.is_initialized = true;

        const a = new Vector(2, 0).clamped(1).rotated(Math.PI / 2).normalized();
        console.log(`(${a.x}, ${a.y})`);
        console.log(`(${a.equals(new Vector(0, 1))})`);
    }
}
