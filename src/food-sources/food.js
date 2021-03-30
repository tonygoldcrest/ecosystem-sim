export default class Food {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.empty = false;
	}

	toArray() {
		return [this.x, this.y];
	}
}
