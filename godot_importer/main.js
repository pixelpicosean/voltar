const fs = require('fs');
const path = require('path');

const {
    convert_scenes,
    convert_project_settings,
} = require('./tscn_to_json');

convert_project_settings(__dirname + '/../assets/project.godot');

const generated_files = convert_scenes(__dirname + '/../assets/scene');
generated_files.forEach(({ url, data }) => {
    const json = JSON.stringify(data, null, 4);
    fs.writeFileSync(url, json);
    console.log(`- export "${path.basename(url)}"`)
})

console.log('finished!')
