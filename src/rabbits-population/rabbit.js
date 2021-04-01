import { scaleByDeltaTime, scaleByResolution } from '../helpers.js';
import names from '../names.js';
import { getInheritableProp } from './helpers.js';

export const ACTIVITIES = {
	NONE: 0,
	FETCHING_WATER: 1,
	DRINKING: 2,
	FETCHING_FOOD: 3,
	MATING: 4,
};

export const DEATH_REASONS = {
	DRAWN: 0,
	STARVATION: 1,
	THIRST: 2,
	AGE: 3,
	OUT_OF_BOUNDS: 4,
	ILLNESS: 5,
};

export const SEX = {
	MALE: 0,
	FEMALE: 1,
};

export default class Rabbit {
	constructor(
		x,
		y,
		environment,
		foodSources,
		population,
		inheritableProps,
		parentTextures
	) {
		this.config = {
			inheritableProps: inheritableProps || {
				baseSpeed: 0.5 + Math.random(),
				descendants: 1 + Math.floor(7 * Math.random()),
				changeDirectionThreshold: Math.random() / 1000,
				maxAge: 60 + Math.floor(Math.random() * 20),
				waterSenseRadius: Math.floor(
					environment.rowsNumber / (7 - 2 * Math.random())
				),
				foodSenseRadius: 90 + Math.floor(20 * Math.random()),
				femaleSenseRadius: 90 + Math.floor(20 * Math.random()),
			},
			name: names[Math.floor(Math.random() * names.length)],
			minSize: 40,
			maxSize: 20,
			seed: Math.random(),
			baseWaterSearchThreshold: 60,
			baseFoodSearchThreshold: 60,
			sex: Math.random() <= 0.5 ? SEX.MALE : SEX.FEMALE,
		};

		if (!parentTextures) {
			this.config.inheritableProps.textureIndex = Math.floor(3 * Math.random());
		} else if (this.config.sex === SEX.MALE) {
			this.config.inheritableProps.textureIndex = parentTextures[0];
		} else {
			this.config.inheritableProps.textureIndex = parentTextures[1];
		}

		this.state = {
			activity: ACTIVITIES.NONE,
			stats: {
				water: 50 + Math.floor(20 * Math.random()),
				food: 40 + Math.floor(20 * Math.random()),
				mate: 0,
				age: 0,
				pregnancy: 0,
			},
			size: 20,
			alive: true,
			birthday: Date.now(),
			impregnated: 0,
			childbirths: 0,
			pregnant: false,
			speed: this.config.inheritableProps.baseSpeed,
			highlighted: 0,
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
		if (!this.state.alive) {
			return;
		}

		this.move();
		this.updateStats();
		this.checkAge();
		this.checkStats();

		if (
			this.state.activity === ACTIVITIES.MATING &&
			this.config.sex === SEX.FEMALE
		) {
			return;
		}

		if (Math.random() < scaleByDeltaTime(0.000005)) {
			this.die(DEATH_REASONS.ILLNESS);
		}

		if (
			!this.state.activity &&
			Math.random() < this.config.inheritableProps.changeDirectionThreshold
		) {
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

		switch (this.state.activity) {
			case ACTIVITIES.FETCHING_WATER:
				this.checkDistanceToWater();
				break;
			case ACTIVITIES.FETCHING_FOOD:
				this.checkDistanceToFood();
				break;
			case ACTIVITIES.MATING:
				if (this.config.sex === SEX.MALE) {
					this.checkDistanceToFemale();
				}
				break;
			default:
				break;
		}

		this.checkEnvironment();
	}

	move() {
		const coeff = Math.max(
			0,
			2 *
				Math.sin(
					2 * Math.PI * this.config.seed + (this.state.speed * Date.now()) / 200
				)
		);
		const movement = glMatrix.vec2.fromValues(...this.state.velocity);

		glMatrix.vec2.scale(movement, movement, scaleByDeltaTime(coeff));
		glMatrix.vec2.add(this.state.position, this.state.position, movement);
		this.state.projectedSize = this.state.size + 5 * coeff;
	}

	startMoving() {
		this.state.speed = this.config.inheritableProps.baseSpeed;
		this.state.velocity = glMatrix.vec2.create();
		glMatrix.vec2.random(this.state.velocity, 0.1 * this.state.speed);

		this.updateFieldOfView();
		this.state.activity = ACTIVITIES.NONE;
	}

	wander(angle = Math.random() * 2 * Math.PI) {
		this.state.speed = this.config.inheritableProps.baseSpeed;

		glMatrix.vec2.rotate(
			this.state.velocity,
			this.state.velocity,
			[0, 0],
			angle
		);

		glMatrix.vec2.normalize(this.state.velocity, this.state.velocity);
		glMatrix.vec2.scale(
			this.state.velocity,
			this.state.velocity,
			0.1 * this.state.speed
		);

		this.updateFieldOfView();
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

		this.updateFieldOfView();
	}

	stop() {
		this.state.speed = this.config.inheritableProps.baseSpeed;
		glMatrix.vec2.zero(this.state.velocity);
	}

	updateFieldOfView() {
		this.state.fieldOfView = glMatrix.vec2.fromValues(...this.state.velocity);
		glMatrix.vec2.normalize(this.state.fieldOfView, this.state.fieldOfView);
		glMatrix.vec2.scale(this.state.fieldOfView, this.state.fieldOfView, 15);
	}

	toArray() {
		return [
			this.state.position[0],
			this.state.position[1],
			this.state.projectedSize,
			this.state.highlighted,
			this.config.sex,
			this.config.inheritableProps.textureIndex,
		];
	}

	updateStats() {
		this.state.stats.age += scaleByDeltaTime(0.002);
		this.state.stats.food -= scaleByDeltaTime(0.012);
		if (this.config.sex === SEX.MALE) {
			this.state.stats.mate += scaleByDeltaTime(0.01);
		}

		if (this.state.pregnant) {
			this.state.stats.pregnancy += scaleByDeltaTime(0.01);
		}

		if (!this.state.isDrinking) {
			this.state.stats.water -= scaleByDeltaTime(0.012);
		} else {
			this.state.stats.water += scaleByDeltaTime(0.1);

			if (this.state.stats.water > 100) {
				this.state.isDrinking = false;
				this.startMoving();
				this.state.activity = ACTIVITIES.NONE;
			}
		}
	}

	die(reason) {
		if (this.closestFemale) {
			this.closestFemale.startMoving();
			this.closestFemale = undefined;
		}

		this.state.alive = false;
		this.state.deathReason = reason;
	}

	checkStats() {
		if (this.state.stats.water < 0) {
			this.die(DEATH_REASONS.THIRST);
		} else if (this.state.stats.food < 0) {
			this.die(DEATH_REASONS.STARVATION);
		}
	}

	searchForWater() {
		this.closestWaterTile = this.environment.getClosestWater(
			this.state.position[0],
			this.state.position[1],
			this.config.inheritableProps.waterSenseRadius
		);

		if (this.closestWaterTile) {
			const distanceToWater = Math.abs(
				glMatrix.vec2.distance(this.state.position, this.closestWaterTile)
			);

			if (distanceToWater > 500) {
				debugger;
			}

			this.state.speed = this.config.inheritableProps.baseSpeed + 1;
			this.setDirection(
				this.closestWaterTile[0] - this.state.position[0],
				this.closestWaterTile[1] - this.state.position[1]
			);

			this.state.activity = ACTIVITIES.FETCHING_WATER;
		}
	}

	searchForFood() {
		this.closestFoodSource = this.foodSources.getClosestFoodSource(
			this.state.position[0],
			this.state.position[1],
			this.config.inheritableProps.foodSenseRadius
		);

		if (this.closestFoodSource && !this.closestFoodSource.empty) {
			this.state.speed = this.config.inheritableProps.baseSpeed + 1;
			this.setDirection(
				this.closestFoodSource.x - this.state.position[0],
				this.closestFoodSource.y - this.state.position[1]
			);

			this.state.activity = ACTIVITIES.FETCHING_FOOD;
		}
	}

	waitForMating() {
		this.stop();
		this.state.activity = ACTIVITIES.MATING;
	}

	impregnate(fatherProps) {
		this.state.pregnant = true;
		this.state.activity = ACTIVITIES.NONE;
		this.state.fatherProps = fatherProps;
		this.startMoving();
	}

	searchForFemale() {
		this.closestFemale = this.population.getClosestFemale(
			this.state.position[0],
			this.state.position[1],
			this.config.inheritableProps.femaleSenseRadius
		);

		if (
			this.closestFemale &&
			!this.closestFemale.state.pregnant &&
			this.closestFemale.state.stats.age > 10
		) {
			this.state.speed = this.config.inheritableProps.baseSpeed + 1;
			this.setDirection(
				this.closestFemale.state.position[0] - this.state.position[0],
				this.closestFemale.state.position[1] - this.state.position[1]
			);

			this.state.activity = ACTIVITIES.MATING;

			this.closestFemale.waitForMating();
		}
	}

	checkDistanceToWater() {
		const distanceToWater = Math.abs(
			glMatrix.vec2.distance(this.state.position, this.closestWaterTile)
		);

		if (distanceToWater < 10) {
			this.stop();
			this.state.isDrinking = true;
		}
	}

	checkDistanceToFood() {
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

		if (distance < 25) {
			this.closestFoodSource.empty = true;
			this.state.stats.food = 100;
			this.closestFoodSource = undefined;
			this.wander();
		}
	}

	checkDistanceToFemale() {
		if (!this.closestFemale) {
			this.wander();
			return;
		}

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
			this.closestFemale.impregnate({ ...this.config.inheritableProps });
			this.closestFemale = undefined;
			this.state.stats.mate = 0;
			this.state.impregnated += 1;
			this.wander();
		} else if (distance > 200) {
			this.wander();
			this.closestFemale.startMoving();
			this.closestFemale = undefined;
		}
	}

	checkEnvironment() {
		const fieldOfView = glMatrix.vec2.fromValues(...this.state.position);
		glMatrix.vec2.add(fieldOfView, this.state.position, this.state.fieldOfView);

		// going for water infinite

		if (
			(fieldOfView[0] < 0 && this.state.velocity[0] < 0) ||
			(fieldOfView[0] > this.environment.width && this.state.velocity[0] > 0)
		) {
			this.state.velocity[0] = -this.state.velocity[0];
			this.state.activity = ACTIVITIES.NONE;
			this.updateFieldOfView();
		} else if (
			(fieldOfView[1] < 0 && this.state.velocity[1] < 0) ||
			(fieldOfView[1] > this.environment.height && this.state.velocity[1] > 0)
		) {
			this.state.velocity[1] = -this.state.velocity[1];
			this.state.activity = ACTIVITIES.NONE;
			this.updateFieldOfView();
		} else if (
			this.environment.isWater(
				Math.floor(fieldOfView[0]),
				Math.floor(fieldOfView[1])
			) &&
			this.state.activity !== ACTIVITIES.FETCHING_WATER &&
			!this.state.isDrinking
		) {
			this.wander((2 * Math.PI) / 3 + Math.random() * ((2 * Math.PI) / 3));
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
			this.die(DEATH_REASONS.DRAWN);
		}
	}

	checkAge() {
		this.state.size =
			this.config.minSize +
			this.config.maxSize *
				(this.state.stats.age / this.config.inheritableProps.maxAge);
		if (this.state.stats.age > this.config.inheritableProps.maxAge) {
			this.die(DEATH_REASONS.AGE);
		}
	}

	getGenes() {
		return {
			baseSpeed: getInheritableProp('baseSpeed', 'father', this),
			maxAge: Math.floor(getInheritableProp('maxAge', 'average', this)),
			descendants: getInheritableProp('descendants', 'mother', this),
			changeDirectionThreshold: getInheritableProp(
				'changeDirectionThreshold',
				'average',
				this
			),
			waterSenseRadius: Math.floor(
				getInheritableProp('waterSenseRadius', 'average', this)
			),
			foodSenseRadius: getInheritableProp('foodSenseRadius', 'average', this),
			femaleSenseRadius: getInheritableProp(
				'femaleSenseRadius',
				'father',
				this
			),
		};
	}

	getParentsTextures() {
		return [
			this.state.fatherProps.textureIndex,
			this.config.inheritableProps.textureIndex,
		];
	}
}
