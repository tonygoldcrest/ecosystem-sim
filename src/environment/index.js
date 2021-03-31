import GLProgram from '../gl-program/index.js';
import Tile from './tile.js';

export default class Environment extends GLProgram {
	constructor(gl, uMatrix) {
		super(gl);

		this.uMatrix = uMatrix;

		this.width = this.gl.canvas.clientWidth;
		this.height = this.gl.canvas.clientHeight;

		this.rowsNumber = 400;
		this.side = this.height / this.rowsNumber;
		this.columnsNumber = Math.floor(this.width / this.side);
		this.rowOffset = (this.height - this.side * this.rowsNumber) / 2;
		this.columnOffset = (this.width - this.side * this.columnsNumber) / 2;

		this.tiles = new Array(this.columnsNumber * this.rowsNumber);

		this.generateTiles();
		this.loading = Promise.all([this.setupProgram()]);
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
		const tileColorAttributeLocation = this.gl.getAttribLocation(
			this.program,
			'aTileColor'
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
			tileColorAttributeLocation,
			3,
			this.gl.FLOAT,
			false,
			5 * Float32Array.BYTES_PER_ELEMENT,
			2 * Float32Array.BYTES_PER_ELEMENT
		);

		this.gl.enableVertexAttribArray(positionAttributeLocation);
		this.gl.enableVertexAttribArray(tileColorAttributeLocation);
	}

	setupUniforms() {
		super.setupUniforms();
		const tileSizeLocation = this.gl.getUniformLocation(
			this.program,
			'uTileSize'
		);
		const matrixLocation = this.gl.getUniformLocation(this.program, 'uMatrix');

		this.gl.uniform1f(tileSizeLocation, 2 * this.side);
		this.gl.uniformMatrix3fv(matrixLocation, false, this.uMatrix);
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

		this.rawData = new Float32Array(
			this.tiles.map((tile) => tile.toArray()).flat()
		);
	}

	getRandomGroundTile() {
		const groundTiles = this.tiles.filter((tile) => tile.type !== 'water');

		return groundTiles[Math.floor(Math.random() * groundTiles.length)];
	}

	getRandomGrassTile() {
		const groundTiles = this.tiles.filter(
			(tile) => tile.type === 'grass' || tile.type === 'darkGrass'
		);

		return groundTiles[Math.floor(Math.random() * groundTiles.length)];
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
		const minY = mapY - radius < 0 ? 0 : mapY - radius;
		const maxY =
			mapY + radius >= this.rowsNumber - 1
				? this.rowsNumber - 1
				: mapY + radius;
		const minX = mapX - radius < 0 ? 0 : mapX - radius;
		const maxX =
			mapX + radius >= this.columnsNumber - 1
				? this.columnsNumber - 1
				: mapX + radius;

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
		this.gl.drawArrays(this.gl.POINTS, 0, this.tiles.length);
	}
}
