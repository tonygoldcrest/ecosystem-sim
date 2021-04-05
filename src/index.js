import Environment from './environment/index.js';
import FoodSources from './food-sources/index.js';
import { resizeCanvasToDisplaySize, hexToRgb } from './helpers.js';
import {
	updateObituary,
	updateGlobalStats,
	updateStats,
} from './rabbit-stats.js';
import RabbitPopulation from './rabbits-population/index.js';
import initSpeedControl from './speed-control.js';

class Game {
	constructor() {
		this.canvas = document.querySelector('#canvas');

		/** @type {WebGL2RenderingContext} */
		this.gl = this.canvas.getContext('webgl2');

		this.dayNightCycle = false;

		this.global = {
			nextTextureRegistry: 0,
			gl: this.gl,
			deltaTime: 0,
			simulationTime: 0,
			generationType: 'island',
			timeFromStart: 0,
			speedUpFactor: 1,
		};

		window.global = this.global;
	}

	async setupGl() {
		resizeCanvasToDisplaySize(this.gl.canvas, 2);

		this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

		this.gl.enable(this.gl.BLEND);
		this.gl.disable(this.gl.DEPTH_TEST);
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

		// requestAnimationFrame(this.draw.bind(this));
		//
		this.limitFps(144);
	}

	draw(now) {
		if (!this.frameEndTime) {
			this.frameEndTime = now;
		}
		// if (this.global.timeFromStart > 1000) {
		// this.global.timeFromStart = 0;
		// }

		this.global.deltaTime = (now - this.frameEndTime) / 1000;

		if (this.global.deltaTime > 0.1) {
			this.global.deltaTime = 0;
		}

		if (this.rabbitsPopulation.rabbits.length) {
			this.global.simulationTime +=
				this.global.deltaTime * this.global.speedUpFactor;
		}

		// this.global.timeFromStart += this.global.deltaTime;
		this.global.timeFromStart = (Date.now() - this.startTime) / 1000;

		this.stats.begin();
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		this.environment.draw();
		this.rabbitsPopulation.draw();
		this.foodSources.draw();

		updateStats(this.highlightedRabbit);
		updateGlobalStats(this.rabbitsPopulation.rabbits.length);
		updateObituary(this.rabbitsPopulation.obituary);

		this.stats.end();
		// requestAnimationFrame(this.draw.bind(this));
		this.frameEndTime = now;
	}

	limitFps(fps) {
		this.fpsInterval = 1000 / fps;
		this.then = Date.now();
		requestAnimationFrame(this.animateWithLimitedFps.bind(this));
	}

	animateWithLimitedFps(now) {
		requestAnimationFrame(this.animateWithLimitedFps.bind(this));

		this.now = Date.now();
		this.elapsed = this.now - this.then;

		if (this.elapsed > this.fpsInterval) {
			this.then = this.now - (this.elapsed % this.fpsInterval);

			this.draw(now);
		}
	}
}

const game = new Game();

const playButton = document.getElementById('play-button');
const underlay = document.getElementById('underlay');

playButton.addEventListener('click', () => {
	playButton.style.display = 'none';
	underlay.style.display = 'flex';
	setTimeout(() => {
		initSpeedControl();
		game.start();
	}, 30);
});
