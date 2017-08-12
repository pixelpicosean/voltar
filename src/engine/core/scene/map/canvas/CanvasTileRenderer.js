import CanvasRenderer from '../../../renderers/canvas/CanvasRenderer';


export default class CanvasTileRenderer {
    constructor(renderer) {
        this.renderer = renderer;
        this.tileAnim = [0, 0];
    }
}

CanvasRenderer.registerPlugin('tilemap', CanvasTileRenderer);
