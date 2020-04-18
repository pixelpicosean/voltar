import { Vector3 } from "./vector3";

export class AABB {
    constructor() {
        this.position = new Vector3;
        this.size = new Vector3;
    }

    get_area() { return 0 }
    has_no_area() { return true }

    has_no_surface() { return true }
}
