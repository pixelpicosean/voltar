/**
 * @enum {number}
 */
export const ShapeType = {
    LINE: 0,
    RAY: 1,
    SEGMENT: 2,
    CIRCLE: 3,
    RECTANGLE: 4,
    CAPSULE: 5,
    CONVEX_POLYGON: 6,
    CONCAVE_POLYGON: 7,
    CUSTOM: 8,
}

/**
 * @enum {number}
 */
export const SpaceParameter = {
    CONTACT_RECYCLE_RADIUS: 0,
    CONTACT_MAX_SEPARATION: 1,
    BODY_MAX_ALLOWED_PENETRATION: 2,
    BODY_LINEAR_VELOCITY_SLEEP_THRESHOLD: 3,
    BODY_ANGULAR_VELOCITY_SLEEP_THRESHOLD: 4,
    BODY_TIME_TO_SLEEP: 5,
    CONSTRAINT_DEFAULT_BIAS: 6,
}

/**
 * @enum {number}
 */
export const AreaParameter = {
    GRAVITY: 0,
    GRAVITY_VECTOR: 1,
    GRAVITY_IS_POINT: 2,
    GRAVITY_DISTANCE_SCALE: 3,
    GRAVITY_POINT_ATTENUATION: 4,
    LINEAR_DAMP: 5,
    ANGULAR_DAMP: 6,
    PRIORITY: 7,
}

/**
 * @enum {number}
 */
export const AreaSpaceOverrideMode = {
    DISABLED: 0,
    COMBINE: 1,
    COMBINE_REPLACE: 2,
    REPLACE: 3,
    REPLACE_COMBINE: 4,
}

/**
 * @enum {number}
 */
export const Type = {
    AREA: 0,
    BODY: 1,
}

export const INTERSECTION_QUERY_MAX = 2048;
