const {
    Vector2,
    PoolRealArray,
} = require('../parse_utils');
const _ = require('lodash');

/**
 * @param {string} str
 */
const parse_curve_data = (str) => {
    const packs = str.split('Vector2')
        .filter(s => s.length > 0) // remove empty string

    const res = _.flatten(packs.map(pack => {
            const vec_and_rest = pack.split(')');
            const vec = `Vector2${vec_and_rest[0]})`;
            let numbers = vec_and_rest[1].trim();
            if (numbers[numbers.length - 1] === ',') {
                numbers = numbers.substr(0, numbers.length - 1);
            }
            numbers = `( ${numbers.substring(1, numbers.length).trim()} )`;

            return _.flatten([
                // @ts-ignore
                [Vector2(vec)],
                // @ts-ignore
                PoolRealArray(numbers),
            ]);
        })
    )

    return res;
};

module.exports = (data) => {
    return {
        id: data.attr.id,
        type: 'Curve',
        data: parse_curve_data(data.prop._data[0]),
    }
};
