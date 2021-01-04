import { GDCLASS } from "engine/core/v_object";
import { node_class_map } from "engine/registry";

import { VSG } from "engine/servers/visual/visual_server_globals";

import {
    Node,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
} from "../main/node";
import {
    NOTIFICATION_ENTER_WORLD,
    NOTIFICATION_EXIT_WORLD,
} from "./spatial";

type Environment_t = import("engine/drivers/webgl/rasterizer_scene").Environment_t;

export class WorldEnvironment extends Node {
    get class() { return "WorldEnvironment" }

    environment: Environment_t = null;

    set_environment(p_environment: Environment_t) {
        if (this.is_inside_tree() && this.environment && this.get_viewport().find_world().environment === this.environment) {
            this.get_viewport().find_world().set_environment(null);
            this.remove_from_group(`_world_environment_${this.get_viewport().find_world().scenario.id}`)
        }

        this.environment = p_environment;
        if (this.is_inside_tree() && this.environment) {
            this.get_viewport().find_world().set_environment(this.environment);
            this.add_to_group(`_world_environment_${this.get_viewport().find_world().scenario.id}`)
        }
    }

    _load_data(data: any) {
        super._load_data(data);

        if (data.environment) {
            this.set_environment(
                VSG.scene_render.environment_create()
                    ._load_data(data.environment)
            );
        }

        return this;
    }

    _notification(p_what: number) {
        if (p_what === NOTIFICATION_ENTER_WORLD || p_what === NOTIFICATION_ENTER_TREE) {
            if (this.environment) {
                this.get_viewport().find_world().set_environment(this.environment);
                this.add_to_group(`_world_environment_${this.get_viewport().find_world().scenario.id}`);
            }
        } else if (p_what === NOTIFICATION_EXIT_WORLD || p_what === NOTIFICATION_EXIT_TREE) {
            if (this.environment && this.get_viewport().find_world().environment === this.environment) {
                this.get_viewport().find_world().set_environment(null);
                this.remove_from_group(`_world_environment_${this.get_viewport().find_world().scenario.id}`)
            }
        }
    }
}
node_class_map["WorldEnvironment"] = GDCLASS(WorldEnvironment, Node);
