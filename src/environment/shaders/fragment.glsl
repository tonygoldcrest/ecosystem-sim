#version 300 es

precision highp float;

out vec4 outColor;

uniform vec3 uColor;

uniform float uTime;
uniform sampler2D uTexture;
uniform vec2 uResolution;
in vec2 aInterpPosition;

void main() {
	vec2 uv = aInterpPosition / uResolution.xy;
	outColor = texture(uTexture, uv);
}
