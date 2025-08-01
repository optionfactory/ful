import { ParsedElement } from "@optionfactory/ftl";
import { Input } from "./input.mjs";




class LocalDate extends ParsedElement {
    render() {
        const content = this.innerHTML.trim();
        if (content === '') {
            this.innerHTML = this.getAttribute('default') ?? '';
            return;
        }
        const locale = this.getAttribute("locale") ?? Intl.DateTimeFormat().resolvedOptions().locale;
        const formatter = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'numeric', day: 'numeric' });
        const [y, m, d] = content.split('-').map(Number);
        this.innerHTML = formatter.format(new Date(y, m - 1, d));
    }
}

class Instant extends ParsedElement {
    render() {
        const content = this.innerHTML.trim();
        if (content === '') {
            this.innerHTML = this.getAttribute('default') ?? '';
            return;
        }
        const locale = this.getAttribute("locale") ?? Intl.DateTimeFormat().resolvedOptions().locale;
        const format = new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        });
        this.innerHTML = format.format(new Date(Instant.isoToLocal(content)));
    }
    static isoToLocal(iso) {
        //this is so sad
        const d = new Date(iso);
        const pad = (n, v) => String(v).padStart(n, '0');
        const date = `${d.getFullYear()}-${pad(2, d.getMonth() + 1)}-${pad(2, d.getDate())}`;
        const time = `${pad(2, d.getHours())}:${pad(2, d.getMinutes())}:${pad(2, d.getSeconds())}.${pad(3, d.getMilliseconds())}`;
        return `${date}T${time}`
    }    
}


class InputLocalDate extends Input {
    static observed = ['value', 'readonly:presence', 'min', 'max', 'step'];
    _type() {
        return 'date';
    }
    get min() {
        const v = this._input.min;
        return v === '' ? null : v;
    }
    set min(v) {
        this._input.min = v;
    }
    get max() {
        const v = this._input.max;
        return v === '' ? null : v;
    }
    set max(v) {
        this._input.max = v;
    }
    get step() {
        const v = this._input.step;
        return v === '' ? null : v;
    }
    set step(v) {
        this._input.step = (v ?? '');
    }

}

class InputLocalTime extends InputLocalDate {
    _type() {
        return 'time';
    }
}


class InputInstant extends Input {
    static observed = ['value', 'readonly:presence', 'min', 'max', 'step'];
    _type() {
        return 'datetime-local';
    }
    get value() {
        const v = this._input.value;
        return v === '' ? null : new Date(v).toISOString();
    }
    set value(v) {
        this._input.value = v ? Instant.isoToLocal(v) : '';
    }
    get min() {
        const v = this._input.min;
        return v === '' ? null : new Date(v).toISOString();
    }
    set min(v) {
        this._input.min = v ? Instant.isoToLocal(v) : '';
    }
    get max() {
        const v = this._input.max;
        return v === '' ? null : new Date(v).toISOString();
    }
    set max(v) {
        this._input.max = v ? Instant.isoToLocal(v) : '';
    }
    get step() {
        const v = this._input.step;
        return v === '' ? null : v;
    }
    set step(v) {
        this._input.step = (v ?? '');
    }
}




export { Instant, LocalDate, InputLocalDate, InputLocalTime, InputInstant }