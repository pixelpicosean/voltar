const path = require('path')
const walk = require('walk')
const fs = require('fs-extra')

// File with these extensions in `assets/image/standalone` will be copied to media
// during building process
const standalone_copy_exts = [
    '.png',
    '.tiff',
    '.jpg',
    '.jpeg',
]

module.exports.copy_standalone_images = function () {
    // sync images from `image/standalone` to `media`
    const source_folder = path.resolve(__dirname, '../assets/image/standalone')
    const target_folder = path.resolve(__dirname, '../media')

    const copy_standalone_images_to_media = (image_url) => {
        fs.copyFileSync(image_url, path.resolve(target_folder, path.basename(image_url)));
    }
    if (fs.existsSync(source_folder)) {
        walk.walkSync(source_folder, {
            listeners: {
                file: function (root, { name }, next) {
                    if (standalone_copy_exts.indexOf(path.extname(name)) < 0) {
                        return next();
                    }
                    copy_standalone_images_to_media(path.resolve(root, name));
                },
            },
        });
    }
}
