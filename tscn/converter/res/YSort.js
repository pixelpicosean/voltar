const {
    boolean,
} = require('../../parser/type_converters');

const Node2D = require('./Node2D');

module.exports = (data) => {
    return Object.assign(Node2D(data), {
        type: 'YSort',
        sort_enabled: boolean(data.prop.sort_enabled),
    });
};

module.exports.is_tres = () => true;
