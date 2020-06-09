attribute highp vec2 vertex; // attrib:0
attribute highp vec2 uv; // attrib:4

varying highp vec2 uv_interp;

void main() {
    uv_interp = uv;
    gl_Position = vec4(vertex, 0.0, 1.0);
}
