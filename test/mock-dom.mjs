import { JSDOM } from "jsdom";

function mockdom(html) {
    let jsdom = new JSDOM(html);
    globalThis.document = jsdom.window.document;
    globalThis.HTMLElement = jsdom.window.HTMLElement;
    return jsdom;
}

mockdom("<html></html>");