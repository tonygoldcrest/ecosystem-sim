import GLProgram from '../gl-program/index.js';
import Rabbit, { SEX } from './rabbit.js';

export default class RabbitPopulation extends GLProgram {
	constructor(gl, uMatrix, environment, foodSources) {
		super(gl);

		this.uMatrix = uMatrix;
		this.amount = 100;
		this.rabbits = new Array(this.amount);
		this.environment = environment;
		this.foodSources = foodSources;

		this.generateRabbits();
		this.loading = Promise.all([this.setupProgram()]);
	}

	async setupProgram() {
		await super.setupProgram(
			'./src/rabbits-population/shaders/vertex.glsl',
			'./src/rabbits-population/shaders/fragment.glsl'
		);

		this.buffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);

		this.setupAttributes();
		this.setupUniforms();

		this.loadTexture();
	}

	setupAttributes() {
		this.gl.bindVertexArray(this.vao);

		const positionAttributeLocation = this.gl.getAttribLocation(
			this.program,
			'aPosition'
		);
		const rabbitSizeAttributeLocation = this.gl.getAttribLocation(
			this.program,
			'aRabbitSize'
		);
		const isHighlightedAttributeLocation = this.gl.getAttribLocation(
			this.program,
			'aIsHighlighted'
		);
		const rabbitSexAttributeLocation = this.gl.getAttribLocation(
			this.program,
			'aRabbitSex'
		);

		this.gl.vertexAttribPointer(
			positionAttributeLocation,
			2,
			this.gl.FLOAT,
			false,
			5 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		this.gl.vertexAttribPointer(
			rabbitSizeAttributeLocation,
			1,
			this.gl.FLOAT,
			false,
			5 * Float32Array.BYTES_PER_ELEMENT,
			2 * Float32Array.BYTES_PER_ELEMENT
		);
		this.gl.vertexAttribPointer(
			isHighlightedAttributeLocation,
			1,
			this.gl.FLOAT,
			false,
			5 * Float32Array.BYTES_PER_ELEMENT,
			3 * Float32Array.BYTES_PER_ELEMENT
		);
		this.gl.vertexAttribPointer(
			rabbitSexAttributeLocation,
			1,
			this.gl.FLOAT,
			false,
			5 * Float32Array.BYTES_PER_ELEMENT,
			4 * Float32Array.BYTES_PER_ELEMENT
		);

		this.gl.enableVertexAttribArray(positionAttributeLocation);
		this.gl.enableVertexAttribArray(rabbitSizeAttributeLocation);
		this.gl.enableVertexAttribArray(isHighlightedAttributeLocation);
		this.gl.enableVertexAttribArray(rabbitSexAttributeLocation);
	}

	loadTexture() {
		const image = new Image();
		image.src = '/icons/rabbit.png';
		image.onload = function () {
			this.bindTexture(image);
		}.bind(this);
	}

	bindTexture(image) {
		this.gl.useProgram(this.program);
		const texture = this.gl.createTexture();

		this.gl.activeTexture(this.gl.TEXTURE0 + 0);
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

		const imageLocation = this.gl.getUniformLocation(this.program, 'uTexture');
		this.gl.uniform1i(imageLocation, 0);
	}

	setupUniforms() {
		super.setupUniforms();
		const matrixLocation = this.gl.getUniformLocation(this.program, 'uMatrix');

		this.gl.uniformMatrix3fv(matrixLocation, false, this.uMatrix);
	}

	generateRabbits() {
		for (let i = 0; i < this.rabbits.length; i++) {
			const randomTile = this.environment.getRandomGroundTile();
			this.rabbits[i] = new Rabbit(
				randomTile.x,
				randomTile.y,
				this.environment,
				this.foodSources,
				this
			);
		}

		this.rawData = new Float32Array(this.amount * 5);
	}

	getClosestFemale(x, y, distance) {
		let minDistance = 1000;
		let currentClosestFemale;
		this.rabbits
			.filter(
				(rabbit) => rabbit.state.alive && rabbit.config.sex === SEX.FEMALE
			)
			.forEach((rabbit) => {
				const dst = Math.abs(
					glMatrix.vec2.distance(
						[x, y],
						[rabbit.state.position[0], rabbit.state.position[1]]
					)
				);
				if (dst < distance && dst < minDistance) {
					currentClosestFemale = rabbit;
					minDistance = dst;
				}
			});

		return currentClosestFemale;
	}

	getRabbitAt(x, y) {
		const rabbit = this.rabbits.find(
			(rabbit) =>
				x > rabbit.state.position[0] - rabbit.state.projectedSize / 2.0 &&
				x < rabbit.state.position[0] + rabbit.state.projectedSize / 2.0 &&
				y > rabbit.state.position[1] - rabbit.state.projectedSize / 2.0 &&
				y < rabbit.state.position[1] + rabbit.state.projectedSize / 2.0
		);

		return rabbit;
	}

	draw() {
		const aliveRabbits = this.rabbits.filter((rabbit) => rabbit.state.alive);

		for (let i = 0; i < aliveRabbits.length; i++) {
			aliveRabbits[i].live();
			const rabbit = aliveRabbits[i].toArray();
			[
				this.rawData[5 * i],
				this.rawData[5 * i + 1],
				this.rawData[5 * i + 2],
				this.rawData[5 * i + 3],
				this.rawData[5 * i + 4],
			] = rabbit;
		}

		this.gl.useProgram(this.program);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
		this.gl.bindVertexArray(this.vao);

		this.gl.bufferData(this.gl.ARRAY_BUFFER, this.rawData, this.gl.STATIC_DRAW);
		this.gl.drawArrays(this.gl.POINTS, 0, aliveRabbits.length);

		const deadRabbits = this.rabbits.filter((rabbit) => !rabbit.state.alive);

		deadRabbits.forEach((rabbit) => {
			this.rabbits.splice(this.rabbits.indexOf(rabbit), 1);
		});

		const pregnantRabbits = this.rabbits.filter(
			(rabbit) => rabbit.state.pregnant && rabbit.state.stats.pregnancy > 100
		);

		pregnantRabbits.forEach((rabbit) => {
			for (let i = 0; i < rabbit.config.descendants; i++) {
				this.rabbits.push(
					new Rabbit(
						rabbit.state.position[0] + Math.floor((2 * Math.random() - 1) * 5),
						rabbit.state.position[1] + Math.floor((2 * Math.random() - 1) * 5),
						this.environment,
						this.foodSources,
						this
					)
				);
			}

			rabbit.state.pregnant = false;
			rabbit.state.stats.pregnancy = 0;
		});

		if (pregnantRabbits || deadRabbits) {
			this.rawData = new Float32Array(this.rabbits.length * 5);
		}
	}
}
