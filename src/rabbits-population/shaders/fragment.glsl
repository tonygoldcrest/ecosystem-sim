#version 300 es

precision highp float;

out vec4 outColor;

in float aHighlighted;
in float aSex;
uniform sampler2D uTexture;

uniform float uTime;

void main() {
	vec4 textureColor = texture(uTexture, gl_PointCoord);

	if (aSex == 1.0) {
		textureColor = textureColor * vec4(.98, .69, .63, 1);
	}

	if (aHighlighted == 1.0) {
		textureColor = textureColor * vec4(0.5, 0.5, 0.5, 1);
	}

	outColor = textureColor * vec4(uTime, uTime, uTime, 1);
}
