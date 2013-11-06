// Partial 'sham' to work around ie8s lack of es5 //////////////////////////////////////////////
// When IE8 support is no longer needed, all these can be dropped in favour of the es5 methods.

exports.getPrototypeOf = function getPrototypeOf(obj) {
	if (Object.getPrototypeOf) {
		var proto = Object.getPrototypeOf(obj);

		// to avoid bad shams...
		if (proto !== obj) return proto;
	}

	// this is what most shams do, but sometimes it's wrong.
	if (obj.constructor && obj.constructor.prototype && obj.constructor.prototype !== obj) {
		return obj.constructor.prototype;
	}

	// this works only if we've been kind enough to supply a superclass property
	// (which we do when we extend classes).
	if (obj.constructor && obj.constructor.superclass) {
		return obj.constructor.superclass.prototype;
	}

	// can't find a good prototype.
	return null;
};

var defineProperty = function(obj, prop, descriptor) {
	obj[prop] = descriptor.value;
};
if (Object.defineProperty) {
	try {
		// IE8 throws an error here.
		Object.defineProperty({}, 'x', {});
		defineProperty = Object.defineProperty;
	} catch (e) {}
}
exports.defineProperty = defineProperty;

exports.create = Object.create || function(proto, descriptors) {
	var myConstructor = function() {};
	myConstructor.prototype = proto;

	var result = new myConstructor();

	var keys = Object.keys(descriptors);
	for (var i = 0; i < keys.length; ++i) {
		var key = keys[i];
		defineProperty(result, key, descriptors[key]);
	}

	return result;
};

