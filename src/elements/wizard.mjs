class Wizard extends HTMLElement {
    constructor() {
        super();
        this.progress = [...this.children].filter(e => e.matches("header,ol,ul"));

        this.progress.forEach(p => {
            const children = [...p.children];
            const current = children.filter(e => e.matches(".active"))[0];
            if (current === undefined && children.length > 0) {
                children[0].classList.add('active');
            }
        });
        if (this.querySelector('section.current') === null) {
            const firstSection = this.querySelector('section:first-of-type');
            if (firstSection !== null) {
                firstSection.classList.add('current');
            }
        }
    }
    next() {
        this.progress.forEach(p => {
            const children = [...p.children];
            const current = children.filter(e => e.matches(".active"))[0];
            current?.classList.remove('active');
            current?.nextElementSibling?.classList.add('active');
        });
        const currentSection = this.querySelector('section.current');
        currentSection.classList.remove("current");
        currentSection.nextElementSibling.classList.add('current');

        this.dispatchEvent(new CustomEvent('wizard:activate', {
            bubbles: true,
            cancelable: true
        }));

    }
    prev() {
        this.progress.forEach(p => {
            const children = [...p.children];
            const current = children.filter(e => e.matches(".active"))[0];
            current?.classList.remove('active');
            current?.previousElementSibling?.classList.add('active');
        });
        const currentSection = this.querySelector('section.current');
        currentSection.classList.remove("current");
        currentSection.previousElementSibling.classList.add('current');
        this.dispatchEvent(new CustomEvent('wizard:activate', {
            bubbles: true,
            cancelable: true
        }));
    }
    moveTo = function (n) {
        this.progress.forEach(p => {
            const children = [...p.children];
            const current = children.filter(e => e.matches(".active"))[0];
            current?.classList.remove('active');
            p.children[+n]?.classList.add('active');
        });
        const currentSection = this.querySelector('section.current');
        currentSection?.classList.remove("current");
        const nthSection = this.querySelector(`section:nth-child(${+n})`);
        nthSection.classList.add('current');
        this.dispatchEvent(new CustomEvent('wizard:activate', {
            bubbles: true,
            cancelable: true
        }));
    }
    static custom(tagName, configuration) {
        customElements.define(tagName, class extends Wizard {
            constructor() {
                super(configuration);
            }
        });
    }
    static configure() {
        return Wizard.custom('ful-wizard');
    }
}




export { Wizard };
