import { NEEDS_ENUM, SEX } from './rabbits-population/rabbit.js';

const stats = document.createElement('div');
stats.classList.add('rabbit-stats');
stats.classList.add('rabbit-stats--hidden');
document.body.appendChild(stats);

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
				<div class="rabbit-stat__name">Age:</div>
				<div class="rabbit-stat__value">${rabbit.state.currentAge}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Max Age:</div>
				<div class="rabbit-stat__value">${rabbit.config.maxAge}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Alive:</div>
				<div class="rabbit-stat__value">${rabbit.state.alive}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Water:</div>
				<div class="rabbit-stat__value">${Math.floor(rabbit.state.stats.water)}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Water search threshold:</div>
				<div class="rabbit-stat__value">${Math.floor(
					rabbit.state.waterSearchThreshold
				)}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Going for water:</div>
				<div class="rabbit-stat__value">${
					rabbit.state.activity === NEEDS_ENUM.WATER
				}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Food:</div>
				<div class="rabbit-stat__value">${Math.floor(rabbit.state.stats.food)}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Food search threshold:</div>
				<div class="rabbit-stat__value">${Math.floor(
					rabbit.state.foodSearchThreshold
				)}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Going for food:</div>
				<div class="rabbit-stat__value">${
					rabbit.state.activity === NEEDS_ENUM.FOOD
				}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Mating desire:</div>
				<div class="rabbit-stat__value">${Math.floor(rabbit.state.stats.mate)}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Is pregnant:</div>
				<div class="rabbit-stat__value">${Math.floor(rabbit.state.pregnant)}</div>
			</div>
			<div class="rabbit-stat">
				<div class="rabbit-stat__name">Pregnancy progress:</div>
				<div class="rabbit-stat__value">${Math.floor(
					rabbit.state.stats.pregnancy
				)}</div>
			</div>
		`;
	} else {
		stats.classList.add('rabbit-stats--hidden');
	}
}
