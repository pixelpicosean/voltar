const {
    int,
    url,
} = require('../type_converters');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'PackedScene',
        path: url(data.attr.path),
    };
};
