import Node2D from '../Node2D';

export default class CollisionObject2D extends Node2D {
    get_shape() {
        return this._shape;
    }
    set_shape(s) {
        this._shape = s;
    }

    get_collision_layer() {
        return this.collision_layer;
    }
    get_collision_layer_bit(bit) {
        return this.collision_layer & (1 << bit);
    }
    set_collision_layer(layer) {
        this.collision_layer = layer;
    }
    set_collision_layer_bit(bit, value) {
        if (value) {
            this.collision_layer |= 1 << bit;
        }
        else {
            this.collision_layer &= ~(1 << bit);
        }
    }

    get_collision_mask() {
        return this.collision_mask;
    }
    get_collision_mask_bit(bit) {
        return this.collision_mask & (1 << bit);
    }
    set_collision_mask(mask) {
        this.collision_mask = mask;
    }
    set_collision_mask_bit(bit, value) {
        if (value) {
            this.collision_mask |= 1 << bit;
        }
        else {
            this.collision_mask &= ~(1 << bit);
        }
    }

    constructor() {
        super();

        this.is_physics_object = true;

        this.collision_layer = 0;
        this.collision_mask = 0;

        this.left = 0;
        this.right = 0;
        this.top = 0;
        this.bottom = 0;

        this._shape = null;
    }

    _load_data(data) {
        for (let k in data) {
            switch (k) {
            // Directly set
            // - Node2D
            case 'name':
            case 'x':
            case 'y':
            case 'collision_layer':
            case 'collision_mask':
                this[k] = data[k];
                break;

                // Set vector
                // - Node2D
            case 'position':
                this[k].x = data[k].x || 0;
                this[k].y = data[k].y || 0;
                break;

                // - Node2D
            case 'scale':
                this[k].x = data[k].x || 1;
                this[k].y = data[k].y || 1;
                break;
            }
        }
    }
}
