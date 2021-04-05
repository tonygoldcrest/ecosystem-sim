import GLProgram from '../gl-program/index.js';
import { hexToRgb, smoothstep } from '../helpers.js';
import Tile from './tile.js';
import Heapify from '../../libs/heapify.mjs';

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
			this.assignTextureToUniform();
		});
	}

	async assignTextureToUniform() {
		const { registry } = await this.loadTexture(this.generateImage());

		this.gl.useProgram(this.program);
		this.gl.bindVertexArray(this.vao);
		const imageLocation = this.gl.getUniformLocation(this.program, 'uTexture');
		this.gl.uniform1i(imageLocation, registry);
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
				let tileType;
				if (global.generationType === 'island') {
					const length =
						4 *
						Math.sqrt(
							(i / this.rowsNumber - 0.5) ** 2 +
								(j / this.columnsNumber - 0.5) ** 2
						);

					let noiseValue =
						noise.simplex2(j / (3 * noiseScale), i / (3 * noiseScale)) +
						noise.simplex2(j / (2 * noiseScale), i / (2 * noiseScale)) +
						noise.simplex2(j / noiseScale, i / noiseScale) +
						noise.simplex2((2 * j) / noiseScale, (2 * i) / noiseScale) +
						noise.simplex2((3 * j) / noiseScale, (3 * i) / noiseScale);

					noiseValue -= length * 3.1;

					if (noiseValue < -5) {
						tileType = 'water';
					} else if (noiseValue < -4.5) {
						tileType = 'sand';
					} else if (noiseValue < -3) {
						tileType = 'grass';
					} else if (noiseValue < -1.0) {
						tileType = 'darkGrass';
					} else if (noiseValue < -0.8) {
						tileType = 'dirt';
					} else {
						tileType = 'water';
					}
				} else if (global.generationType === 'map') {
					const noiseValue = noise.simplex2(j / noiseScale, i / noiseScale);

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
				}

				this.tiles[i * this.columnsNumber + j] = new Tile(
					i * this.columnsNumber + j,
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

	getRandomGrassTileWithinRadius(x, y, radius) {
		const mapX = Math.floor((x - this.columnOffset) / this.side);
		const mapY = Math.floor((y - this.rowOffset) / this.side);

		const minY = Math.max(0, mapY - radius);
		const maxY = Math.min(mapY + radius, this.rowsNumber - 1);
		const minX = Math.max(0, mapX - radius);
		const maxX = Math.min(mapX + radius, this.columnsNumber - 1);

		const minIndex = this.columnsNumber * minY + minX;
		const maxIndex = this.columnsNumber * maxY + maxX;

		const grassTiles = this.tiles
			.slice(minIndex, maxIndex)
			.filter((tile) => tile.type === 'grass' || tile.type === 'darkGrass');

		console.log(grassTiles.length, minIndex, maxIndex);

		return grassTiles[Math.floor(Math.random() * grassTiles.length)];
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

	getPathToTile(fromX, fromY, toTile) {
		const mapFromX = Math.floor((fromX - this.columnOffset) / this.side);
		const mapFromY = Math.floor((fromY - this.rowOffset) / this.side);
		const fromTile = this.tiles[this.columnsNumber * mapFromY + mapFromX];

		if (!fromTile || !toTile) {
			return null;
		}

		return this.aStar(fromTile, toTile, glMatrix.vec2.distance);
	}

	getPath(fromX, fromY, toX, toY) {
		const mapFromX = Math.floor((fromX - this.columnOffset) / this.side);
		const mapFromY = Math.floor((fromY - this.rowOffset) / this.side);
		const mapToX = Math.floor((toX - this.columnOffset) / this.side);
		const mapToY = Math.floor((toY - this.rowOffset) / this.side);
		const fromTile = this.tiles[this.columnsNumber * mapFromY + mapFromX];
		const toTile = this.tiles[this.columnsNumber * mapToY + mapToX];

		if (!fromTile || !toTile) {
			return null;
		}

		return this.aStar(fromTile, toTile, glMatrix.vec2.distance);
	}

	hasWaterBetweenPoints(fromX, fromY, toX, toY) {
		const fromVec = glMatrix.vec2.fromValues(fromX, fromY);
		const toVec = glMatrix.vec2.fromValues(toX, toY);

		const path = glMatrix.vec2.create();

		glMatrix.vec2.subtract(path, toVec, fromVec);

		const length = glMatrix.vec2.length(path);

		const increment = this.side;

		for (let i = 0; i < length / increment; i++) {
			const normPath = glMatrix.vec2.create();
			glMatrix.vec2.normalize(normPath, path);
			glMatrix.vec2.scale(normPath, normPath, i * increment);
			glMatrix.vec2.add(normPath, fromVec, normPath);
			const tileX = Math.floor((normPath[0] - this.columnOffset) / this.side);
			const tileY = Math.floor((normPath[1] - this.rowOffset) / this.side);

			if (this.tiles[this.columnsNumber * tileY + tileX].type === 'water') {
				return true;
			}
		}

		return false;
	}

	getTile(column, row) {
		return row < 0 ||
			row > this.rowsNumber - 1 ||
			column < 0 ||
			column > this.columnsNumber - 1
			? undefined
			: this.tiles[row * this.columnsNumber + column];
	}

	tileNeighbours(id) {
		const row = Math.floor(id / this.columnsNumber);
		const column = Math.floor(id % this.columnsNumber);

		return [
			this.getTile(column - 1, row - 1),
			this.getTile(column, row - 1),
			this.getTile(column + 1, row - 1),
			this.getTile(column - 1, row),
			this.getTile(column + 1, row),
			this.getTile(column - 1, row + 1),
			this.getTile(column, row + 1),
			this.getTile(column + 1, row + 1),
		];
	}

	reconstructPath(cameFrom, current) {
		const totalPath = [this.tiles[current]];

		const keys = Object.keys(cameFrom).map((key) => parseInt(key));

		while (keys.includes(current)) {
			current = cameFrom[current];
			totalPath.push(this.tiles[current]);
		}

		return totalPath;
	}

	aStar(from, to, dist) {
		const queue = new Heapify(1000);

		const startFscore = Math.abs(dist(from.toVec(), to.toVec()));
		queue.push(from.id, startFscore);

		const cameFrom = {};

		const gScore = { [from.id]: 0 };
		const fScore = { [from.id]: startFscore };

		while (queue.size) {
			const current = queue.pop();

			if (current === to.id) {
				return this.reconstructPath(cameFrom, current);
			}

			const neighbours = this.tileNeighbours(current);

			for (let i = 0; i < neighbours.length; i++) {
				if (!neighbours[i]) {
					continue;
				}
				const tentativeGscore = gScore[current] + 1;

				if (
					tentativeGscore < gScore[neighbours[i].id] ||
					typeof gScore[neighbours[i].id] === 'undefined'
				) {
					cameFrom[neighbours[i].id] = current;
					gScore[neighbours[i].id] = tentativeGscore;
					fScore[neighbours[i].id] =
						gScore[neighbours[i].id] +
						Math.abs(dist(neighbours[i].toVec(), to.toVec()));

					queue.push(neighbours[i].id, fScore[neighbours[i].id]);
				}
			}
		}

		return null;
	}
}
