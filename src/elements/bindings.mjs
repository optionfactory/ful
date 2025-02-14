
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
        const keys = path.split(".").map((k) => /^[0-9]+$/.test(k) ? +k : k);
        let current = result ?? {};
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
     * Extracts all values from a root element.
     * null values are extracted as null.
     * undefined values are not extracted.
     * @param {Element} root 
     * @param {string} ignoredChildrenSelector 
     * @returns 
     */
    static extractFrom(root, ignoredChildrenSelector){
        let result = {};
        for(const el of /** @type {NodeListOf<HTMLElement>} */(root.querySelectorAll('[name]'))){
            if (el.dataset.fulBindInclude === 'never') {
                continue;
            }
            if(ignoredChildrenSelector && el.dataset.fulBindInclude !== 'always' && el.closest(ignoredChildrenSelector) !== null){
                continue;
            }
            const value = Bindings.extract(el);
            if(value === undefined){
                continue;
            } 
            const name = /** @type {string} */(el.getAttribute('name'));
            result = Bindings.providePath(result, name, value);
        }
        return result;
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

    static mutateIn(root, values){
        for (const [flattenedKey, value] of Object.entries(Bindings.flatten(values, ''))) {
            for(const el of root.querySelectorAll(`[name='${CSS.escape(flattenedKey)}']`)){
                Bindings.mutate(el, value)
            }
        }
    }


    static errors(root, es, invalidClass){
        const fieldErrors = es.filter(e => e.type === 'FIELD_ERROR' || e.type === 'INVALID_FORMAT');
        const globalErrors = es.filter(e => e.type !== 'FIELD_ERROR' && e.type !== 'INVALID_FORMAT');
        root.querySelectorAll(`.${CSS.escape(invalidClass)}`).forEach(el => el.classList.remove(invalidClass));
        root.querySelectorAll("ful-errors").forEach(el => {
            el.replaceChildren();
            el.setAttribute('hidden', '');
        });
        fieldErrors.forEach(e => {
            const name = e.context.replace("[", ".").replace("].", ".");
            const validationTargetsSelector = `[name='${CSS.escape(name)}'] [ful-validation-target],[name='${CSS.escape(name)}']:not(:has([ful-validation-target]))`;
            root.querySelectorAll(validationTargetsSelector).forEach(input => input.classList.add(invalidClass));
            const fieldErrorsSelector = `ful-field-error[field='${CSS.escape(name)}']`;
            root.querySelectorAll(fieldErrorsSelector).forEach(el => {
                const hel = /** @type HTMLElement} */ (el);
                hel.innerText = e.reason
            });
        });
        root.querySelectorAll("ful-errors").forEach(el => {
            const hel = /** @type HTMLElement} */ (el);
            hel.innerText = globalErrors.map(e => e.reason).join("\n");
            if (globalErrors.length !== 0) {
                el.removeAttribute('hidden');
            }
        });


    }
}


export { Bindings }