import Node2D from '../Node2D';


const HALF_PI = Math.PI * 0.5;
const SLOPE_ANGLE_DIFF_MIN = 0.001;


export default class CollisionMap extends Node2D {
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

    get width() {
        return (this.data && this.data[0]) ? this.data[0].length : 0;
    }
    set width(v) {}
    get height() {
        return (this.data) ? this.data.length : 0;
    }
    set height(v) {}

    constructor(tilesize, data, layer_bit = 1, tiledef = TileDef) {
        super();

        this.type = 'CollisionMap';

        this.collision_layer = 0;
        this.set_collision_layer_bit(layer_bit);

        this.tilesize = tilesize;
        this.data = data;

        this.tiledef = tiledef;
        this.last_slope = 1;

        for (let t in this.tiledef) {
            if (t | 0 > this.last_slope) {
                this.last_slope = t | 0;
            }
        }

        // Notify the physics server that collision map is entered/exited
        this.tree_entered.add(() => {
            this.scene_tree.physics_server.collision_map_entered(this);
        });
        this.tree_exited.add(() => {
            this.scene_tree.physics_server.collision_map_exited(this);
        });
    }

    clear() {
        this.data = [[]];
        this.width = 0;
        this.height = 0;
    }
    get_tile(x, y) {
        return this.data[y][x];
    }
    set_tile(x, y, tile) {
        this.data[y][x] = tile;
    }

    trace(x, y, vx, vy, object_width, object_height, res) {
        // Break the trace down into smaller steps if necessary.
        // We add a little extra movement (0.1 px) when calculating the number of steps required,
        // to force an additional trace step whenever vx or vy is a factor of tilesize. This
        // prevents the trace step from skipping through the very first tile.
        var steps = Math.ceil((Math.max(Math.abs(vx), Math.abs(vy)) + 0.1) / this.tilesize);
        if (steps > 1) {
            var sx = vx / steps;
            var sy = vy / steps;

            for (var i = 0; i < steps && (sx || sy); i++) {
                this._trace_step(res, x, y, sx, sy, object_width, object_height, vx, vy, i);

                x = res.position.x;
                y = res.position.y;
                if (res.collision.x) {
                    sx = 0;
                    vx = 0;
                }
                if (res.collision.y) {
                    sy = 0;
                    vy = 0;
                }
                if (res.collision.slope) {
                    break;
                }
            }
        }

        // Just one step
        else {
            this._trace_step(res, x, y, vx, vy, object_width, object_height, vx, vy, 0);
        }

        res.collider = this;

        return res;
    }


    _trace_step(res, x, y, vx, vy, width, height, rvx, rvy, step) {
        var tileX, tileY;

        res.position.x += vx;
        res.position.y += vy;

        var t = 0;

        // Horizontal collision (walls)
        if (vx) {
            var pxOffsetX = (vx > 0 ? width : 0);
            var tileOffsetX = (vx < 0 ? this.tilesize : 0);

            var firstTileY = Math.max(Math.floor(y / this.tilesize), 0);
            var lastTileY = Math.min(Math.ceil((y + height) / this.tilesize), this.height);
            tileX = Math.floor((res.position.x + pxOffsetX) / this.tilesize);

            // We need to test the new tile position as well as the current one, as we
            // could still collide with the current tile if it's a line def.
            // We can skip this test if this is not the first step or the new tile position
            // is the same as the current one.
            var prevTileX = Math.floor((x + pxOffsetX) / this.tilesize);
            if (step > 0 || tileX == prevTileX || prevTileX < 0 || prevTileX >= this.width) {
                prevTileX = -1;
            }

            // Still inside this collision map?
            if (tileX >= 0 && tileX < this.width) {
                for (tileY = firstTileY; tileY < lastTileY; tileY++) {
                    if (prevTileX != -1) {
                        t = this.data[tileY][prevTileX];
                        if (t > 1 && t <= this.last_slope && this._check_tile_def(res, t, x, y, rvx, rvy, width, height, prevTileX, tileY)) {
                            break;
                        }
                    }

                    t = this.data[tileY][tileX];
                    if (
                        t == 1 || t > this.last_slope || // fully solid tile?
                        (t > 1 && this._check_tile_def(res, t, x, y, rvx, rvy, width, height, tileX, tileY)) // slope?
                    ) {
                        if (t > 1 && t <= this.last_slope && res.collision.slope) {
                            break;
                        }

                        // full tile collision!
                        res.collision.x = true;
                        res.tile.x = t;
                        res.normal.x = vx < 0 ? 1 : -1;
                        x = res.position.x = tileX * this.tilesize - pxOffsetX + tileOffsetX;
                        rvx = 0;
                        break;
                    }
                }
            }
        }

        // Vertical collision (floor, ceiling)
        if (vy) {
            var pxOffsetY = (vy > 0 ? height : 0);
            var tileOffsetY = (vy < 0 ? this.tilesize : 0);

            var firstTileX = Math.max(Math.floor(res.position.x / this.tilesize), 0);
            var lastTileX = Math.min(Math.ceil((res.position.x + width) / this.tilesize), this.width);
            tileY = Math.floor((res.position.y + pxOffsetY) / this.tilesize);

            var prevTileY = Math.floor((y + pxOffsetY) / this.tilesize);
            if (step > 0 || tileY == prevTileY || prevTileY < 0 || prevTileY >= this.height) {
                prevTileY = -1;
            }

            // Still inside this collision map?
            if (tileY >= 0 && tileY < this.height) {
                for (tileX = firstTileX; tileX < lastTileX; tileX++) {
                    if (prevTileY != -1) {
                        t = this.data[prevTileY][tileX];
                        if (t > 1 && t <= this.last_slope &&
                            this._check_tile_def(res, t, x, y, rvx, rvy, width, height, tileX, prevTileY)) {
                            break;
                        }
                    }

                    t = this.data[tileY][tileX];
                    if (
                        t == 1 || t > this.last_slope || // fully solid tile?
                        (t > 1 && this._check_tile_def(res, t, x, y, rvx, rvy, width, height, tileX, tileY)) // slope?
                    ) {
                        if (t > 1 && t <= this.last_slope && res.collision.slope) {
                            break;
                        }

                        // full tile collision!
                        res.collision.y = true;
                        res.tile.y = t;
                        res.normal.y = vy < 0 ? 1 : -1;
                        res.position.y = tileY * this.tilesize - pxOffsetY + tileOffsetY;
                        break;
                    }
                }
            }
        }

        // res is changed in place, nothing to return
        res.normal.normalize();
    }

    _check_tile_def(res, t, x, y, vx, vy, width, height, tileX, tileY) {
        var def = this.tiledef[t];
        if (!def) {
            return false;
        }

        var lx = (tileX + def[0]) * this.tilesize,
            ly = (tileY + def[1]) * this.tilesize,
            lvx = (def[2] - def[0]) * this.tilesize,
            lvy = (def[3] - def[1]) * this.tilesize,
            solid = def[4];

        // Find the box corner to test, relative to the line
        var tx = x + vx + (lvy < 0 ? width : 0) - lx,
        ty = y + vy + (lvx > 0 ? height : 0) - ly;

        // Is the box corner behind the line?
        if (lvx * ty - lvy * tx > 0) {

            // Lines are only solid from one side - find the dot product of
            // line normal and movement vector and dismiss if wrong side
            if (vx * -lvy + vy * lvx < 0) {
                return solid;
            }

            // Find the line normal
            var length = Math.sqrt(lvx * lvx + lvy * lvy);
            var nx = lvy / length,
                ny = -lvx / length;

            // Project out of the line
            var proj = tx * nx + ty * ny;
            var px = nx * proj,
                py = ny * proj;

            // If we project further out than we moved in, then this is a full
            // tile collision for solid tiles.
            // For non-solid tiles, make sure we were in front of the line.
            if (px * px + py * py >= vx * vx + vy * vy) {
                return solid || (lvx * (ty - vy) - lvy * (tx - vx) < 0.5);
            }

            // Project the point back to motion direction,
            // so we will get more precise result. Further more,
            // we can stop the the unwilling slope slide behavior
            let mx = px, my = py;
            let len = Math.sqrt(vx * vx + vy * vy);
            let n_vx = vx / len, n_vy = vy / len;
            let angle = Math.acos(-nx * n_vx + -ny * n_vy);
            if (Math.abs(angle - HALF_PI) > SLOPE_ANGLE_DIFF_MIN) {
                let len_f = Math.sqrt(px * px + py * py) / Math.cos(angle);
                mx = len_f * n_vx;
                my = len_f * n_vy;
            }

            res.travel.x = vx - mx;
            res.travel.y = vy - my;

            res.remainder.x = mx;
            res.remainder.y = my;

            res.position.x = x + (vx - mx);
            res.position.y = y + (vy - my);

            res.collision.slope = {
                x: lvx,
                y: lvy,
            };

            res.normal.set(nx, ny);

            return true;
        }

        return false;
    }
}


// Default Slope Tile definition. Each tile is defined by an array of 5 vars:
// - 4 for the line in tile coordinates (0 -- 1)
// - 1 specifing whether the tile is 'filled' behind the line or not
// [ x1, y1, x2, y2, solid ]

// Defining 'half', 'one third' and 'two thirds' as vars  makes it a bit
// easier to read... I hope.
const H = 1 / 2,
    N = 1 / 3,
    M = 2 / 3,
    SOLID = true,
    NON_SOLID = false;

const TileDef = {
    /* 15 NE */
    5: [0, 1, 1, M, SOLID],
    6: [0, M, 1, N, SOLID],
    7: [0, N, 1, 0, SOLID],
    /* 22 NE */
    3: [0, 1, 1, H, SOLID],
    4: [0, H, 1, 0, SOLID],
    /* 45 NE */
    2: [0, 1, 1, 0, SOLID],
    /* 67 NE */
    10: [H, 1, 1, 0, SOLID],
    21: [0, 1, H, 0, SOLID],
    /* 75 NE */
    32: [M, 1, 1, 0, SOLID],
    43: [N, 1, M, 0, SOLID],
    54: [0, 1, N, 0, SOLID],

    /* 15 SE */
    27: [0, 0, 1, N, SOLID],
    28: [0, N, 1, M, SOLID],
    29: [0, M, 1, 1, SOLID],
    /* 22 SE */
    25: [0, 0, 1, H, SOLID],
    26: [0, H, 1, 1, SOLID],
    /* 45 SE */
    24: [0, 0, 1, 1, SOLID],
    /* 67 SE */
    11: [0, 0, H, 1, SOLID],
    22: [H, 0, 1, 1, SOLID],
    /* 75 SE */
    33: [0, 0, N, 1, SOLID],
    44: [N, 0, M, 1, SOLID],
    55: [M, 0, 1, 1, SOLID],

    /* 15 NW */
    16: [1, N, 0, 0, SOLID],
    17: [1, M, 0, N, SOLID],
    18: [1, 1, 0, M, SOLID],
    /* 22 NW */
    14: [1, H, 0, 0, SOLID],
    15: [1, 1, 0, H, SOLID],
    /* 45 NW */
    13: [1, 1, 0, 0, SOLID],
    /* 67 NW */
    8: [H, 1, 0, 0, SOLID],
    19: [1, 1, H, 0, SOLID],
    /* 75 NW */
    30: [N, 1, 0, 0, SOLID],
    41: [M, 1, N, 0, SOLID],
    52: [1, 1, M, 0, SOLID],

    /* 15 SW */
    38: [1, M, 0, 1, SOLID],
    39: [1, N, 0, M, SOLID],
    40: [1, 0, 0, N, SOLID],
    /* 22 SW */
    36: [1, H, 0, 1, SOLID],
    37: [1, 0, 0, H, SOLID],
    /* 45 SW */
    35: [1, 0, 0, 1, SOLID],
    /* 67 SW */
    9: [1, 0, H, 1, SOLID],
    20: [H, 0, 0, 1, SOLID],
    /* 75 SW */
    31: [1, 0, M, 1, SOLID],
    42: [M, 0, N, 1, SOLID],
    53: [N, 0, 0, 1, SOLID],

    /* Go N  */
    12: [0, 0, 1, 0, NON_SOLID],
    /* Go S  */
    23: [1, 1, 0, 1, NON_SOLID],
    /* Go E  */
    34: [1, 0, 1, 1, NON_SOLID],
    /* Go W  */
    45: [0, 1, 0, 0, NON_SOLID],

    // Now that was fun!
};
