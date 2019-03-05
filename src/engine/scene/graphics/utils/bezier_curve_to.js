/**
 * Calculate the points for a bezier curve and then draws it.
 *
 * @param {number} from_x - Starting point x
 * @param {number} from_y - Starting point y
 * @param {number} cp_x - Control point x
 * @param {number} cp_y - Control point y
 * @param {number} cp_x2 - Second Control point x
 * @param {number} cp_y2 - Second Control point y
 * @param {number} to_x - Destination point x
 * @param {number} to_y - Destination point y
 * @param {number} n - Number of segments approximating the bezier curve
 * @param {number[]} [path] - Path array to push points into
 */
export default function bezier_curve_to(from_x, from_y, cp_x, cp_y, cp_x2, cp_y2, to_x, to_y, n, path = []) {
    let dt = 0;
    let dt2 = 0;
    let dt3 = 0;
    let t2 = 0;
    let t3 = 0;

    path.push(from_x, from_y);

    for (let i = 1, j = 0; i <= n; ++i) {
        j = i / n;

        dt = (1 - j);
        dt2 = dt * dt;
        dt3 = dt2 * dt;

        t2 = j * j;
        t3 = t2 * j;

        path.push(
            (dt3 * from_x) + (3 * dt2 * j * cp_x) + (3 * dt * t2 * cp_x2) + (t3 * to_x),
            (dt3 * from_y) + (3 * dt2 * j * cp_y) + (3 * dt * t2 * cp_y2) + (t3 * to_y)
        );
    }

    return path;
}
