const fs = require('fs');
const path = require('path');

const { get_list } = require('./resource_record');

/**
 * @param {string} font_family
 * @param {string} filename
 * @param {string} format
 */
const font_css = (font_family, filename, format) =>
`@font-face {
    font-family: '${font_family}';
    src: url('media/${filename}') format(${format});
}\n`

module.exports.convert_dynamic_fonts = function convert_dynamic_fonts() {
    const dy_fonts = get_list('DynamicFont');
    if (dy_fonts && dy_fonts.length > 0) {
        // copy to media
        dy_fonts.forEach(({ filename }) => {
            fs.copyFileSync(path.normalize(path.join(__dirname, `../assets/font/${filename}`)), path.normalize(path.join(__dirname, `../media/${filename}`)));
        })
        // generate font list for webpack to load
        const content = dy_fonts
            .map(({ filename, family }) => {
                let ext = path.extname(filename).toLowerCase();
                let format = ext === '.ttf' ? 'truetype' : 'opentype';
                return font_css(family, filename, format);
            })
            .join('\n')
        fs.writeFileSync(path.normalize(path.join(__dirname, '../fonts.css')), content);
    }
}
