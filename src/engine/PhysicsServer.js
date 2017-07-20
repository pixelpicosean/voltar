import { Vector } from './core';


const Arrays = new Array(20);
for (let i = 0; i < 20; i++) {
    Arrays[i] = [];
}
const get_array = () => {
    let arr = Arrays.pop();
    if (!arr) {
        arr = [];
    }
    return arr;
};
const put_array = (arr) => {
    arr.length = 0;
    Arrays.push(arr);
};


export default class PhysicsServer {
    constructor() {
        this.is_initialized = false;

        this.spatial_shift = 5;
        this.hash = {};
        this.checks = {};
        this.collision_checks = 0;
    }

    init() {
        if (this.is_initialized) {
            return;
        }
        this.is_initialized = true;
    }
    solve_collision(node) {
        // Reset hash and checks
        this.hash = {};
        this.checks = {};
        this.collision_checks = 0;

        this._test_node(node);

        // Recycle arrays in the hash
        for (let i in this.hash) {
          let group = this.hash[i];
          for (let j in group) {
            put_array(group[j]);
          }
        }
    }

    _test_node(node) {
        if (node.type !== 'Area2D' && node.type !== 'PhysicsBody2D') {
            for (let i = 0; i < node.children.length; i++) {
                this._test_node(node.children[i]);
            }
            return;
        }

        const coll = node;

        // Update bounds
        if (coll._shape) {
            const half_width = coll._shape.extents.x;
            const half_height = coll._shape.extents.y;

            const pos = coll.get_global_position();

            coll.left = pos.x - half_width;
            coll.right = pos.x + half_width;
            coll.top = pos.y - half_height;
            coll.bottom = pos.y + half_height;
        }

        // Insert the hash and test collisions
        const sx = coll.left >> this.spatial_shift;
        const sy = coll.top >> this.spatial_shift;
        const ex = coll.right >> this.spatial_shift;
        const ey = coll.bottom >> this.spatial_shift;

        const a_is_area = coll.type === 'Area2D';

        for (let y = sy; y <= ey; y++) {
            for (let x = sx; x <= ex; x++) {
                // Find or create the list
                if (!this.hash[x]) {
                    this.hash[x] = {};
                }
                if (!this.hash[x][y]) {
                    this.hash[x][y] = get_array();
                }
                const group = this.hash[x][y];

                // Insert collider into the group
                group.push(coll);

                // Pass: only one collider
                if (group.length === 1) {
                    continue;
                }

                // Test colliders in the same group
                for (let j = 0; j < group.length; j++) {
                    let coll2 = group[j];

                    // Pass: same collider or someone is already removed
                    if (coll2 === coll || coll.is_queued_for_deletion || coll2.is_queued_for_deletion) {
                        continue;
                    }

                    const a2b = !!(coll.collision_mask & coll2.collision_layer);
                    const b2a = !!(coll2.collision_mask & coll.collision_layer);

                    // Pass: never collide with each other
                    if (!a2b && !b2a) {
                        continue;
                    }

                    const key = `${coll.id < coll2.id ? coll.id : coll2.id}:${coll.id > coll2.id ? coll.id : coll2.id}`;

                    // Pass: already checked
                    if (this.checks[key]) {
                        continue;
                    }

                    // Mark this pair is already checked
                    this.checks[key] = true;
                    this.collision_checks++;

                    const b_is_area = coll2.type === 'Area2D';

                    // AABB overlap
                    if (!(
                        coll.bottom <= coll2.top ||
                        coll.top >= coll2.bottom ||
                        coll.left >= coll2.right ||
                        coll.right <= coll2.left)
                    ) {
                        // Area vs Area
                        if (a_is_area && b_is_area) {
                            if (!coll.area_map[coll2.id]) {
                                coll.area_map[coll2.id] = coll2;
                                coll.area_entered.dispatch(coll2);
                            }
                            if (!coll2.area_map[coll.id]) {
                                coll2.area_map[coll.id] = coll;
                                coll2.area_entered.dispatch(coll);
                            }
                        }
                    }
                }
            }
        }

        // Area exit test
        if (a_is_area) {
            let a = coll;
            for (let k in a.area_map) {
                let b = a.area_map[k];

                // No longer overlap?
                if (
                  a.bottom <= b.top ||
                  a.top >= b.bottom ||
                  a.left >= b.right ||
                  a.right <= b.left
                ) {
                    delete a.area_map[k];
                    a.area_exited.dispatch(b);
                }
            }
        }

        // Test child nodes
        for (let i = 0; i < node.children.length; i++) {
            this._test_node(node.children[i]);
        }
    }
}
