import Environment from './environment/index.js';
import FoodSources from './food-sources/index.js';
import { resizeCanvasToDisplaySize, hexToRgb } from './helpers.js';
import {
	updateObituary,
	updatePopulationSize,
	updateStats,
} from './rabbit-stats.js';
import RabbitPopulation from './rabbits-population/index.js';

class Game {
	constructor() {
		this.canvas = document.querySelector('#canvas');

		/** @type {WebGL2RenderingContext} */
		this.gl = this.canvas.getContext('webgl2');

		this.dayNightCycle = false;

		this.global = {
			nextTextureRegistry: 0,
			gl: this.gl,
		};

		window.global = this.global;
	}

	async setupGl() {
		resizeCanvasToDisplaySize(this.gl.canvas, 2);

		this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

		this.mProjection = glMatrix.mat3.create();

		glMatrix.mat3.projection(
			this.mProjection,
			this.gl.canvas.clientWidth,
			this.gl.canvas.clientHeight
		);
	}

	async start() {
		await this.setupGl();

		this.environment = new Environment(this.gl, this.mProjection);
		this.foodSources = new FoodSources(
			this.gl,
			this.mProjection,
			this.environment,
			this.global
		);
		this.rabbitsPopulation = new RabbitPopulation(
			this.gl,
			this.mProjection,
			this.environment,
			this.foodSources,
			this.global
		);

		this.stats = new Stats();
		this.stats.showPanel(0);
		document.body.appendChild(this.stats.dom);

		const backgroundColorRgb = hexToRgb('#E7BF81');
		this.gl.clearColor(
			backgroundColorRgb.r,
			backgroundColorRgb.g,
			backgroundColorRgb.b,
			1.0
		);

		await this.environment.loading;
		await this.foodSources.loading;
		await this.rabbitsPopulation.loading;

		this.canvas.addEventListener('mousedown', (event) => {
			const rabbit = this.rabbitsPopulation.getRabbitAt(
				event.offsetX,
				event.offsetY
			);

			if (rabbit) {
				if (this.highlightedRabbit) {
					this.highlightedRabbit.state.highlighted = 0.0;
				}
				this.highlightedRabbit = rabbit;
				rabbit.state.highlighted = 1.0;
			} else {
				if (this.highlightedRabbit) {
					this.highlightedRabbit.state.highlighted = 0.0;
				}
				this.highlightedRabbit = undefined;
			}
		});

		this.startTime = Date.now();

		this.draw();
	}

	draw() {
		this.stats.begin();
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		let currentTime = 1;
		if (this.dayNightCycle) {
			currentTime = Math.max(
				0.3,
				Math.min(1, Math.sin((Date.now() - this.startTime) / 10000) + 0.7)
			);
		}
		this.environment.updateTime(currentTime);
		this.rabbitsPopulation.updateTime(currentTime);
		this.foodSources.updateTime(currentTime);

		this.environment.draw();
		this.rabbitsPopulation.draw();
		this.foodSources.draw();

		updateStats(this.highlightedRabbit);
		updatePopulationSize(this.rabbitsPopulation.rabbits.length);
		updateObituary(this.rabbitsPopulation.obituary);

		this.stats.end();
		requestAnimationFrame(this.draw.bind(this));
	}
}

const game = new Game();
game.start();
