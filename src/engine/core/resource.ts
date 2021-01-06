import { VObject, GDCLASS } from "./v_object";

type Node = import("engine/scene/main/node").Node;

export class Resource extends VObject {
    get class() { return 'Resource' }

    resource_name = "";
    resource_path = "";

    resource_local_to_scene = false;

    local_scene: Node = null;

    data: any = null;

    /* virtual */
    _setup_local_to_scene() { }

    /* public */
    get_local_scene() {
        if (this.local_scene) {
            return this.local_scene;
        }
        return null;
    }
    get_rid(): any { return null }
    setup_local_to_scene() {
        this._setup_local_to_scene();
    }
}
GDCLASS(Resource, VObject)
