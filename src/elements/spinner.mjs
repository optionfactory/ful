import { Fragments, Templated } from "./elements.mjs"

class Spinner extends Templated(HTMLElement) {
    render(slotted, template) {
        return Fragments.fromHtml(`
            <div class="spinner-border spinner-border-sm" aria-hidden="true"></div>
        `);
    }
    static configure() {
        customElements.define('ful-spinner', Spinner);
    }
}

export { Spinner };