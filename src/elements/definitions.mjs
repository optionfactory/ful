import { Spinner } from "./spinner.mjs";
import { Input } from "./input.mjs";
import { RadioGroup } from "./radio.mjs";
import { Select } from "./select.mjs";
import { Form } from "./form.mjs";


export class CustomElements {
    static configure() {
        customElements.define('ful-spinner', Spinner);
        customElements.define('ful-input', Input);
        customElements.define('ful-radio-group', RadioGroup);
        customElements.define('ful-select', Select);
        customElements.define('ful-form', Form);
    }
}
