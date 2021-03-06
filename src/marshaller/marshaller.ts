import {MarshallDataType} from "./marshall-data-type";
import {
	Data,
	IMarshalledArrayData,
	IMarshalledBigIntData,
	IMarshalledBooleanBoxedData,
	IMarshalledDateData,
	IMarshalledMapData,
	IMarshalledNumberBoxedData,
	IMarshalledObjectData,
	IMarshalledRefData,
	IMarshalledRegExpData,
	IMarshalledSetData,
	IMarshalledStringBoxedData,
	IMarshalledSymbolData,
	JsonType,
	MarshalledData,
	MarshalledDataResult,
	TypedArrayData
} from "./marshalled-data";
import {marshalledDataTypeKey, marshalledRefKey} from "./marshalled-data-keys";

/**
 * A Regular expression that matches the description of a Symbol
 * @type {RegExp}
 */
const SYMBOL_REGEX: RegExp = /Symbol\(([^)]*)\)/;

/**
 * Marshalls the given value
 * @param {T} value
 * @param {string|number} [space]
 * @returns {string}
 */
export function marshall<T>(value: T, space?: string | number): string {
	return JSON.stringify(visitValue(value, new Map()), undefined, space);
}

/**
 * The replacer function for the marshalling call
 * @param {T} value
 * @param {Map<{}, string>} refToRefIdentifierMap
 * @returns {Data}
 */
function visitValue<T>(value: T, refToRefIdentifierMap: Map<{}, string>): MarshalledDataResult {
	// Check for ref hits
	const refMapHit = refToRefIdentifierMap.get(value);
	if (refMapHit != null) {
		return {[marshalledDataTypeKey]: "ref", value: refMapHit};
	}

	// Otherwise, if it is a simple JSON serialize type, just return the value
	if (isJsonType(value)) {
		return value;
	}

	switch (typeof value) {
		case "function":
			throw new TypeError(`Cannot marshal functions since this is considered to be a security risk!`);

		case "undefined":
			return {[marshalledDataTypeKey]: "undefined"};

		case <MarshallDataType>"bigint":
			return {
				[marshalledDataTypeKey]: "bigint",
				[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
				value: value.toString()
			};

		case "symbol":
			return {
				[marshalledDataTypeKey]: "symbol",
				value: (<symbol>(<any>value)).toString().match(SYMBOL_REGEX)![1]
			};

		default: {
			if (value === null) {
				return {[marshalledDataTypeKey]: "null"};
			} else if (typeof value === "number" && isNaN(value)) {
				return {[marshalledDataTypeKey]: "nan"};
			} else if (typeof value === "number" && value === Infinity) {
				return {[marshalledDataTypeKey]: "infinity"};
			} else if (value instanceof Date) {
				return {
					[marshalledDataTypeKey]: "date",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: value.toISOString()
				};
			} else if (value instanceof String || value instanceof Number || value instanceof Boolean) {
				return {
					[marshalledDataTypeKey]: value instanceof String ? "string-boxed" : value instanceof Number ? "number-boxed" : "boolean-boxed",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: value.valueOf()
				};
			} else if (value instanceof RegExp) {
				return {
					[marshalledDataTypeKey]: "regexp",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: value.toString()
				};
			} else if (value instanceof Set) {
				return {
					[marshalledDataTypeKey]: "set",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: <IMarshalledArrayData>visitValue([...value], refToRefIdentifierMap)
				};
			} else if (value instanceof Map) {
				return {
					[marshalledDataTypeKey]: "map",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: <IMarshalledArrayData>visitValue([...value], refToRefIdentifierMap)
				};
			} else if (value instanceof Uint8Array) {
				return {
					[marshalledDataTypeKey]: "uint8array",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: [...value]
				};
			} else if (value instanceof Uint8ClampedArray) {
				return {
					[marshalledDataTypeKey]: "uint8clampedarray",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: [...value]
				};
			} else if (value instanceof Uint16Array) {
				return {
					[marshalledDataTypeKey]: "uint16array",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: [...value]
				};
			} else if (value instanceof Uint32Array) {
				return {
					[marshalledDataTypeKey]: "uint32array",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: [...value]
				};
			} else if (value instanceof Int8Array) {
				return {
					[marshalledDataTypeKey]: "int8array",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: [...value]
				};
			} else if (value instanceof Int16Array) {
				return {
					[marshalledDataTypeKey]: "int16array",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: [...value]
				};
			} else if (value instanceof Int32Array) {
				return {
					[marshalledDataTypeKey]: "int32array",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: [...value]
				};
			} else if (value instanceof Float32Array) {
				return {
					[marshalledDataTypeKey]: "float32array",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: [...value]
				};
			} else if (value instanceof Float64Array) {
				return {
					[marshalledDataTypeKey]: "float64array",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: [...value]
				};
			} else if (Array.isArray(value)) {
				return {
					[marshalledDataTypeKey]: "array",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: value.map(v => visitValue(v, refToRefIdentifierMap))
				};
			} else if (isObjectLiteral(value)) {
				return {
					[marshalledDataTypeKey]: "object",
					[marshalledRefKey]: addRef(value, refToRefIdentifierMap),
					value: Object.assign(
						{},
						...Object.entries(value).map(([key, objectValue]) => ({
							[key]: visitValue(objectValue, refToRefIdentifierMap)
						}))
					)
				};
			} else if (value instanceof WeakMap) {
				throw new TypeError(`WeakMaps cannot be marshalled since they aren't iterable`);
			} else if (value instanceof WeakSet) {
				throw new TypeError(`WeakSets cannot be marshalled since they aren't iterable`);
			} else {
				throw new TypeError(`Could not marshall a value of type: ${value.constructor.name}`);
			}
		}
	}
}

/**
 * Demarshalls the given string. MarshalledData can also be optionally provided
 * @param {string|MarshalledData} value
 * @returns {T}
 */
export function demarshall<T>(value: string | MarshalledData): T {
	const parsed: MarshalledDataResult = isMarshalledData(value) ? value : JSON.parse(value);
	return demarshallValue(parsed, new Map());
}

/**
 * The replacer function for the demarshalling call
 * @param {MarshalledDataResult} data
 * @param {Map<string, {}>} refMap
 * @returns {*}
 */
function demarshallValue(data: MarshalledDataResult, refMap: Map<string, {}>): any {
	if (isJsonType(data)) {
		return data;
	}

	// Check if there is a ref for the data and store it in the refMap if so
	const refMatch: string | undefined = (<any>data)[marshalledRefKey];

	if (isMarshalledData(data)) {
		switch (data[marshalledDataTypeKey]) {
			case "array": {
				const {value} = <IMarshalledArrayData>data;
				const newArray: any[] = [];
				refMap.set(refMatch!, newArray);
				for (let i = 0; i < value.length; i++) {
					newArray[i] = demarshallValue(value[i], refMap);
				}
				return newArray;
			}

			case "object": {
				const {value} = <IMarshalledObjectData>data;
				refMap.set(refMatch!, value);
				return demarshallValue(value, refMap);
			}

			case "symbol": {
				const {value} = <IMarshalledSymbolData>data;
				return Symbol(value);
			}

			case "string-boxed": {
				const {value} = <IMarshalledStringBoxedData>data;
				// noinspection JSPrimitiveTypeWrapperUsage
				const boxedString = new String(value);
				refMap.set(refMatch!, boxedString);
				return boxedString;
			}

			case "number-boxed": {
				const {value} = <IMarshalledNumberBoxedData>data;
				// noinspection JSPrimitiveTypeWrapperUsage
				const boxedNumber = new Number(value);
				refMap.set(refMatch!, boxedNumber);
				return boxedNumber;
			}

			case "boolean-boxed": {
				const {value} = <IMarshalledBooleanBoxedData>data;
				// noinspection JSPrimitiveTypeWrapperUsage
				const boxedBoolean = new Boolean(value);
				refMap.set(refMatch!, boxedBoolean);
				return boxedBoolean;
			}

			case "nan": {
				return NaN;
			}

			case "infinity": {
				return Infinity;
			}

			case "ref": {
				const {value} = <IMarshalledRefData>data;
				const refMapHit = refMap.get(value);
				if (refMapHit == null) {
					throw new ReferenceError(`Internal Error: Could not resolve a reference!!`);
				}
				return refMapHit;
			}

			case "bigint": {
				const {value} = <IMarshalledBigIntData>data;
				const bigInt = BigInt(value);
				refMap.set(refMatch!, bigInt);
				return bigInt;
			}

			case "undefined":
				return undefined;

			case "null":
				return null;

			case "date": {
				const {value} = <IMarshalledDateData>data;
				const date = new Date(value);
				refMap.set(refMatch!, date);
				return date;
			}

			case "uint8array":
			case "uint8clampedarray":
			case "uint16array":
			case "uint32array":
			case "int8array":
			case "int16array":
			case "int32array":
			case "float32array":
			case "float64array":
				const {value} = <TypedArrayData>data;
				const newArray = getTypedArray(data[marshalledDataTypeKey], value.map(v => demarshallValue(v, refMap)));
				refMap.set(refMatch!, newArray);
				return newArray;

			case "regexp": {
				const {value} = <IMarshalledRegExpData>data;
				const flags = value.replace(/.*\/([gimyus]*)$/, "$1");
				const pattern = value.replace(new RegExp("^/(.*?)/" + flags + "$"), "$1");
				const regex = new RegExp(pattern, flags);
				refMap.set(refMatch!, regex);
				return regex;
			}

			case "set": {
				const {value} = <IMarshalledSetData>data;
				const newSet: Set<any> = new Set();
				refMap.set(refMatch!, newSet);
				value.value.forEach(v => newSet.add(demarshallValue(v, refMap)));
				return newSet;
			}

			case "map": {
				const {value} = <IMarshalledMapData>data;
				const newMap: Map<any, any> = new Map();
				refMap.set(refMatch!, newMap);
				value.value.forEach(v => {
					const [key, value] = demarshallValue(v, refMap);
					newMap.set(key, value);
				});
				return newMap;
			}

			default:
				throw new TypeError(`Could not demarshall a value: ${data}`);
		}
	} else if (Array.isArray(data)) {
		return (<Data[]>data).map(v => demarshallValue(v, refMap));
	} else if (isObjectLiteral(data)) {
		return Object.assign(data, ...Object.entries(data).map(([key, objectValue]) => (key === marshalledDataTypeKey ? {} : {[key]: demarshallValue(<any>objectValue, refMap)})));
	} else {
		throw new Error("Internal Error: This state may never happen");
	}
}

/**
 * Returns true if the given data represents an Object Literal
 * @param {*} data
 * @returns {boolean}
 */
function isObjectLiteral(data: any): data is object {
	return typeof data === "object" && data.constructor.name === "Object";
}

/**
 * Returns true if the given data is a JsonType
 * @param {*} data
 */
function isJsonType(data: any): data is JsonType {
	if (data == null) return false;
	const typeofData = typeof data;
	return typeofData === "string" || (typeofData === "number" && !isNaN(data) && data !== Infinity) || typeofData === "boolean";
}

/**
 * Returns true if the given data is some marshalled data
 * @param {*} data
 */
export function isMarshalledData(data: any): data is MarshalledData {
	const typeofData = <MarshallDataType>typeof data;
	return data != null && !isJsonType(data) && !Array.isArray(data) && typeofData !== "symbol" && typeofData !== "bigint" && marshalledDataTypeKey in data;
}

/**
 * Generates a ref
 * @returns {string}
 */
function generateRef(currentCount: number): string {
	return `${currentCount + 1}`;
}

/**
 * Gets a TypedArray that matches the given MarshalledDataType
 * @param {MarshallDataType} type
 * @param {number[]} args
 */
function getTypedArray(type: MarshallDataType, args: number[]): Uint8Array | Uint8ClampedArray | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | Float32Array | Float64Array {
	switch (type) {
		case "uint8array":
			return new Uint8Array(args);
		case "uint8clampedarray":
			return new Uint8ClampedArray(args);
		case "uint16array":
			return new Uint16Array(args);
		case "uint32array":
			return new Uint32Array(args);
		case "int8array":
			return new Int8Array(args);
		case "int16array":
			return new Int16Array(args);
		case "int32array":
			return new Int32Array(args);
		case "float32array":
			return new Float32Array(args);
		case "float64array":
			return new Float64Array(args);
		default:
			throw new TypeError(`The given data type: ${type} can not be used with TypedArrays!`);
	}
}

/**
 * Adds a ref to the given map
 * @param {T} value
 * @param {Map<{}, string>} map
 */
function addRef<T>(value: T, map: Map<{}, string>): string {
	// Generate a ref for the value and store it in the Map
	const generatedRef = generateRef(map.size);
	map.set(value, generatedRef);
	return generatedRef;
}
