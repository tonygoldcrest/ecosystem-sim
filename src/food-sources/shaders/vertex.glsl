#version 300 es

in vec2 aPosition;
uniform mat3 uMatrix;

void main() {
	gl_Position = vec4(uMatrix * vec3(aPosition, 1), 1);
	gl_PointSize = 60.0;
}
