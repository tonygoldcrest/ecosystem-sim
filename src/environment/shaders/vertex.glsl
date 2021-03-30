#version 300 es

in vec2 aPosition;
in vec3 aTileColor;
uniform mat3 uMatrix;
uniform float uTileSize;

out vec3 aColor;

void main() {
	gl_Position = vec4(uMatrix * vec3(aPosition, 1), 1);
	aColor = aTileColor;
	gl_PointSize = uTileSize;
}
