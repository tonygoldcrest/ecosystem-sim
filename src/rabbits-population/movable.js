import { scaleByDeltaTime } from '../helpers.js';
import { ACTIVITIES, DEATH_REASONS } from './constants.js';

export default class Movable {
	updateVelocityBasedOnPath() {
		if (!this.currentPath) {
			return;
		}

		if (!this.tmpPathNode) {
			this.tmpPathNode = this.currentPath.pop();
			this.currentPathNode = this.tmpPathNode;
		}

		while (
			this.tmpPathNode &&
			Math.abs(glMatrix.vec2.distance(this.state.position, this.tmpPathNode)) <
				12
		) {
			this.currentPathNode = this.tmpPathNode;
			this.tmpPathNode = this.currentPath.pop();
		}

		if (this.currentPathNode && this.currentPathNode !== this.prevPathNode) {
			this.setDirection(
				this.currentPathNode[0] - this.state.position[0],
				this.currentPathNode[1] - this.state.position[1]
			);
			this.prevPathNode = this.currentPathNode;
		} else if (!this.currentPathNode) {
			this.wander();
		}
	}

	calculateMovement() {
		const coefficient = Math.max(
			0,
			2 *
				Math.sin(
					10 * Math.PI * this.config.seed +
						(global.speedUpFactor *
							this.state.speed *
							global.timeFromStart *
							1000) /
							200
				)
		);

		const movement = glMatrix.vec2.fromValues(...this.state.velocity);
		glMatrix.vec2.scale(movement, movement, scaleByDeltaTime(coefficient));

		return {
			coefficient,
			movement,
		};
	}

	move() {
		const { coefficient, movement } = this.calculateMovement();

		if (
			coefficient === 0 &&
			!this.state.activity &&
			!this.state.isNewDirectionSet
		) {
			this.wander();
			this.state.isNewDirectionSet = true;
		}

		if (coefficient > 0) {
			this.state.isNewDirectionSet = false;
		}

		glMatrix.vec2.add(this.state.position, this.state.position, movement);
		this.state.projectedSize = this.state.size + 5 * coefficient;
	}

	startMoving() {
		this.state.speed = this.config.inheritableProps.baseSpeed;

		this.state.velocity = glMatrix.vec2.fromValues(
			Math.random() * 2 - 1,
			Math.random() * 2 - 1
		);
		glMatrix.vec2.normalize(this.state.velocity, this.state.velocity);

		this.wander();
	}

	startWandering() {
		this.state.activity = ACTIVITIES.NONE;
		this.wander();
	}

	wander() {
		if (glMatrix.vec2.exactEquals(this.state.velocity, [0, 0])) {
			return;
		}

		this.state.speed = this.config.inheritableProps.baseSpeed;

		const angle =
			noise.perlin3(
				this.state.initialPosition[0],
				this.state.initialPosition[1],
				scaleByDeltaTime(global.timeFromStart / 10)
			) *
			2 *
			Math.PI;

		if (!this.state.prevAngle) {
			this.state.prevAngle = angle;
		}

		glMatrix.vec2.rotate(
			this.state.velocity,
			this.state.velocity,
			[0, 0],
			this.state.prevAngle - angle
		);
		glMatrix.vec2.normalize(this.state.velocity, this.state.velocity);
		glMatrix.vec2.scale(
			this.state.velocity,
			this.state.velocity,
			0.1 * this.state.speed
		);

		this.state.prevAngle = angle;
		this.state.activity = ACTIVITIES.NONE;
	}

	setDirection(x, y) {
		this.state.velocity = glMatrix.vec2.fromValues(x, y);
		glMatrix.vec2.normalize(this.state.velocity, this.state.velocity);
		glMatrix.vec2.scale(
			this.state.velocity,
			this.state.velocity,
			0.1 * this.state.speed
		);
	}

	stop() {
		this.state.previousVelocity = [...this.state.velocity];
		this.state.speed = 0.7;
		glMatrix.vec2.zero(this.state.velocity);
	}

	scheduleRotateVelocityAndMove(velX, velY) {
		if (this.state.rotateVelocityAndMoveTimeout) {
			clearTimeout(this.state.rotateVelocityAndMoveTimeout);
		}

		this.state.rotateVelocityAndMoveTimeout = setTimeout(() => {
			this.state.rotateVelocityAndMoveTimeout = undefined;

			this.state.velocity = glMatrix.vec2.fromValues(velX, velY);

			glMatrix.vec2.normalize(this.state.velocity, this.state.velocity);

			glMatrix.vec2.rotate(
				this.state.velocity,
				this.state.velocity,
				[0, 0],
				Math.PI
			);

			this.wander();
		}, Math.floor((Math.random() * 500) / scaleByDeltaTime(1)));
	}

	scheduleStartMovingWithRandomVelocity() {
		if (this.state.restartMovementTimeout) {
			clearTimeout(this.state.restartMovementTimeout);
		}

		this.state.restartMovementTimeout = setTimeout(() => {
			this.state.restartMovementTimeout = undefined;
			this.startMoving();
		}, Math.floor((Math.random() * 5000) / scaleByDeltaTime(1)));
	}

	checkEnvironment() {
		const { movement } = this.calculateMovement();
		const nextPosition = glMatrix.vec2.fromValues(0, 0);
		glMatrix.vec2.add(nextPosition, this.state.position, movement);

		// going for water infinite

		if (
			(nextPosition[0] < 0 && this.state.velocity[0] < 0) ||
			(nextPosition[0] > this.environment.width &&
				this.state.velocity[0] > 0) ||
			(nextPosition[1] < 0 && this.state.velocity[1] < 0) ||
			(nextPosition[1] > this.environment.height &&
				this.state.velocity[1] > 0) ||
			this.environment.isWater(
				Math.floor(nextPosition[0]),
				Math.floor(nextPosition[1])
			)
		) {
			if (this.state.activity !== ACTIVITIES.FETCHING_WATER) {
				this.stop();
				this.scheduleRotateVelocityAndMove(...this.state.previousVelocity);
			} else {
				this.state.activity = ACTIVITIES.DRINKING;
				this.stop();
			}
		}

		if (
			this.state.position[0] < 0 ||
			this.state.position[0] > this.environment.width ||
			this.state.position[1] < 0 ||
			this.state.position[1] > this.environment.height
		) {
			this.die(DEATH_REASONS.OUT_OF_BOUNDS);
		} else if (
			this.environment.isWater(
				Math.floor(this.state.position[0]),
				Math.floor(this.state.position[1])
			)
		) {
			// console.log(nextPosition);
			// if (!this.state.highlighted) {
			// this.state.highlighted = 1;
			// setTimeout(() => {
			// this;
			// nextPosition;
			// debugger;
			// }, 40);
			// }
			this.die(DEATH_REASONS.DRAWN);
		}
	}
}
