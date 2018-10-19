const fs = require('fs');
const {
    convert_scenes,
    convert_project_settings,
} = require('./tscn_to_json');

convert_project_settings('../assets/project.godot');

const generated_files = convert_scenes('../assets/scene');
generated_files.forEach(({ url, data }) => {
    const json = JSON.stringify(data, null, 4);
    fs.writeFileSync(url, json);
    console.log(`- gen "${url}"`)
})

console.log('finished!')
