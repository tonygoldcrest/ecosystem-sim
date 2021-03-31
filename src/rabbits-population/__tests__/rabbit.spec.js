import Rabbit, { SEX, ACTIVITIES } from '../rabbit';
import glMatrixMock from '../../mocks/glMatrix';
import { vec2 } from '../../../libs/gl-matrix-min';

describe('Rabbit', () => {
	beforeAll(() => {
		window.glMatrix = glMatrixMock;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor()', () => {
		beforeEach(() => {
			jest.spyOn(Math, 'random').mockReturnValue(0);
		});

		afterEach(() => {
			Math.random.mockRestore();
		});

		it('should start moving after creation', () => {
			jest.spyOn(Rabbit.prototype, 'startMoving');

			new Rabbit(0, 0, {}, {}, {});

			expect(Rabbit.prototype.startMoving).toHaveBeenCalledTimes(1);

			Rabbit.prototype.startMoving.mockRestore();
		});

		it('should generate min values in config', () => {
			const rabbit = new Rabbit(0, 0, {}, {}, {});
			expect(rabbit.config.descendants).toBe(1);
			expect(rabbit.config.seed).toBe(0);
			expect(rabbit.config.sex).toBe(SEX.MALE);
			expect(rabbit.config.maxAgeInMilliseconds).toBe(300000);
		});

		it('should generate max values in config', () => {
			jest.spyOn(Math, 'random').mockReturnValue(1);
			const rabbit = new Rabbit(0, 0, {}, {}, {});
			expect(rabbit.config.descendants).toBe(8);
			expect(rabbit.config.seed).toBe(1);
			expect(rabbit.config.sex).toBe(SEX.FEMALE);
			expect(rabbit.config.maxAgeInMilliseconds).toBe(360000);
		});

		it('should generate min values in state', () => {
			jest.spyOn(Date, 'now').mockReturnValue(0);
			const rabbit = new Rabbit(0, 0, {}, {}, {});

			expect(rabbit.state.stats.water).toBe(60);
			expect(rabbit.state.stats.food).toBe(40);
			expect(rabbit.state.stats.mate).toBe(0);
			expect(rabbit.state.stats.pregnancy).toBe(0);
			expect(rabbit.state.birthday).toBe(0);
			expect(rabbit.state.highlighted).toBe(0);
			expect(rabbit.state.pregnant).toBe(false);
			expect(rabbit.state.alive).toBe(true);
			expect(rabbit.state.currentAge).toBe(0);
			expect(rabbit.state.waterSearchThreshold).toBe(
				rabbit.config.baseWaterSearchThreshold
			);
			expect(rabbit.state.foodSearchThreshold).toBe(
				rabbit.config.baseFoodSearchThreshold
			);
			expect(rabbit.state.position[0]).toBe(0);
			expect(rabbit.state.position[1]).toBe(0);

			Date.now.mockRestore();
		});

		it('should generate max values in state', () => {
			jest.spyOn(Math, 'random').mockReturnValue(1);
			const rabbit = new Rabbit(0, 0, {}, {}, {});

			expect(rabbit.state.stats.water).toBe(90);
			expect(rabbit.state.stats.food).toBe(70);
			expect(rabbit.state.waterSearchThreshold).toBe(
				rabbit.config.baseWaterSearchThreshold + 20
			);
			expect(rabbit.state.foodSearchThreshold).toBe(
				rabbit.config.baseFoodSearchThreshold + 20
			);
		});
	});

	describe('startMoving()', () => {
		it('should update field of view after setting velocity', () => {
			const rabbit = new Rabbit(0, 0, {}, {}, {});
			jest.spyOn(rabbit, 'updateFieldOfView');

			rabbit.startMoving();

			expect(rabbit.updateFieldOfView).toHaveBeenCalledTimes(1);

			rabbit.updateFieldOfView.mockRestore();
		});

		it('should reset the activity to none', () => {
			const rabbit = new Rabbit(0, 0, {}, {}, {});

			rabbit.state.activity = ACTIVITIES.MATING;

			rabbit.startMoving();

			expect(rabbit.state.activity).toBe(ACTIVITIES.NONE);
		});

		it('should reset the speed to 1', () => {
			const rabbit = new Rabbit(0, 0, {}, {}, {});

			rabbit.state.speed = 3;

			rabbit.startMoving();

			expect(rabbit.state.speed).toBe(1);
		});

		it('should assign a random vector to velocity with length dependent on speed', () => {
			const rabbit = new Rabbit(0, 0, {}, {}, {});

			expect(glMatrix.vec2.random).toHaveBeenCalledTimes(1);
			expect(glMatrix.vec2.random.mock.calls[0][1]).toBe(
				rabbit.state.speed * 0.1
			);
		});
	});

	describe('updateFieldOfView()', () => {
		it('should set fieldOfView to the same direction as velocity and have length of 30', () => {
			const rabbit = new Rabbit(0, 0, {}, {}, {});

			window.glMatrix.vec2 = vec2;

			rabbit.state.velocity = [1, 1];

			rabbit.updateFieldOfView();

			expect(Math.floor(rabbit.state.fieldOfView[0])).toBe(21);
			expect(Math.floor(rabbit.state.fieldOfView[1])).toBe(21);

			rabbit.state.velocity = [-1, 1];

			rabbit.updateFieldOfView();

			expect(Math.floor(rabbit.state.fieldOfView[0])).toBe(-22);
			expect(Math.floor(rabbit.state.fieldOfView[1])).toBe(21);

			window.glMatrix.vec2 = glMatrixMock.vec2;
		});
	});

	describe('live()', () => {
		let rabbit;

		beforeEach(() => {
			rabbit = new Rabbit(0, 0, {}, {}, {});
			rabbit.searchForWater = jest.fn();
			rabbit.searchForFood = jest.fn();
			rabbit.searchForFemale = jest.fn();
			rabbit.checkDistanceToFood = jest.fn();
			rabbit.checkDistanceToWater = jest.fn();
			rabbit.checkDistanceToFemale = jest.fn();
			rabbit.checkEnvironment = jest.fn();
			rabbit.move = jest.fn();
			rabbit.updateStats = jest.fn();
			rabbit.checkAge = jest.fn();
			rabbit.checkStats = jest.fn();
			rabbit.wander = jest.fn();
		});

		it('should start searching for water if water stats are low', () => {
			rabbit.state.stats.water = 30;
			rabbit.state.waterSearchThreshold = 60;
			rabbit.live();

			expect(rabbit.searchForWater).toHaveBeenCalledTimes(1);
		});

		it('should start searching for food if food stats are low', () => {
			rabbit.state.stats.water = 80;
			rabbit.state.waterSearchThreshold = 60;
			rabbit.state.stats.food = 30;
			rabbit.state.foodSearchThreshold = 60;
			rabbit.live();

			expect(rabbit.searchForWater).toHaveBeenCalledTimes(0);
			expect(rabbit.searchForFood).toHaveBeenCalledTimes(1);
		});

		it('should start searching for female is wants to mate', () => {
			rabbit.state.stats.water = 80;
			rabbit.state.waterSearchThreshold = 60;
			rabbit.state.stats.food = 80;
			rabbit.state.foodSearchThreshold = 60;
			rabbit.state.stats.mate = 60;
			rabbit.state.matingThreshold = 40;
			rabbit.live();

			expect(rabbit.searchForWater).toHaveBeenCalledTimes(0);
			expect(rabbit.searchForFood).toHaveBeenCalledTimes(0);
			expect(rabbit.searchForFemale).toHaveBeenCalledTimes(1);
		});

		it('should start checking the distance to water when going to drink', () => {
			rabbit.state.activity = ACTIVITIES.FETCHING_WATER;
			rabbit.live();

			expect(rabbit.checkDistanceToWater).toHaveBeenCalledTimes(1);
			expect(rabbit.checkDistanceToFood).toHaveBeenCalledTimes(0);
			expect(rabbit.checkDistanceToFemale).toHaveBeenCalledTimes(0);
		});

		it('should start checking the distance to food when going to eat', () => {
			rabbit.state.activity = ACTIVITIES.FETCHING_FOOD;
			rabbit.live();

			expect(rabbit.checkDistanceToFood).toHaveBeenCalledTimes(1);
			expect(rabbit.checkDistanceToWater).toHaveBeenCalledTimes(0);
			expect(rabbit.checkDistanceToFemale).toHaveBeenCalledTimes(0);
		});

		it('should start checking the distance to female when going to mate', () => {
			rabbit.state.activity = ACTIVITIES.MATING;
			rabbit.config.sex = SEX.MALE;
			rabbit.live();

			expect(rabbit.checkDistanceToFemale).toHaveBeenCalledTimes(1);
			expect(rabbit.checkDistanceToFood).toHaveBeenCalledTimes(0);
			expect(rabbit.checkDistanceToWater).toHaveBeenCalledTimes(0);
		});

		it('should not check the distance to female if female', () => {
			rabbit.state.activity = ACTIVITIES.MATING;
			rabbit.config.sex = SEX.FEMALE;
			rabbit.live();

			expect(rabbit.checkDistanceToFemale).toHaveBeenCalledTimes(0);
			expect(rabbit.checkDistanceToFood).toHaveBeenCalledTimes(0);
			expect(rabbit.checkDistanceToWater).toHaveBeenCalledTimes(0);
		});

		it('should not do anything when female and waiting for mating', () => {
			rabbit.state.stats.water = 20;
			rabbit.state.waterSearchThreshold = 60;
			rabbit.state.stats.food = 20;
			rabbit.state.foodSearchThreshold = 60;
			rabbit.state.stats.mate = 60;
			rabbit.state.matingThreshold = 40;
			rabbit.state.activity = ACTIVITIES.MATING;
			rabbit.config.sex = SEX.FEMALE;
			rabbit.live();

			expect(rabbit.move).toHaveBeenCalledTimes(1);
			expect(rabbit.updateStats).toHaveBeenCalledTimes(1);
			expect(rabbit.checkAge).toHaveBeenCalledTimes(1);
			expect(rabbit.checkStats).toHaveBeenCalledTimes(1);

			expect(rabbit.searchForWater).toHaveBeenCalledTimes(0);
			expect(rabbit.searchForFood).toHaveBeenCalledTimes(0);
			expect(rabbit.searchForFemale).toHaveBeenCalledTimes(0);
			expect(rabbit.checkDistanceToFemale).toHaveBeenCalledTimes(0);
			expect(rabbit.checkDistanceToFood).toHaveBeenCalledTimes(0);
			expect(rabbit.checkDistanceToWater).toHaveBeenCalledTimes(0);
		});
	});
});
