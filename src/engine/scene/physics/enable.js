// Register to global node class map
import { node_class_map } from 'engine/registry';

import Area2D from './area_2d';
import CollisionShape2D from './collision_shape_2d';
import {
    StaticBody2D,
    KinematicBody2D,
} from './physics_body_2d';

node_class_map['Area2D'] = Area2D;
node_class_map['StaticBody2D'] = StaticBody2D;
node_class_map['KinematicBody2D'] = KinematicBody2D;

node_class_map['CollisionShape2D'] = CollisionShape2D;
