
class Bindings {

    /**
     * @param {{ [x: string]: any; }} obj
     * @param {string} prefix
     * @return {{ [x: string]: any; }}
     */
    static flatten(obj, prefix) {
        return Object.keys(obj).reduce((acc, k) => {
            const pre = prefix.length ? prefix + '.' : '';
            if (typeof obj[k] === 'object' && obj[k] !== null) {
                Object.assign(acc, Bindings.flatten(obj[k], pre + k));
            } else {
                acc[pre + k] = obj[k];
            }
            return acc;
        }, {});
    }
    
    /**
     * @param {any} result
     * @param {string} path
     * @param {any} value
     */
    static providePath(result, path, value) {
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
    /**
     * 
     * @param {Element & {dataset?: any} & {checked?: boolean} & {value?: any}} el 
     * @returns 
     */
    static extract(el) {
        if (el.getAttribute('type') === 'radio') {
            if (!el.checked) {
                return undefined;
            }
            return el.dataset['fulBindType'] === 'boolean' ? el.value === 'true' : el.value;
        }
        if (el.getAttribute('type') === 'checkbox') {
            return el.checked;
        }
        if (el.dataset['fulBindType'] === 'boolean') {
            return !el.value ? null : el.value === 'true';
        }
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
            return el.value === '' || el.value === undefined ? null : el.value;
        }
        return el.value;
    }
    
    /**
     * 
     * @param {Element  & {checked?: boolean} & {value?: any}} el 
     * @returns 
     */    
    static mutate(el, raw) {
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
}


export { Bindings }