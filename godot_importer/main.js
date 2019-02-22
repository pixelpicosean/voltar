const fs = require('fs');
const path = require('path');

const {
    convert_scenes,
    convert_project_settings,
    get_resource_map,
} = require('./tscn_to_json');

console.log(`[started]`)

// 1. project settings
console.log(`1. project settings`)
convert_project_settings(__dirname + '/../assets/project.godot');

// 2. scenes
console.log(`2. scenes`)
const generated_files = convert_scenes(__dirname + '/../assets/scene');
generated_files.forEach(({ url, data }) => {
    fs.writeFileSync(url, JSON.stringify(data, null, 4));
    console.log(`  - export "${path.basename(url)}"`)
})

// 3. resources
const resource_map = get_resource_map();
for (let { filename, data } of generated_files) {
    resource_map[filename] = data;
}
fs.writeFileSync(__dirname + '/../assets/resources.json', JSON.stringify(resource_map, null, 4));
console.log(`3. resources`)

console.log('[finished]')
