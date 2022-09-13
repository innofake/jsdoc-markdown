

/**
 * Retrieves the value from the object in a nested fashion. Specify a path as e.g. "food.fruit.apple". Click [here](https://hackernoon.com/accessing-nested-objects-in-javascript-f02f1bd6387f) for more info.
 *
 * @export function    
 * @param {Object} obj Object to retrieve value from.
 * @param {String} path Path to nested value, e.g. "food.fruit.apple".
 * @param {String} [separator="."] Separator to the path split on.
 * 
 * @returns {*} Value of the resolved path.
 */
export function getValue(obj, path, separator = `.`) {

    try {

        separator = separator || `.`;

        return path.
            replace(`[`, separator).replace(`]`, ``).
            split(separator).
            reduce((accumulator, currentValue) => accumulator[currentValue], obj);

    } catch (err) {
        return undefined;
    }
}