#version 300 es

precision highp float;

out vec4 outColor;

in float aHighlighted;
in float aSex;
uniform sampler2D uTextureMale[3];
uniform sampler2D uTextureFemale[3];

uniform float uTime;

in float aTextureIndex;

void main() {
	vec4 textureColor;

	if (aSex == 1.0) {
		if (aTextureIndex == 0.0) {
			textureColor = texture(uTextureFemale[0], gl_PointCoord);
		} else if (aTextureIndex == 1.0) {
			textureColor = texture(uTextureFemale[1], gl_PointCoord);
		} else if (aTextureIndex == 2.0) {
			textureColor = texture(uTextureFemale[2], gl_PointCoord) * vec4(.98, .69, .63, 1);
		}
	} else {
		if (aTextureIndex == 0.0) {
			textureColor = texture(uTextureMale[0], gl_PointCoord);
		} else if (aTextureIndex == 1.0) {
			textureColor = texture(uTextureMale[1], gl_PointCoord);
		} else if (aTextureIndex == 2.0) {
			textureColor = texture(uTextureMale[2], gl_PointCoord);
		}
	}

	if (aHighlighted == 1.0) {
		textureColor = textureColor * vec4(0.5, 0.5, 0.5, 1);
	}

	outColor = textureColor * vec4(uTime, uTime, uTime, 1);
}
