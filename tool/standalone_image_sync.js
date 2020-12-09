const path = require('path')
const watch = require('node-watch')
const fs = require('fs-extra')

// File with these extensions in `assets/image/standalone` will be copied to media
// during building process
const standalone_copy_exts = [
    '.png',
    '.tiff',
    '.jpg',
    '.jpeg',
]

module.exports = function (game_dir) {
    // sync images from `image/standalone` to `media`
    const source_folder = path.resolve(game_dir, 'assets/image/standalone')
    const target_folder = path.resolve(game_dir, 'media')

    const copy_standalone_images_to_media = (image_url) => {
        fs.copyFileSync(image_url, path.resolve(target_folder, path.basename(image_url)));
    }
    if (fs.existsSync(source_folder)) {
        watch(source_folder, { recursive: true }, (evt, name) => {
            if (standalone_copy_exts.indexOf(path.extname(name)) < 0) {
                return;
            }

            if (evt === 'update') {
                copy_standalone_images_to_media(name);
            } else if (evt === 'remove') {
                fs.removeSync(path.resolve(target_folder, path.basename(name)));
            }
        })
    }
}
