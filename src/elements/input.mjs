import { Attributes, Templated, CustomElements } from "./elements.mjs"

class Input extends Templated(HTMLElement) {
    render(slotted, template) {
        const id = Attributes.uid('ful-input');
        const name = this.getAttribute('input-name');
        const floating = this.hasAttribute('floating');
        slotted.input = slotted.input || (() => {
            const el = document.createElement("input")
            el.classList.add("form-control");
            return el;
        })();
        Attributes.forward('input-', this, slotted.input)
        Attributes.defaultValue(slotted.input, "name", id);
        Attributes.defaultValue(slotted.input, "id", id);
        Attributes.defaultValue(slotted.input, "type", "text");
        Attributes.defaultValue(slotted.input, "placeholder", " ");
        return CustomElements.labelAndInputGroup(id, name || id, floating, slotted);
    }
    static configure() {
        customElements.define('ful-input', Input);
    }
}




export { Input };
