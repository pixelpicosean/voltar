// Your friendly neighbour https://en.wikipedia.org/wiki/Dihedral_group of order 16
import Matrix from './matrix';

const ux = [1, 1, 0, -1, -1, -1, 0, 1, 1, 1, 0, -1, -1, -1, 0, 1];
const uy = [0, 1, 1, 1, 0, -1, -1, -1, 0, 1, 1, 1, 0, -1, -1, -1];
const vx = [0, -1, -1, -1, 0, 1, 1, 1, 0, 1, 1, 1, 0, -1, -1, -1];
const vy = [1, 1, 0, -1, -1, -1, 0, 1, -1, -1, 0, 1, 1, 1, 0, -1];

/** @type {Matrix[]} */
const temp_matrices = [];

/** @type {number[][]} */
const mul = [];

/**
 * @param {number} x
 */
function signum(x) {
    if (x < 0) {
        return -1;
    }
    if (x > 0) {
        return 1;
    }

    return 0;
}

function init() {
    for (let i = 0; i < 16; i++) {
        const row = [];

        mul.push(row);

        for (let j = 0; j < 16; j++) {
            const _ux = signum((ux[i] * ux[j]) + (vx[i] * uy[j]));
            const _uy = signum((uy[i] * ux[j]) + (vy[i] * uy[j]));
            const _vx = signum((ux[i] * vx[j]) + (vx[i] * vy[j]));
            const _vy = signum((uy[i] * vx[j]) + (vy[i] * vy[j]));

            for (let k = 0; k < 16; k++) {
                if (ux[k] === _ux && uy[k] === _uy && vx[k] === _vx && vy[k] === _vy) {
                    row.push(k);
                    break;
                }
            }
        }
    }

    for (let i = 0; i < 16; i++) {
        const mat = new Matrix();

        mat.set(ux[i], uy[i], vx[i], vy[i], 0, 0);
        temp_matrices.push(mat);
    }
}

init();

/**
 * Implements Dihedral Group D_8, see [group D4]{@link http://mathworld.wolfram.com/DihedralGroupD4.html},
 * D8 is the same but with diagonals. Used for texture rotations.
 *
 * Vector xX(i), xY(i) is U-axis of sprite with rotation i
 * Vector yY(i), yY(i) is V-axis of sprite with rotation i
 * Rotations: 0 grad (0), 90 grad (2), 180 grad (4), 270 grad (6)
 * Mirrors: vertical (8), main diagonal (10), horizontal (12), reverse diagonal (14)
 * This is the small part of gameofbombs.com portal system. It works.
 *
 * @author Ivan @ivanpopelyshev
 */
const GroupD8 = {
    E: 0,
    SE: 1,
    S: 2,
    SW: 3,
    W: 4,
    NW: 5,
    N: 6,
    NE: 7,
    MIRROR_VERTICAL: 8,
    MIRROR_HORIZONTAL: 12,
    u_x: (/** @type {number} */ind) => ux[ind],
    u_y: (/** @type {number} */ind) => uy[ind],
    v_x: (/** @type {number} */ind) => vx[ind],
    v_y: (/** @type {number} */ind) => vy[ind],
    inv: (/** @type {number} */rotation) => {
        if (rotation & 8) {
            return rotation & 15;
        }

        return (-rotation) & 7;
    },
    add: (/** @type {number} */rotation_second, /** @type {number} */rotation_first) => mul[rotation_second][rotation_first],
    sub: (/** @type {number} */rotation_second, /** @type {number} */rotation_first) => mul[rotation_second][GroupD8.inv(rotation_first)],

    /**
     * Adds 180 degrees to rotation. Commutative operation.
     *
     * @param {number} rotation - The number to rotate.
     */
    rotate180: (rotation) => rotation ^ 4,

    /**
     * Direction of main vector can be horizontal, vertical or diagonal.
     * Some objects work with vertical directions different.
     *
     * @param {number} rotation - The number to check.
     * @returns {boolean} Whether or not the width/height should be swapped.
     */
    is_vertical: (rotation) => (rotation & 3) === 2,

    /**
     * @param {number} dx
     * @param {number} dy
     */
    by_direction: (dx, dy) => {
        if (Math.abs(dx) * 2 <= Math.abs(dy)) {
            if (dy >= 0) {
                return GroupD8.S;
            }

            return GroupD8.N;
        }
        else if (Math.abs(dy) * 2 <= Math.abs(dx)) {
            if (dx > 0) {
                return GroupD8.E;
            }

            return GroupD8.W;
        }
        else if (dy > 0) {
            if (dx > 0) {
                return GroupD8.SE;
            }

            return GroupD8.SW;
        }
        else if (dx > 0) {
            return GroupD8.NE;
        }

        return GroupD8.NW;
    },

    /**
     * Helps sprite to compensate texture packer rotation.
     *
     * @param {Matrix} matrix - sprite world matrix
     * @param {number} rotation - The rotation factor to use.
     * @param {number} tx - sprite anchoring
     * @param {number} ty - sprite anchoring
     */
    matrix_append_rotation_inv: (matrix, rotation, tx = 0, ty = 0) => {
        // Packer used "rotation", we use "inv(rotation)"
        const mat = temp_matrices[GroupD8.inv(rotation)];

        mat.tx = tx;
        mat.ty = ty;
        matrix.append(mat);
    },
};

export default GroupD8;
