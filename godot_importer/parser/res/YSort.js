const Node2D = require('./Node2D');

module.exports = (data) => {
    return Object.assign(Node2D(data), {
        type: 'YSort',
        sort_enabled: data.prop.sort_enabled,
    });
};
