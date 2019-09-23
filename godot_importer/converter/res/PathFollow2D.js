const Node2D = require('./Node2D');

module.exports = (data) => {
    return Object.assign(Node2D(data), {
        type: 'PathFollow2D',
    });
};

module.exports.is_tres = () => true;
