const _ = require('lodash');
const fp = require('lodash/fp');
const fs = require('fs');
const path = require('path');
const walk = require('walk');
const {
    remove_last,
    remove_first_n_last,
    parse_as_primitive,
} = require('./utils');
const {
    int,
    real,
    string,
    boolean,
    get_function_params,
    Color,
    Vector2,
    Rect2,
    GeneralArray,
} = require('./parser/parse_utils');

const gd_scene = require('./parser/gd_scene');
const node = require('./parser/node');
const resource = require('./parser/resource');

/**
 * @param {string} data
 * @returns {string[][]}
 */
function split_to_blocks(data) {
    const blocks = [];

    const lines = data.split('\n').filter(str => str.length > 0);
    let i = 0, line, block = [];
    for (i = 0; i < lines.length; i++) {
        line = lines[i];

        // Reach a block head
        if (line[0] === '[') {
            // Is it a one-line head?
            if (_.last(line) === ']') {
                // Save current block
                blocks.push(block);

                // Start a new block
                block = [line];
            }
            // So it's a multi-line head
            else {
                // Loop through lines to find all the closing brackets
                let close_brackets_to_be_found = 0;
                let content = '';
                inner: for (; i < lines.length; i++) {
                    let inner_line = lines[i];

                    // Concate the lines since head is only allowed
                    // to be one-line
                    content = `${content} ${inner_line}`;

                    // How many [ do we have in this line?
                    close_brackets_to_be_found += (inner_line.match(/\[/g) || []).length;

                    // How many ] do we have in this line?
                    close_brackets_to_be_found -= (inner_line.match(/\]/g) || []).length;

                    // Are we done?
                    if (close_brackets_to_be_found === 0) {
                        // Save current block
                        blocks.push(block);

                        // Start a new block
                        block = [content.trim()];
                        break inner;
                    }
                }
            }
        } else {
            block.push(line);
        }
    }
    blocks.push(block);

    return blocks.filter(b => b.length > 0);
}
/**
 * @param {string} attr_str
 * @returns {any}
 */
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
        // - array
        else if (first_letter_of_value === '[') {
            let str_after_mark = str.substring(idx + 1);
            let close_brackets_to_be_found = 1;
            let attr_length = 1;
            inner: for (let i = 1; i < str_after_mark.length; i++) {
                attr_length += 1;

                close_brackets_to_be_found += ((str_after_mark[i] === '[') ? 1 : ((str_after_mark[i] === ']') ? -1 : 0));

                if (close_brackets_to_be_found === 0) {
                    attr[key] = GeneralArray(str_after_mark);
                    break inner;
                }
            }

            // Remove parsed attribute
            str = str.substring(idx + attr_length);
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
/**
 * @param {string} str
 * @returns {{key: string, attr: any}}
 */
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
/**
 * @param {any} db
 * @param {string} line
 * @param {string[]} tokens
 * @param {{key: string|number, value: any}[]} stack
 * @param {string|number} [key]
 */
function push_tokens_in_a_line(db, line, tokens, stack, key = undefined) {
    const p_idx = line.indexOf('{');
    const b_idx = line.indexOf('[');

    // array or dictionary
    // - "{"
    if (p_idx >= 0 && b_idx < 0) {
        tokens.push('{')
        stack.push({
            key: key,
            value: {},
        })
        // all the properties of a dictionary are start with a "key"
        // so we can stop here
    }
    // - "["
    else if (b_idx >= 0 && p_idx < 0) {
        tokens.push('[')
        stack.push({
            key: key,
            value: [],
        })
        const rest_line = line.substring(b_idx + 1);

        // the array is ended in this line
        if (rest_line.indexOf(']') === rest_line.lastIndexOf(']')) {
            const items_str = rest_line.substring(0, rest_line.indexOf(']')).trim();
            const items = GeneralArray(items_str);

            // end it
            tokens.pop();
            const pack = stack.pop();
            pack.value = items;

            const parent = (stack.length > 0) ? _.last(stack).value : db;
            parent[key] = items;
        }
        // multi-line array
        else {
            push_tokens_in_a_line(db, rest_line, tokens, stack, 0);
        }
    }
    // - "{ [" or "[ {"
    else if (p_idx >= 0 && b_idx >= 0) {
        if (p_idx < b_idx) {
            tokens.push('{')
            stack.push({
                key: key,
                value: {},
            })
        } else {
            tokens.push('[')
            stack.push({
                key: key,
                value: [],
            })
            const rest_line = line.substring(b_idx + 1);
            push_tokens_in_a_line(db, rest_line, tokens, stack, 0);
        }
    }

    // let's just keep the others for now
    else {
        const parent = (stack.length > 0) ? _.last(stack).value : db;
        parent[key] = line;
    }
};
/**
 * @param {string[]} block
 * @returns {any}
 */
function parse_block(block) {
    const data = Object.assign({
        prop: {}
    }, parse_section(block[0]));

    const tokens = [];
    /** @type {{key: string|number, value: any}[]} */
    const stack = [];
    for (let i = 1; i < block.length; i++) {
        const line = block[i];

        let token = tokens.length ? tokens[tokens.length - 1] : '';
        switch (token) {
            // search for new token
            case '': {
                const equal_idx = line.indexOf('=');
                if (equal_idx > 0) {
                    const key = line.substr(0, equal_idx).trim();
                    const value_res = parse_as_primitive(line.substring(equal_idx + 1));
                    if (value_res.is_valid) {
                        data.prop[key] = value_res.value;
                    } else {
                        // multi-line string
                        if (value_res.type === 'multi_line_string') {
                            tokens.push('"');
                            stack.push({
                                key: key,
                                value: (value_res.value + '\n'),
                            });
                        }
                        // array or dictionary
                        else {
                            push_tokens_in_a_line(data.prop, value_res.value, tokens, stack, key);
                        }
                    }
                }
            } break;
            case '"': {
                let str_after_last_quotation = line;

                // see whether there're some "content" quotations
                let idx = line.lastIndexOf('\\"');
                if (idx > 0) {
                    str_after_last_quotation = line.substring(idx + 1);
                }
                if (str_after_last_quotation[str_after_last_quotation.length - 1] === '"') {
                    // now we found end of this multi-line string
                    const pack = stack.pop();
                    pack.value = pack.value + remove_last(line);
                    data.prop[pack.key] = pack.value;

                    // Pop out current token
                    tokens.pop();
                }
            } break;
            case '{': {
                const idx_of_first_quotation = line.indexOf('"');

                // "key": value
                if (idx_of_first_quotation >= 0) {
                    const idx_of_second_quotation = line.substring(line.indexOf('"') + 1).indexOf('"') + (line.indexOf('"') + 1);
                    const key = line.substring(idx_of_first_quotation + 1, idx_of_second_quotation);
                    const idx_of_colon = line.indexOf(':');
                    const value_res = parse_as_primitive(line.substring(idx_of_colon + 1));
                    if (value_res.is_valid) {
                        const pack = _.last(stack);
                        pack.value[key] = value_res.value;
                    }
                    // array or dictionary
                    else {
                        push_tokens_in_a_line(data.prop, value_res.value, tokens, stack, key);
                    }
                }
                // "}" or "}, {" or "} ]"
                else {
                    const idx_of_close_p = line.indexOf('}');
                    if (idx_of_close_p >= 0) {
                        // close current dictionary
                        tokens.pop();
                        const pack = stack.pop();
                        const parent = (stack.length > 0) ? _.last(stack).value : data.prop;
                        parent[pack.key] = pack.value;

                        const rest_line = line.substring(idx_of_close_p + 1);

                        // a new dictionrary after current one
                        if (rest_line.indexOf(',') >= 0) {
                            tokens.push('{');
                            stack.push({
                                key: Number(pack.key) + 1,
                                value: {},
                            })
                        }
                        // the dictionary just end here
                        else if (rest_line.indexOf(']') >= 0) {
                            const pack = stack.pop();
                            const parent = (stack.length > 0) ? _.last(stack).value : data.prop;
                            parent[pack.key] = pack.value;
                        }
                    } else {
                        // shouldn't be here!!!
                    }
                }
            } break;
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
        case 'gd_resource': {
            return block;
        };
        case 'resource': {
            return block;
        };
        default: {
            throw `Block with key "${block.key}" is not supported!`;
        };
    }
}

/**
 *
 * @param {any[]} blocks
 */
function construct_scene(blocks) {
    // Fetch node block list
    const node_list = fp.flow(
        // @ts-ignore
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
    // @ts-ignore
    const child_node_list = fp.filter(b => !!b.parent)(node_list);
    for (let i = 0; i < child_node_list.length; i++) {
        let n = child_node_list[i];
        // @ts-ignore
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
        // @ts-ignore
        if (n.parent === '.') {
            // @ts-ignore
            n.__meta__.path = n.name;
        } else {
            // @ts-ignore
            n.__meta__.path = `${parent.__meta__.path}/${n.name}`;
        }

        // Insert into node db
        // @ts-ignore
        node_db[n.__meta__.path] = n;

        // Delete parent property which is no longer used
        // @ts-ignore
        delete n.parent;
    }

    // Remove metadata of nodes
    (function remove_meta(node) {
        delete node.__meta__;
        for (let c of node.children) {
            remove_meta(c);
        }
        if (node._is_proxy_) {
            delete node.children;
        }
    })(root_node);

    // Add resources into root_node.__meta__
    const fetch_res = (type) => fp.flow(
        fp.filter(b => b.key === `${type}_resource`),
        fp.reduce((hash, b) => {
            // @ts-ignore
            hash[b.id] = b;

            // @ts-ignore
            delete b.key;
            // @ts-ignore
            delete b.id;

            return hash;
        }, {})
    )(blocks);

    root_node.__meta__ = {
        ext_resource: fetch_res('ext'),
        sub_resource: fetch_res('sub'),
    };

    return root_node;
}

/**
 * @param {string} url
 * @returns {string}
 */
function normalize_image_res_url(url) {
    // "res://" = 6, "/image/" = 6
    const without_prefix = url.substring(6 + 6);
    const without_ext = without_prefix.substring(0, without_prefix.indexOf(path.extname(without_prefix)));
    return without_ext.substring(without_ext.indexOf('/') + 1);
}
/**
 * @param {string} url
 * @returns {string}
 */
function normalize_res_url(url) {
    // "res://" = 6
    const without_prefix = url.substring(6);
    const without_ext = without_prefix.substring(0, without_prefix.indexOf(path.extname(without_prefix)));
    return without_ext.substring(without_ext.indexOf('/') + 1);
}
/**
 * @param {string} url
 * @returns {string}
 */
function normalize_res_real_url(url) {
    const without_prefix = url.replace('res://', __dirname + '/../assets/');
    return without_prefix;
}

const resource_normalizers = {
    Texture: (res) => normalize_image_res_url(res.path),
    SpriteFrames: (res, meta) => {
        const frames = {};
        res.animations.forEach(anim => {
            const a = frames[anim.name] = {
                frames: anim.frames.map(f => {
                    const tex = meta.ext_resource[get_function_params(f)[0]];
                    return resource_normalizers.Texture(tex);
                }),
                name: anim.name,
                loop: anim.loop,
                speed: anim.speed,
            };
        })
        return frames;
    },
    DynamicFontData: (res) => normalize_res_url(res.path),
    DynamicFont: (res, meta) => {
        const font = {
            size: res.size,
            family: undefined,
        };
        const font_data = meta.ext_resource[get_function_params(res.font_data)[0]];
        font.family = resource_normalizers[font_data.type](font_data, meta);
        return font;
    },
    BitmapFont: (res, meta) => path.basename(res.path, '.fnt'),
    RectangleShape2D: (res, meta, parent) => {
        res.position = parent.position;
        delete parent.position;
        return res;
    },
    CircleShape2D: (res, meta, parent) => {
        res.position = parent.position;
        delete parent.position;
        return res;
    },
    TileSet: (res, meta) => {
        const text_data = fs.readFileSync(normalize_res_real_url(res.path), 'utf8');

        const sections = split_to_blocks(text_data)
            .map(parse_block)
            .map(convert_block)

        let result = undefined;
        const res_table = {};
        const head = sections.shift();
        for (let i = 0; i < head.attr.load_steps; i++) {
            const sec = sections[i];
            if (sec.key === 'ext_resource') {
                res_table[sec.id] = resource_normalizers[sec.type](sec);
            } else if (sec.key === 'sub_resource') {
                throw 'sub_resource in "tres" is not supported yet';
            } else if (sec.key === 'resource') {
                const prop = sec.prop;
                // TODO: make this a general function
                const keys = Object.keys(prop);
                // Array?
                if (_.startsWith(keys[0], '0/')) {
                    const array = [];
                    for (const k in prop) {
                        const key_list = k.split('/');
                        const index = parseInt(key_list[0]);
                        if (array.length < index + 1) {
                            array.length = index + 1;
                            array[index] = {};
                        }

                        let value = prop[k];
                        if (_.startsWith(value, 'ExtResource')) {
                            value = res_table[get_function_params(value)];
                        } else if (_.startsWith(value, 'Vector2')) {
                            value = Vector2(value);
                        } else if (_.startsWith(value, 'Color')) {
                            value = Color(value);
                        } else if (_.startsWith(value, 'Rect2')) {
                            value = Rect2(value);
                        }

                        array[index][key_list[1]] = value;
                    }
                    result = array;
                }
                // Dictionary?
                else {
                    result = prop;
                }
            }
        }

        if (result.length > 0) {
            const texture = result[0].texture;
            const tile_mode = result[0].tile_mode;
            result = result.map(tile => {
                const data = {};
                if (tile.modulate) {
                    if (
                        tile.modulate.r !== 1
                        ||
                        tile.modulate.g !== 1
                        ||
                        tile.modulate.b !== 1
                        ||
                        tile.modulate.a !== 1
                    ) {
                        data.modulate = tile.modulate;
                    }
                }
                if (tile.navigation_offset) {
                    if (
                        tile.navigation_offset.x !== 0
                        ||
                        tile.navigation_offset.y !== 0
                    ) {
                        data.navigation_offset = tile.navigation_offset;
                    }
                }
                if (tile.occluder_offset) {
                    if (
                        tile.occluder_offset.x !== 0
                        ||
                        tile.occluder_offset.y !== 0
                    ) {
                        data.occluder_offset = tile.occluder_offset;
                    }
                }
                data.region = tile.region;
                if (tile.tex_offset) {
                    if (
                        tile.tex_offset.x !== 0
                        ||
                        tile.tex_offset.y !== 0
                    ) {
                        data.tex_offset = tile.tex_offset;
                    }
                }
                if (tile.shapes.length > 0) {
                    data.shapes = tile.shapes;
                }
                return data;
            });
        }

        return result;
    },
    PackedScene: (res) => normalize_res_url(res.path),
    Curve2D: (res) => ({ points: res.points }),
    Curve: (res) => res,
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
        if (node.instance !== undefined) {
            node.filename = node.instance;
        }
        delete node.instance;
    },
    AnimationPlayer: (node, meta) => {
        if (node._anim_post_processed) {
            return;
        }

        const anims = {};
        for (let a in node.anims) {
            anims[a] = meta.sub_resource[get_function_params(node.anims[a])[0]];

            // try to normalize animation values
            for (let track of anims[a].tracks) {
                let values = track.keys.values;
                for (let i = 0; i < values.length; i++) {
                    let value = values[i];

                    if (_.isString(value)) {
                        if (value.indexOf('ExtResource') >= 0) {
                            let res = meta.ext_resource[get_function_params(value)[0]];
                            values[i] = resource_normalizers[res.type](res, meta, node);
                        } else if (value.indexOf('SubResource') >= 0) {
                            let res = meta.sub_resource[get_function_params(value)[0]];
                            values[i] = resource_normalizers[res.type](res, meta, node);
                        } else {
                            // const arr = GeneralArray(value);
                            // if (Array.isArray(arr)) {
                            //     values[i] = arr;
                            // }
                        }
                    }
                }
            }

            delete anims[a].type;
        }
        node.anims = anims;
        node._anim_post_processed = true;
    },
};

function normalize_resource(node, meta) {
    // try to normalize all implicit properties
    for (let k in node) {
        let value = node[k];

        if (value === undefined) {
            continue;
        }

        if (_.isString(value)) {
            if (value.indexOf('ExtResource') >= 0) {
                let res = meta.ext_resource[get_function_params(value)[0]];
                node[k] = resource_normalizers[res.type](res, meta, node);
            } else if (value.indexOf('SubResource') >= 0) {
                let res = meta.sub_resource[get_function_params(value)[0]];
                node[k] = resource_normalizers[res.type](res, meta, node);
            }
        }
    }

    const post_action = post_resource_actions[node.type];
    if (post_action) {
        post_action(node, meta);
    }

    if (node.children) {
        node.children.forEach(child => {
            normalize_resource(child, meta);
        });
    }
}

function post_process_nodes(node) {
    const parser = require(`./parser/res/${node.type}`);
    if (parser.post_process) {
        parser.post_process(node);
    }

    if (node.children) {
        node.children.forEach(post_process_nodes);
    }
}

function clean_up_unused_data(node) {
    // Remove __meta__
    node.__meta__ = undefined;

    // Remove properties start with "_"
    for (let k in node) {
        if (k[0] === '_') {
            delete node[k];
        }
    }

    // Cleanup children data
    for (let c of node.children) {
        clean_up_unused_data(c);
    }
}

function convert_scene(tscn_path) {
    console.log(`- import "${path.basename(tscn_path)}"`);

    const data = fs.readFileSync(tscn_path, 'utf8');

    const scene = construct_scene(
        split_to_blocks(data)
            .map(parse_block)
            .map(convert_block)
    );

    // Normalize resources
    normalize_resource(scene, scene.__meta__);

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
                        filename: key,
                        data: convert_scene(url),
                    })
                } else {
                    next();
                }
            },
        },
    });

    // Parse scene instance override properties
    const scene_db = {};
    for (let s of generated_data) {
        scene_db[s.filename] = s;
    }

    for (let s of generated_data) {
        const scene = s.data;

        // Parse scene instance data
        const parse = (node) => {
            if (node.type === 'Scene') {
                const template = scene_db[node.filename].data;

                const res = require(`./parser/res/${template.type}`)(
                    {
                        attr: {},
                        prop: node.prop,
                    }
                );

                // `prop` is no longer useful
                delete node.prop;

                // Type should not be changed
                delete res.type;

                // Add instance data to the Scene node
                for (let k in res) {
                    if (res[k] !== undefined) {
                        node[k] = res[k];
                    }
                }
            }

            for (let c of node.children) {
                parse(c);
            }
        }
        parse(s.data);

        // Normalize resources
        normalize_resource(scene, scene.__meta__);

        // Post process
        post_process_nodes(scene);

        // Data cleanup
        clean_up_unused_data(scene);
    }

    return generated_data;
}

/**
 * @param {string} project_url
 */
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
    while (lines[0][0] !== '[') {
        lines.shift();
    }

    // Convert back into a big string
    data = lines.join('\n')

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

    // Save the version
    settings.version = version;

    // Filter and normalize settings
    const real_settings = {};
    if (settings.application) {
        let application = {};
        application.name = string(settings.application['config/name']);
        real_settings.application = application;
    }
    if (settings.display || settings.rendering) {
        settings.display = settings.display || {};
        settings.rendering = settings.rendering || {};

        let display = {};

        // size
        display.width = int(settings.display['window/size/width']) || 640;
        display.height = int(settings.display['window/size/height']) || 480;

        // clear color
        let clear_color = Color(settings.rendering['environment/default_clear_color']);
        if (clear_color !== undefined) {
            display.background_color = color2hex(clear_color);
        }

        // stretch
        let stretch_mode = string(settings.display['window/stretch/mode']);
        if (stretch_mode !== undefined) {
            display.stretch_mode = stretch_mode;
        }
        let stretch_aspect = string(settings.display['window/stretch/aspect']);
        if (stretch_aspect !== undefined) {
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
    if (settings.physics) {
        let physics = {};

        let sleep_threshold_linear = real(settings.physics['2d/sleep_threshold_linear']);
        if (sleep_threshold_linear !== undefined) {
            physics.sleep_threshold_linear = sleep_threshold_linear;
        }

        let sleep_threshold_angular = real(settings.physics['2d/sleep_threshold_angular']);
        if (sleep_threshold_angular !== undefined) {
            physics.sleep_threshold_angular = sleep_threshold_angular;
        }

        let time_before_sleep = real(settings.physics['2d/time_before_sleep']);
        if (time_before_sleep !== undefined) {
            physics.time_before_sleep = time_before_sleep;
        }

        let default_gravity = real(settings.physics['2d/default_gravity']) || 98;
        let default_gravity_vector = Vector2(settings.physics['2d/default_gravity_vector']);
        if (default_gravity_vector !== undefined) {
            physics.gravity = {
                x: default_gravity_vector.x * default_gravity,
                y: default_gravity_vector.y * default_gravity,
            }
        } else {
            physics.gravity = {
                x: 0,
                y: default_gravity,
            }
        }

        let default_linear_damp = real(settings.physics['2d/default_linear_damp']);
        if (default_linear_damp !== undefined) {
            physics.default_linear_damp = default_linear_damp;
        }

        let default_angular_damp = real(settings.physics['2d/default_angular_damp']);
        if (default_angular_damp !== undefined) {
            physics.default_angular_damp = default_angular_damp;
        }

        real_settings.physics = physics;
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
