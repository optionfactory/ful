
class Slots {
    static extract(el) {
        const slotted = Object.fromEntries([...el.querySelectorAll("[slot]")].map(el => {
            el.parentElement.removeChild(el);
            const slot = el.getAttribute("slot");
            el.removeAttribute("slot");
            return [slot, el];
        }));
        slotted.default = new DocumentFragment();
        slotted.default.append(...el.childNodes);
        return slotted;
    }
}

export { Slots };