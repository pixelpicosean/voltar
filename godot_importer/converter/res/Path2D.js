const Node2D = require('./Node2D');

module.exports = (data) => {
    return Object.assign(Node2D(data), {
        type: 'Path2D',
        curve: data.prop.curve,
    });
};

module.exports.is_tres = () => true;
