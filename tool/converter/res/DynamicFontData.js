const path = require('path');
const opentype = require('opentype.js');

const {
    record_data_with_type,
    add_to_resource_check_ignores,
    add_non_tres_data,
} = require('../../registry');

module.exports.extra_process = (data) => {
    /** @type {string} */
    let filename = data.attr.path.replace('res://font/', '');

    let url = path.normalize(path.resolve(__dirname, `../../../assets/font/${filename}`));
    let fontdata = opentype.loadSync(url);
    let hhea = fontdata.tables.hhea;
    let ascender = hhea.ascender;
    let descender = hhea.descender;

    // add font file to the list for be processed later
    record_data_with_type('DynamicFont', filename);

    // use font file name as key
    filename = filename
        .replace('.ttf', '').replace('.TTF', '')
        .replace('.otf', '').replace('.OTF', '')

    add_to_resource_check_ignores(filename);

    const dynamic_font_data = {
        type: 'DynamicFontData',
        filename: data.attr.path,
        family: filename,
        ascender: ascender,
        descender: descender,
    }

    add_non_tres_data(data.attr.type, dynamic_font_data);

    return {
        // nodes can use the filename to retrive font info
        extra: dynamic_font_data.filename,
    }
};

module.exports.is_tres = false;
