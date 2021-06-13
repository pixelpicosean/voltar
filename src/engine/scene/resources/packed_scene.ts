import { memnew } from "engine/core/os/memory";
import {
    res_class_map,
    get_resource_map,
} from "engine/registry";
import { Node } from "../main/node";

type Dictionary = { [key: string]: any };

type Script = { new(): Node };

type NodeData = {
    type?: string;
    name?: string;
    parent?: string;
    instance?: PackedScene;
    script?: Script;
} | Dictionary;

type NodePathTable = { [name: string]: Node };

export class PackedScene {
    get type() { return "PackedScene" }

    filename = "";

    ext: Dictionary;
    sub: Dictionary;
    nodes: NodeData[];

    script?: Script;

    instance(): Node {
        let root_data = this.nodes[0];
        let node_path_table: NodePathTable = Object.create(null);

        let root: Node = null;

        // simple step: try to create root instance based on its type
        if (this.script) {
            /* script attached, type known */
            root = new this.script;
            root._init();
        } else if (root_data.type) {
            /* no script, no inheritance. Simple node! \o/ */
            root = memnew(root_data.type);
        }
        node_path_table["."] = root;

        // complex step: inherited scene, find right class and setup its children
        if (!root && root_data.instance) {
            let parent_packed_scene: PackedScene = root_data.instance;
            root = parent_packed_scene.instance();

            // build node path table because nodes are created from `instance()`
            node_path_table["."] = root;
            build_node_path_table(node_path_table, root.data.children, null);
        }

        setup_scene(this, node_path_table);

        return root;
    }

    _load_data(data: any) {
        this.ext = data.ext;
        this.sub = data.sub;
        this.nodes = data.nodes;

        return this;
    }
}

res_class_map["PackedScene"] = PackedScene;

function build_node_path_table(table: NodePathTable, nodes: Node[], root: string) {
    for (let n of nodes) {
        let self_path = root ? `${root}/${n.name}` : n.name;
        table[self_path] = n;
        if (n.data.children.length > 0) {
            build_node_path_table(table, n.data.children, self_path);
        }
    }
}

function setup_scene(scene_data: PackedScene, node_path_table: NodePathTable) {
    const resource_map = get_resource_map();

    let nodes = scene_data.nodes;

    // start from root of the inheritance tree
    let root_data = nodes[0];
    if (root_data.instance) {
        let parent_packed_scene = root_data.instance;
        setup_scene(parent_packed_scene, node_path_table);
    }

    // setup root
    let root = node_path_table["."];
    root._load_data(root_data);

    // setup children
    for (let i = 1; i < nodes.length; i++) {
        let node_data = nodes[i];
        let self_path = (node_data.parent === ".") ? node_data.name : `${node_data.parent}/${node_data.name}`;

        let child = node_path_table[self_path];

        // child node not existed, create one and add to parent
        if (!child) {
            // @Incomplete: support script attached to normal node
            // if (node_data.script) {
            //     child = new node_data.script;
            // }

            if (node_data.instance) {
                /* a PackedScene instance */
                let child_packed_scene = node_data.instance;
                child = child_packed_scene.instance();
            } else {
                /* a normal node */
                child = memnew(node_data.type);
            }

            node_path_table[self_path] = child;

            let parent = node_path_table[node_data.parent];
            parent.add_child(child);
        }

        child._load_data(node_data);
    }
}
