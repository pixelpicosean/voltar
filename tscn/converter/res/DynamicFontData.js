const path = require('path');
const opentype = require('opentype.js');

const record = require('../../resource_record');

module.exports = (data) => {
    return {
        id: data.attr.id,
        type: 'DynamicFontData',
    };
};

module.exports.is_tres = false;

/** @type {{ [filename: string]: opentype.Font } */
let table = {};

module.exports.get_resource_path = (res) => {
    /** @type {string} */
    let filename = res.attr.path.replace('res://font/', '');

    let data = table[filename];
    if (!data) {
        data = opentype.loadSync(path.normalize(path.join(__dirname, `../../../assets/font/${filename}`)));
    }
    let family = data.tables.name.fontFamily.en;

    // add to copy list
    record.add('DynamicFont', {
        filename,
        family,
    });

    // we don't want engine to check this one since
    // dynamic font are not resource objects
    record.add_to_resource_lookup_skip_list(family);

    return family;
}
