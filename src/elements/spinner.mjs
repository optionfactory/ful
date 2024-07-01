import { ParsedElement } from "./elements.mjs"

const ful_spinner_ec = globalThis.ec || ftl.EvaluationContext.configure({

});

const ful_spinner_template_ = globalThis.ful_spinner_template || ftl.Template.fromHtml(`
    <div class="ful-spinner-wrapper">
        <div class="ful-spinner-text">{{{{ slotted.default }}}}</div>
        <div class="ful-spinner-icon"></div>
    </div>
`, ful_spinner_ec);


class Spinner extends ParsedElement {
    render() {
        const slotted = Slots.from(this);
        this.replaceChildren(ful_spinner_template_.render({ slotted }));
    }
}

export { Spinner };