import { Matrix } from '../../../math';

/**
 * Calculates the mapped matrix
 * @param filter_area {Rectangle} The filter area
 * @param sprite {Sprite} the target sprite
 * @param outputMatrix {Matrix} @alvin
 */
// TODO playing around here.. this is temporary - (will end up in the shader)
// this returns a matrix that will normalise map filter cords in the filter to screen space
export function calculateScreenSpaceMatrix(outputMatrix, filter_area, textureSize)
{
     // let world_transform = sprite.world_transform.copy(Matrix.TEMP_MATRIX),
    // let texture = {width:1136, height:700};//sprite._texture.baseTexture;

    // TODO unwrap?
    const mappedMatrix = outputMatrix.identity();

    mappedMatrix.translate(filter_area.x / textureSize.width, filter_area.y / textureSize.height);

    mappedMatrix.scale(textureSize.width, textureSize.height);

    return mappedMatrix;
}

export function calculateNormalizedScreenSpaceMatrix(outputMatrix, filter_area, textureSize)
{
    const mappedMatrix = outputMatrix.identity();

    mappedMatrix.translate(filter_area.x / textureSize.width, filter_area.y / textureSize.height);

    const translateScaleX = (textureSize.width / filter_area.width);
    const translateScaleY = (textureSize.height / filter_area.height);

    mappedMatrix.scale(translateScaleX, translateScaleY);

    return mappedMatrix;
}

// this will map the filter coord so that a texture can be used based on the transform of a sprite
export function calculateSpriteMatrix(outputMatrix, filter_area, textureSize, sprite)
{
    const world_transform = sprite.world_transform.copy(Matrix.TEMP_MATRIX);
    const texture = sprite._texture.baseTexture;

    // TODO unwrap?
    const mappedMatrix = outputMatrix.identity();

    // scale..
    const ratio = textureSize.height / textureSize.width;

    mappedMatrix.translate(filter_area.x / textureSize.width, filter_area.y / textureSize.height);

    mappedMatrix.scale(1, ratio);

    const translateScaleX = (textureSize.width / texture.width);
    const translateScaleY = (textureSize.height / texture.height);

    world_transform.tx /= texture.width * translateScaleX;

    // this...?  free beer for anyone who can explain why this makes sense!
    world_transform.ty /= texture.width * translateScaleX;
    // world_transform.ty /= texture.height * translateScaleY;

    world_transform.invert();
    mappedMatrix.prepend(world_transform);

    // apply inverse scale..
    mappedMatrix.scale(1, 1 / ratio);

    mappedMatrix.scale(translateScaleX, translateScaleY);

    mappedMatrix.translate(sprite.anchor.x, sprite.anchor.y);

    return mappedMatrix;
}
