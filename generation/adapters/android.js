const t = require("babel-types");
const generator = require("../core/generator");

const { isNumber, isString } = require("../core/type-checks");
const { callGlobal } = require("../helpers");

const typeCheckInterfaces = {
	Integer: isNumber,
	Double: isNumber,
	String: isString
};

const contentSanitizersForFunction = {
	scrollInDirection: {
		argumentName: "direction",
		newType: "String",
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
