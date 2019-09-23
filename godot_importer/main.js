const path = require('path');
// const fs = require('fs');
// const _ = require('lodash');

const { convert_project_settings } = require('./convert_project_settings');
const { convert_scenes } = require('./convert_scenes');

console.log(`[started]`)

// 1. project settings
console.log(`1. project settings`)
convert_project_settings(path.normalize(path.join(__dirname, '../assets/project.godot')));


// 2. scenes
console.log(`2. scenes`)
const generated_files = convert_scenes(path.normalize(path.join(__dirname, '../assets')));
/*
generated_files.forEach(({ url, data }) => {
    // Remove flag header used internally
    const ext = data.__meta__.ext;
    for (let k in ext) {
        if (_.isString(ext[k]) && _.startsWith(ext[k], '@url#')) {
            ext[k] = ext[k].replace(/^@url#/, '');
        }
    }
    // Save the JSON besides original tscn file,
    // so we can check them out instead of big "resources.json".
    // fs.writeFileSync(url, JSON.stringify(data, null, 4));
    console.log(`  - export "${path.basename(url)}"`)
})

// 3. resources
const resource_map = get_resource_map();
for (let { filename, data } of generated_files) {
    resource_map[filename] = {
        '@type#': 'PackedScene',
        data: data,
    };
}
fs.writeFileSync(path.normalize(path.join(__dirname, '../assets/resources.json')), JSON.stringify(resource_map, null, 4));
console.log(`3. resources`)

console.log('[finished]')

*/
