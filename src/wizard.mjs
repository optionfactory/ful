class Wizard {
    constructor(el) {
        this.el = el;
        this.progress = [...el.querySelectorAll('header,ol,ul')];
        
        this.progress.forEach(p => {
            const current = p.querySelector(':scope > .active');
            if (current === null){
                p.children[0].classList.add('active');
            }
        });
        if (this.el.querySelector('section.current') === null) {
            const firstSection = this.el.querySelector('section:first-of-type');
            if(firstSection !== null){
                firstSection.classList.add('current');
            }
        }
    }
    next() {
        this.progress.forEach(p => {
            const current = p.querySelector(':scope > .active');
            current.classList.remove('active');
            current.nextElementSibling.classList.add('active');
        });
        const currentSection = this.el.querySelector('section.current');
        currentSection.classList.remove("current");
        currentSection.nextElementSibling.classList.add('current');
        
        this.el.dispatchEvent(new CustomEvent('wizard:activate', {
            bubbles: true, 
            cancelable: true
        }));
        
    }
    prev() {
        this.progress.forEach(p => {
            const current = p.querySelector(':scope > .active');
            current.classList.remove('active');
            current.previousElementSibling.classList.add('active');
        });        
        const currentSection = this.el.querySelector('section.current');
        currentSection.classList.remove("current");
        currentSection.previousElementSibling.classList.add('current');        
        this.el.dispatchEvent(new CustomEvent('wizard:activate', {
            bubbles: true, 
            cancelable: true
        }));
    }
    moveTo = function (n) {
        this.progress.forEach(p => {
            const current = p.querySelector(':scope > .active');
            current?.classList.remove('active');
            p.children[+n].classList.add('active');
        });                
        const currentSection = this.el.querySelector('section.current');
        currentSection?.classList.remove("current");
        const nthSection = this.el.querySelector(`section:nth-child(${+n})`);
        nthSection.classList.add('current');
        this.el.dispatchEvent(new CustomEvent('wizard:activate', {
            bubbles: true, 
            cancelable: true
        }));
    };

}




export { Wizard };
