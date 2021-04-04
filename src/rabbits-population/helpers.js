export function getInheritableProp(prop, type, mother) {
	switch (type) {
		case 'average':
			return (
				(mother.state.fatherProps[prop] +
					mother.config.inheritableProps[prop]) /
				2
			);
		case 'mother':
			return mother.config.inheritableProps[prop];
		case 'father':
			return mother.state.fatherProps[prop];
		default:
			throw new Error('unknown type');
	}
}

export function mutate(prop) {
	return prop;
}
