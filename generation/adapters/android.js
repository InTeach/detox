const t = require("babel-types");
const generator = require("../core/generator");

const { isNumber } = require("../core/type-checks");
const { callGlobal } = require("../helpers");

const typeCheckInterfaces = {
	Integer: isNumber,
	Double: isNumber
};

const contentSanitizersForFunction = {
	scrollInDirection: {
		argumentName: "direction",
		type: "Integer",
		name: "sanitize_android_direction",
		value: callGlobal("sanitize_android_direction")
	}
};

module.exports = generator({
	typeCheckInterfaces,
	contentSanitizersForFunction,
	contentSanitizersForType: {},
	supportedTypes: ["Integer", "int", "double", "Double"],
	renameTypesMap: {
		int: "Integer", // TODO: add test
		double: "Double"
	},
	classValue: ({ package: pkg, name }) => `${pkg}.${name}`
});
