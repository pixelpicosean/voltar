import * as v from 'engine/index';


export class MainScene extends v.Node {
    static instance() { return new MainScene }

    constructor() {
        super();
    }
}
v.GDCLASS(MainScene, v.Node)

v.attach_script('res://scene/demo.tscn', MainScene);
