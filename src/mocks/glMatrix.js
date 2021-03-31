export default {
	vec2: {
		random: jest.fn().mockReturnValue([0, 0]),
		fromValues: jest.fn().mockImplementation((a, b) => [a, b]),
		create: jest.fn().mockReturnValue([0, 0]),
		normalize: jest.fn().mockReturnValue([1, 1]),
		scale: jest.fn().mockReturnValue([1, 1]),
	},
};
