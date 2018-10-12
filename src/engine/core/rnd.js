/**
 * An extremely useful repeatable random data generator.
 *
 * Based on RandomDataGenerator of Phaser engine, by Richard Davey <rich@photonstorm.com>
 *
 * The random number genererator is based on the Alea PRNG, but is modified.
 *  - https://github.com/coverslide/node-alea
 *  - https://github.com/nquinlan/better-random-numbers-for-javascript-mirror
 *  - http://baagoe.org/en/wiki/Better_random_numbers_for_javascript (original, perm. 404)
 */
export class RandomDataGenerator {
    /**
   * @constructor
   * @param {Array|String} [seeds=[]] - An array of values to use as the seed, or a generator state (from {#state}).
   */
    constructor(seeds = []) {
    /**
     * @type {number}
     * @private
     */
        this.c = 1;

        /**
     * @type {number}
     * @private
     */
        this.s0 = 0;

        /**
     * @type {number}
     * @private
     */
        this.s1 = 0;

        /**
     * @type {number}
     * @private
     */
        this.s2 = 0;

        if (typeof(seeds) === 'string') {
            this.state(seeds);
        }
        else {
            this.sow(seeds);
        }
    }

    /**
   * Private random helper.
   *
   * @method RandomDataGenerator#rnd
   * @private
   * @return {number} Random number
   */
    rnd() {
        let t = 2091639 * this.s0 + this.c * 2.3283064365386963e-10; // 2^-32

        this.c = t | 0;
        this.s0 = this.s1;
        this.s1 = this.s2;
        this.s2 = t - this.c;

        return this.s2;
    }

    /**
   * Reset the seed of the random data generator.
   *
   * _Note_: the seed array is only processed up to the first `undefined` (or `null`) value, should such be present.
   *
   * @method RandomDataGenerator#sow
   * @param {any[]} seeds - The array of seeds: the `toString()` of each value is used.
   */
    sow(seeds) {
    // Always reset to default seed
        this.s0 = this.hash(' ');
        this.s1 = this.hash(this.s0);
        this.s2 = this.hash(this.s1);
        this.c = 1;

        if (!seeds) {
            return;
        }

        // Apply any seeds
        let i, seed;
        for (i = 0; i < seeds.length && (seeds[i] != null); i++) {
            seed = seeds[i];

            this.s0 -= this.hash(seed);
            this.s0 += ~~(this.s0 < 0);
            this.s1 -= this.hash(seed);
            this.s1 += ~~(this.s1 < 0);
            this.s2 -= this.hash(seed);
            this.s2 += ~~(this.s2 < 0);
        }
    }

    /**
   * Internal method that creates a seed hash.
   *
   * @method RandomDataGenerator#hash
   * @private
   * @param {any} data  Data to create hash from
   * @return {number} hashed value.
   */
    hash(data) {
        let h, i, n;
        n = 0xefc8249d;
        data = data.toString();

        for (i = 0; i < data.length; i++) {
            n += data.charCodeAt(i);
            h = 0.02519603282416938 * n;
            n = h >>> 0;
            h -= n;
            h *= n;
            n = h >>> 0;
            h -= n;
            n += h * 0x100000000;// 2^32
        }

        return (n >>> 0) * 2.3283064365386963e-10;// 2^-32
    }

    /**
   * Returns a random real number between 0 and 1.
   *
   * @method RandomDataGenerator#frac
   * @return {number} A random real number between 0 and 1.
   */
    frac() {
        return this.rnd.apply(this) + (this.rnd.apply(this) * 0x200000 | 0) * 1.1102230246251565e-16;   // 2^-53
    }

    /**
   * Gets or Sets the state of the generator. This allows you to retain the values
   * that the generator is using between games, i.e. in a game save file.
   *
   * To seed this generator with a previously saved state you can pass it as the
   * `seed` value in your game config, or call this method directly after Phaser has booted.
   *
   * Call this method with no parameters to return the current state.
   *
   * If providing a state it should match the same format that this method
   * returns, which is a string with a header `!rnd` followed by the `c`,
   * `s0`, `s1` and `s2` values respectively, each comma-delimited.
   *
   * @method RandomDataGenerator#state
   * @param {string} [state] - Generator state to be set.
   * @return {string} The current state of the generator.
   */
    state(state) {
        if (typeof state === 'string' && state.match(/^!rnd/)) {
            state = state.split(',');

            this.c = parseFloat(state[1]);
            this.s0 = parseFloat(state[2]);
            this.s1 = parseFloat(state[3]);
            this.s2 = parseFloat(state[4]);
        }

        return ['!rnd', this.c, this.s0, this.s1, this.s2].join(',');
    }
}

let rnd = null;

export function randomize() {
    rnd = new RandomDataGenerator([(Date.now() * Math.random()).toString()]);
}

export function rand_range(min, max) {
    return rnd.frac() * (max - min) + min;
}

export function rand_range_i(min, max) {
    return Math.floor(rand_range(0, max - min + 1) + min);
}

export function randf() {
    return rnd.frac();
}

/**
 * Returns a random integer between 0 and 2^32.
 *
 * @method RandomDataGenerator#integer
 * @return {number} A random integer between 0 and 2^32.
 */
export function randi() {
    return rnd.rnd.apply(rnd) * 0x100000000;// 2^32
}

/**
 * Returns a valid RFC4122 version4 ID hex string from https://gist.github.com/1308368
 *
 * @method RandomDataGenerator#uuid
 * @return {string} A valid RFC4122 version4 ID hex string
 */
export function uuid() {
    let a = '', b = '';

    /* eslint no-empty:0*/
    for (b = a = ''; a++ < 36; b += ~a % 5 | a * 3 & 4 ? (a ^ 15 ? 8 ^ rnd.frac() * (a ^ 20 ? 16 : 4) : 4).toString(16) : '-') {}

    return b;
}

/**
 * Returns a random member of `array`.
 *
 * @method RandomDataGenerator#pick
 * @param {Array} ary - An Array to pick a random member of.
 * @return {any} A random member of the array.
 */
export function pick(ary) {
    return ary[rand_range_i(0, ary.length - 1)];
}

/**
 * Returns a random member of `array`, favoring the earlier entries.
 *
 * @method RandomDataGenerator#weightedPick
 * @param {Array} ary - An Array to pick a random member of.
 * @return {any} A random member of the array.
 */
export function weighted_pick(ary) {
    return ary[~~(Math.pow(rnd.frac(), 2) * (ary.length - 1) + 0.5)];
}

randomize();
