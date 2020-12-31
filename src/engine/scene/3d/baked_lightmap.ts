import { node_class_map, res_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";

import { VSG } from "engine/servers/visual/visual_server_globals";

import { ImageTexture } from "../resources/texture";
import { VisualInstance } from "./visual_instance";
import { AABB } from "engine/core/math/aabb";
import { NOTIFICATION_EXIT_TREE, NOTIFICATION_READY } from "../main/node";

interface User {
    path: string;
    lightmap: ImageTexture;
    instance_index: number;
}

export class BakedLightmapData {
    get class() { return "BakedLightmapData" }

    baked_light = VSG.storage.lightmap_capture_create();
    energy = 1;
    bounds = new AABB;

    users: User[] = [];

    get_rid() {
        return this.baked_light;
    }

    set_bounds(p_bounds: AABB) {
        this.bounds.copy(p_bounds);
        VSG.storage.lightmap_capture_set_bounds(this.baked_light, this.bounds);
    }

    _load_data(data: any) {
        if (data.energy !== undefined) this.energy = data.energy;
        if (data.users) this.users = data.users;
        if (data.bounds) this.set_bounds(data.bounds);
        return this;
    }
}
res_class_map["BakedLightmapData"] = BakedLightmapData;

export class BakedLightmap extends VisualInstance {
    get class() { return "BakedLightmap" }

    light_data: BakedLightmapData = null;

    set_light_data(p_data: BakedLightmapData) {
        if (this.light_data) {
            if (this.is_inside_tree()) {
                this._clear_lightmaps();
            }
            this.set_base(null);
        }
        this.light_data = p_data;

        if (this.light_data) {
            this.set_base(this.light_data.get_rid());
            if (this.is_inside_tree()) {
                this._assign_lightmaps();
            }
        }
    }

    /* private */

    _load_data(data: any) {
        super._load_data(data);

        if (data.light_data) {
            this.set_light_data(data.light_data);
        }

        return this;
    }

    _notification(p_what: number) {
        if (p_what === NOTIFICATION_READY) {
            if (this.light_data) {
                this._assign_lightmaps();
            }
            this.request_ready();
        }

        if (p_what === NOTIFICATION_EXIT_TREE) {
            if (this.light_data) {
                this._clear_lightmaps();
            }
        }
    }

    _clear_lightmaps() {
        for (let user of this.light_data.users) {
            let node = this.get_node(user.path);
            if (user.instance_index >= 0) {
                // @Investigate node.get_bake_mesh_instance(user.instance_index);
            } else {
                let vi = node as VisualInstance;
                VSG.scene.instance_set_use_lightmap(vi.instance, this.instance, null);
            }
        }
    }

    _assign_lightmaps() {
        for (let user of this.light_data.users) {
            let lightmap = user.lightmap;

            let node = this.get_node(user.path);
            if (user.instance_index >= 0) {
                // @Investigate node.get_bake_mesh_instance(user.instance_index);
            } else {
                let vi = node as VisualInstance;
                VSG.scene.instance_set_use_lightmap(vi.instance, this.instance, lightmap.get_rid());
            }
        }
    }
}
node_class_map["BakedLightmap"] = GDCLASS(BakedLightmap, VisualInstance);
