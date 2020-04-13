const fs = require('fs');
const path = require('path');

const ttf2woff = require('./font/ttf2woff');
const ttf2woff2 = require('./font/ttf2woff2');

const { get_list } = require('./resource_record');

/**
 * @param {string} fontname
 */
const font_css = (fontname) =>
`@font-face {
    font-family: '${fontname}';
    src: url('media/font/${fontname}.woff2') format('woff2'),
         url('media/font/${fontname}.woff') format('woff'),
         url('media/font/${fontname}.ttf') format('truetype');
}\n`

module.exports.convert_dynamic_fonts = function convert_dynamic_fonts() {
    const dy_fonts = get_list('DynamicFont');
    if (dy_fonts && dy_fonts.length > 0) {
        // make sure font folder exist
        const font_folder = path.normalize(path.join(__dirname, '../media/font'));
        if (!fs.existsSync(font_folder)) {
            fs.mkdirSync(font_folder);
        }

        const list = dy_fonts.map((filename) => {
            let fontname = filename.replace('.ttf', '').replace('.TTF', '')

            let original_url = path.normalize(path.join(__dirname, `../assets/font/${filename}`));
            let target_url = path.normalize(path.join(__dirname, `../media/font/${fontname}.ttf`));

            // copy ttf/otf to media folder
            fs.copyFileSync(original_url, target_url);

            // generate and save woff to media folder
            let ttf = new Uint8Array(fs.readFileSync(original_url));
            let woff = ttf2woff(ttf);
            let woff_target_url = path.normalize(path.join(__dirname, `../media/font/${fontname}.woff`));
            fs.writeFileSync(woff_target_url, woff);

            // generate and save woff2 to media folder
            ttf2woff2(ttf).then(woff2 => {
                let woff2_target_url = path.normalize(path.join(__dirname, `../media/font/${fontname}.woff2`));
                fs.writeFileSync(woff2_target_url, woff2);
            });

            return fontname
        })

        // generate font list for webpack to load
        const content = list
            .map(font_css)
            .join('\n')
        fs.writeFileSync(path.normalize(path.join(__dirname, '../fonts.css')), content);
    }
}
