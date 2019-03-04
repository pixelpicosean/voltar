varying vec2 v_mask_coord;
varying vec2 v_texture_coord;

uniform sampler2D u_sampler;
uniform sampler2D mask;
uniform float alpha;
uniform vec4 mask_clamp;

void main(void) {
    float clip = step(3.5,
        step(mask_clamp.x, v_mask_coord.x) +
        step(mask_clamp.y, v_mask_coord.y) +
        step(v_mask_coord.x, mask_clamp.z) +
        step(v_mask_coord.y, mask_clamp.w));

    vec4 original = texture2D(u_sampler, v_texture_coord);
    vec4 masky = texture2D(mask, v_mask_coord);

    original *= (masky.r * masky.a * alpha * clip);

    gl_FragColor = original;
}
