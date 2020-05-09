const fs = require('fs');

const { split_to_blocks } = require('./parser/split_to_blocks');
const { parse_block } = require('./parser/parse_block');
const Environment = require('./converter/res/Environment');


/**
 * @param {string} project_url
 */
module.exports.convert_default_env = (project_url) => {
    let data = fs.readFileSync(project_url, 'utf8');

    // Remove comments
    let lines = data.split('\n')
        .filter(line => line.length > 0 && line[0] !== ';');

    // Convert back into a big string
    data = lines.join('\n')

    const resource = split_to_blocks(data)
        .map(parse_block)
        .filter(b => b.key === "resource")[0]

    const environment = Environment(resource);
    fs.writeFileSync(project_url.replace(/\.tres/, '.json'), JSON.stringify(environment, null, 4));
};
