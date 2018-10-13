import { device } from 'engine/dep/index';

export default function max_recommended_textures(max) {
    if (device.tablet || device.phone) {
        // check if the res is iphone 6 or higher..
        return 4;
    }

    // desktop should be ok
    return max;
}
