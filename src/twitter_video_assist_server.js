let workerSpace = {}

const CAPTURE_INTERVAL = 33
const PLAY_SPEED_RATE = 2.0
const filenameRegex = /([\w,\s-.]+\.[A-Za-z]{2,4}$)/

browser.runtime.onMessage.addListener(processRequest)

function processRequest(request) {
    switch (request.type) {
        case 'video':
            downloadMp4Video(request)
            break

        case 'image':
            downloadImage(request)
            break

        case 'gif':
            processGifVideo(request)
    }
}

browser.webRequest.onBeforeRequest.addListener(
    async (details) => {
        if (details.tabId === -1) return;

        const filter = browser.webRequest.filterResponseData(details.requestId);
        const chunks = [];

        filter.ondata = event => {
            chunks.push(event.data);
            filter.write(event.data);
        };

        filter.onstop = async () => {
            try {
                const responseText = await new Blob(chunks).text();
                const jsonResponse = JSON.parse(responseText);
                const targetParents = findAllParents(jsonResponse, ['media_url_https', 'video_info']);

                if (targetParents.length > 0) {
                    const medias = extractMedias(targetParents);
                    browser.tabs.sendMessage(details.tabId, {
                        type: 'UPDATE_SESSION_DATA',
                        data: medias
                    });
                }
            } catch (e) {
                console.error('[Processing Error]', e);
                filter.disconnect();
            } finally {
                try { filter.close(); }
                catch (e) { console.warn('[Close Error]', e); }
                isProcessing = false;
            }
        };
    },
    { urls: ["https://x.com/i/api/graphql/*"] },
    ["blocking"]
);

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

function processVideoSource({
    videoSource,
    tweetId,
    readableFilename,
    tweetSelector,
    token
}) {
    if (videoSource.includes('blob')) {
        if (!!tweetId) {
            processBlobVideo(tweetId, readableFilename, token)
        }
    } else if (videoSource.includes('ext_tw_video')) {
        downloadMp4Video(videoSource, readableFilename)
    } else {
        processGifVideo(videoSource, readableFilename)
    }
}

function convertGif(url, readableFilename) {
    sendSpinnerStateMessage(false)

    var filename = url.substring(url.lastIndexOf('/') + 1).split(".")[0]
    var worker = createWorker(filename, readableFilename)
    var canvas = document.createElement('canvas')
    var context = canvas.getContext('2d')
    var video = document.createElement('video')

    video.src = url
    video.crossOrigin = "use-credentials"
    video.playbackRate = PLAY_SPEED_RATE
    video.preload = "auto"
    video.innerHTML = '<source src="' + video.src + '" type="video/mp4 preload="metadata" />'

    video.oncanplaythrough = processVideo(canvas, context, video, worker)
}

function createWorker(filename, readableFilename) {
    workerSpace[filename] = new Worker('gif_converter.js')
    workerSpace[filename].onmessage = processWorkerData(filename, readableFilename)
    return workerSpace[filename]
}

function processWorkerData(filename, readableFilename) {
    return (event) => {
        browser.storage.sync.get({
            spcificPathName: false,
            readableName: false
        }).then((items) => {
            var u8Array = new Uint8Array(atob(event.data).split("").map(function (c) {
                return c.charCodeAt(0)
            }))
            var blob = new Blob([u8Array], {
                type: 'image/gif'
            })
            var url = URL.createObjectURL(blob)

            let downloadFilename = filename
            if (items.readableName) {
                downloadFilename = readableFilename
            }

            browser.downloads.download({
                url: url,
                saveAs: items.spcificPathName,
                filename: downloadFilename + ".gif"
            })
            workerSpace[filename].terminate()
            delete workerSpace[filename]
            if (numberOfWorker() == 0) {
                sendSpinnerStateMessage(true)
            }
        })
    }
}

function processVideo(canvas, context, video, worker) {
    return () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        captureVideo(context, video, worker)
    }
}

async function captureVideo(context, video, worker) {
    worker.postMessage({
        delay: CAPTURE_INTERVAL * PLAY_SPEED_RATE,
        w: video.videoWidth,
        h: video.videoHeight
    })

    video.play()
    while (!video.ended) {
        draw(context, video, worker)
        await sleep(CAPTURE_INTERVAL)
    }

    worker.postMessage({})
}

function draw(context, video, worker) {
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
    var imageData = context.getImageData(0, 0, video.videoWidth, video.videoHeight)
    worker.postMessage({
        frame: imageData
    })
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function sendSpinnerStateMessage(hide) {
    browser.tabs.query({
        currentWindow: true,
        url: ["*://*.twitter.com/*", "*://twitter.com/*"]
    }).then((tabs) => {
        for (var i in tabs) {
            browser.tabs.sendMessage(tabs[i].id, {
                hideSpinner: hide
            })
        }
    })
}

function numberOfWorker() {
    return Object.keys(workerSpace).length
}