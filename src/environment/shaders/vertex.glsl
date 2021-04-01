#version 300 es

in vec2 aPosition;
uniform mat3 uMatrix;
out vec2 aInterpPosition;

void main() {
	gl_Position = vec4(uMatrix * vec3(aPosition, 1), 1);

	aInterpPosition = aPosition;
}
