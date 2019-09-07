import { VObject, GDCLASS } from "./v_object";
import { Node } from "engine/scene/main/node";

export class Resource extends VObject {
    constructor() {
        super();

        this.class = 'Resource';

        this.resource_name = '';
        this.resource_path = '';

        this.resource_local_to_scene = false;

        /** @type {Node} */
        this.local_scene = null;
    }

    /* virtual */
    _setup_local_to_scene() { }

    /* public */
    get_local_scene() {
        if (this.local_scene) {
            return this.local_scene;
        }
        return null;
    }
    get_rid() { return null }
    setup_local_to_scene() {
        this._setup_local_to_scene();
    }
}
GDCLASS(Resource, VObject)
