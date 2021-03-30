#version 300 es

in vec2 aPosition;
in float aRabbitSize;
in float aIsHighlighted;
in float aRabbitSex;

uniform mat3 uMatrix;

out float aHighlighted;
out float aSex;

void main() {
	gl_Position = vec4(uMatrix * vec3(aPosition, 1), 1);
	gl_PointSize = aRabbitSize;
	aHighlighted = aIsHighlighted;
	aSex = aRabbitSex;
}
