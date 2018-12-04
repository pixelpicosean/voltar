import Node2D from 'engine/scene/Node2D';
import { Type } from './const';
import { Shape2D } from '../scene/resources/shape_2d';
import { Matrix } from 'engine/math/index';

const IDTransform = Object.freeze(new Matrix());

export default class CollisionObject2D extends Node2D {
    constructor() {
        super();

        this.type = 'CollisionObject2D';
    }
}
