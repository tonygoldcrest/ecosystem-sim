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
}
