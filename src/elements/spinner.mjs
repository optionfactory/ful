import { ParsedElement } from "@optionfactory/ftl"

class Spinner extends ParsedElement({
    slots: true,
    template: `
        <div class="ful-spinner-wrapper">
            <div class="ful-spinner-text">{{{{ slots.default }}}}</div>
            <div class="ful-spinner-icon"></div>
        </div>
    `
}) {
    render({slots}) {
        this.template().withOverlay({ slots }).renderTo(this);
    }
}

export { Spinner };