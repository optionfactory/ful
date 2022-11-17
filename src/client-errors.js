window.addEventListener('error', function (error) {
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
                filename: error.filename,
                line: error.lineno,
                col: error.colno,
                message: error.message,
                stack: error.error && error.error.stack && error.error.stack.split ? error.error.stack.split("\n") : undefined
            })
        });
    } catch (e) {
        //nothing to do here
    }
});
