import colors from '../colors.js';
import { hexToRgb } from '../helpers.js';

export default class Tile {
	constructor(x, y, type) {
		this.x = x;
		this.y = y;
		this.type = type;
		this.color = hexToRgb(colors[type]);
	}

	toArray() {
		return [this.x, this.y, this.color.r, this.color.g, this.color.b];
	}
}
