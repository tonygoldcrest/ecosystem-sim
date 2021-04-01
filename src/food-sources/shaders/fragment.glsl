#version 300 es

precision highp float;

out vec4 outColor;

uniform sampler2D uTexture;

uniform float uTime;

void main() {
	outColor = texture(uTexture, gl_PointCoord);
}
