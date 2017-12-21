const t = require("babel-types");
const generator = require("../core/generator");

const { isNumber } = require("../core/type-checks");

const typeCheckInterfaces = {
	Integer: isNumber,
	Double: isNumber
};

module.exports = generator({
	typeCheckInterfaces,
	contentSanitizersForType: {},
	supportedTypes: ["Integer", "int", "double", "Double"],
	renameTypesMap: {
		int: "Integer", // TODO: add test
		double: "Double"
	},
	classValue: ({ package: pkg, name }) => `${pkg}.${name}`
});
