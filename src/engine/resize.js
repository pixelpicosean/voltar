/**
 * Calculate how to scale a content to fill its container in `outer-box` mode.
 * @return {object} { left , top , scale }
 */
export function outer_box_resize(container_width, container_height, content_width, content_height) {
    const pRatio = container_width / container_height;
    const cRatio = content_width / content_height;

    const result = { left: 0, top: 0, scale: 1 };
    if (pRatio > cRatio) {
        result.scale = container_height / content_height;
        result.left = (container_width - content_width * result.scale) * 0.5;
    }
    else {
        result.scale = container_width / content_width;
        result.top = (container_height - content_height * result.scale) * 0.5;
    }

    return result;
}

/**
 * Calculate how to scale a content to fill its container in `inner-box` mode.
 * @return {object} { left , top , scale }
 */
export function inner_box_resize(container_width, container_height, content_width, content_height) {
    const pRatio = container_width / container_height;
    const cRatio = content_width / content_height;

    const result = { left: 0, top: 0, scale: 1 };
    if (pRatio < cRatio) {
        result.scale = container_height / content_height;
        result.left = (container_width - content_width * result.scale) * 0.5;
    }
    else {
        result.scale = container_width / content_width;
        result.top = (container_height - content_height * result.scale) * 0.5;
    }

    return result;
}
