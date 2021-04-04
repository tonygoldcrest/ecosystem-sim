import colors from '../colors.js';
import { hexToRgb } from '../helpers.js';

export default class Tile {
	constructor(id, x, y, type, walkable = true, color) {
		this.id = id;
		this.x = x;
		this.y = y;
		this.type = type;
		this.colorHex = color || colors[type];
		this.color = hexToRgb(this.colorHex);
		this.walkable = walkable;
	}

	toArray() {
		return [this.x, this.y, this.color.r, this.color.g, this.color.b];
	}

	toVec() {
		return [this.x, this.y];
	}
}
