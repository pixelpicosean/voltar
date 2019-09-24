const path = require('path');

const {
    int,
    url,
} = require('../../parser/type_converters');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'Texture',
        path: url(data.attr.path),
    };
};

module.exports.is_tres = () => false;
module.exports.get_resource_path = (res) => {
    /** @type {string} */
    const url = res.attr.path;

    // "res://" = 6, "image/" = 6
    const without_prefix = url.substring(6 + 6);
    const without_ext = without_prefix.substring(0, without_prefix.indexOf(path.extname(without_prefix)));

    if (without_prefix.startsWith('standalone')) {
        const final_url = without_prefix.replace(/^standalone\//, 'media/');
        return final_url;
    }

    return without_ext.substring(without_ext.indexOf('/') + 1);
}
