import { GroupD8, Rectangle } from '../math/index';

/**
 * A standard object to store the Uvs of a texture
 */
export default class TextureUvs {
    constructor() {
        this.x0 = 0;
        this.y0 = 0;

        this.x1 = 1;
        this.y1 = 0;

        this.x2 = 1;
        this.y2 = 1;

        this.x3 = 0;
        this.y3 = 1;

        this.uvs_uint32 = new Uint32Array(4);
    }

    /**
     * Sets the texture Uvs based on the given frame information.
     *
     * @private
     * @param {Rectangle} frame - The frame of the texture
     * @param {Rectangle} base_frame - The base frame of the texture
     * @param {number} rotate - Rotation of frame, see {@link GroupD8}
     */
    set(frame, base_frame, rotate) {
        const tw = base_frame.width;
        const th = base_frame.height;

        if (rotate) {
            // width and height div 2 div baseFrame size
            const w2 = frame.width / 2 / tw;
            const h2 = frame.height / 2 / th;

            // coordinates of center
            const cX = (frame.x / tw) + w2;
            const cY = (frame.y / th) + h2;

            rotate = GroupD8.add(rotate, GroupD8.NW); // NW is top-left corner
            this.x0 = cX + (w2 * GroupD8.u_x(rotate));
            this.y0 = cY + (h2 * GroupD8.u_y(rotate));

            rotate = GroupD8.add(rotate, 2); // rotate 90 degrees clockwise
            this.x1 = cX + (w2 * GroupD8.u_x(rotate));
            this.y1 = cY + (h2 * GroupD8.u_y(rotate));

            rotate = GroupD8.add(rotate, 2);
            this.x2 = cX + (w2 * GroupD8.u_x(rotate));
            this.y2 = cY + (h2 * GroupD8.u_y(rotate));

            rotate = GroupD8.add(rotate, 2);
            this.x3 = cX + (w2 * GroupD8.u_x(rotate));
            this.y3 = cY + (h2 * GroupD8.u_y(rotate));
        }
        else {
            this.x0 = frame.x / tw;
            this.y0 = frame.y / th;

            this.x1 = (frame.x + frame.width) / tw;
            this.y1 = frame.y / th;

            this.x2 = (frame.x + frame.width) / tw;
            this.y2 = (frame.y + frame.height) / th;

            this.x3 = frame.x / tw;
            this.y3 = (frame.y + frame.height) / th;
        }

        this.uvs_uint32[0] = (((this.y0 * 65535) & 0xFFFF) << 16) | ((this.x0 * 65535) & 0xFFFF);
        this.uvs_uint32[1] = (((this.y1 * 65535) & 0xFFFF) << 16) | ((this.x1 * 65535) & 0xFFFF);
        this.uvs_uint32[2] = (((this.y2 * 65535) & 0xFFFF) << 16) | ((this.x2 * 65535) & 0xFFFF);
        this.uvs_uint32[3] = (((this.y3 * 65535) & 0xFFFF) << 16) | ((this.x3 * 65535) & 0xFFFF);
    }
}
