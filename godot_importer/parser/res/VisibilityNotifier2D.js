const Node2D = require('./Node2D');

module.exports = (data) => {
    return Object.assign(Node2D(data), {
        type: 'VisibilityNotifier2D',
        rect: data.prop.rect,
    });
};
