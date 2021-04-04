import {
	ACTIVITIES,
	DEATH_REASONS,
	SEX,
} from './rabbits-population/constants.js';

const stats = document.createElement('div');
stats.classList.add('rabbit-stats');
stats.classList.add('rabbit-stats--hidden');
document.body.appendChild(stats);

const globalStats = document.createElement('div');
globalStats.classList.add('global-stats');
document.body.appendChild(globalStats);

const obituary = document.createElement('div');
obituary.classList.add('obituary');
document.body.appendChild(obituary);

export function updateStats(rabbit) {
	if (rabbit) {
		stats.classList.remove('rabbit-stats--hidden');

		stats.innerHTML = `
			<div class="rabbit-name">${rabbit.config.name}</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Sex:</div>
				<div class="rabbit-stat__value">${
					rabbit.config.sex === SEX.MALE ? 'male' : 'female'
				}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Generation:</div>
				<div class="rabbit-stat__value">${
					rabbit.config.inheritableProps.generation
				}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Alive:</div>
				<div class="rabbit-stat__value">${rabbit.state.alive ? 'YES' : 'NO'}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Age:</div>
				<div class="rabbit-stat__value">${Math.floor(rabbit.state.stats.age)}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Max Age:</div>
				<div class="rabbit-stat__value">${rabbit.config.inheritableProps.maxAge}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Speed:</div>
				<div class="rabbit-stat__value">${rabbit.config.inheritableProps.baseSpeed.toFixed(
					3
				)}</div>
			</div>
			${
				rabbit.config.sex === SEX.FEMALE
					? `<div class="rabbit-stat">
						<div class="rabbit-stat__name">Egg number:</div>
						<div class="rabbit-stat__value">${rabbit.config.inheritableProps.descendants}</div>
					</div>`
					: ''
			}
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Water:</div>
				<div class="rabbit-stat__value">${Math.floor(rabbit.state.stats.water)}%</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Water search threshold:</div>
				<div class="rabbit-stat__value">${Math.floor(
					rabbit.state.waterSearchThreshold
				)}%</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Going for water:</div>
				<div class="rabbit-stat__value">${
					rabbit.state.activity === ACTIVITIES.FETCHING_WATER ? 'YES' : 'NO'
				}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Food:</div>
				<div class="rabbit-stat__value">${Math.floor(rabbit.state.stats.food)}%</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Food search threshold:</div>
				<div class="rabbit-stat__value">${Math.floor(
					rabbit.state.foodSearchThreshold
				)}%</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Going for food:</div>
				<div class="rabbit-stat__value">${
					rabbit.state.activity === ACTIVITIES.FETCHING_FOOD ? 'YES' : 'NO'
				}</div>
			</div>
			${
				rabbit.config.sex === SEX.MALE
					? `<div class="rabbit-stat">
						<div class="rabbit-stat__name">Mating desire:</div>
						<div class="rabbit-stat__value">${Math.floor(rabbit.state.stats.mate)}%</div>
					</div>
					<div class="rabbit-stat">
						<div class="rabbit-stat__name">Impregnated females:</div>
						<div class="rabbit-stat__value">${rabbit.state.impregnated}</div>
					</div>
					`
					: ''
			}
			${
				rabbit.config.sex === SEX.FEMALE
					? `<div class="rabbit-stat">
						<div class="rabbit-stat__name">Is pregnant:</div>
						<div class="rabbit-stat__value">${rabbit.state.pregnant ? 'YES' : 'NO'}</div>
					</div>
					<div class="rabbit-stat">
						<div class="rabbit-stat__name">Pregnancy progress:</div>
						<div class="rabbit-stat__value">${Math.floor(
							rabbit.state.stats.pregnancy
						)}%</div>
					</div>
					<div class="rabbit-stat">
						<div class="rabbit-stat__name">Childbirths:</div>
						<div class="rabbit-stat__value">${rabbit.state.childbirths}</div>
					</div>
					`
					: ''
			}
		`;
	} else {
		stats.classList.add('rabbit-stats--hidden');
	}
}

export function updateGlobalStats(populationSize) {
	globalStats.innerHTML = `
			<div class="global-stats__entry">
				<div class="global-stats__key">Simulation time:</div>
				<div class="global-stats__value">${new Date(global.simulationTime * 1000)
					.toISOString()
					.substr(11, 8)}</div>
			</div>
			<div class="global-stats__entry">
				<div class="global-stats__key">Population size:</div>
				<div class="global-stats__value">${populationSize}</div>
			</div>
			`;
}

const obituaryKeys = {
	[DEATH_REASONS.THIRST]: 'Thirst',
	[DEATH_REASONS.STARVATION]: 'Starvation',
	[DEATH_REASONS.DRAWN]: 'Drowning',
	[DEATH_REASONS.AGE]: 'Age',
	[DEATH_REASONS.OUT_OF_BOUNDS]: 'Out of bounds',
	[DEATH_REASONS.ILLNESS]: 'Illness',
};

export function updateObituary(ob) {
	const entries = Object.entries(ob).map(
		([key, value]) => `
		<div class="obituary-entry">
			<div class="obituary__key">${obituaryKeys[key]}:</div>
			<div class="obituary__value">${value}</div>
		</div>
	`
	);

	obituary.innerHTML = `
		<div class="obituary-header">Obituary</div>
		<div class="obituary-entries">${entries.join('')}</div>
	`;
}
