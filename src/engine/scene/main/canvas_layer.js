import Node2D from "../Node2D";
import { Vector2, Matrix } from "engine/math/index";

export default class CanvasLayer extends Node2D {
    constructor() {
        super();

        this.locrotscale_dirty = false;
        this.ofs = new Vector2();
        this.scale_ = new Vector2();
        this.rot = 0;
        this.layer = 0;
        this.transform_ = new Matrix();
        this.canvas = null;

        this.vp = null;

        this.sort_index = 0;
    }

    _update_xform() { }
    _update_locrotscale() { }
}
