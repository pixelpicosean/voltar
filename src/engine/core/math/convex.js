import { Vector2 } from "./vector2";

/**
 * @param {Vector2[]} vertices
 */
export function decompose_in_convex(vertices) {
    /** @type {Vector2[]} */
    var vec = [];
    var i = 0, n = 0, j = 0;
    var d = 0, t = 0, dx = 0, dy = 0, min_len = 0;
    var i1 = 0, i2 = 0, i3 = 0;
    var j1 = 0, j2 = 0, k = 0, h = 0;
    /** @type {Vector2[]} */
    var vec1 = [];
    /** @type {Vector2[]} */
    var vec2 = [];
    var is_convex = false;
    /** @type {Vector2[][]} */
    var figs_vec = [];
    /** @type {Vector2[][]} */
    var queue = [];
    /** @type {Vector2} */
    var p1 = null;
    /** @type {Vector2} */
    var p2 = null;
    /** @type {Vector2} */
    var p3 = null;
    /** @type {Vector2} */
    var v1 = null;
    /** @type {Vector2} */
    var v2 = null;
    /** @type {Vector2} */
    var v = null;
    /** @type {Vector2} */
    var hitV = null;

    queue.push(vertices);

    while (queue.length) {
        vec = queue[0];
        n = vec.length;
        is_convex = true;

        for (i = 0; i < n; i++) {
            i1 = i;
            i2 = (i < n - 1) ? i + 1 : i + 1 - n;
            i3 = (i < n - 2) ? i + 2 : i + 2 - n;

            p1 = vec[i1];
            p2 = vec[i2];
            p3 = vec[i3];

            d = det(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
            if ((d < 0)) {
                is_convex = false;
                min_len = Number.MAX_VALUE;

                for (j = 0; j < n; j++) {
                    if (((j != i1) && j != i2)) {
                        j1 = j;
                        j2 = (j < n - 1) ? j + 1 : 0;

                        v1 = vec[j1];
                        v2 = vec[j2];

                        v = hit_ray(p1.x, p1.y, p2.x, p2.y, v1.x, v1.y, v2.x, v2.y);

                        if (v) {
                            dx = p2.x - v.x;
                            dy = p2.y - v.y;
                            t = dx * dx + dy * dy;

                            if ((t < min_len)) {
                                h = j1;
                                k = j2;
                                hitV = v;
                                min_len = t;
                            }
                        }
                    }
                }

                if ((min_len == Number.MAX_VALUE)) {
                    err();
                }

                vec1 = [];
                vec2 = [];

                j1 = h;
                j2 = k;
                v1 = vec[j1];
                v2 = vec[j2];

                if (!points_match(hitV.x, hitV.y, v2.x, v2.y)) {
                    vec1.push(hitV);
                }
                if (!points_match(hitV.x, hitV.y, v1.x, v1.y)) {
                    vec2.push(hitV);
                }

                h = -1;
                k = i1;
                while (true) {
                    if ((k != j2)) {
                        vec1.push(vec[k]);
                    }
                    else {
                        if (((h < 0) || h >= n)) {
                            err();
                        }
                        if (!is_on_segment(v2.x, v2.y, vec[h].x, vec[h].y, p1.x, p1.y)) {
                            vec1.push(vec[k]);
                        }
                        break;
                    }

                    h = k;
                    if (((k - 1) < 0)) {
                        k = n - 1;
                    }
                    else {
                        k--;
                    }
                }

                vec1 = vec1.reverse();

                h = -1;
                k = i2;
                while (true) {
                    if ((k != j1)) {
                        vec2.push(vec[k]);
                    }
                    else {
                        if (((h < 0) || h >= n)) {
                            err();
                        }
                        if (((k == j1) && !is_on_segment(v1.x, v1.y, vec[h].x, vec[h].y, p2.x, p2.y))) {
                            vec2.push(vec[k]);
                        }
                        break;
                    }

                    h = k;
                    if (((k + 1) > n - 1)) {
                        k = 0;
                    }
                    else {
                        k++;
                    }
                }

                queue.push(vec1, vec2);
                queue.shift();

                break;
            }
        }

        if (is_convex) {
            figs_vec.push(queue.shift());
        }
    }

    return figs_vec;
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3
 * @param {number} y3
 * @param {number} x4
 * @param {number} y4
 */
function hit_ray(x1, y1, x2, y2, x3, y3, x4, y4) {
    var t1 = x3 - x1, t2 = y3 - y1, t3 = x2 - x1, t4 = y2 - y1, t5 = x4 - x3, t6 = y4 - y3, t7 = t4 * t5 - t3 * t6, a;

    a = (((t5 * t2) - t6 * t1) / t7);
    var px = x1 + a * t3, py = y1 + a * t4;
    var b1 = is_on_segment(x2, y2, x1, y1, px, py);
    var b2 = is_on_segment(px, py, x3, y3, x4, y4);

    if ((b1 && b2)) {
        return new Vector2(px, py);
    }

    return null;
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3
 * @param {number} y3
 * @param {number} x4
 * @param {number} y4
 */
function hit_segment(x1, y1, x2, y2, x3, y3, x4, y4) {
    var t1 = x3 - x1, t2 = y3 - y1, t3 = x2 - x1, t4 = y2 - y1, t5 = x4 - x3, t6 = y4 - y3, t7 = t4 * t5 - t3 * t6, a;

    a = (((t5 * t2) - t6 * t1) / t7);
    var px = x1 + a * t3, py = y1 + a * t4;
    var b1 = is_on_segment(px, py, x1, y1, x2, y2);
    var b2 = is_on_segment(px, py, x3, y3, x4, y4);

    if ((b1 && b2)) {
        return new Vector2(px, py);
    }

    return null;
}

/**
 * @param {number} px
 * @param {number} py
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
function is_on_segment(px, py, x1, y1, x2, y2) {
    var b1 = ((((x1 + 0.1) >= px) && px >= x2 - 0.1) || (((x1 - 0.1) <= px) && px <= x2 + 0.1));
    var b2 = ((((y1 + 0.1) >= py) && py >= y2 - 0.1) || (((y1 - 0.1) <= py) && py <= y2 + 0.1));
    return ((b1 && b2) && is_on_line(px, py, x1, y1, x2, y2));
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
function points_match(x1, y1, x2, y2) {
    var dx = (x2 >= x1) ? x2 - x1 : x1 - x2, dy = (y2 >= y1) ? y2 - y1 : y1 - y2;
    return ((dx < 0.1) && dy < 0.1);
}

/**
 * @param {number} px
 * @param {number} py
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
function is_on_line(px, py, x1, y1, x2, y2) {
    if ((((x2 - x1) > 0.1) || x1 - x2 > 0.1)) {
        var a = (y2 - y1) / (x2 - x1),
            possibleY = a * (px - x1) + y1,
            diff = (possibleY > py) ? possibleY - py : py - possibleY;
        return (diff < 0.1);
    }

    return (((px - x1) < 0.1) || x1 - px < 0.1);
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3
 * @param {number} y3
 */
function det(x1, y1, x2, y2, x3, y3) {
    return x1 * y2 + x2 * y3 + x3 * y1 - y1 * x2 - y2 * x3 - y3 * x1;
}

function err() {
    console.error('Concave to convex goes wrong!');
}
