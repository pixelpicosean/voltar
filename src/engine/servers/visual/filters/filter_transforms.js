import { Matrix, Rectangle } from 'engine/core/math/index';

/**
 * Calculates the mapped matrix
 * @param output_matrix {Matrix}
 * @param filter_area {Rectangle} The filter area
 * @param texture_size {Rectangle} Size of the texture
 */
// TODO playing around here.. this is temporary - (will end up in the shader)
// this returns a matrix that will normalise map filter cords in the filter to screen space
export function calculate_screen_space_matrix(output_matrix, filter_area, texture_size) {
    // TODO unwrap?
    const mapped_matrix = output_matrix.identity();

    mapped_matrix.translate(filter_area.x / texture_size.width, filter_area.y / texture_size.height);
    mapped_matrix.scale(texture_size.width, texture_size.height);

    return mapped_matrix;
}

/**
 * Calculates the mapped matrix
 * @param output_matrix {Matrix}
 * @param filter_area {Rectangle} The filter area
 * @param texture_size {Rectangle} Size of the texture
 */
export function calculate_normalized_screen_space_matrix(output_matrix, filter_area, texture_size) {
    const mapped_matrix = output_matrix.identity();

    mapped_matrix.translate(filter_area.x / texture_size.width, filter_area.y / texture_size.height);
    mapped_matrix.scale(texture_size.width / filter_area.width, texture_size.height / filter_area.height);

    return mapped_matrix;
}

/**
 * this will map the filter coord so that a texture can be used based on the transform of a sprite
 * @param output_matrix {Matrix}
 * @param filter_area {Rectangle} The filter area
 * @param texture_size {Rectangle} Size of the texture
 * @param sprite {import('engine/scene/sprites/sprite').default}
 */
export function calculate_sprite_matrix(output_matrix, filter_area, texture_size, sprite) {
    const orig = sprite._texture.orig;
    const mapped_matrix = output_matrix.set(texture_size.width, 0, 0, texture_size.height, filter_area.x, filter_area.y);
    const world_transform = sprite.world_transform.copy(Matrix.TEMP_MATRIX);

    world_transform.invert();
    mapped_matrix.prepend(world_transform);
    mapped_matrix.scale(1.0 / orig.width, 1.0 / orig.height);
    mapped_matrix.translate(sprite.anchor.x, sprite.anchor.y);

    return mapped_matrix;
}
