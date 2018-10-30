const {
    int,
    real,
    boolean,
    Vector2,
} = require('../parse_utils');

const Control = require('./Control');

module.exports = (data) => {
    const res = Object.assign({}, Control(data), {
        type: 'Container',
    });

    return res;
};
