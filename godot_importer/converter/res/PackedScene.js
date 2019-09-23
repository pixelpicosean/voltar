const {
    int,
    url,
} = require('../../parser/type_converters');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'PackedScene',
        path: url(data.attr.path),
    };
};

module.exports.is_tres = () => true;
