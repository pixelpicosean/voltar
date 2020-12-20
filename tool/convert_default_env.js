const fs = require('fs');

const { split_to_blocks } = require('./parser/split_to_blocks');
const { parse_block } = require('./parser/parse_block');
const { get_function_params } = require('./parser/type_converters');
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

    const blocks = split_to_blocks(data)
        .map(parse_block)

    // TODO: support external sky resource
    const exts = blocks.filter(b => b.key === "ext_resource")
        .map(b => require(`./converter/res/${b.attr.type}`)(b))
    const subs = blocks.filter(b => b.key === "sub_resource")
        .map(b => require(`./converter/res/${b.attr.type}`)(b))

    for (let sub of subs) {
        for (let k in sub) {
            let res = sub[k];
            if (typeof res === 'string') {
                if (res.startsWith('ExtResource(')) {
                    let id = parseInt(get_function_params(res)[0], 10);
                    for (let e of exts) {
                        if (e.id === id) {
                            if (e.type === "Texture") {
                                const standalone_prefix = 'res://image/standalone/';
                                if (e.path.contains(standalone_prefix)) {
                                    /* standalone image copied to media folder */
                                    sub[k] = e.path.replace(standalone_prefix, 'media/');
                                } else {
                                    /* image packed into texture atlas */
                                    sub[k] = e.path.replace('res://image/sprite/', '');
                                }
                            } else {
                                sub[k] = e;
                            }
                        }
                    }
                }
            }
        }
    }

    const resource = blocks.filter(b => b.key === "resource")[0]
    for (let k in resource.prop) {
        let res = resource.prop[k];
        if (typeof res === 'string') {
            if (res.startsWith('SubResource(')) {
                let id = parseInt(get_function_params(res)[0], 10);
                for (let s of subs) {
                    if (s.id === id) {
                        resource.prop[k] = s;
                    }
                }
            } else if (res.startsWith('ExtResource(')) {
                let id = parseInt(get_function_params(res)[0], 10);
                for (let s of exts) {
                    if (s.id === id) {
                        resource.prop[k] = s;
                    }
                }
            }
        }
    }

    const environment = Environment(resource);
    fs.writeFileSync(project_url.replace(/\.tres/, '.json'), JSON.stringify(environment, null, 4));
};
