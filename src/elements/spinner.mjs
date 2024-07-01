import { Slots, Fragments, templates, ParsedElement } from "./elements.mjs"

templates.put('ful-spinner', Fragments.fromHtml(`
    <div class="ful-spinner-wrapper">
        <div class="ful-spinner-text">{{{{ slotted.default }}}}</div>
        <div class="ful-spinner-icon"></div>
    </div>
`));

class Spinner extends ParsedElement() {
    render() {
        const slotted = Slots.from(this);
        templates.get('ful-spinner').renderTo(this, { slotted });
    }
}

export { Spinner };