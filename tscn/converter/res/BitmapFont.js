const path = require('path');

const {
    int,
    url,
} = require('../../parser/type_converters');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'BitmapFont',
        path: url(data.attr.path),
    };
};

module.exports.is_tres = false;
module.exports.get_resource_path = (res) => {
    /** @type {string} */
    const url = res.attr.path;
    return path.basename(url, '.fnt');
}

// TODO: add bitmap font to preload assets list in `resources.json`
