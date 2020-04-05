const _ = require('lodash');

const {
    GeneralArray,
    parse_as_primitive,
    get_function_params,
} = require('./type_converters');
const built_in_functions = require('./type_converters');

const {
    remove_last,
    remove_first_n_last,
} = require('./utils');

/**
 * @typedef TresAttr
 * @property {string} [type]
 * @property {string} [path]
 */

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
        if (rest_line.indexOf(']') >= 0 && rest_line.indexOf(']') === rest_line.lastIndexOf(']')) {
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
    // - data wrapped by a function call: Function(param1, param2, param3)
    else if (line.indexOf('(') >= 0 && line.indexOf(')') >= 0 && get_function_params(line).length > 0) {
        const trimmed_line = line.trim();
        const function_name = trimmed_line.substring(0, trimmed_line.indexOf('('));
        const converter = built_in_functions[function_name];
        if (converter) {
            const parent = (stack.length > 0) ? _.last(stack).value : db;
            parent[key] = converter(trimmed_line);
        } else {
            const parent = (stack.length > 0) ? _.last(stack).value : db;
            parent[key] = line;
        }
    }
    // let's just keep the others for now
    else {
        const parent = (stack.length > 0) ? _.last(stack).value : db;
        parent[key] = line;
    }
};

/**
 * @param {string} attr_str
 */
function parse_attr(attr_str) {
    /** @type {TresAttr} */
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
 * @param {string[]} block
 */
module.exports.parse_block = (block) => {
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
                // empty line?
                if (str_after_last_quotation.length === 0 || str_after_last_quotation === "\n") {
                    const pack = _.last(stack);
                    pack.value += line;
                }
                else if (str_after_last_quotation[str_after_last_quotation.length - 1] === '"') {
                    // now we found end of this multi-line string
                    const pack = stack.pop();
                    pack.value = pack.value + remove_last(line);
                    data.prop[pack.key] = pack.value;

                    // Pop out current token
                    tokens.pop();
                }
                // still content, let's push them all back
                else {
                    const pack = _.last(stack);
                    pack.value += line;
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
            case '[': {
                if (line.indexOf(']') >= 0) {
                    // close current array
                    tokens.pop();
                    const pack = stack.pop();
                    const parent = (stack.length > 0) ? _.last(stack).value : data.prop;
                    parent[pack.key] = pack.value;
                } else if (line.trimLeft().startsWith(',')) {
                    // this array is continue
                    const el_str = line.trimLeft().substr(1).trim();
                    push_tokens_in_a_line(data.prop, el_str, tokens, stack, _.last(stack).value.length);
                }
            } break;
        }
    }

    return data;
}
