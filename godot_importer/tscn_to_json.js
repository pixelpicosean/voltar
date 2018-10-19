const _ = require('lodash');
const fp = require('lodash/fp');
const fs = require('fs');
const path = require('path');
const walk = require('walk');
const {
    remove_first_n_last,
    trim_string,
} = require('./utils');
const {
    int,
    string,
    boolean,
    get_function_params,
    Color,
} = require('./parser/parse_utils');

const gd_scene = require('./parser/gd_scene');
const node = require('./parser/node');
const resource = require('./parser/resource');

function split_to_blocks(data) {
    const blocks = [];

    const lines = data.split('\n').filter(str => str.length > 0);
    let i = 0, line, block = [];
    for (i = 0; i < lines.length; i++) {
        line = lines[i];

        // Reach a block head
        if (line[0] === '[' && _.last(line) === ']') {
            // Save current block
            blocks.push(block);

            // Start a new block
            block = [line];
        } else {
            block.push(line);
        }
    }
    blocks.push(block);

    return blocks.filter(b => b.length > 0);
}
function parse_attr(attr_str) {
    const attr = {};

    let str = attr_str;
    let idx = str.indexOf('=');
    while (idx >= 0) {
        // Parse the key
        let key = str.substring(0, idx);

        // Parse the value
        // - value between quotation mark
        let first_letter_of_value = str[idx + 1];
        if (first_letter_of_value === '"') {
            let str_after_mark = str.substring(idx + 2);
            let value = str_after_mark.substring(0, str_after_mark.indexOf('"'));
            attr[key] = value;

            // Remove parsed attribute
            str = str.substring(idx + 2 + value.length + 2);
        }
        // - number value without quotation mark
        else if (_.isFinite(parseInt(first_letter_of_value))) {
            let str_after_mark = str.substring(idx + 1);
            let end_idx = str_after_mark.indexOf(' ');
            if (end_idx < 0) {
                end_idx = str_after_mark.length;
            }
            let value = str_after_mark.substring(0, end_idx);
            attr[key] = parseInt(value);

            // Remove parsed attribute
            str = str.substring(idx + 2 + value.length);
        }
        // - function value
        else {
            let function_name = str.substring(idx + 1);
            function_name = function_name.substring(0, function_name.indexOf('('));
            let params = str.substring(idx + 1 + function_name.length + 1, str.indexOf(')')).trim();
            attr[key] = `${function_name}( ${params} )`;

            // Remove parsed attribute
            str = str.substring(idx + 1 + attr[key].length);
        }

        // Find equal mark of the next attribute
        idx = str.indexOf('=');
    }

    return attr;
};
function parse_section(str) {
    if (str[0] !== '[' || _.last(str) !== ']') {
        throw `Expected '[' at the beginning and ']' at the end!`;
    }

    const content = remove_first_n_last(str);
    const key = content.split(' ')[0];
    const attr_str = content.substring(key.length).trim();

    return {
        key: key,
        attr: parse_attr(attr_str),
    };
};
function parse_block(block) {
    const data = Object.assign({
        prop: {}
    }, parse_section(block[0]));

    // Properties
    for (let i = 1; i < block.length; i++) {
        if (block[i].indexOf('=') >= 0) {
            // One line property is not end with '{'
            if (_.last(block[i]) !== '{') {
                let seg = block[i].split('=');
                data.prop[trim_string(seg[0]).replace(/"/g, '')] = trim_string(seg[1]);
            }
            // Multi-line property (object)
            else {
                let seg = block[i].split('=');

                // An array, so this line is end with "[ {"
                if (seg[1].indexOf('[') >= 0) {
                    let prop = data.prop[trim_string(seg[0]).replace(/"/g, '')] = [{}];
                    i += 1;

                    let square_balance = -1;
                    for (; i < block.length; i++) {
                        if (block[i].indexOf('[') >= 0) {
                            square_balance -= 1;
                        }
                        if (block[i].indexOf(']') >= 0) {
                            square_balance += 1;
                        }

                        // not open another multi-line [ ]
                        if (square_balance === -1) {
                            // Contains ":" means it is a single line property
                            if (block[i].indexOf(':') >= 0) {
                                let inner_seg = block[i].split(':');
                                _.last(inner_prop)[trim_string(inner_seg[0]).replace(/"/g, '')] = trim_string(inner_seg[1]);
                            }
                            // Current object is finished
                            else if (block[i] === '}, {') {
                                prop.push({});
                            }
                        } else if (square_balance === 0) {
                            break;
                        }
                    }
                }
                // An object, so this line is end with "{"
                else {
                    let prop = data.prop[trim_string(seg[0]).replace(/"/g, '')];
                    if (!prop) {
                        prop = data.prop[trim_string(seg[0]).replace(/"/g, '')] = {};
                    }
                    i += 1;

                    let obj_prop_arr = [];
                    let should_parse = false;
                    for (; i < block.length; i++) {
                        if (block[i] === '}') {
                            i -= 1;
                            should_parse = true;
                            break;
                        } else if (block[i] === '} ]') {
                            should_parse = false;
                            break;
                        }
                        // An array, so this line is end with "[ {"
                        else if (block[i].indexOf('[ {') >= 0) {
                            let seg = block[i].split(':');
                            let inner_prop = prop[trim_string(seg[0]).replace(/"/g, '')] = [{}];
                            i += 1;

                            let square_balance = -1;
                            for (; i < block.length; i++) {
                                if (block[i].indexOf('[') >= 0) {
                                    square_balance -= 1;
                                }
                                if (block[i].indexOf(']') >= 0) {
                                    square_balance += 1;
                                }

                                // not open another multi-line [ ]
                                if (square_balance === -1) {
                                    // Contains ":" means it is a single line property
                                    if (block[i].indexOf(':') >= 0) {
                                        let inner_seg = block[i].split(':');
                                        _.last(inner_prop)[trim_string(inner_seg[0]).replace(/"/g, '')] = trim_string(inner_seg[1]);
                                    }
                                    // Current object is finished
                                    else if (block[i] === '}, {') {
                                        inner_prop.push({});
                                    }
                                } else if (square_balance === 0) {
                                    break;
                                }

                                // TODO: support nested object literal
                            }
                        } else {
                            obj_prop_arr.push(block[i]);
                        }
                    }

                    if (should_parse) {
                        for (let line of obj_prop_arr) {
                            let inner_seg = line.split(':');
                            prop[trim_string(inner_seg[0]).replace(/"/g, '')] = trim_string(inner_seg[1]);
                        }
                    }
                }
            }
        }
    }

    return data;
}

function convert_block(block) {
    switch (block.key) {
        case 'gd_scene': {
            return gd_scene(block);
        };
        case 'ext_resource': {
            return Object.assign({
                key: 'ext_resource',
            }, resource(block));
        };
        case 'sub_resource': {
            return Object.assign({
                key: 'sub_resource',
            }, resource(block));
        };
        case 'node': {
            return node(block);
        };
        default: {
            throw `Block with key "${block.key}" is not supported!`;
        };
    }
}

function construct_scene(blocks) {
    // Fetch node block list
    const node_list = fp.flow(
        fp.filter(b => b.key === 'node'),
        fp.forEach(n => {
            n.__meta__ = {};
            n.children = [];
            delete n.key;
            delete n.index;
        })
    )(blocks);

    // Combine nodes into scene tree
    const root_node = fp.find(n => !n.parent)(node_list);
    root_node.__meta__.path = '';
    const node_db = {
        '.': root_node,
    };
    const child_node_list = fp.filter(b => !!b.parent)(node_list);
    for (let i = 0; i < child_node_list.length; i++) {
        let n = child_node_list[i];
        let parent = node_db[n.parent];

        // Let's work on this node later, since its parent node
        // does not exist now
        if (!parent) {
            child_node_list.push(n);
            continue;
        }

        // Add as child of parent node
        parent.children.push(n);

        // Calculate path of the node
        if (n.parent === '.') {
            n.__meta__.path = n.name;
        } else {
            n.__meta__.path = `${parent.__meta__.path}/${n.name}`;
        }

        // Insert into node db
        node_db[n.__meta__.path] = n;

        // Delete parent property which is no longer used
        delete n.parent;
    }

    // Remove metadata of nodes
    (function remove_meta(node) {
        delete node.__meta__;
        for (let c of node.children) {
            remove_meta(c);
        }
    })(root_node);

    // Add resources into root_node.__meta__
    const fetch_res = (type) => (fp.flow(
            fp.filter(b => b.key === `${type}_resource`),
            fp.reduce((hash, b) => {
                hash[b.id] = b;

                delete b.key;
                delete b.id;

                return hash;
            }, {})
        )(blocks)
    );

    root_node.__meta__ = {
        ext_resource: fetch_res('ext'),
        sub_resource: fetch_res('sub'),
    };

    return root_node;
}

function normalize_image_res_url(url) {
    // "res://" = 6, "/image/" = 6
    const without_prefix = url.substring(6 + 6);
    const without_ext = without_prefix.substring(0, without_prefix.indexOf(path.extname(without_prefix)));
    return without_ext.substring(without_ext.indexOf('/') + 1);
}
function normalize_res_url(url) {
    // "res://" = 6
    const without_prefix = url.substring(6);
    const without_ext = without_prefix.substring(0, without_prefix.indexOf(path.extname(without_prefix)));
    return without_ext.substring(without_ext.indexOf('/') + 1);
}

const resource_normalizers = {
    Texture: (res, meta) => normalize_image_res_url(res.path),
    DynamicFontData: (res, meta) => normalize_res_url(res.path),
    DynamicFont: (res, meta) => {
        const font = {
            size: res.size,
            family: undefined,
        };
        const font_data = meta.ext_resource[get_function_params(res.font_data)];
        font.family = resource_normalizers[font_data.type](font_data, meta);
        return font;
    },
    PackedScene: (res, meta) => normalize_res_url(res.path),
};

const post_resource_actions = {
    Text: (node, meta) => {
        if ('font' in node && _.isObject(node.font)) {
            node.style.fontSize = node.font.size;
            node.style.fontFamily = node.font.family;
            delete node.font;
        }
    },
    Scene: (node, meta) => {
        node.key = node.instance;
        delete node.instance;
    },
    AnimationPlayer: (node, meta) => {
        const anims = {};
        for (let a in node.anims) {
            anims[a] = meta.sub_resource[get_function_params(node.anims[a])];
            delete anims[a].type;
        }
        node.anims = anims;
    },
};

function normalize_resource(node, meta) {
    for (let k in node) {
        let value = node[k];
        if (_.isString(value)) {
            if (value.indexOf('ExtResource') >= 0) {
                let res = meta.ext_resource[get_function_params(value)];
                node[k] = resource_normalizers[res.type](res, meta);
            } else if (value.indexOf('SubResource') >= 0) {
                let res = meta.sub_resource[get_function_params(value)];
                node[k] = resource_normalizers[res.type](res, meta);
            }
        }
    }

    const post_action = post_resource_actions[node.type];
    if (post_action) {
        post_action(node, meta);
    }

    node.children.forEach(child => {
        normalize_resource(child, meta);
    });
}

function convert_scene(tscn_path) {
    console.log(`- parse "${tscn_path}"`);

    const data = fs.readFileSync(tscn_path, 'utf8');

    const scene = construct_scene(
        split_to_blocks(data)
            .map(parse_block)
            .map(convert_block)
    );
    normalize_resource(scene, scene.__meta__);

    // Remove `__meta__`
    delete scene.__meta__;

    return scene;
}

module.exports.convert_scenes = (scene_root_url) => {
    const generated_data = [];
    walk.walkSync(scene_root_url, {
        listeners: {
            file: function (root, fileStats, next) {
                if (path.extname(fileStats.name) === '.tscn') {
                    const url = `${root}/${fileStats.name}`;
                    const name = fileStats.name.substring(0, fileStats.name.length - 5);
                    const key = (() => {
                        const segs = root.split('/scene/');
                        segs.shift();
                        let path = '';
                        if (segs.length > 0) {
                            for (let s of segs) {
                                path += s;
                            }
                            path += `/${name}`;
                        } else {
                            path = name;
                        }
                        return path;
                    })();
                    generated_data.push({
                        url: url.replace(/\.tscn/, '.json'),
                        data: convert_scene(url),
                    })
                } else {
                    next();
                }
            },
        },
    });
    return generated_data;
}

module.exports.convert_project_settings = (project_url) => {
    let data = fs.readFileSync(project_url, 'utf8');

    // Remove comments
    let lines = data.split('\n')
        .filter(line => line.length > 0 && line[0] !== ';');

    // Remove version info
    let version = 0;
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.indexOf('config_version') >= 0) {
            version = int(line.replace('config_version=', ''));
            lines = lines.slice(i + 1);
            break;
        }
    }

    // Convert back into a big string
    data = lines.reduce((data, line) => data + line + '\n', '');

    /** @type {any} */
    const settings = split_to_blocks(data)
        .map(parse_block)
        .map(b => {
            delete b.attr;
            return b;
        })
        .reduce((settings, b) => {
            settings[b.key] = b.prop;
            return settings;
        }, {});

    // Filter and normalize settings
    const real_settings = {};
    if (settings.application) {
        let application = {};
        application.name = string(settings.application['config/name']);
        real_settings.application = application;
    }
    if (settings.display || settings.rendering) {
        let display = {};

        // size
        display.width = int(settings.display['window/size/width']) || 640;
        display.height = int(settings.display['window/size/height']) || 480;

        // clear color
        display.background_color = color2hex(Color(settings.rendering['environment/default_clear_color']));

        // stretch
        let stretch_mode = string(settings.display['window/stretch/mode']);
        if (stretch_mode) {
            display.stretch_mode = stretch_mode;
        }
        let stretch_aspect = string(settings.display['window/stretch/aspect']);
        if (stretch_aspect) {
            display.stretch_aspect = stretch_aspect;
        }

        // pixel snap
        let pixel_snap = boolean(settings.rendering['quality/2d/use_pixel_snap']);
        if (pixel_snap !== undefined) {
            display.pixel_snap = pixel_snap;
        }

        // filter
        let use_nearest = boolean(settings.rendering['quality/filters/use_nearest_mipmap_filter']);
        if (use_nearest !== undefined) {
            display.scale_mode = use_nearest ? 'nearest' : 'linear';
        }

        real_settings.display = display;
    }

    fs.writeFileSync(project_url.replace(/\.godot/, '.json'), JSON.stringify(real_settings, null, 4));
};

/**
 * Converts a color {r, g, b, a} to a hex number
 *
 * @param {{r: number, g: number, b: number, a: number}} color
 * @return {number} The hex color number
 */
function color2hex({ r, g, b }) {
    return (((r * 255) << 16) + ((g * 255) << 8) + (b * 255 | 0));
}
