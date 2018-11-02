const {
    int,
    url,
} = require('../parse_utils');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'BitmapFont',
        path: url(data.attr.path),
    };
};
