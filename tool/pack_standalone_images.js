const path = require('path')
const fs = require('fs');

const { add_json_resource } = require('./registry');
const { boolean } = require('./parser/type_converters');

/**
 * @param {string} dir
 * @param {RegExp} filter
 * @param {string[]} [r_output]
 */
function find_files(dir, filter, r_output = []) {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
        const file_path = path.join(dir, file);
        const file_stat = fs.lstatSync(file_path);

        if (file_stat.isDirectory()) {
            find_files(file_path, filter, r_output);
        } else if (filter.test(file_path)) {
            r_output.push(file_path);
        }
    });

    return r_output;
}

// File with these extensions in `assets/image/standalone` will be packed and save to `media`
const image_filter = /\.(png|tiff|jpg|jpeg)$/;

module.exports.pack_standalone_images = function () {
    // sync images from `image/standalone` to `media`
    const folder = path.resolve(__dirname, '../assets/image/standalone');

    let images = [];
    let image_pack = [];
    find_files(folder, image_filter).map((url) => {
        let key = url.replace(folder, '').replace('\\', '/');
        if (key.startsWith('/')) {
            key = key.substr(1);
        }
        key = `media/${key}`;

        let bitmap = fs.readFileSync(url);
        let flags = {
            FILTER: false,
            REPEAT: 0,
            MIPMAPS: false,
        };
        let import_data_url = `${url}.import`;
        if (fs.existsSync(import_data_url)) {
            let import_data = fs.readFileSync(import_data_url, "utf8").split("\n");
            for (let line of import_data) {
                let match = line.match(/flags\/(\w*)\s*=(true|false|0|1|2)/);
                if (match && match[1].toUpperCase() in flags) {
                    if (match[2] === "true" || match[2] === "false") {
                        flags[match[1].toUpperCase()] = boolean(match[2]);
                    } else {
                        flags[match[1].toUpperCase()] = parseInt(match[2], 10);
                    }
                }
            }
        }

        images.push({
            key,
            flags,
        });
        image_pack.push(
            Buffer.from(bitmap).toString('base64')
        );
    })

    let pack_id = add_json_resource(image_pack);

    return {
        pack_id,
        images,
    }
}
