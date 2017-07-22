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

const res = {
    overlap: 0,
    overlap_n: new Vector(),
    overlap_v: new Vector(),
};


export default class PhysicsServer {
    constructor() {
        this.is_initialized = false;

        this.spatial_shift = 5;
        this.hash = null;
        this.checks = null;
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
        this.hash = Object.create(null);
        this.checks = Object.create(null);
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
                    this.hash[x] = Object.create(null);
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

                    let a2b = !!(coll.collision_mask & coll2.collision_layer);
                    let b2a = !!(coll2.collision_mask & coll.collision_layer);

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
                            coll._area_inout(true, coll2);
                            coll2._area_inout(true, coll);
                        }
                        // Area vs Body
                        else if (a_is_area && !b_is_area) {
                            coll._body_inout(true, coll2);
                        }
                        // Body vs Area
                        else if (!a_is_area && b_is_area) {
                            coll2._body_inout(true, coll);
                        }
                        // Body vs Body
                        else {
                            a2b = a2b && (coll.collision_exceptions.indexOf(coll2) < 0);
                            b2a = b2a && (coll2.collision_exceptions.indexOf(coll) < 0);

                            let push_a = false, push_b = false;
                            let a_is_left = true, a_is_top = true;
                            let overlap_x = Infinity, overlap_y = Infinity, half_overlap;
                            if (coll.x < coll2.x) {
                                a_is_left = true;
                                overlap_x = coll.right - coll2.left;
                            }
                            else if (coll.x > coll2.x) {
                                a_is_left = false;
                                overlap_x = coll2.right - coll.left;
                            }
                            if (coll.y < coll2.y) {
                                a_is_top = true;
                                overlap_y = coll.bottom - coll2.top;
                            }
                            else if (coll.y > coll2.y) {
                                a_is_top = false;
                                overlap_y = coll2.bottom - coll.top;
                            }

                            // No overlap at all
                            if (overlap_x === 0 && overlap_y === 0) {
                                continue;
                            }

                            if (overlap_x < overlap_y) {
                                res.overlap = overlap_x;

                                if (a_is_left) {
                                    res.overlap_n.set(-1, 0);
                                    res.overlap_v.set(-overlap_x, 0);
                                    push_a = (a2b && coll._collide(coll2, res));

                                    res.overlap_n.set(1, 0);
                                    res.overlap_v.set(overlap_x, 0);
                                    push_b = (b2a && coll2._collide(coll, res));
                                }
                                else {
                                    res.overlap_n.set(1, 0);
                                    res.overlap_v.set(overlap_x, 0);
                                    push_a = (a2b && coll._collide(coll2, res));

                                    res.overlap_n.set(-1, 0);
                                    res.overlap_v.set(-overlap_x, 0);
                                    push_b = (b2a && coll2._collide(coll, res));
                                }

                                if (push_a && !push_b) {
                                    if (a_is_left) {
                                        coll.x -= overlap_x;
                                    }
                                    else {
                                        coll.x += overlap_x;
                                    }
                                }
                                else if (!push_a && push_b) {
                                    if (a_is_left) {
                                        coll2.x += overlap_x;
                                    }
                                    else {
                                        coll2.x -= overlap_x;
                                    }
                                }
                                else if (push_a && push_b) {
                                    half_overlap = overlap_x * 0.5;

                                    if (a_is_left) {
                                        coll.x -= half_overlap;
                                        coll2.x += half_overlap;
                                    }
                                    else {
                                        coll2.x -= half_overlap;
                                        coll.x += half_overlap;
                                    }
                                }
                            }
                            else {
                                res.overlap = overlap_y;

                                if (a_is_top) {
                                    res.overlap_n.set(0, -1);
                                    res.overlap_v.set(0, -overlap_y);
                                    push_a = (a2b && coll._collide(coll2, res));

                                    res.overlap_n.set(0, 1);
                                    res.overlap_v.set(0, overlap_y);
                                    push_b = (b2a && coll2._collide(coll, res));
                                }
                                else {
                                    res.overlap_n.set(0, 1);
                                    res.overlap_v.set(0, overlap_y);
                                    push_a = (a2b && coll._collide(coll2, res));

                                    res.overlap_n.set(0, -1);
                                    res.overlap_v.set(0, -overlap_y);
                                    push_b = (b2a && coll2._collide(coll, res));
                                }

                                if (push_a && !push_b) {
                                    if (a_is_top) {
                                        coll.y -= overlap_y;
                                    }
                                    else {
                                        coll.y += overlap_y;
                                    }
                                }
                                else if (!push_a && push_b) {
                                    if (a_is_top) {
                                        coll2.y += overlap_y;
                                    }
                                    else {
                                        coll2.y -= overlap_y;
                                    }
                                }
                                else if (push_a && push_b) {
                                    half_overlap = overlap_y * 0.5;
                                    if (a_is_top) {
                                        coll.y -= half_overlap;
                                        coll2.y += half_overlap;
                                    }
                                    else {
                                        coll.y += half_overlap;
                                        coll2.y -= half_overlap;
                                    }
                                }
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
                    a._area_inout(false, b);
                }
            }
        }
        // Body exit test
        if (a_is_area) {
            let a = coll;
            for (let k in a.body_map) {
                let b = a.body_map[k];

                // No longer overlap?
                if (
                  a.bottom <= b.top ||
                  a.top >= b.bottom ||
                  a.left >= b.right ||
                  a.right <= b.left
                ) {
                    a._body_inout(false, b);
                }
            }
        }

        // Test child nodes
        for (let i = 0; i < node.children.length; i++) {
            this._test_node(node.children[i]);
        }
    }
}
