import GLProgram from '../gl-program/index.js';
import { hexToRgb } from '../helpers.js';
import Tile from './tile.js';

export default class Environment extends GLProgram {
	constructor(gl, uMatrix) {
		super(gl);

		this.uMatrix = uMatrix;

		this.width = this.gl.canvas.clientWidth;
		this.height = this.gl.canvas.clientHeight;

		this.rowsNumber = 500;
		this.side = this.height / this.rowsNumber;
		this.columnsNumber = Math.floor(this.width / this.side);
		this.rowOffset = (this.height - this.side * this.rowsNumber) / 2;
		this.columnOffset = (this.width - this.side * this.columnsNumber) / 2;

		this.tiles = new Array(this.columnsNumber * this.rowsNumber);

		this.loading = Promise.all([this.setupProgram()]);

		this.generateTiles();

		this.loading.then(() => {
			this.loadTexture(this.generateImage());
		});
	}

	async setupProgram() {
		await super.setupProgram(
			'./src/environment/shaders/vertex.glsl',
			'./src/environment/shaders/fragment.glsl'
		);

		this.buffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);

		this.setupAttributes();
		this.setupUniforms();
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
			0,
			0
		);

		this.gl.enableVertexAttribArray(positionAttributeLocation);
	}

	setupUniforms() {
		super.setupUniforms();
		const colorLocation = this.gl.getUniformLocation(this.program, 'uColor');
		const matrixLocation = this.gl.getUniformLocation(this.program, 'uMatrix');
		this.imageLocation = this.gl.getUniformLocation(this.program, 'uTexture');
		const resolutionLocation = this.gl.getUniformLocation(
			this.program,
			'uResolution'
		);

		const backgroundColorRgb = hexToRgb('#000000');

		this.gl.uniform3f(
			colorLocation,
			backgroundColorRgb.r,
			backgroundColorRgb.g,
			backgroundColorRgb.b
		);

		this.gl.uniformMatrix3fv(matrixLocation, false, this.uMatrix);
		this.gl.uniform2f(
			resolutionLocation,
			this.gl.canvas.clientWidth,
			this.gl.canvas.clientHeight
		);
	}

	generateTiles() {
		noise.seed(Math.random());
		const noiseScale = this.rowsNumber / 2;

		for (let i = 0; i < this.rowsNumber; i++) {
			for (let j = 0; j < this.columnsNumber; j++) {
				const noiseValue = noise.simplex2(j / noiseScale, i / noiseScale);
				let tileType;
				if (noiseValue < -0.8) {
					tileType = 'dirt';
				} else if (noiseValue < -0.5) {
					tileType = 'darkGrass';
				} else if (noiseValue < 0.2) {
					tileType = 'grass';
				} else if (noiseValue < 0.4) {
					tileType = 'sand';
				} else {
					tileType = 'water';
				}

				this.tiles[i * this.columnsNumber + j] = new Tile(
					this.side / 2 + j * this.side + this.columnOffset,
					this.side / 2 + i * this.side + this.rowOffset,
					tileType
				);
			}
		}

		this.rawData = new Float32Array(this.getTriangles());
	}

	generateImage() {
		const canvas = document.createElement('canvas');
		canvas.width = this.gl.canvas.clientWidth - 2 * this.columnOffset;
		canvas.height = this.gl.canvas.clientHeight - 2 * this.rowOffset;
		const ctx = canvas.getContext('2d');

		for (let x = 0; x < canvas.width; x++) {
			for (let y = 0; y < canvas.height; y++) {
				const mapX = Math.floor((x + this.columnOffset) / this.side);
				const mapY = Math.floor((y + this.rowOffset) / this.side);

				const index = this.columnsNumber * mapY + mapX;

				ctx.fillStyle = this.tiles[index] ? this.tiles[index].colorHex : '#fff';
				ctx.fillRect(x, y, 1, 1);
			}
		}

		return canvas.toDataURL('image/png');
	}

	loadTexture(src) {
		const image = new Image();
		image.src = src;
		image.onload = function () {
			this.bindTexture(image);
		}.bind(this);
	}

	bindTexture(image) {
		const texture = this.gl.createTexture();

		this.gl.activeTexture(this.gl.TEXTURE0 + global.nextTextureRegistry);
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

		this.gl.useProgram(this.program);
		this.gl.bindVertexArray(this.vao);
		const imageLocation = this.gl.getUniformLocation(this.program, 'uTexture');
		this.gl.uniform1i(imageLocation, global.nextTextureRegistry);

		global.nextTextureRegistry += 1;
	}

	getRandomGroundTile() {
		if (!this.groundTiles) {
			this.groundTiles = this.tiles.filter((tile) => tile.type !== 'water');
		}

		return this.groundTiles[
			Math.floor(Math.random() * this.groundTiles.length)
		];
	}

	getRandomGrassTile() {
		if (!this.grassTiles) {
			this.grassTiles = this.tiles.filter(
				(tile) => tile.type === 'grass' || tile.type === 'darkGrass'
			);
		}

		return this.grassTiles[Math.floor(Math.random() * this.grassTiles.length)];
	}

	isWater(x, y) {
		const mapX = Math.floor((x - this.columnOffset) / this.side);
		const mapY = Math.floor((y - this.rowOffset) / this.side);

		const index = this.columnsNumber * mapY + mapX;

		return this.tiles[index] && this.tiles[index].type === 'water';
	}

	getClosestWater(x, y, radius) {
		const mapX = Math.floor((x - this.columnOffset) / this.side);
		const mapY = Math.floor((y - this.rowOffset) / this.side);

		let closestWater;
		let currentMin = 1000;
		const minY = Math.max(0, mapY - radius);
		const maxY = Math.min(mapY + radius, this.rowsNumber - 1);
		const minX = Math.max(0, mapX - radius);
		const maxX = Math.min(mapX + radius, this.columnsNumber - 1);

		for (let i = minY; i <= maxY; i++) {
			for (let j = minX; j <= maxX; j++) {
				const index = this.columnsNumber * i + j;

				if (this.tiles[index] && this.tiles[index].type === 'water') {
					const distance = Math.sqrt((j - mapX) ** 2 + (i - mapY) ** 2);

					if (distance < currentMin) {
						currentMin = distance;
						closestWater = this.tiles[index];
					}
				}
			}
		}

		return closestWater ? [closestWater.x, closestWater.y] : undefined;
	}

	draw() {
		this.gl.useProgram(this.program);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
		this.gl.bindVertexArray(this.vao);

		this.gl.bufferData(this.gl.ARRAY_BUFFER, this.rawData, this.gl.STATIC_DRAW);
		this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
	}

	getTriangles() {
		// prettier-ignore
		return [
			this.columnOffset, this.rowOffset,
			this.gl.canvas.clientWidth - this.columnOffset, this.rowOffset,
			this.columnOffset, this.gl.canvas.clientHeight - this.rowOffset,
			this.gl.canvas.clientWidth - this.columnOffset, this.rowOffset,
			this.columnOffset, this.gl.canvas.clientHeight - this.rowOffset,
			this.gl.canvas.clientWidth - this.columnOffset, this.gl.canvas.clientHeight - this.rowOffset,
		];
	}
}
