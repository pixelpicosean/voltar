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
    c = 1;

    s0 = 0;

    s1 = 0;

    s2 = 0;

    /**
     * @param seeds - An array of values to use as the seed, or a generator state (from {#state}).
     */
    constructor(seeds: Array<any> | string = []) {
        if (typeof (seeds) === 'string') {
            this.state(seeds);
        } else {
            this.sow(seeds);
        }
    }

    /**
     * Private random helper.
     *
     * @return {number} Random number
     */
    rnd(): number {
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
     * @param {any[]} seeds - The array of seeds: the `toString()` of each value is used.
     */
    sow(seeds: any[]) {
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
     * @private
     * @param {any} data  Data to create hash from
     * @return {number} hashed value.
     */
    hash(data: any): number {
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
     * @return {number} A random real number between 0 and 1.
     */
    frac(): number {
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
     * @param {string} [state] - Generator state to be set.
     * @return {string} The current state of the generator.
   */
    state(state: string): string {
        if (typeof state === 'string' && state.match(/^!rnd/)) {
            const states = state.split(',');

            this.c = parseFloat(states[1]);
            this.s0 = parseFloat(states[2]);
            this.s1 = parseFloat(states[3]);
            this.s2 = parseFloat(states[4]);
        }

        return ['!rnd', this.c, this.s0, this.s1, this.s2].join(',');
    }
}
