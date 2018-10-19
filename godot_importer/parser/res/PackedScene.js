const {
    int,
    url,
} = require('../parse_utils');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'PackedScene',
        path: url(data.attr.path),
    };
};
