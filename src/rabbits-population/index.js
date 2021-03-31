import GLProgram from '../gl-program/index.js';
import Rabbit, { DEATH_REASONS, SEX } from './rabbit.js';

const MALE_TEXTURES_NUMBER = 3;
const FEMALE_TEXTURES_NUMBER = 3;

export default class RabbitPopulation extends GLProgram {
	constructor(gl, uMatrix, environment, foodSources, global) {
		super(gl);

		this.uMatrix = uMatrix;
		this.amount = 100;
		this.rabbits = new Array(this.amount);
		this.environment = environment;
		this.foodSources = foodSources;

		this.global = global;

		this.obituary = Object.values(DEATH_REASONS).reduce(
			(acc, value) => ({ ...acc, [value]: 0 }),
			{}
		);

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
		const rabbitTextureIndexAttributeLocation = this.gl.getAttribLocation(
			this.program,
			'aRabbitTextureIndex'
		);

		this.gl.vertexAttribPointer(
			positionAttributeLocation,
			2,
			this.gl.FLOAT,
			false,
			6 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		this.gl.vertexAttribPointer(
			rabbitSizeAttributeLocation,
			1,
			this.gl.FLOAT,
			false,
			6 * Float32Array.BYTES_PER_ELEMENT,
			2 * Float32Array.BYTES_PER_ELEMENT
		);
		this.gl.vertexAttribPointer(
			isHighlightedAttributeLocation,
			1,
			this.gl.FLOAT,
			false,
			6 * Float32Array.BYTES_PER_ELEMENT,
			3 * Float32Array.BYTES_PER_ELEMENT
		);
		this.gl.vertexAttribPointer(
			rabbitSexAttributeLocation,
			1,
			this.gl.FLOAT,
			false,
			6 * Float32Array.BYTES_PER_ELEMENT,
			4 * Float32Array.BYTES_PER_ELEMENT
		);
		this.gl.vertexAttribPointer(
			rabbitTextureIndexAttributeLocation,
			1,
			this.gl.FLOAT,
			false,
			6 * Float32Array.BYTES_PER_ELEMENT,
			5 * Float32Array.BYTES_PER_ELEMENT
		);

		this.gl.enableVertexAttribArray(positionAttributeLocation);
		this.gl.enableVertexAttribArray(rabbitSizeAttributeLocation);
		this.gl.enableVertexAttribArray(isHighlightedAttributeLocation);
		this.gl.enableVertexAttribArray(rabbitSexAttributeLocation);
		this.gl.enableVertexAttribArray(rabbitTextureIndexAttributeLocation);
	}

	loadTexture() {
		const malePromises = [];
		for (let i = 0; i < MALE_TEXTURES_NUMBER; i++) {
			malePromises.push(
				new Promise((resolve) => {
					const maleImage = new Image();
					maleImage.src = `./icons/rabbit${i}.png`;
					maleImage.onload = function () {
						resolve(this.bindTexture(maleImage));
					}.bind(this);
				})
			);
		}

		const femalePromises = [];
		for (let i = 0; i < FEMALE_TEXTURES_NUMBER; i++) {
			femalePromises.push(
				new Promise((resolve) => {
					const femaleImage = new Image();
					femaleImage.src = `./icons/female-rabbit${i}.png`;
					femaleImage.onload = function () {
						resolve(this.bindTexture(femaleImage));
					}.bind(this);
				})
			);
		}

		Promise.all(malePromises).then((results) => {
			this.gl.useProgram(this.program);
			const imageLocation = this.gl.getUniformLocation(
				this.program,
				'uTextureMale'
			);
			this.gl.uniform1iv(imageLocation, new Float32Array(results));
		});
		Promise.all(femalePromises).then((results) => {
			this.gl.useProgram(this.program);
			const imageLocation = this.gl.getUniformLocation(
				this.program,
				'uTextureFemale'
			);
			this.gl.uniform1iv(imageLocation, new Float32Array(results));
		});
	}

	bindTexture(image) {
		this.gl.useProgram(this.program);
		const texture = this.gl.createTexture();
		const textureRegistry = this.global.nextTextureRegistry;

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

		this.global.nextTextureRegistry += 1;
		return textureRegistry;
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

		this.rawData = new Float32Array(this.amount * 6);
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
				x > rabbit.state.position[0] - rabbit.state.projectedSize / 4.0 &&
				x < rabbit.state.position[0] + rabbit.state.projectedSize / 4.0 &&
				y > rabbit.state.position[1] - rabbit.state.projectedSize / 4.0 &&
				y < rabbit.state.position[1] + rabbit.state.projectedSize / 4.0
		);

		return rabbit;
	}

	draw() {
		const aliveRabbits = this.rabbits.filter((rabbit) => rabbit.state.alive);

		for (let i = 0; i < aliveRabbits.length; i++) {
			aliveRabbits[i].live();
			const rabbit = aliveRabbits[i].toArray();
			[
				this.rawData[6 * i],
				this.rawData[6 * i + 1],
				this.rawData[6 * i + 2],
				this.rawData[6 * i + 3],
				this.rawData[6 * i + 4],
				this.rawData[6 * i + 5],
			] = rabbit;
		}

		this.gl.useProgram(this.program);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
		this.gl.bindVertexArray(this.vao);

		this.gl.bufferData(this.gl.ARRAY_BUFFER, this.rawData, this.gl.STATIC_DRAW);
		this.gl.drawArrays(this.gl.POINTS, 0, aliveRabbits.length);

		const deadRabbits = this.rabbits.filter((rabbit) => !rabbit.state.alive);

		deadRabbits.forEach((rabbit) => {
			this.obituary[rabbit.state.deathReason] += 1;
			this.rabbits.splice(this.rabbits.indexOf(rabbit), 1);
		});

		const pregnantRabbits = this.rabbits.filter(
			(rabbit) => rabbit.state.pregnant && rabbit.state.stats.pregnancy > 100
		);

		pregnantRabbits.forEach((rabbit) => {
			for (let i = 0; i < rabbit.config.inheritableProps.descendants; i++) {
				this.rabbits.push(
					new Rabbit(
						rabbit.state.position[0] + Math.floor((2 * Math.random() - 1) * 5),
						rabbit.state.position[1] + Math.floor((2 * Math.random() - 1) * 5),
						this.environment,
						this.foodSources,
						this,
						rabbit.getGenes(),
						rabbit.getParentsTextures()
					)
				);
			}

			rabbit.state.pregnant = false;
			rabbit.state.childbirths += 1;
			rabbit.state.fatherProps = undefined;
			rabbit.state.stats.pregnancy = 0;
		});

		if (pregnantRabbits || deadRabbits) {
			this.rawData = new Float32Array(this.rabbits.length * 6);
		}
	}
}
