precision mediump float;

uniform highp float TIME;

uniform sampler2D TEXTURE;

/* UNIFORM */

void main() {
    vec3 ALBEDO = vec3(1.0);
    float ALPHA = 1.0;

    /* SHADER_BEGIN */
    /* SHADER_END */

    gl_FragColor = vec4(ALBEDO, ALPHA);
}
