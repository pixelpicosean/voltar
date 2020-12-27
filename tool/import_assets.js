const path = require('path');
const fs = require('fs');

const { convert_project_settings } = require('./convert_project_settings');
const { convert_scenes } = require('./convert_scenes');
const { convert_dynamic_fonts } = require('./convert_dynamic_fonts');
const { convert_bmfonts } = require('./convert_bmfonts');
const { convert_default_env } = require('./convert_default_env');
const { pack_standalone_images } = require('./pack_standalone_images');

const { compress } = require('./z/z');

const {
    get_json_packs,
    get_binary_packs,
    get_non_tres_resources,
    get_resource_check_ignores,
} = require('./registry');


/* config */
let compress_resources = true;


console.log(`[started]`)

// 1. project settings
console.log(`1. project settings`)
let project = convert_project_settings(path.normalize(path.join(__dirname, '../assets/project.godot')));

// 2. compile and pack scenes into `resources.json`
console.log(`2. import scenes`)
let resource_map = convert_scenes(path.normalize(path.join(__dirname, '../assets')));
let final_resources = {};
// - add all non-tres resources into the map
let non_tres = get_non_tres_resources();
for (let k in non_tres) {
    non_tres[k].forEach((res) => {
        final_resources[res.filename] = res;
    })
}
for (let k in resource_map) {
    final_resources[k] = resource_map[k];
}
if (compress_resources) {
    let res_str = JSON.stringify(final_resources, null, 2);
    let compressed = compress(res_str);
    fs.writeFileSync(path.normalize(path.join(__dirname, '../media/data.tres')), compressed);
} else {
    fs.writeFileSync(path.normalize(path.join(__dirname, '../media/data.json')), JSON.stringify(final_resources, null, 4));
}
// - save to assets for development
fs.writeFileSync(path.normalize(path.join(__dirname, '../src/gen/data_debug.json')), JSON.stringify(final_resources, null, 4));

// 3. process and copy assets (DynamicFont, ...) to media
console.log(`3. process assets`)
// - default environment
let env = convert_default_env(path.normalize(path.join(__dirname, '../assets/default_env.tres')));
// - bitmap font
convert_bmfonts();
// - dynamic font
convert_dynamic_fonts();
// - standalone images
let standalone_image_pack_info = pack_standalone_images();
// - json data
let json_files = get_json_packs()
    .map((pack, i) => {
        // skip empty data
        if (pack.length === 0) return undefined;

        let url = `media/pack${i}.tres`;
        let filepath = path.normalize(path.join(__dirname, `../${url}`));
        let compressed = compress(JSON.stringify(pack));
        fs.writeFileSync(filepath, compressed);
        return url;
    })
    .filter(e => !!e)
// - binary data
let binary_files = get_binary_packs()
    .map((pack, i) => {
        let url = `media/pack${i}.res`;
        let filepath = path.normalize(path.join(__dirname, `../${url}`));
        fs.writeFileSync(filepath, pack);
        return url;
    })


// collect meta data, and save project file
fs.writeFileSync(path.resolve(__dirname, '../src/gen/default_env.json'), JSON.stringify(env, null, 4));
let resource_check_ignores = get_resource_check_ignores();
fs.writeFileSync(path.resolve(__dirname, '../src/gen/meta.json'), JSON.stringify({
    resource_check_ignores,

    json_files,
    binary_files,

    standalone_images: standalone_image_pack_info,
}, null, 4));
fs.writeFileSync(path.resolve(__dirname, '../src/gen/project.json'), JSON.stringify(project, null, 4));

console.log('[finished]')
