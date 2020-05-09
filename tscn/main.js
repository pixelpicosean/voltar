const path = require('path');
const fs = require('fs');

const { convert_project_settings } = require('./convert_project_settings');
const { convert_scenes } = require('./convert_scenes');
const { convert_dynamic_fonts } = require('./convert_dynamic_fonts');
const { convert_default_env } = require('./convert_default_env');
const record = require('./resource_record');

console.log(`[started]`)

// 1. project settings
console.log(`1. project settings`)
convert_project_settings(path.normalize(path.join(__dirname, '../assets/project.godot')));

// 2. compile and pack scenes into `resources.json`
console.log(`2. import scenes`)
let resource_map = convert_scenes(path.normalize(path.join(__dirname, '../assets')));
let final_resources = {};
// - add all non-tres resources into the map
let non_tres = record.get_non_tres_resources();
for (let k in non_tres) {
    non_tres[k].forEach((res) => {
        final_resources[res.filename] = res;
    })
}
for (let k in resource_map) {
    final_resources[k] = resource_map[k];
}
fs.writeFileSync(path.normalize(path.join(__dirname, '../assets/resources.json')), JSON.stringify(final_resources, null, 4));

// 3. process and copy assets (DynamicFont, ...) to media
console.log(`3. process assets`)
convert_default_env(path.normalize(path.join(__dirname, '../assets/default_env.tres')));
convert_dynamic_fonts()
const resource_lookup_skip_list = record.get_resource_lookup_skip_list();
fs.writeFileSync(path.normalize(path.join(__dirname, '../assets/meta.json')), JSON.stringify({
    resource_lookup_skip_list,
}, null, 4));

console.log('[finished]')
