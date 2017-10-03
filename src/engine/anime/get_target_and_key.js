/**
 * Get the real target and its property key from
 * a root context and full path of the target property.
 * @param  {object} context  Root context that contains the target
 * @param  {string} full_path Full path of the target property
 * @return {array}           [target, key] or undefined if no property matches
 */
export default function get_target_and_key(context, full_path) {
  let path = full_path.split('.');
  // Path is just the property key
  if (path.length === 1) {
    return [context, full_path];
  }
  else {
    let target = context;
    for (let i = 0; i < path.length - 1; i++) {
      if (target.hasOwnProperty(path[i])) {
        target = target[path[i]];
      }
      else {
        console.log(`[Warning]: anim target "${path[i]}" not found`);
        return undefined;
      }
    }

    if (!target.hasOwnProperty(path[path.length - 1])) {
      console.log(`[Warning]: anim target "${path[path.length - 1]}" not found`);
      return undefined;
    }
    return [target, path[path.length - 1]];
  }
};
