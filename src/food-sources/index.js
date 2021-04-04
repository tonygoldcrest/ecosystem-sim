import GLProgram from '../gl-program/index.js';
import { scaleByDeltaTime } from '../helpers.js';
import Food from './food.js';

export default class FoodSources extends GLProgram {
	constructor(gl, uMatrix, environment, global) {
		super(gl);

		this.uMatrix = uMatrix;
		this.amount = 250;
		this.foodSources = new Array(this.amount);
		this.environment = environment;
		this.global = global;

		this.generateFood();
		this.loading = Promise.all([this.setupProgram()]);
	}

	async setupProgram() {
		await super.setupProgram(
			'./src/food-sources/shaders/vertex.glsl',
			'./src/food-sources/shaders/fragment.glsl'
		);

		this.buffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);

		this.setupAttributes();
		this.setupUniforms();

		this.assignTextureToUniform();
	}

	async assignTextureToUniform() {
		const { registry } = await this.loadTexture('./icons/grass.png');

		this.gl.useProgram(this.program);
		this.gl.bindVertexArray(this.vao);
		const imageLocation = this.gl.getUniformLocation(this.program, 'uTexture');
		this.gl.uniform1i(imageLocation, registry);
	}

	setupAttributes() {
		this.gl.bindVertexArray(this.vao);

		const positionAttributeLocation = this.gl.getAttribLocation(
			this.program,
			'aPosition'
		);

		this.gl.vertexAttribPointer(
			positionAttributeLocation,
			2,
			this.gl.FLOAT,
			false,
			2 * Float32Array.BYTES_PER_ELEMENT,
			0
		);

		this.gl.enableVertexAttribArray(positionAttributeLocation);
	}

	setupUniforms() {
		super.setupUniforms();
		const matrixLocation = this.gl.getUniformLocation(this.program, 'uMatrix');

		this.gl.uniformMatrix3fv(matrixLocation, false, this.uMatrix);
	}

	generateFood() {
		for (let i = 0; i < this.foodSources.length; i++) {
			const randomTile = this.environment.getRandomGrassTile();
			this.foodSources[i] = new Food(randomTile.x, randomTile.y);
		}

		this.rawData = new Float32Array(this.amount * 2);
	}

	getClosestFoodSource(x, y, distance) {
		let minDistance = 1000;
		let currentClosestSource = null;
		this.foodSources.forEach((source) => {
			const dst = Math.abs(
				glMatrix.vec2.distance([x, y], [source.x, source.y])
			);
			if (dst < distance && dst < minDistance && !source.empty) {
				currentClosestSource = source;
				minDistance = dst;
			}
		});

		return currentClosestSource;
	}

	draw() {
		const fullSources = this.foodSources.filter((source) => !source.empty);
		for (let i = 0; i < fullSources.length; i++) {
			const food = fullSources[i].toArray();
			[this.rawData[2 * i], this.rawData[2 * i + 1]] = food;
		}

		const emptySources = this.foodSources.filter((source) => source.empty);
		emptySources.forEach((source) => {
			if (Math.random() < scaleByDeltaTime(0.0001)) {
				const randomTile = this.environment.getRandomGrassTile();
				source.x = randomTile.x;
				source.y = randomTile.y;
				source.empty = false;
			}
		});

		this.gl.useProgram(this.program);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
		this.gl.bindVertexArray(this.vao);

		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			this.rawData,
			this.gl.DYNAMIC_DRAW
		);
		this.gl.drawArrays(this.gl.POINTS, 0, fullSources.length);
	}
}
