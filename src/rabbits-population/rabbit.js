import { scaleByDeltaTime } from '../helpers.js';
import names from '../names.js';
import { getInheritableProp, mutate } from './helpers.js';
import Movable from './movable.js';
import { ACTIVITIES, SEX, DEATH_REASONS } from './constants.js';

export default class Rabbit extends Movable {
	constructor(
		x,
		y,
		environment,
		foodSources,
		population,
		inheritableProps,
		parentTextures
	) {
		super();
		this.config = {
			inheritableProps: inheritableProps || {
				generation: 1,
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
			initialPosition: glMatrix.vec2.fromValues(x, y),
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

		this.checkEnvironment();
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

		if (!this.state.activity && this.isWell() && Math.random() < 0.001) {
			this.stop();
			this.scheduleStartMovingWithRandomVelocity();
		}

		if (!this.isWell() && this.state.restartMovementTimeout) {
			clearTimeout(this.state.restartMovementTimeout);
			this.state.restartMovementTimeout = undefined;
			this.startMoving();
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
			case ACTIVITIES.FETCHING_FOOD:
				this.checkDistanceToFood();
				break;
			case ACTIVITIES.MATING:
				if (this.config.sex === SEX.MALE) {
					this.checkDistanceToFemale();
				}
				break;
			case ACTIVITIES.DRINKING:
				this.drink();
				break;
			default:
				break;
		}
	}

	isWell() {
		return (
			this.state.stats.water > this.state.waterSearchThreshold &&
			this.state.stats.food > this.state.foodSearchThreshold &&
			this.state.stats.mate < this.state.matingThreshold
		);
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

	drink() {
		this.state.stats.water += scaleByDeltaTime(0.1);

		if (this.state.stats.water > 100) {
			this.scheduleRotateVelocityAndMove(...this.state.previousVelocity);
			this.state.activity = ACTIVITIES.NONE;
		}
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

		if (this.state.activity !== ACTIVITIES.DRINKING) {
			this.state.stats.water -= scaleByDeltaTime(0.012);
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
			this.state.speed = this.config.inheritableProps.baseSpeed + 1;
			this.setDirection(
				this.closestWaterTile[0] - this.state.position[0],
				this.closestWaterTile[1] - this.state.position[1]
			);

			this.state.activity = ACTIVITIES.FETCHING_WATER;
		}
	}

	searchForFood() {
		const source = this.foodSources.getClosestFoodSource(
			this.state.position[0],
			this.state.position[1],
			this.config.inheritableProps.foodSenseRadius
		);

		if (source) {
			this.closestFoodSource = source;

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

	checkDistanceToFood() {
		const distance = Math.abs(
			glMatrix.vec2.distance(this.state.position, [
				this.closestFoodSource.x,
				this.closestFoodSource.y,
			])
		);

		if (
			this.closestFoodSource.empty ||
			distance > this.config.inheritableProps.foodSenseRadius
		) {
			this.startWandering();
			this.closestFoodSource = undefined;
			return;
		}

		if (distance < 25) {
			this.closestFoodSource.empty = true;
			this.state.stats.food = 100;
			this.closestFoodSource = undefined;
			this.startWandering();
		}
	}

	checkDistanceToFemale() {
		if (
			!this.closestFemale ||
			this.closestFemale.state.pregnant ||
			!this.closestFemale.state.alive
		) {
			this.closestFemale = undefined;
			this.startWandering();
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
			this.startWandering();
		} else if (distance > this.config.inheritableProps.femaleSenseRadius) {
			this.startWandering();
			this.closestFemale.startMoving();
			this.closestFemale = undefined;
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
			baseSpeed: mutate(getInheritableProp('baseSpeed', 'average', this)),
			maxAge: Math.floor(getInheritableProp('maxAge', 'average', this)),
			descendants: Math.round(
				mutate(getInheritableProp('descendants', 'mother', this))
			),
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
			generation:
				Math.max(
					this.config.inheritableProps.generation,
					this.state.fatherProps.generation
				) + 1,
		};
	}

	getParentsTextures() {
		return [
			this.state.fatherProps.textureIndex,
			this.config.inheritableProps.textureIndex,
		];
	}
}
