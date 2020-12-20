const path = require('path')
const walk = require('walk');
const fs = require('fs-extra');

/**
 * @param {string[]} data
 * @param {string} tag
 */
function find_tag_line_idx(data, tag) {
    for (let i = 0; i < data.length; i++) {
        const line = data[i].trimLeft()
        if (line.startsWith(`${tag} `)) {
            return i
        }
    }
    return -1
}

/**
 * @param {string[]} data
 * @param {string} tag
 */
function find_tag_lines_idx(data, tag) {
    /** @type {number[]} */
    const result = []
    for (let i = 0; i < data.length; i++) {
        const line = data[i].trimLeft()
        if (line.startsWith(`${tag} `)) {
            result.push(i)
        }
    }
    return result
}

/**
 * @param {string[]} data
 * @param {string} tag
 */
function get_line_with_tag(data, tag) {
    const idx = find_tag_line_idx(data, tag)
    if (idx >= 0) {
        return data[idx]
    } else {
        return undefined
    }
}

/**
 * @param {string[]} data
 * @param {string} tag
 */
function get_lines_with_tag(data, tag) {
    return find_tag_lines_idx(data, tag)
        .map((idx) => (idx >= 0 ? data[idx] : undefined))
        .filter((line) => (line !== undefined))
}

/**
 * @param {string} line
 * @param {boolean} [close]
 */
function line_to_xml(line, close = true) {
    if (!line) {
        return `<error>line is empty</error>`
    }

    let segments = line.split(' ')
    segments = (() => {
        /** @type {string[]} */
        let new_segments = []

        let continues_seg = ''
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i]
            const count = (seg.match(/"/g) || []).length
            if (count % 2) {
                if (continues_seg.length === 0) {
                    /* begin */
                    continues_seg = seg
                } else if ((continues_seg.match(/"/g).length + count) % 2) {
                    /* not end yet */
                    continues_seg = continues_seg + ' ' + seg
                } else {
                    /* end */
                    continues_seg = continues_seg + ' ' + seg
                    new_segments.push(continues_seg)

                    continues_seg = ''
                }
            } else {
                new_segments.push(seg)
            }
        }

        return new_segments
    })()
    const tag = segments[0]
    const attr_pairs = segments
        .filter((_, i) => (i > 0))
        .filter((str) => (str.indexOf('=') > 0))
        .map((str) => (str.split('=')))
        .map((pair) => [pair[0].trim(), pair[1].trim()])

    const attr_str = attr_pairs
        .map((pair) => {
            if (pair[1].startsWith('"') || pair[1].startsWith("'")) {
                return `${pair[0]}=${pair[1]}`
            } else {
                return `${pair[0]}='${pair[1]}'`
            }
        })
        .join(' ')

    return close ? `<${tag} ${attr_str} />` : `<${tag} ${attr_str}>`
}

const space_per_indent = 4
/**
 * @param {string} str
 * @param {number} indent
 */
function force_indent(str, indent) {
    return `${' '.repeat(indent * space_per_indent)}${str.trimLeft()}`
}

/**
 * @param {string} bmfont
 */
function convert(bmfont) {
    const data = bmfont.split('\n')
    return `<?xml version='1.0'?>
    <font>
        ${line_to_xml(get_line_with_tag(data, 'info'))}
        ${line_to_xml(get_line_with_tag(data, 'common'))}
        <pages>
            ${line_to_xml(get_line_with_tag(data, 'page'))}
        </pages>
        ${line_to_xml(get_line_with_tag(data, 'chars'), false)}
${get_lines_with_tag(data, 'char').map((line) => force_indent(line_to_xml(line, true), 3)).join('\n')}
        </chars>
    </font>
`
}

module.exports.convert_bmfonts = function() {
    // convert and sync BMFont from `bitmapfont` folder to `media`
    const bmfont_folder = path.resolve(__dirname, '../assets/bitmapfont');
    const target_folder = path.resolve(__dirname, '../media')

    const convert_and_save_bmfont_to_media = (/** @type {string} */font_url) => {
        // convert and save fnt file
        const data = fs.readFileSync(font_url, 'utf8')
        const converted_xml = convert(data)
        fs.writeFileSync(path.resolve(target_folder, path.basename(font_url)), converted_xml, 'utf8')

        // copy png file
        const png_url = font_url.replace(/\.fnt$/i, '.png')
        if (fs.existsSync(png_url)) {
            fs.copyFileSync(png_url, path.resolve(target_folder, path.basename(font_url).replace(/\.fnt$/i, '.png')));
        }
    }
    if (fs.existsSync(bmfont_folder)) {
        walk.walkSync(bmfont_folder, {
            listeners: {
                file: function (root, { name }, next) {
                    if (path.extname(name) !== '.fnt') {
                        return next();
                    }
                    convert_and_save_bmfont_to_media(path.resolve(root, name));
                },
            },
        });
    }
}
