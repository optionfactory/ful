/* global CSS */

function extract(extractors, el) {
    const maybeExtractor = extractors[el.dataset['bindExtractor']] || extractors[el.dataset['bindProvide']];
    if (maybeExtractor) {
        return maybeExtractor(el);
    }
    if (el.getAttribute('type') === 'radio') {
        if (!el.checked) {
            return undefined;
        }
        return el.dataset['bindType'] === 'boolean' ? el.value === 'true' : el.value;
    }
    if (el.getAttribute('type') === 'checkbox') {
        return el.checked;
    }
    if (el.dataset['bindType'] === 'boolean') {
        return !el.value ? null : el.value === 'true';
    }
    return el.value || null;
}

function mutate(mutators, el, raw, key, values) {
    const maybeMutator = mutators[el.dataset['bindMutator']] || mutators[el.dataset['bindProvide']];
    if (maybeMutator) {
        maybeMutator(el, raw, key, values);
        return;
    }
    if (el.getAttribute('type') === 'radio') {
        el.checked = el.getAttribute('value') === raw;
        return;
    }
    if (el.getAttribute('type') === 'checkbox') {
        el.checked = raw;
        return;
    }
    el.value = raw;
}


function providePath(result, path, value) {
    const keys = path.split(".").map((k) => k.match(/^[0-9]+$/) ? +k : k);
    let current = result;
    let previous = null;
    for (let i = 0; ; ++i) {
        const ckey = keys[i];
        const pkey = keys[i - 1];
        if (Number.isInteger(ckey) && !Array.isArray(current)) {
            if (previous !== null) {
                previous[pkey] = current = [];
            } else {
                result = current = [];
            }
        }
        if (i === keys.length - 1) {
            //when value is undefined we only want to define the property if it's not defined 
            current[ckey] = value !== undefined ? value : (ckey in current ? current[ckey] : null);
            return result;
        }
        if (current[ckey] === undefined) {
            current[ckey] = {};
        }
        previous = current;
        current = current[ckey];
    }
}

class Bindings {
    extractors;
    mutators;
    valueHoldersSelector;
    ignoredChildrenSelector;

    constructor( {extractors, mutators, ignoredChildrenSelector, valueHoldersSelector}) {
        this.extractors = extractors || {};
        this.mutators = mutators || {};
        this.valueHoldersSelector = valueHoldersSelector || 'input[name], select[name], textarea[name]';
        this.ignoredChildrenSelector = ignoredChildrenSelector || '.d-none';
    }
    setValues(el, values) {
        for (let k in values) {
            if (!values.hasOwnProperty(k)) {
                continue;
            }
            Array.from(el.querySelectorAll(`[name='${CSS.escape(k)}']`)).forEach((el) => {
                mutate(this.mutators, el, values[k], k, values);
            });
        }
    }
    getValues(el) {
        return Array.from(el.querySelectorAll(this.valueHoldersSelector))
                .filter((el) => {
                    if (el.dataset['bindInclude'] === 'never') {
                        return false;
                    }
                    return el.dataset['bindInclude'] === 'always' || el.closest(this.ignoredChildrenSelector) === null;
                })
                .reduce((result, el) => {
                    return providePath(result, el.getAttribute('name'), extract(this.extractors, el));
                }, {});
    }
}



export { Bindings };