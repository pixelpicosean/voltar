import { device } from "engine/dep/index";

/**
 * The maximum recommended texture units to use.
 * In theory the bigger the better, and for desktop we'll use as many as we can.
 * But some mobile devices slow down if there is to many branches in the shader.
 * So in practice there seems to be a sweet spot size that varies depending on the device.
 * @param {number} max
 */
export function maxRecommendedTextures(max) {
    let allowMax = true;

    if (device.tablet || device.phone) {
        allowMax = false;

        if (device.apple.device) {
            const match = (navigator.userAgent).match(/OS (\d+)_(\d+)?/);

            if (match) {
                const majorVersion = parseInt(match[1], 10);

                // All texture units can be used on devices that support ios 11 or above
                if (majorVersion >= 11) {
                    allowMax = true;
                }
            }
        }
        if (device.android.device) {
            const match = (navigator.userAgent).match(/Android\s([0-9.]*)/);

            if (match) {
                const majorVersion = parseInt(match[1], 10);

                // All texture units can be used on devices that support Android 7 (Nougat) or above
                if (majorVersion >= 7) {
                    allowMax = true;
                }
            }
        }
    }

    return allowMax ? max : 4;
}
