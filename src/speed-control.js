const values = [1, 2, 5, 10, 20, 30, 50, 100];

const currentSpeed = 1;

export default function init() {
	const speedControl = document.createElement('div');
	speedControl.classList.add('speed-control');
	document.body.appendChild(speedControl);

	const buttons = values
		.map(
			(value) =>
				`<button data-value='${value}' class='speed-control__button ${
					value === currentSpeed ? 'selected' : ''
				}'>x${value}</button>`
		)
		.join('');

	speedControl.innerHTML = `<div class='speed-control__label'>Speed</div>${buttons}`;

	speedControl.querySelectorAll('.speed-control__button').forEach((button) => {
		button.addEventListener('click', (event) => {
			const prevSelected = speedControl.querySelector('.selected');
			if (prevSelected !== event.target) {
				global.speedUpFactor = parseInt(event.target.dataset.value);
				prevSelected.classList.remove('selected');
				event.target.classList.add('selected');
			}
		});
	});
}
