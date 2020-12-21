/**
 * Simple object check.
 */
function is_object(item: any): boolean {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 */
export function deep_merge(target: any, ...sources: any): any {
    if (!sources.length) return target;
    let source = sources.shift();

    if (is_object(target) && is_object(source)) {
        for (let key in source) {
            if (is_object(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                deep_merge(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return deep_merge(target, ...sources);
}
