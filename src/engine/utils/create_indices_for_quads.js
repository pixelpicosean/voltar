/**
 * Generic Mask Stack data structure
 *
 * @param {number} size - Number of quads
 * @return indices
 */
export default function create_indices_for_quads(size) {
    // the total number of indices in our array, there are 6 points per quad.

    const total_indices = size * 6;

    const indices = new Uint16Array(total_indices);

    // fill the indices with the quads to draw
    for (let i = 0, j = 0; i < total_indices; i += 6, j += 4) {
        indices[i + 0] = j + 0;
        indices[i + 1] = j + 1;
        indices[i + 2] = j + 2;
        indices[i + 3] = j + 0;
        indices[i + 4] = j + 2;
        indices[i + 5] = j + 3;
    }

    return indices;
}
