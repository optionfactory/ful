import { registry } from "@optionfactory/ftl"

class Loaders {
    static fromAttributes(el, defaultLoader, options) {
        const http = registry.component("http-client");
        const requestMapper = el.hasAttribute("request-mapper") ? registry.component(el.getAttribute("request-mapper")) : v => v;
        const responseMapper = el.hasAttribute("response-mapper") ? registry.component(el.getAttribute("response-mapper")) : v => v;
        const loaderClass = registry.component(el.getAttribute("loader") ?? defaultLoader);
        return loaderClass.create({
            el,
            http,
            requestMapper,
            responseMapper,
            options: options ?? {}
        });
    }
}


export { Loaders };