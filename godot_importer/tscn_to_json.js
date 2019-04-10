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

const built_in_functions = {
    Vector2: Vector2,
    Color: Color,
    PoolVector2Array: (/** @type {string} */str) => {
        const params = str.split('(')[1].split(')')[0];
        return params.split(',').map(value => value.trim()).map(parseFloat)
    },
    PoolVector3Array: (/** @type {string} */str) => {
        const params = str.split('(')[1].split(')')[0];
        return params.split(',').map(value => value.trim()).map(parseFloat)
    },
    Rect2: (/** @type {string} */str) => {
        const params_str = str.split('(')[1].split(')')[0];
        const params = params_str.split(',').map(value => value.trim()).map(parseFloat)
        return {
            x: params[0],
            y: params[1],
            width: params[2],
            height: params[3],
        };
    },
};

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
                    const array_str = str_after_mark.substring(1, i).trim();
                    attr[key] = GeneralArray(array_str);
                    break inner;
                }
            }

            // Remove parsed attribute
            str = str.substring(idx + attr_length + 1).trim();
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
                        else {
                            // maybe a data packed into a function?
                            let function_name_found = false;
                            if (value_res.value.indexOf('(') > 0 && value_res.value[value_res.value.length - 1] === ')') {
                                const func = value_res.value.split('(')[0];
                                if (built_in_functions[func]) {
                                    function_name_found = true;
                                    value_res.value = built_in_functions[func](value_res.value);
                                    data.prop[key] = value_res.value;
                                }
                            }

                            // array or dictionary
                            if (!function_name_found) {
                                push_tokens_in_a_line(data.prop, value_res.value, tokens, stack, key);
                            }
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
                            // close current array
                            tokens.pop();
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

// Fetch node block list
const make_node_block_list = (blocks) => (blocks
    .filter(b => b.key === 'node' || b.key === 'inherited_node')
    .map(n => {
        const node = _.cloneDeep(n);

        node.__self_meta__ = {};
        node.children = [];

        if (node.key === 'inherited_node') {
            node.type = '';
        }

        delete node.key;
        delete node.index;

        return node;
    })
);

const fetch_res = (type, blocks) => fp.flow(
    fp.filter(b => b.key === `${type}_resource`),
    fp.reduce((hash, b) => {
        // @ts-ignore
        hash[b.id] = b;

        return hash;
    }, {})
)(blocks);

/**
 *
 * @param {any[]} blocks
 * @param {Object<string, any>} scene_db
 */
function construct_scene(blocks, scene_db) {
    // Fetch node block list
    const node_list = make_node_block_list(blocks);

    // Combine nodes into scene tree
    const root_node = fp.find(n => !n.parent)(node_list);
    root_node.__self_meta__.path = '';
    const node_db = {
        '.': root_node,
    };

    if (root_node.type === 'Scene') {
        const ext = fetch_res('ext', blocks);
        const parent_scene = scene_db[ext[get_function_params(root_node.instance)[0]].path].data;
        const inherited_nodes = parent_scene.__node_db__;
        for (const k in inherited_nodes) {
            if (!node_db[k]) {
                const paths = k.split('/');
                let parent = root_node;
                let i = 0;
                for (const p of paths) {
                    let current_path = '';
                    for (let j = 0; j < i; j++) current_path += paths[j];

                    let found = false;
                    loop_children: for (const c of parent.children) {
                        if (c.name === p) {
                            parent = c;
                            found = true;
                            break loop_children;
                        }
                    }

                    if (!found) {
                        const node_path = current_path.length > 0 ? `${current_path}/${p}` : p;
                        const c = {
                            name: p,
                            type: inherited_nodes[node_path].type,
                            children: [],
                            __self_meta__: {
                                path: node_path,
                            },
                        }
                        parent.children.push(c);
                        parent = c;
                    }

                    i++;
                }
                node_db[k] = parent;
            }
        }
    }

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

        // Calculate path of the node
        // @ts-ignore
        if (n.parent === '.') {
            // @ts-ignore
            n.__self_meta__.path = n.name;
        } else {
            // @ts-ignore
            n.__self_meta__.path = `${parent.__self_meta__.path}/${n.name}`;
        }

        // Add type info if this scene is inherited from another scene
        if (!n.type && root_node.type === 'Scene') {
            const ext = fetch_res('ext', blocks);
            const parent_scene = scene_db[ext[get_function_params(root_node.instance)[0]].path].data;
            const inherited_nodes = parent_scene.__node_db__;
            n.type = inherited_nodes[n.__self_meta__.path].type;

            // Instead of add a new node, we should override it
            const parser = require(`./parser/res/${n.type}`);
            n.attr = n._attr;
            const parsed_node = parser(n);
            const nn = Object.assign(node_db[n.__self_meta__.path], parsed_node);

            // Delete properties which is no longer used
            delete nn.parent;
            delete nn.index;

            continue;
        }

        // Add as child of parent node
        parent.children.push(n);

        // Insert into node db
        // @ts-ignore
        node_db[n.__self_meta__.path] = n;

        // Delete properties which is no longer used
        delete n.parent;
        delete n.index;
    }

    // Remove metadata of nodes
    (function remove_meta(node) {
        for (let c of node.children) {
            remove_meta(c);
        }
        if (node._is_proxy_) {
            delete node.children;
        }
    })(root_node);

    // Add resources into root_node.__self_meta__
    root_node.__meta__ = {
        ext_resource: fetch_res('ext', blocks),
        sub_resource: fetch_res('sub', blocks),
    };

    // Cleanup node_db data
    const node_db_fixed = {};
    for (const k in node_db) {
        node_db_fixed[k] = {
            name: node_db[k].name,
            type: node_db[k].type,
            __self_meta__: node_db[k].__self_meta__,
            children: [],
        }
    }
    root_node.__node_db__ = node_db_fixed;

    return root_node;
}

/**
 * @param {string} url
 * @returns {string}
 */
function normalize_image_res_url(url) {
    // "res://" = 6, "image/" = 6
    const without_prefix = url.substring(6 + 6);
    const without_ext = without_prefix.substring(0, without_prefix.indexOf(path.extname(without_prefix)));

    if (_.startsWith(without_prefix, 'standalone')) {
        const final_url = without_prefix.replace(/^standalone\//, 'media/');
        return final_url;
    }

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
    return url.replace('res://', path.normalize(path.join(__dirname, '/../assets/')));
}

const resource_map = {};

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
    RectangleShape2D: (res, meta, parent) => res,
    CircleShape2D: (res, meta, parent) => res,
    ConvexPolygonShape2D: (res) => res,
    TileSet: (res, meta) => {
        const real_url = normalize_res_real_url(res.path);
        const text_data = fs.readFileSync(real_url, 'utf8');

        const sections = split_to_blocks(text_data)
            .map(parse_block)
            .map(convert_block)

        let result = undefined;
        let tile_map = undefined;
        const ext_res_table = {};
        const sub_res_table = {};
        const head = sections.shift();
        for (let i = 0; i < head.attr.load_steps; i++) {
            const sec = sections[i];
            if (sec.key === 'ext_resource') {
                ext_res_table[sec.id] = resource_normalizers[sec.type](sec);
            } else if (sec.key === 'sub_resource') {
                sub_res_table[sec.id] = resource_normalizers[sec.type](sec);
                // throw 'sub_resource in "tres" is not supported yet';
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
                        if (typeof (value) === 'number') {
                            // do nothing
                        } else if (typeof (value) === 'boolean') {
                            // do nothing
                        } else if (Array.isArray(value)) {
                            if (value.length > 0) {
                                // Shape list
                                if (k.indexOf('shapes') >= 0) {
                                    for (const s of value) {
                                        s.autotile_coord = Vector2(s.autotile_coord);
                                        s.shape = sub_res_table[get_function_params(s.shape)];
                                        s.shape_transform = get_function_params(s.shape_transform).map(parseFloat);

                                        // FIXME: should we delete the key and id here?
                                        s.shape.key = undefined;
                                        s.shape.id = undefined;

                                        // FIXME: should we remove the properties if they are default value?
                                        if (s.autotile_coord.x === 0 && s.autotile_coord.y === 0) {
                                            s.autotile_coord = undefined;
                                        }

                                        if (s.one_way === false) {
                                            s.one_way = undefined;
                                        }

                                        if (s.one_way_margin === 1) {
                                            s.one_way_margin = undefined;
                                        }

                                        /** @type {number[]} */
                                        const t = s.shape_transform;
                                        if (
                                            t[0] === 1
                                            &&
                                            t[1] === 0
                                            &&
                                            t[2] === 0
                                            &&
                                            t[3] === 1
                                            &&
                                            t[4] === 0
                                            &&
                                            t[5] === 0
                                        ) {
                                            s.shape_transform = undefined;
                                        }
                                    }
                                }
                            }
                        } else if (_.startsWith(value, 'ExtResource')) {
                            value = ext_res_table[get_function_params(value)];
                        } else if (_.startsWith(value, 'SubResource')) {
                            value = sub_res_table[get_function_params(value)];
                        } else if (_.startsWith(value, 'Vector2')) {
                            value = Vector2(value);
                        } else if (_.startsWith(value, 'Color')) {
                            value = Color(value);
                        } else if (_.startsWith(value, 'Rect2')) {
                            value = Rect2(value);
                        }

                        array[index][key_list[1]] = value;
                    }
                    tile_map = array;
                }
                // Dictionary?
                else {
                    tile_map = prop;
                }
            }
        }

        if (tile_map.length > 0) {
            const texture = tile_map[0].texture;
            const tile_mode = tile_map[0].tile_mode;
            tile_map = tile_map.map(tile => {
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

            result = {
                texture: texture,
                tile_mode: tile_mode,
                tile_map: tile_map,
            };
        }

        if (result) {
            const json_path = real_url.replace(path.extname(real_url), '.json');

            // Save resource as JSON besides of the original tscn file
            fs.writeFileSync(json_path, JSON.stringify(result, null, 4));

            // Add this resource to loading queue
            resource_map[res.path] = {
                '@type#': 'TileSet',
                data: result,
            };
        }

        return `@url#${res.path}`;
    },
    PackedScene: (res) => res.path,
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
            node._attr.instance = node.instance;
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

function normalize_resource(node, meta, __final_meta__) {
    // try to normalize all implicit properties
    for (let k in node) {
        let value = node[k];

        if (value === undefined) {
            continue;
        }

        if (k === 'script') {
            node.script = undefined;
            continue;
        }

        if (_.isString(value)) {
            if (value.indexOf('ExtResource') >= 0) {
                const key = get_function_params(value)[0];
                let res = meta.ext_resource[key];
                node[k] = `@ext#${key}`;
                __final_meta__.ext[key] = resource_normalizers[res.type](res, meta, node);
            } else if (value.indexOf('SubResource') >= 0) {
                const key = get_function_params(value)[0];
                let res = meta.sub_resource[key];
                node[k] = `@sub#${key}`;
                __final_meta__.sub[key] = resource_normalizers[res.type](res, meta, node);
            }
        }
    }

    const post_action = post_resource_actions[node.type];
    if (post_action) {
        post_action(node, meta);
    }

    if (node.children) {
        node.children.forEach(child => {
            normalize_resource(child, meta, __final_meta__);
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
    // Let's use the final meta as final meta
    node.__meta__ = node.__final_meta__;

    // Remove properties start with "_"
    for (let k in node) {
        if (_.startsWith(k, '_') && k !== '__meta__') {
            delete node[k];
        }
    }

    // Cleanup children data
    for (let c of node.children) {
        clean_up_unused_data(c);
    }
}

function convert_scene(data, scene_db) {
    const scene = construct_scene(data, scene_db);

    // Normalize resources
    scene.__final_meta__ = { ext: {}, sub: {} };
    normalize_resource(scene, scene.__meta__, scene.__final_meta__);

    return scene;
}

module.exports.convert_scenes = (/** @type {string} */scene_root_url_p) => {
    const scene_root_url = path.normalize(scene_root_url_p);

    const file_db = {};
    walk.walkSync(scene_root_url, {
        listeners: {
            file: function (root, file_stats, next) {
                if (path.extname(file_stats.name) === '.tscn') {
                    const url = path.resolve(root, file_stats.name);
                    const relative_to_root = path.relative(scene_root_url, root);
                    const filename = `res://${(path.join(relative_to_root, file_stats.name))}`;

                    console.log(`  - import "${path.basename(url)}"`);
                    file_db[filename] = {
                        url: url.replace(/\.tscn$/, '.json'),
                        relative_to_root: relative_to_root,
                        filename: filename,
                        data: fs.readFileSync(url, 'utf8'),
                    };
                } else {
                    next();
                }
            },
        },
    });

    // Construct dependencies map
    const dependence_map = {};
    for (let f in file_db) {
        const pack = file_db[f];

        // Parse blocks and override
        const parsed_data = split_to_blocks(pack.data)
            .map(parse_block)
            .map(convert_block)
        pack.data = parsed_data;

        // Find all the dependent scenes (as ext_resource)
        const ext = fetch_res('ext', parsed_data);
        for (let k in ext) {
            if (file_db.hasOwnProperty(ext[k].path)) {
                const dep_list = dependence_map[pack.filename] || [];
                dep_list.push(ext[k].path);
                dependence_map[pack.filename] = dep_list;
            }
        }
    }

    // Sort scenes based on dependency
    let scene_path_list = [];
    for (let f in file_db) {
        scene_path_list.push(f);
    }

    const dependence_amount_map = {};
    for (const k in dependence_map) {
        dependence_amount_map[k] = 0;
    }
    const get_dep_list = (name) => {
        if (!dependence_map[name]) {
            return [name];
        }
        return _.flatMap(dependence_map[name].map(get_dep_list));
    };
    const dep_full_list = _.flatMap(scene_path_list.map(get_dep_list));
    const scene_dep_frequent_map = dep_full_list.reduce((res, path) => {
        if (!res[path]) {
            res[path] = 0;
        }
        res[path] += 1;

        return res;
    }, {});

    let scene_dep_frequent_list = [];
    for (const k in scene_dep_frequent_map) {
        scene_dep_frequent_list.push({ k: k, v: scene_dep_frequent_map[k] });
    }
    scene_dep_frequent_list = _.sortBy(scene_dep_frequent_list, ['v'])
        .reverse()
        .map((freq) => (freq.k))

    for (const f of scene_path_list) {
        if (scene_dep_frequent_list.indexOf(f) < 0) {
            scene_dep_frequent_list.push(f);
        }
    }

    const ordered_scene_load_list = scene_dep_frequent_list.map(p => file_db[p]);
    const scene_db = {};
    const generated_data = [];

    for (const pack of ordered_scene_load_list) {
        const scene = convert_scene(pack.data, scene_db);
        const scene_pack = {
            filename: pack.filename,
            url: file_db[pack.filename].url,
            data: scene,
        };
        scene_db[pack.filename] = scene_pack;
        generated_data.push(scene_pack);
    }

    // Parse scene instance override properties
    for (let s of generated_data) {
        const scene = s.data;
        const meta = scene.__final_meta__;
        scene._is_root = true;

        // Parse scene instance data
        const parse = (node) => {
            if (node.type === 'Scene') {
                let filename = node.filename;

                // ext_resource?
                if (_.startsWith(node.filename, '@ext#')) {
                    filename = meta.ext[filename.substring(5)];
                }
                // sub_resource?
                else if (_.startsWith(node.filename, '@sub#')) {
                    filename = meta.sub[filename.substring(5)];
                }

                let template = scene_db[filename].data;
                let type = template.type;
                let res = null;

                // inherited scene?
                if (template._attr && template._attr.instance) {
                    const template_meta = template.__meta__;
                    const filename_idx = template._attr.instance.substring(5);
                    const filename = template_meta.ext_resource[filename_idx].path;
                    const parent_template = scene_db[filename].data;
                    type = parent_template.type;
                }

                res = require(`./parser/res/${type}`)(
                    {
                        attr: node._attr || {},
                        prop: node.prop,
                    }
                );

                // `prop` is no longer useful
                delete node.prop;

                // Type should not be changed
                delete res.type;

                // Add instance data to the Scene node
                for (let k in res) {
                    if (k === 'prop') {
                        for (let prop_k in res[k]) {
                            if (res[k][prop_k] !== undefined) {
                                node[prop_k] = res[k][prop_k];
                            }
                        }
                    }
                    if (res[k] !== undefined) {
                        node[k] = res[k];
                    }
                }

                delete node.prop;
                delete node.index;
            }

            // Check whether we have script exported properties
            for (let k in node._prop) {
                if (node._prop[k] !== undefined && !node.hasOwnProperty(k)) {
                    node[k] = node._prop[k];
                }
            }
            delete node._prop;

            for (let c of node.children) {
                parse(c);
            }
        }
        parse(scene);

        // Normalize resources
        normalize_resource(scene, scene.__meta__, scene.__final_meta__);

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
        if (settings.display['window/size/width'] !== undefined) {
            display.width = int(settings.display['window/size/width']) || 1024;
        }
        if (settings.display['window/size/height'] !== undefined) {
            display.height = int(settings.display['window/size/height']) || 600;
        }

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
    if (settings.layer_names) {
        const layer_values = {};
        for (const k in settings.layer_names) {
            if (k.indexOf('2d_physics/layer_') >= 0) {
                const num_str = k.replace('2d_physics/layer_', '');
                const num = parseInt(num_str);
                if (Number.isFinite(num)) {
                    layer_values[settings.layer_names[k]] = num;
                }
            }
        }

        real_settings.layer_map = {
            physics: layer_values,
        };
    }

    fs.writeFileSync(project_url.replace(/\.godot/, '.json'), JSON.stringify(real_settings, null, 4));
};

module.exports.get_resource_map = () => {
    return resource_map;
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
