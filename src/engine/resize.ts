interface ScaleBox {
    left: number;
    top: number;
    scale: number;
}

/**
 * Calculate how to scale a content to fill its container in `outer-box` mode.
 */
export function outer_box_resize(container_width: number, container_height: number, content_width: number, content_height: number) {
    const p_ratio = container_width / container_height;
    const c_ratio = content_width / content_height;

    let result: ScaleBox = { left: 0, top: 0, scale: 1 };
    if (p_ratio > c_ratio) {
        result.scale = container_height / content_height;
        result.left = (container_width - content_width * result.scale) * 0.5;
    } else {
        result.scale = container_width / content_width;
        result.top = (container_height - content_height * result.scale) * 0.5;
    }

    return result;
}

/**
 * Calculate how to scale a content to fill its container in `inner-box` mode.
 */
export function inner_box_resize(container_width: number, container_height: number, content_width: number, content_height: number) {
    const p_ratio = container_width / container_height;
    const c_ratio = content_width / content_height;

    let result: ScaleBox = { left: 0, top: 0, scale: 1 };
    if (p_ratio < c_ratio) {
        result.scale = container_height / content_height;
        result.left = (container_width - content_width * result.scale) * 0.5;
    } else {
        result.scale = container_width / content_width;
        result.top = (container_height - content_height * result.scale) * 0.5;
    }

    return result;
}
