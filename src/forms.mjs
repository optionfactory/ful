/* global Infinity, CSS */

class Form {

    static DEFAULT_FIELD_CONTAINER_SELECTOR = 'label';
    static DEFAULT_ERROR_CLASS = 'has-error';
    static DEFAULT_HIDE_CLASS = 'd-none';

    el;
    bindings;
    globalErrorsEl;
    fieldContainerSelector;
    errorClass;
    hideClass;
    constructor(el, bindings, {globalErrorsEl, fieldContainerSelector, errorClass, hideClass}) {
        this.el = el;
        this.bindings = bindings;
        this.globalErrorsEl = globalErrorsEl;
        this.fieldContainerSelector = fieldContainerSelector !== undefined ? fieldContainerSelector : Form.DEFAULT_FIELD_CONTAINER_SELECTOR;
        this.errorClass = errorClass || Form.DEFAULT_ERROR_CLASS;
        this.hideClass = hideClass || Form.DEFAULT_HIDE_CLASS;
    }
    setValues(values) {
        return this.bindings.setValues(this.el, values);
    }
    getValues() {
        return this.bindings.getValues(this.el);
    }
    setErrors(errors, scrollFirstErrorIntoView, context) {

        this.clearErrors();
        errors
                .map(this.mapError ? this.mapError : (e) => e)
                .filter((e) => e.type === 'FIELD_ERROR' || e.type === 'INVALID_FORMAT')
                .forEach((e) => {
                    const name = e.context.replace("[", ".").replace("].", ".");
                    Array.from(this.el.querySelectorAll(`[name='${CSS.escape(name)}']`))
                            .map(el => this.fieldContainerSelector ? el.closest(this.fieldContainerSelector) : el)
                            .filter(el => el !== null)
                            .forEach(label => {
                                label.classList.add(this.errorClass);
                                label.dataset['error'] = e.reason;
                            });
                });
        if (this.globalErrorsEl) {
            const globalErrors = errors.filter((e) => e.type !== 'FIELD_ERROR' && e.type !== 'INVALID_FORMAT');
            this.globalErrorsEl.innerHTML = globalErrors.map(e => e.reason).join("\n");
            if (globalErrors.length !== 0) {
                this.globalErrorsEl.classList.remove(this.hideClass);
            }
        }
        if (!scrollFirstErrorIntoView) {
            return;
        }
        const yOffsets = Array.from(this.el.querySelectorAll('.${CSS.escape(this.errorClass)}'))
                .map((label) => label.getBoundingClientRect().y + window.scrollY);
        const firstErrorScrollY = Math.min(...yOffsets);
        if (firstErrorScrollY !== Infinity) {
            window.scroll(window.scrollX, firstErrorScrollY > 100 ? firstErrorScrollY - 100 : 0);
        }
    }
    clearErrors() {
        this.el.querySelectorAll(`.${CSS.escape(this.errorClass)}`).forEach(l => l.classList.remove(this.errorClass));
        if (this.globalErrorsEl) {
            this.globalErrorsEl.innerHTML = '';
            this.globalErrorsEl.classList.add(this.hideClass);
        }
    }
}
/*
 export function forms() {
 }
 
 forms.dropContext = function (context) {
 return function (e) {
 if (e.context && e.context.indexOf(context) === 0) {
 e.context = e.context.substring(context.length);
 }
 return e;
 };
 };
 
 
 Dom.ready(() => {
 document.querySelectorAll('label:not([data-error])').forEach(el => {
 el.dataset['error'] = "Il valore inserito non è valido";
 });
 });
 
 Dom.ready(() => {
 Dom.on(document.body, 'change', '[data-pattern]', {}, evt => {
 const el = evt.srcElement;
 const pattern = el.dataset['pattern'];
 const matches = el.value.match(pattern);
 const label = el.closest('label');
 if(label === null){
 return;
 }
 label.classList[matches ? 'remove' : 'add']('has-error');        
 });
 });
 */
export { Form };