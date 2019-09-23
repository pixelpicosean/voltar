const {
    int,
    url,
} = require('../type_converters');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'Texture',
        path: url(data.attr.path),
    };
};
