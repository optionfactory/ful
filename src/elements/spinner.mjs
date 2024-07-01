import { ParsedElement, Templated } from "./elements.mjs"



const ful_spinner_ec = globalThis.ec || ftl.EvaluationContext.configure({

});

const ful_spinner_template_ = globalThis.ful_spinner_template || ftl.Template.fromHtml(`
    <div class="ful-spinner-wrapper">
        <div class="ful-spinner-text">{{{{ slotted.default }}}}</div>
        <div class="ful-spinner-icon"></div>
    </div>
`, ful_spinner_ec);


class Spinner extends Templated(ParsedElement, ful_spinner_template_) {
    render(slotted, template) {
        return template.render({ slotted });
    }
}

export { Spinner };