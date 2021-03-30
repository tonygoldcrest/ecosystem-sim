import names from '../names.js';

export const NEEDS_ENUM = {
	NONE: 0,
	WATER: 1,
	FOOD: 2,
	MATE: 3,
};

export const SEX = {
	MALE: 0,
	FEMALE: 1,
};

export default class Rabbit {
	constructor(x, y, environment, foodSources, population) {
		this.config = {
			name: names[Math.floor(Math.random() * names.length)],
			minSize: 40,
			maxSize: 20,
			maxAge: 80,
			descendants: 1 + Math.floor(7 * Math.random()),
			seed: Math.random(),
			baseWaterSearchThreshold: 60,
			baseFoodSearchThreshold: 60,
			sex: Math.random() <= 0.5 ? SEX.MALE : SEX.FEMALE,
			maxAgeInMilliseconds: 1000 * 60 * 5 + 1000 * 60 * 1 * Math.random(),
		};
		this.state = {
			activity: NEEDS_ENUM.NONE,
			isMating: false,
			stats: {
				water: 60 + Math.floor(30 * Math.random()),
				food: 40 + Math.floor(30 * Math.random()),
				mate: 0,
				pregnancy: 0,
			},
			size: 20,
			alive: true,
			birthday: Date.now(),
			pregnant: false,
			speed: 1,
			highlighted: 0,
			currentAge: 0,
			projectedSize: 20,
			waterSearchThreshold:
				this.config.baseWaterSearchThreshold + Math.floor(20 * Math.random()),
			foodSearchThreshold:
				this.config.baseFoodSearchThreshold + Math.floor(20 * Math.random()),
			matingThreshold: 50,
			position: glMatrix.vec2.fromValues(x, y),
		};

		this.foodSources = foodSources;
		this.environment = environment;
		this.population = population;

		this.startMoving();
	}

	live() {
		const coeff = Math.max(
			0,
			2 *
				Math.sin(
					Math.PI * this.config.seed + (this.state.speed * Date.now()) / 200
				)
		);
		const movement = glMatrix.vec2.fromValues(...this.state.velocity);

		glMatrix.vec2.scale(movement, movement, coeff);
		glMatrix.vec2.add(this.state.position, this.state.position, movement);
		this.state.projectedSize = this.state.size + 5 * coeff;

		this.updateStats();
		this.checkAge();
		this.checkStats();

		if (this.state.isMating) {
			return;
		}

		if (!this.state.activity && Math.random() < 0.001) {
			this.wander();
		}

		if (
			!this.state.activity &&
			this.state.stats.water < this.state.waterSearchThreshold
		) {
			this.searchForWater();
		}

		if (
			!this.state.activity &&
			this.state.stats.food < this.state.foodSearchThreshold
		) {
			this.searchForFood();
		}

		if (
			!this.state.activity &&
			this.state.stats.mate > this.state.matingThreshold
		) {
			this.searchForFemale();
		}

		if (this.state.activity === NEEDS_ENUM.WATER) {
			this.moveTowardsWater();
		}

		if (this.state.activity === NEEDS_ENUM.FOOD) {
			this.moveTowardsFood();
		}

		if (this.state.activity === NEEDS_ENUM.MATE) {
			this.moveTowardsFemale();
		}

		this.checkEnvironment();
	}

	startMoving() {
		this.state.speed = 1;
		this.state.velocity = glMatrix.vec2.create();
		glMatrix.vec2.random(this.state.velocity, 0.1 * this.state.speed);

		this.updateFieldOfView();
		this.state.activity = NEEDS_ENUM.NONE;
	}

	wander() {
		this.state.speed = 1;

		glMatrix.vec2.rotate(
			this.state.velocity,
			this.state.velocity,
			[0, 0],
			Math.PI / 6 + (Math.random() * Math.PI) / 2
		);

		glMatrix.vec2.normalize(this.state.velocity, this.state.velocity);
		glMatrix.vec2.scale(
			this.state.velocity,
			this.state.velocity,
			0.1 * this.state.speed
		);

		this.updateFieldOfView();
		this.state.activity = NEEDS_ENUM.NONE;
	}

	setDirection(x, y) {
		this.state.velocity = glMatrix.vec2.fromValues(x, y);
		glMatrix.vec2.normalize(this.state.velocity, this.state.velocity);
		glMatrix.vec2.scale(
			this.state.velocity,
			this.state.velocity,
			0.1 * this.state.speed
		);

		this.updateFieldOfView();
	}

	stop() {
		this.state.speed = 1;
		glMatrix.vec2.zero(this.state.velocity);
	}

	updateFieldOfView() {
		this.state.fieldOfView = glMatrix.vec2.fromValues(...this.state.velocity);
		glMatrix.vec2.normalize(this.state.fieldOfView, this.state.fieldOfView);
		glMatrix.vec2.scale(this.state.fieldOfView, this.state.fieldOfView, 30);
	}

	toArray() {
		return [
			this.state.position[0],
			this.state.position[1],
			this.state.projectedSize,
			this.state.highlighted,
			this.config.sex,
		];
	}

	updateStats() {
		this.state.stats.food -= 0.005;
		if (this.config.sex === SEX.MALE) {
			this.state.stats.mate += 0.01;
		}

		if (this.state.pregnant) {
			this.state.stats.pregnancy += 0.01;
		}

		if (!this.state.isDrinking) {
			this.state.stats.water -= 0.01;
		} else {
			this.state.stats.water += 0.1;

			if (this.state.stats.water > 100) {
				this.state.isDrinking = false;
				this.startMoving();
				this.state.activity = NEEDS_ENUM.NONE;
			}
		}
	}

	checkStats() {
		if (this.state.stats.water < 0 || this.state.stats.food < 0) {
			this.state.alive = false;
		}
	}

	searchForWater() {
		this.closestWaterTile = this.environment.getClosestWater(
			this.state.position[0],
			this.state.position[1],
			Math.floor(this.environment.rowsNumber / 15)
		);

		if (this.closestWaterTile) {
			this.state.speed = 2;
			this.setDirection(
				this.closestWaterTile[0] - this.state.position[0],
				this.closestWaterTile[1] - this.state.position[1]
			);

			this.state.activity = NEEDS_ENUM.WATER;
		}
	}

	searchForFood() {
		this.closestFoodSource = this.foodSources.getClosestFoodSource(
			this.state.position[0],
			this.state.position[1],
			60
		);

		if (this.closestFoodSource && !this.closestFoodSource.empty) {
			this.state.speed = 2;
			this.setDirection(
				this.closestFoodSource.x - this.state.position[0],
				this.closestFoodSource.y - this.state.position[1]
			);

			this.state.activity = NEEDS_ENUM.FOOD;
		}
	}

	searchForFemale() {
		this.closestFemale = this.population.getClosestFemale(
			this.state.position[0],
			this.state.position[1],
			100
		);

		if (
			this.closestFemale &&
			!this.closestFemale.state.pregnant &&
			this.closestFemale.state.currentAge > 10
		) {
			this.state.speed = 2;
			this.setDirection(
				this.closestFemale.state.position[0] - this.state.position[0],
				this.closestFemale.state.position[1] - this.state.position[1]
			);

			this.state.activity = NEEDS_ENUM.MATE;

			this.closestFemale.stop();
			this.closestFemale.state.isMating = true;
		}
	}

	moveTowardsWater() {
		const distance = Math.abs(
			glMatrix.vec2.distance(this.state.position, this.closestWaterTile)
		);

		if (distance < 20) {
			this.stop();
			this.state.isDrinking = true;
		} else if (distance > 100) {
			this.state.activity = NEEDS_ENUM.NONE;
			this.wander();
		}
	}

	moveTowardsFood() {
		if (this.closestFoodSource.empty) {
			this.wander();
			this.closestFoodSource = undefined;
			return;
		}

		const distance = Math.abs(
			glMatrix.vec2.distance(this.state.position, [
				this.closestFoodSource.x,
				this.closestFoodSource.y,
			])
		);

		if (distance < 20) {
			this.closestFoodSource.empty = true;
			this.state.stats.food = 100;
			this.closestFoodSource = undefined;
			this.wander();
		} else if (distance > 100) {
			this.wander();
			this.closestFoodSource = undefined;
		}
	}

	moveTowardsFemale() {
		if (this.closestFemale.state.pregnant) {
			this.wander();
			this.closestFemale = undefined;
			return;
		}

		const distance = Math.abs(
			glMatrix.vec2.distance(
				this.state.position,
				this.closestFemale.state.position
			)
		);

		if (distance < 20) {
			this.closestFemale.state.pregnant = true;
			this.closestFemale.state.isMating = false;
			this.closestFemale.startMoving();
			this.closestFemale = undefined;
			this.state.stats.mate = 0;
			this.wander();
		} else if (distance > 200) {
			this.wander();
			this.closestFemale = undefined;
		}
	}

	checkEnvironment() {
		const fieldOfView = glMatrix.vec2.fromValues(...this.state.position);
		glMatrix.vec2.add(fieldOfView, this.state.position, this.state.fieldOfView);

		if (
			fieldOfView[0] < 0 ||
			fieldOfView[0] > this.environment.width ||
			fieldOfView[1] < 0 ||
			fieldOfView[1] > this.environment.height ||
			(this.environment.isWater(
				Math.floor(fieldOfView[0]),
				Math.floor(fieldOfView[1])
			) &&
				this.state.activity !== NEEDS_ENUM.WATER)
		) {
			this.wander();
		}
	}

	checkAge() {
		this.state.currentAge = Math.floor(
			this.config.maxAge *
				((Date.now() - this.state.birthday) / this.config.maxAgeInMilliseconds)
		);

		this.state.size =
			this.config.minSize +
			this.config.maxSize * (this.state.currentAge / this.config.maxAge);
		if (Date.now() - this.state.birthday > this.config.maxAgeInMilliseconds) {
			this.state.alive = false;
		}
	}
}
