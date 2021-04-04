import { createProgram, createShader } from '../helpers.js';

export default class GLProgram {
	constructor(gl) {
		/** @type {WebGL2RenderingContext} */
		this.gl = gl;
	}

	async setupProgram(vertexUrl, fragmentUrl) {
		const vertexShaderSource = await fetch(vertexUrl).then((response) => response.text());
		const fragmentShaderSource = await fetch(fragmentUrl).then((response) => response.text());

		const vertexShader = createShader(
			this.gl,
			this.gl.VERTEX_SHADER,
			vertexShaderSource
		);
		const fragmentShader = createShader(
			this.gl,
			this.gl.FRAGMENT_SHADER,
			fragmentShaderSource
		);

		this.program = createProgram(this.gl, vertexShader, fragmentShader);
		this.gl.useProgram(this.program);

		this.vao = this.gl.createVertexArray();
	}

	setupUniforms() {
		this.timeLocation = this.gl.getUniformLocation(this.program, 'uTime');

		this.gl.uniform1f(this.timeLocation, 0);
	}

	updateTime(time) {
		this.gl.useProgram(this.program);
		this.gl.bindVertexArray(this.vao);

		this.gl.uniform1f(this.timeLocation, time);
	}

	loadTexture(src) {
		return new Promise((resolve) => {
			const image = new Image();
			image.src = src;
			image.onload = function () {
				resolve({ registry: this.bindTexture(image) });
			}.bind(this);
		});
	}

	bindTexture(image) {
		const texture = this.gl.createTexture();
		const textureRegistry = global.nextTextureRegistry;

		this.gl.activeTexture(this.gl.TEXTURE0 + textureRegistry);
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

		this.gl.texParameteri(
			this.gl.TEXTURE_2D,
			this.gl.TEXTURE_WRAP_S,
			this.gl.CLAMP_TO_EDGE
		);
		this.gl.texParameteri(
			this.gl.TEXTURE_2D,
			this.gl.TEXTURE_WRAP_T,
			this.gl.CLAMP_TO_EDGE
		);
		this.gl.texParameteri(
			this.gl.TEXTURE_2D,
			this.gl.TEXTURE_MIN_FILTER,
			this.gl.NEAREST
		);
		this.gl.texParameteri(
			this.gl.TEXTURE_2D,
			this.gl.TEXTURE_MAG_FILTER,
			this.gl.NEAREST
		);

		const mipLevel = 0;
		const internalFormat = this.gl.RGBA;
		const srcFormat = this.gl.RGBA;
		const srcType = this.gl.UNSIGNED_BYTE;
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			mipLevel,
			internalFormat,
			srcFormat,
			srcType,
			image
		);

		global.nextTextureRegistry += 1;

		return textureRegistry;
	}
}
