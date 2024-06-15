
import { Templated } from "./elements.mjs"


class FieldError extends Templated(HTMLElement) {
    render(slotted, template) {
        this.classList.add('invalid-feedback');
    }
    static configure() {
        customElements.define('ful-field-error', FieldError);
    }
}

class Errors extends Templated(HTMLElement) {
    render(slotted, template) {
        this.classList.add('alert', 'alert-danger', 'd-none');
    }
    static configure() {
        customElements.define('ful-errors', Errors);
    }

}


export { FieldError, Errors }