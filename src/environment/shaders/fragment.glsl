#version 300 es

precision highp float;

out vec4 outColor;

in vec3 aColor;

uniform float uTime;

void main() {
	outColor = vec4(aColor.xyz, 1) * vec4(uTime, uTime, uTime, 1);
}
