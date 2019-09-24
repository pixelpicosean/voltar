const path = require('path');
const fs = require('fs');

const { convert_project_settings } = require('./convert_project_settings');
const { convert_scenes } = require('./convert_scenes');

console.log(`[started]`)

// 1. project settings
console.log(`1. project settings`)
convert_project_settings(path.normalize(path.join(__dirname, '../assets/project.godot')));

// 2. scenes
console.log(`2. scenes`)
const resource_map = convert_scenes(path.normalize(path.join(__dirname, '../assets')));

fs.writeFileSync(path.normalize(path.join(__dirname, '../assets/resources.json')), JSON.stringify(resource_map, null, 4));
console.log(`3. resources`)

console.log('[finished]')
