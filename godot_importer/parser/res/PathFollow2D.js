const {
    string,
    path,
    int,
    real,
    boolean,
    Vector2,
    Color,
} = require('../parse_utils');
const Node2D = require('./Node2D');

module.exports = (data) => {
    return Object.assign(Node2D(data), {
        type: 'PathFollow2D',
    });
};
