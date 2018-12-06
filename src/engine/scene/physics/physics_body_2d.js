import CollisionObject2D from "./collision_object_2d";
import PhysicsServer from "engine/servers/physics_2d/physics_server";

export class PhysicsBody2D extends CollisionObject2D {
    constructor() {
        super(PhysicsServer.singleton.body_create(), false);

        this.collision_layer = 1;
        this.collision_mask = 1;
    }
}
