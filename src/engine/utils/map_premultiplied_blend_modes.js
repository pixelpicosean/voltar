import { BLEND_MODES } from '../const';

/**
 * Corrects pixi blend, takes premultiplied alpha into account
 *
 * @param {number[][]} [array] - The array to output into.
 * @return {number[][]} Mapped modes.
 */

export default function map_premultiplied_blend_modes(array) {
    if (array === undefined) array = []

    const pm = [];
    const npm = [];

    for (let i = 0; i < 32; i++) {
        pm[i] = i;
        npm[i] = i;
    }

    pm[BLEND_MODES.NORMAL_NPM] = BLEND_MODES.NORMAL;
    pm[BLEND_MODES.ADD_NPM] = BLEND_MODES.ADD;
    pm[BLEND_MODES.SCREEN_NPM] = BLEND_MODES.SCREEN;

    npm[BLEND_MODES.NORMAL] = BLEND_MODES.NORMAL_NPM;
    npm[BLEND_MODES.ADD] = BLEND_MODES.ADD_NPM;
    npm[BLEND_MODES.SCREEN] = BLEND_MODES.SCREEN_NPM;

    array.push(npm);
    array.push(pm);

    return array;
}
