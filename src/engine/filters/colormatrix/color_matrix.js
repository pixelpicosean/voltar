import Filter from 'engine/servers/visual/filters/filter';

import Vert from '../fragments/default.vert';
import Frag from './color_matrix.frag';

/**
 * The ColorMatrixFilter class lets you apply a 5x4 matrix transformation on the RGBA
 * color and alpha values of every pixel on your node to produce a result
 * with a new set of RGBA color and alpha values. It's pretty powerful!
 *
 * ```js
 *  let colorMatrix = new ColorMatrixFilter();
 *  node.filters = [colorMatrix];
 *  colorMatrix.contrast(2);
 * ```
 * @author Clément Chenebault <clement@goodboydigital.com>
 */
export default class ColorMatrix extends Filter {
    constructor() {
        super(Vert, Frag);

        this.uniforms.m = new Float32Array([
            1, 0, 0, 0, 0,
            0, 1, 0, 0, 0,
            0, 0, 1, 0, 0,
            0, 0, 0, 1, 0,
        ]);

        this.alpha = 1;
    }

    /**
     * Transforms current matrix and set the new one
     *
     * @param {number[]} matrix - 5x4 matrix
     * @param {boolean} [multiply] - if true, current matrix and matrix are multiplied. If false,
     *  just set the current matrix with @param matrix
     */
    _load_matrix(matrix, multiply = false) {
        let new_matrix = new Float32Array(matrix);

        if (multiply) {
            this._multiply(new_matrix, this.uniforms.m, matrix);
            new_matrix = this._color_matrix(new_matrix);
        }

        // set the new matrix
        this.uniforms.m = new_matrix;
    }

    /**
     * Multiplies two mat5's
     *
     * @param {Float32Array} out - 5x4 matrix the receiving matrix
     * @param {Float32Array} a - 5x4 matrix the first operand
     * @param {number[]} b - 5x4 matrix the second operand
     */
    _multiply(out, a, b) {
        // Red Channel
        out[0] = (a[0] * b[0]) + (a[1] * b[5]) + (a[2] * b[10]) + (a[3] * b[15]);
        out[1] = (a[0] * b[1]) + (a[1] * b[6]) + (a[2] * b[11]) + (a[3] * b[16]);
        out[2] = (a[0] * b[2]) + (a[1] * b[7]) + (a[2] * b[12]) + (a[3] * b[17]);
        out[3] = (a[0] * b[3]) + (a[1] * b[8]) + (a[2] * b[13]) + (a[3] * b[18]);
        out[4] = (a[0] * b[4]) + (a[1] * b[9]) + (a[2] * b[14]) + (a[3] * b[19]) + a[4];

        // Green Channel
        out[5] = (a[5] * b[0]) + (a[6] * b[5]) + (a[7] * b[10]) + (a[8] * b[15]);
        out[6] = (a[5] * b[1]) + (a[6] * b[6]) + (a[7] * b[11]) + (a[8] * b[16]);
        out[7] = (a[5] * b[2]) + (a[6] * b[7]) + (a[7] * b[12]) + (a[8] * b[17]);
        out[8] = (a[5] * b[3]) + (a[6] * b[8]) + (a[7] * b[13]) + (a[8] * b[18]);
        out[9] = (a[5] * b[4]) + (a[6] * b[9]) + (a[7] * b[14]) + (a[8] * b[19]) + a[9];

        // Blue Channel
        out[10] = (a[10] * b[0]) + (a[11] * b[5]) + (a[12] * b[10]) + (a[13] * b[15]);
        out[11] = (a[10] * b[1]) + (a[11] * b[6]) + (a[12] * b[11]) + (a[13] * b[16]);
        out[12] = (a[10] * b[2]) + (a[11] * b[7]) + (a[12] * b[12]) + (a[13] * b[17]);
        out[13] = (a[10] * b[3]) + (a[11] * b[8]) + (a[12] * b[13]) + (a[13] * b[18]);
        out[14] = (a[10] * b[4]) + (a[11] * b[9]) + (a[12] * b[14]) + (a[13] * b[19]) + a[14];

        // Alpha Channel
        out[15] = (a[15] * b[0]) + (a[16] * b[5]) + (a[17] * b[10]) + (a[18] * b[15]);
        out[16] = (a[15] * b[1]) + (a[16] * b[6]) + (a[17] * b[11]) + (a[18] * b[16]);
        out[17] = (a[15] * b[2]) + (a[16] * b[7]) + (a[17] * b[12]) + (a[18] * b[17]);
        out[18] = (a[15] * b[3]) + (a[16] * b[8]) + (a[17] * b[13]) + (a[18] * b[18]);
        out[19] = (a[15] * b[4]) + (a[16] * b[9]) + (a[17] * b[14]) + (a[18] * b[19]) + a[19];

        return out;
    }

    /**
     * Normalize the offset component to 0-1
     *
     * @param {Float32Array} matrix - 5x4 matrix
     */
    _color_matrix(matrix) {
        matrix[4] /= 255;
        matrix[9] /= 255;
        matrix[14] /= 255;
        matrix[19] /= 255;

        return matrix;
    }

    /**
     * Adjusts brightness
     *
     * @param {number} b - value of the brigthness (0-1, where 0 is black)
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    brightness(b, multiply) {
        const matrix = [
            b, 0, 0, 0, 0,
            0, b, 0, 0, 0,
            0, 0, b, 0, 0,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Set the matrices in grey scales
     *
     * @param {number} scale - value of the grey (0-1, where 0 is black)
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    greyscale(scale, multiply) {
        const matrix = [
            scale, scale, scale, 0, 0,
            scale, scale, scale, 0, 0,
            scale, scale, scale, 0, 0,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Set the black and white matrice.
     *
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    black_and_white(multiply) {
        const matrix = [
            0.3, 0.6, 0.1, 0, 0,
            0.3, 0.6, 0.1, 0, 0,
            0.3, 0.6, 0.1, 0, 0,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Set the hue property of the color
     *
     * @param {number} rotation - in degrees
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    hue(rotation, multiply) {
        rotation = (rotation || 0) / 180 * Math.PI;

        const cos_r = Math.cos(rotation);
        const sin_r = Math.sin(rotation);
        const sqrt = Math.sqrt;

        /* a good approximation for hue rotation
         This matrix is far better than the versions with magic luminance constants
         formerly used here, but also used in the starling framework (flash) and known from this
         old part of the internet: quasimondo.com/archives/000565.php

         This new matrix is based on rgb cube rotation in space. Look here for a more descriptive
         implementation as a shader not a general matrix:
         https://github.com/evanw/glfx.js/blob/58841c23919bd59787effc0333a4897b43835412/src/filters/adjust/huesaturation.js

         This is the source for the code:
         see http://stackoverflow.com/questions/8507885/shift-hue-of-an-rgb-color/8510751#8510751
         */

        const w = 1 / 3;
        const sqrW = sqrt(w); // weight is

        const a00 = cos_r + ((1.0 - cos_r) * w);
        const a01 = (w * (1.0 - cos_r)) - (sqrW * sin_r);
        const a02 = (w * (1.0 - cos_r)) + (sqrW * sin_r);

        const a10 = (w * (1.0 - cos_r)) + (sqrW * sin_r);
        const a11 = cos_r + (w * (1.0 - cos_r));
        const a12 = (w * (1.0 - cos_r)) - (sqrW * sin_r);

        const a20 = (w * (1.0 - cos_r)) - (sqrW * sin_r);
        const a21 = (w * (1.0 - cos_r)) + (sqrW * sin_r);
        const a22 = cos_r + (w * (1.0 - cos_r));

        const matrix = [
            a00, a01, a02, 0, 0,
            a10, a11, a12, 0, 0,
            a20, a21, a22, 0, 0,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Set the contrast matrix, increase the separation between dark and bright
     * Increase contrast : shadows darker and highlights brighter
     * Decrease contrast : bring the shadows up and the highlights down
     *
     * @param {number} amount - value of the contrast (0-1)
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    contrast(amount, multiply) {
        const v = (amount || 0) + 1;
        const o = -0.5 * (v - 1);

        const matrix = [
            v, 0, 0, 0, o,
            0, v, 0, 0, o,
            0, 0, v, 0, o,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Set the saturation matrix, increase the separation between colors
     * Increase saturation : increase contrast, brightness, and sharpness
     *
     * @param {number} amount - The saturation amount (0-1)
     * @param {boolean} [multiply] - if true, current matrix and matrix are multiplied.
     */
    saturate(amount = 0, multiply = false) {
        const x = (amount * 2 / 3) + 1;
        const y = ((x - 1) * -0.5);

        const matrix = [
            x, y, y, 0, 0,
            y, x, y, 0, 0,
            y, y, x, 0, 0,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Desaturate image (remove color)
     */
    desaturate() {
        this.saturate(-1);
    }

    /**
     * Negative image (inverse of classic rgb matrix)
     *
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    negative(multiply) {
        const matrix = [
            -1, 0, 0, 1, 0,
            0, -1, 0, 1, 0,
            0, 0, -1, 1, 0,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Sepia image
     *
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    sepia(multiply) {
        const matrix = [
            0.393, 0.7689999, 0.18899999, 0, 0,
            0.349, 0.6859999, 0.16799999, 0, 0,
            0.272, 0.5339999, 0.13099999, 0, 0,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Color motion picture process invented in 1916 (thanks Dominic Szablewski)
     *
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    technicolor(multiply) {
        const matrix = [
            1.9125277891456083, -0.8545344976951645, -0.09155508482755585, 0, 11.793603434377337,
            -0.3087833385928097, 1.7658908555458428, -0.10601743074722245, 0, -70.35205161461398,
            -0.231103377548616, -0.7501899197440212, 1.847597816108189, 0, 30.950940869491138,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Polaroid filter
     *
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    polaroid(multiply) {
        const matrix = [
            1.438, -0.062, -0.062, 0, 0,
            -0.122, 1.378, -0.122, 0, 0,
            -0.016, -0.016, 1.483, 0, 0,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Filter who transforms : Red -> Blue and Blue -> Red
     *
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    to_bgr(multiply) {
        const matrix = [
            0, 0, 1, 0, 0,
            0, 1, 0, 0, 0,
            1, 0, 0, 0, 0,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Color reversal film introduced by Eastman Kodak in 1935. (thanks Dominic Szablewski)
     *
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    kodachrome(multiply) {
        const matrix = [
            1.1285582396593525, -0.3967382283601348, -0.03992559172921793, 0, 63.72958762196502,
            -0.16404339962244616, 1.0835251566291304, -0.05498805115633132, 0, 24.732407896706203,
            -0.16786010706155763, -0.5603416277695248, 1.6014850761964943, 0, 35.62982807460946,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Brown delicious browni filter (thanks Dominic Szablewski)
     *
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    browni(multiply) {
        const matrix = [
            0.5997023498159715, 0.34553243048391263, -0.2708298674538042, 0, 47.43192855600873,
            -0.037703249837783157, 0.8609577587992641, 0.15059552388459913, 0, -36.96841498319127,
            0.24113635128153335, -0.07441037908422492, 0.44972182064877153, 0, -7.562075277591283,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Vintage filter (thanks Dominic Szablewski)
     *
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    vintage(multiply) {
        const matrix = [
            0.6279345635605994, 0.3202183420819367, -0.03965408211312453, 0, 9.651285835294123,
            0.02578397704808868, 0.6441188644374771, 0.03259127616149294, 0, 7.462829176470591,
            0.0466055556782719, -0.0851232987247891, 0.5241648018700465, 0, 5.159190588235296,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * We don't know exactly what it does, kind of gradient map, but funny to play with!
     *
     * @param {number} desaturation - Tone values.
     * @param {number} toned - Tone values.
     * @param {number} light_color - Tone values, example: `0xFFE580`
     * @param {number} dark_color - Tone values, example: `0xFFE580`
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    color_tone(desaturation, toned, light_color, dark_color, multiply) {
        desaturation = desaturation || 0.2;
        toned = toned || 0.15;
        light_color = light_color || 0xFFE580;
        dark_color = dark_color || 0x338000;

        const l_r = ((light_color >> 16) & 0xFF) / 255;
        const l_g = ((light_color >> 8) & 0xFF) / 255;
        const l_b = (light_color & 0xFF) / 255;

        const d_r = ((dark_color >> 16) & 0xFF) / 255;
        const d_g = ((dark_color >> 8) & 0xFF) / 255;
        const d_b = (dark_color & 0xFF) / 255;

        const matrix = [
            0.3, 0.59, 0.11, 0, 0,
            l_r, l_g, l_b, desaturation, 0,
            d_r, d_g, d_b, toned, 0,
            l_r - d_r, l_g - d_g, l_b - d_b, 0, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Night effect
     *
     * @param {number} intensity - The intensity of the night effect.
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    night(intensity, multiply) {
        intensity = intensity || 0.1;
        const matrix = [
            intensity * (-2.0), -intensity, 0, 0, 0,
            -intensity, 0, intensity, 0, 0,
            0, intensity, intensity * 2.0, 0, 0,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Predator effect
     *
     * Erase the current matrix by setting a new indepent one
     *
     * @param {number} amount - how much the predator feels his future victim
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    predator(amount, multiply) {
        const matrix = [
            // row 1
            11.224130630493164 * amount,
            -4.794486999511719 * amount,
            -2.8746118545532227 * amount,
            0 * amount,
            0.40342438220977783 * amount,
            // row 2
            -3.6330697536468506 * amount,
            9.193157196044922 * amount,
            -2.951810836791992 * amount,
            0 * amount,
            -1.316135048866272 * amount,
            // row 3
            -3.2184197902679443 * amount,
            -4.2375030517578125 * amount,
            7.476448059082031 * amount,
            0 * amount,
            0.8044459223747253 * amount,
            // row 4
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * LSD effect
     *
     * @param {boolean} multiply - if true, current matrix and matrix are multiplied.
     */
    lsd(multiply) {
        const matrix = [
            2, -0.4, 0.5, 0, 0,
            -0.5, 2, -0.4, 0, 0,
            -0.4, -0.5, 3, 0, 0,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, multiply);
    }

    /**
     * Erase the current matrix by setting the default one
     */
    reset() {
        const matrix = [
            1, 0, 0, 0, 0,
            0, 1, 0, 0, 0,
            0, 0, 1, 0, 0,
            0, 0, 0, 1, 0,
        ];

        this._load_matrix(matrix, false);
    }

    /**
     * The matrix of the color matrix filter
     *
     * @type {number[]}
     */
    get matrix() {
        return this.uniforms.m;
    }
    set matrix(value) {
        this.uniforms.m = value;
    }

    /**
     * The opacity value to use when mixing the original and resultant colors.
     *
     * When the value is 0, the original color is used without modification.
     * When the value is 1, the result color is used.
     * When in the range (0, 1) the color is interpolated between the original and result by this amount.
     *
     * @type {number}
     * @default 1
     */
    get alpha() {
        return this.uniforms.u_alpha;
    }
    set alpha(value) {
        this.uniforms.u_alpha = value;
    }
}

// Americanized alias
ColorMatrix.prototype.grayscale = ColorMatrix.prototype.greyscale;
