//anonymous function injected directly into the page, to allow proper interceptions
(async function () {


    //get original twitter fetch and XHR methods
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    //overriding fetch and XML requests
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        tryInterceptResponse(args[0], response.clone());
        return response;
    };

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._url = url;
        return originalXHROpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (...args) {
        this.addEventListener('load', function () {
            if (this.responseType !== '' && this.responseType !== 'text') return;
            try {
                const responseText = this.responseText;
                tryInterceptRawResponse(this._url, responseText);
            } catch (e) {
                console.warn('[inject.js] XHR parse error', e);
            }
        });
        return originalXHRSend.apply(this, args);
    };

    //intercepting Fetch API requests
    async function tryInterceptResponse(url, response) {
        if (!url.includes('/i/api/graphql/')) return;

        try {
            const text = await response.text();
            //split for XML parsing
            tryInterceptRawResponse(url, text);
        } catch (e) {
            console.warn('[inject.js] fetch parse error', e);
        }
    }

    //for XHR requests (such as /i/api/1.1/jot/client_event.json )
    function tryInterceptRawResponse(url, text) {
        if (!url.includes('/i/api/graphql/') && !url.includes('/TweetDetail')) return;

        //everything else is essentially the same as before
        try {
            const jsonResponse = JSON.parse(text);

            const parents = findAllParents(jsonResponse, ['media_url_https', 'video_info']);

            if (parents.length > 0) {
                const medias = extractMedias(parents);
                const existing = JSON.parse(sessionStorage.getItem('TwitterMediaDownloader') || '[]');

                const updated = deduplicateMedia(existing, medias)
                sessionStorage.setItem('TwitterMediaDownloader', JSON.stringify(updated));

            }
        } catch (e) {
            console.warn('[inject.js] JSON parse error', e);
        }
    }

    //avoiding duplicates in session storage during multiple intercepted calls (reopening the same media)
    function deduplicateMedia(existing, incoming) {

        //map new session storage objects
        //using video/media url as unique keys to avoid duplication
        const seenUrls = new Set(existing.map(m => m.url || m.video?.variants?.[0]?.url));
        const unique = incoming.filter(m => {
            const key = m.url || m.video?.variants?.[0]?.url;
            if (seenUrls.has(key)) return false;
            seenUrls.add(key);
            return true;
        });

        return existing.concat(unique);
    }


    function findAllParents(obj, targetKeys, depth = 4) {
        const results = [];
        const seen = new WeakSet();

        function _traverse(currentObj, path = []) {
            if (!currentObj || seen.has(currentObj)) return;
            seen.add(currentObj);

            const entries = Array.isArray(currentObj)
                ? currentObj.entries()
                : Object.entries(currentObj);

            for (const [key, value] of entries) {
                if (targetKeys.includes(key)) {
                    const ancestor = path[path.length - depth];

                    if (path.length >= depth + 3) {
                        const resultParent = path[path.length - depth - 3];
                        const quotedStatusParent = path[path.length - depth - 2];

                        if (quotedStatusParent?.quoted_status_result && resultParent?.result) {
                            const legacyIdStr = resultParent.result.legacy?.id_str;
                            if (legacyIdStr && ancestor) {
                                ancestor.referencedBy = legacyIdStr;
                            }
                        }
                    }

                    if (ancestor) {
                        results.push(ancestor);
                    }
                }

                if (value && typeof value === 'object') {
                    _traverse(value, [...path, currentObj]);
                }
            }
        }

        _traverse(obj);
        return [...new Set(results)];
    }
})();

