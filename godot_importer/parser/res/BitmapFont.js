const {
    int,
    url,
} = require('../type_converters');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'BitmapFont',
        path: url(data.attr.path),
    };
};
