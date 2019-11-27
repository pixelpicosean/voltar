const _ = require('lodash');

const { convert_block } = require('./convert_block');
const { normalize_resource_object } = require('./resource_normalizer');
const { get_function_params } = require('../parser/type_converters');

/**
 * @param {{ key: string, attr: any, prop: any }[]} blocks
 */
module.exports.convert_tres = (blocks) => {
    const sections = blocks
        .map(convert_block)
        .filter(a => !!a) // remove all striped sections

    const head = sections.shift();

    if (head.key === 'gd_resource') {
        // FIXME: do we have sub/ext resource inside a tres resource?
        const converter = require(`./res/${head.attr.type}`);
        return converter({
            attr: head.attr,
            prop: sections[0].prop,
        });
    } else if (head.key === 'gd_scene') {
        const ext = {};
        const sub = {};
        const nodes = [];

        for (let i = 0; i < sections.length; i++) {
            let sec = sections[i];
            if (sec.key === 'ext_resource') {
                if (sec.extra_process) {
                    ext[sec.attr.id] = sec;
                    continue;
                }

                const converter = require(`./res/${sec.attr.type}`);
                if (typeof (converter.get_resource_path) === 'function') {
                    ext[sec.attr.id] = converter.get_resource_path(sec);
                } else {
                    ext[sec.attr.id] = sec.attr.path;
                }
            } else if (sec.key === 'sub_resource') {
                sub[sec.id] = sec;
                sec.key = undefined;
                sec.id = undefined;
            } else if (sec.key === 'node') {
                if (sec._prop && sec._prop.script) {
                    const ext_idx = get_function_params(sec._prop.script);
                    const script_pack = ext[ext_idx];
                    if (script_pack.type === 'ReplaceNode') {
                        sec.key = 'node';
                        sec.attr = {
                            type: script_pack.meta,
                            index: sec['index'],
                            parent: sec['parent'],
                            name: sec['name'],
                        };
                        sec.prop = sec._prop;
                        sec._prop = undefined;
                        const converter = require(`./res/${sec.attr.type}`);
                        const parsed_sec = converter(sec);
                        // copy extra properties (may come from scripts)
                        for (const k in sec.prop) {
                            if (k === 'script') continue;
                            if (parsed_sec[k] === undefined) {
                                parsed_sec[k] = sec.prop[k];
                            }
                        }
                        parsed_sec.key = undefined;
                        parsed_sec._prop = undefined;

                        sec = parsed_sec;
                    }
                    ext[ext_idx] = undefined;
                }

                // we don't normalize instance nodes now
                // since we don't know their type yet
                if (!sec.instance) {
                    sec._prop = undefined;
                    sec.key = undefined;
                    normalize_resource_object(sec);
                }
                nodes.push(sec);
            }
        }

        return {
            type: 'PackedScene',
            ext,
            sub,
            nodes,
        };
    } else {
        throw `TRES of type "${head.key}" is not supported`;
    }
}
