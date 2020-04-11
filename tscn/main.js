const path = require('path');
const fs = require('fs');

const { convert_project_settings } = require('./convert_project_settings');
const { convert_scenes } = require('./convert_scenes');
const { convert_dynamic_fonts } = require('./convert_dynamic_fonts');

console.log(`[started]`)

// 1. project settings
console.log(`1. project settings`)
convert_project_settings(path.normalize(path.join(__dirname, '../assets/project.godot')));

// 2. compile and pack scenes into `resources.json`
console.log(`2. import scenes`)
const resource_map = convert_scenes(path.normalize(path.join(__dirname, '../assets')));
fs.writeFileSync(path.normalize(path.join(__dirname, '../assets/resources.json')), JSON.stringify(resource_map, null, 4));

// 3. process and copy assets (DynamicFont, ...) to media
console.log(`3. process assets`)
convert_dynamic_fonts()

console.log('[finished]')
