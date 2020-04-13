const record = require('../../resource_record');

module.exports = (data) => {
    return {
        id: data.attr.id,
        type: 'DynamicFontData',
    };
};

module.exports.is_tres = false;

module.exports.get_resource_path = (res) => {
    /** @type {string} */
    let filename = res.attr.path.replace('res://font/', '');

    // add font file to the list for be processed later
    record.add('DynamicFont', filename);

    // use font file name as key
    filename = filename
        .replace('.ttf', '').replace('.TTF', '')
        .replace('.otf', '').replace('.OTF', '')

    record.add_to_resource_lookup_skip_list(filename);

    return filename;
}
