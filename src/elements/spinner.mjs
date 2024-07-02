import { ParsedElement } from "./elements.mjs"

class Spinner extends ParsedElement({
    slots: true,
    template: `
        <div class="ful-spinner-wrapper">
            <div class="ful-spinner-text">{{{{ slots.default }}}}</div>
            <div class="ful-spinner-icon"></div>
        </div>
    `
}) {
    render(template, slots) {
        template.renderTo(this, { slots });
    }
}

export { Spinner };