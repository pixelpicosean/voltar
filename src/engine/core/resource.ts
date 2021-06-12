import { VObject, GDCLASS } from "./v_object";

export class Resource extends VObject {
    get class() { return 'Resource' }

    resource_name = "";
    resource_path = "";

    data: any = null;

    /* public */

    get_rid(): any { return null }
}
GDCLASS(Resource, VObject)
