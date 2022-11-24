function ful_report_error(evt){
    function meta_content(name) {
        var metaEls = document.getElementsByTagName("meta");
        var content = [].slice.call(metaEls).filter(function (v) {
            return v.name === name;
        }).map(function (v) {
            return v.content;
        });
        return content[0];
    }
    function configured_report_uri(){
        var scriptEl = document.querySelector('script[data-report-client-errors-uri]');
        if(!scriptEl){
            console && console.error && console.error("missing attribute data-report-client-errors-uri");
            return null;
        }
        return scriptEl.dataset['reportClientErrorsUri'];
    }
    function split_stack(){
        if(evt.error && evt.error.stack && evt.error.stack.split){
            return evt.error.stack.split("\n");
        }
        if(evt.reason && evt.reason.stack && evt.reason.stack.split){
            return evt.reason.stack.split("\n");
        }
        return undefined
    }
    function message(){
        if(evt.message){
            return evt.message;
        }
        if(evt.reason && evt.reason.message){
            return evt.reason.message;
        }
        if(evt.error && evt.error.message){
            return evt.error.message;
        }
        return undefined;
    }

    var uri = configured_report_uri();
    if(!uri){
        return;
    }
    var headers = {
        'Content-Type': 'application/json'
    };
    headers[meta_content("_csrf_header")] = meta_content("_csrf");
    try {
        fetch(uri, {
            method: 'POST',
            mode: 'same-origin',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: headers,
            redirect: 'error',
            referrerPolicy: 'no-referrer-when-downgrade',
            body: JSON.stringify({
                page: window.location && window.location.href ? window.location.href : "unknown",
                filename: evt.filename,
                line: evt.lineno,
                col: evt.colno,
                message: message(),
                stack: split_stack()
            })
        });
    } catch (e) {
        //nothing to do here
    }
}

window.addEventListener('error', ful_report_error);
window.addEventListener('unhandledrejection', ful_report_error);
