let readableNameList = {}
const fileNameRegex = /([\w,\s-.]+\.[A-Za-z]{2,4}$)/

function chromeDownloadRenamer(item, suggest) {
    if (!item.byExtensionId || item.byExtensionId !== chrome.runtime.id) {
        return
    }

    if (!Object.keys(readableNameList).length) {
        return
    }

    let result = fileNameRegex.exec(item.filename)
    const filename = result[1]
    const suggestFilename = readableNameList[filename] || item.filename
    const replacedFilePath = item.filename.replace(fileNameRegex, suggestFilename)
    delete readableNameList[filename]

    suggest({ filename: replacedFilePath, conflictAction: "uniquify" })

    if (!Object.keys(readableNameList).length) {
        chrome.downloads.onDeterminingFilename.removeListener(chromeDownloadRenamer)
    }
}

function processBlobVideo(id, readableName, token) {
    browser.storage.sync.get({
        isVideoSaveAsTS: true,
        isVideoSaveAsMP4: true,
    }).then((items) => {
        if (items.isVideoSaveAsTS) {
            processComplexTsVideo(id, readableName, token)
        }

        if (items.isVideoSaveAsMP4) {
            processComplexMp4Video(id, readableName, token)
        }
    })
}

function processGifVideo({url, readerableFilename}) {
    browser.storage.sync.get({
        isConvertGIF: true,
        isSaveMP4: true,
    }).then((items) => {
        if (items.isConvertGIF) {
            convertGif(url, readerableFilename)
        }

        if (items.isSaveMP4) {
            downloadMp4Video({url, readerableFilename})
        }
    })
}

async function processComplexTsVideo(id, readableName, token) {
    var jsonUrl = "https://api.twitter.com/1.1/videos/tweet/config/"
    jsonUrl += id + ".json"

    var playlistUrl = await getPlaylistUrl(jsonUrl, token)
    var filename = playlistUrl.substring(playlistUrl.lastIndexOf('/') + 1).split(".")[0]
    var palylist = await getMaximumBandwidthPlaylist(playlistUrl)
    var videoUrls = await getVideoFileUrls(palylist)
    var videoData = await accumTsFragment(videoUrls)

    downloadTsVideo(videoData, filename, readableName)
}

async function extractGraphQlMp4Video(id, token, index) {
    try {
        const jsonResponse = await archiveTweetDetailJson(id, token)
        const tweetResults = jsonResponse["data"]["threaded_conversation_with_injections_v2"]["instructions"][0]["entries"][0]["content"]["itemContent"]["tweet_results"]["result"]

        let videoSources = null
        if (tweetResults.hasOwnProperty('tweet')) {
            videoSources = tweetResults['tweet']["legacy"]["extended_entities"]["media"][index]["video_info"]["variants"]
        } else {
            videoSources = tweetResults["legacy"]["extended_entities"]["media"][index]["video_info"]["variants"]
        }
        videoSources.sort(sortByBitrate)

        return videoSources[0]['url']
    } catch (e) {
        if (e instanceof TypeError) {
            return null
        } else {
            throw e;
        }
    }
}

function getMaximumBitrate(videoSources) {
    videoSources.sort(sortByBitrate)
    return videoSources[0]['url']
}

async function extractGraphQlMedia(id, token) {
    try {
        const jsonResponse = await archiveTweetDetailJson(id, token)
        const tweetResults = jsonResponse["data"]["threaded_conversation_with_injections_v2"]["instructions"][0]["entries"]
        const targetTweet = tweetResults.find((tweet) => tweet.entryId.includes(id))["content"]["itemContent"]["tweet_results"]["result"];

        let medias = null
        if (targetTweet.hasOwnProperty('tweet')) {
            medias = targetTweet['tweet']["legacy"]["extended_entities"]["media"]
        } else {
            medias = targetTweet["legacy"]["extended_entities"]["media"]
        }

        return medias.map((media) => {
            let url = null
            if (media.type == 'photo') {
                return { type: 'image', url: refineImageSourceParams(media.media_url_https) }
            } else if (media.type == 'video') {
                return { type: 'video', url: getMaximumBitrate(media.video_info.variants) }
            } else if (media.type == 'animated_gif') {
                return { type: 'gif', url: getMaximumBitrate(media.video_info.variants) }
            }
        })
    } catch (e) {
        if (e instanceof TypeError) {
            return null
        } else {
            throw e;
        }
    }
}

async function archiveTweetDetailJson(id, token) {
    let tweetDetailUrl = `https://x.com/i/api/graphql/-Ls3CrSQNo2fRKH6i6Na1A/TweetDetail?variables=%7B%22focalTweetId%22%3A%22${id}%22%2C%22with_rux_injections%22%3Afalse%2C%22includePromotedContent%22%3Atrue%2C%22withCommunity%22%3Atrue%2C%22withQuickPromoteEligibilityTweetFields%22%3Atrue%2C%22withBirdwatchNotes%22%3Atrue%2C%22withVoice%22%3Atrue%2C%22withV2Timeline%22%3Atrue%7D&features=%7B%22rweb_lists_timeline_redesign_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22tweetypie_unmention_optimization_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Afalse%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C%22responsive_web_media_download_video_enabled%22%3Afalse%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D&fieldToggles=%7B%22withAuxiliaryUserLabels%22%3Afalse%2C%22withArticleRichContentState%22%3Afalse%7D`

    const response = await fetch(tweetDetailUrl, {
        "credentials": "include",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
            "Accept": "*/*",
            "Accept-Language": "ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3",
            "content-type": "application/json",
            "x-twitter-auth-type": "OAuth2Session",
            "x-csrf-token": token,
            "x-twitter-client-language": "ko",
            "x-twitter-active-user": "yes",
            "X-Client-Transaction-Id": "NzRMqdd3tuyaOaNVwIUt8B2lkDXpa9LFoDd8b4qm19wGAPlc5MmznuiuWvZwPq1lzUQZYgAE+nthOir1ViJ1D9Sjz59h",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
        },
        "referrer": "https://twitter.com/Sanghai83780Kim/status/1679624508293140480",
        "method": "GET",
        "mode": "cors"
    });

    return await response.json()
}

const sortByBitrate = (a, b) => {
    const bitrateA = a.bitrate || 0;
    const bitrateB = b.bitrate || 0;

    return bitrateB - bitrateA;
}

async function processComplexMp4Video(id, readableName, token) {
    var pageUrl = "https://api.twitter.com/1.1/statuses/show.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&trim_user=false&include_ext_media_color=true&id=" + id
    var mp4Url = await getMp4Url(pageUrl, token)

    downloadMp4Video(mp4Url, readableName)
}

function processImageDownload(src, readableName) {
    browser.runtime.sendMessage({
        type: 'image',
        readableName: readableName,
        url: src
    })
}

function getMp4Url(url, token) {
    return new Promise((resolve, reject) => {
        var init = {
            origin: 'https://mobile.twitter.com',
            headers: {
                "Accept": '*/*',
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:62.0) Gecko/20100101 Firefox/62.0",
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                "x-csrf-token": token,
            },
            credentials: 'include',
            referrer: 'https://mobile.twitter.com'
        }

        fetch(url, init)
            .then((response) => {
                if (response.status == 200) {
                    response.json().then((json) => {
                        let mp4Variants = (json.extended_entities || json.quoted_status.extended_entities).media[0].video_info.variants.filter(variant => variant.content_type === 'video/mp4')
                        mp4Variants = mp4Variants.sort((a, b) => (b.bitrate - a.bitrate))

                        let url = ''
                        if (mp4Variants.length) {
                            url = mp4Variants[0].url
                        }
                        resolve(url)
                    })
                } else {
                    reject({
                        status: response.status,
                        statusText: response.statusText
                    })
                }
            })
            .catch((err) => {
                reject({
                    error: err
                })
            })
    })
}

function getPlaylistUrl(url, token) {
    return new Promise((resolve, reject) => {
        var init = {
            method: 'GET',
            mode: 'cors',
            origin: 'https://twitter.com',
            headers: {
                "Accept": '*/*',
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:62.0) Gecko/20100101 Firefox/62.0",
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAAPYXBAAAAAAACLXUNDekMxqa8h%2F40K4moUkGsoc%3DTYfbDKbT3jJPCEVnMYqilB28NHfOPqkca3qaAxGfsyKCs0wRbw",
                "x-csrf-token": token,
            },
            credentials: 'include',
            referrer: 'https://twitter.com'
        }

        fetch(url, init)
            .then((response) => {
                if (response.status == 200) {
                    response.json().then((data) => {
                        var platlistUrl = data["track"]["playbackUrl"]
                        resolve(platlistUrl)
                    })
                } else {
                    reject({
                        status: response.status,
                        statusText: response.statusText
                    })
                }
            })
            .catch((err) => {
                reject({
                    error: err
                })
            })
    })
}

function getMaximumBandwidthPlaylist(url) {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(
                (response) => {
                    if (response.status == 200) {
                        response.text().then((text) => {
                            resolve(findMaxBandwidthSource(text))
                        })
                    } else {
                        reject({
                            status: response.status,
                            statusText: response.statusText
                        })
                    }
                }
            )
            .catch((err) => {
                reject({
                    error: err
                })
            })
    })
}

function getVideoFileUrls(url) {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(
                (response) => {
                    if (response.status == 200) {
                        response.text().then((text) => {
                            resolve(parseVideoUrls(text))
                        })
                    } else {
                        reject({
                            status: response.status,
                            statusText: response.statusText
                        })
                    }
                }
            )
            .catch((err) => {
                reject({
                    error: err
                })
            })
    })

}

async function accumTsFragment(videoUrls) {
    var videoBuffer = new Uint8Array(0)

    for (var i in videoUrls) {
        var fragment = await downloadTsFragment(videoUrls[i])
        videoBuffer = mergeFragment(videoBuffer, fragment)
    }

    return videoBuffer
}

function downloadTsFragment(urlTs) {
    return new Promise((resolve, reject) => {
        fetch(urlTs)
            .then((response) => response.arrayBuffer())
            .then((buffer) => {
                resolve(buffer)
            })
            .catch((err) => {
                reject({
                    error: err
                })
            })
    })
}

function mergeFragment(buffer, fragment) {
    var now = new Uint8Array(fragment)
    var prev = new Uint8Array(buffer)

    var merged = new Uint8Array(now.length + prev.length)
    merged.set(prev)
    merged.set(now, prev.length)

    return merged
}

function downloadTsVideo(data, tsFilename, readableName) {
    browser.storage.sync.get({
        spcificPathName: false,
        readableName: false
    }).then((items) => {
        var blob = new Blob([data], {
            type: 'video/mp2t'
        })
        var url = URL.createObjectURL(blob)

        let options = {
            url: url,
            saveAs: items.spcificPathName,
            filename: tsFilename + ".ts"
        }

        if (items.readableName) {
            options.filename = readableName + '.ts'
        }

        browser.downloads.download(options)
    })
}

function fileExtension(url) {
    const splited = url.split('.')
    return splited[splited.length - 1].split('?')[0]
}

function downloadMp4Video({url, readerableFilename}) {
    browser.storage.sync.get({
        spcificPathName: false,
        readableName: false
    }).then((items) => {
        let options = {
            url: url,
            saveAs: items.spcificPathName
        }

        if (items.readableName) {
            options.filename = readerableFilename + '.' + fileExtension(url)
        }

        browser.downloads.download(options)
    })
}

function downloadImage({url, readerableFilename}) {
    browser.storage.sync.get({
        spcificPathName: false,
        readableName: false
    }).then((items) => {
        const uploadedImageQuery = /https:\/\/pbs.twimg.com\/media\/(.*)?\?.*/g
        const extensionAttributeQuery = /(?:\?|\&)format\=([^&]+)/g

        const nameMatches = uploadedImageQuery.exec(url)
        const formatMatches = extensionAttributeQuery.exec(url)

        let options = {
            url: url,
            saveAs: items.spcificPathName
        }

        let filename = 'no_title'
        const format = formatMatches[1]

        if (nameMatches.length) {
            filename = nameMatches[1]
        }

        if (!!items.readableName) {
            if (!!chrome.downloads.onDeterminingFilename) {
                readableNameList[`${filename}.${format}`] = `${readerableFilename}.${format}`

                if (!!chrome.downloads.onDeterminingFilename && !isRenamerActivated()) {
                    chrome.downloads.onDeterminingFilename.addListener(chromeDownloadRenamer)
                }
            }
            filename = readerableFilename
        }

        if (formatMatches.length) {
            options.filename = `${filename}.${format}`
        }

        browser.downloads.download(options)
            .then((_downloadItem) => {
                if (!!chrome.downloads.onDeterminingFilename) {
                    if (!Object.keys(readableNameList).length) {
                        chrome.downloads.onDeterminingFilename.removeListener(chromeDownloadRenamer)
                    }
                }
            })
    })
}

function getCookie(cname) {
    var name = cname + "="
    var decodedCookie = decodeURIComponent(document.cookie)
    var ca = decodedCookie.split(';')
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i]
        while (c.charAt(0) == ' ') {
            c = c.substring(1)
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length)
        }
    }
    return ""
}

function findMaxBandwidthSource(string) {
    var stringsSplited = string.split("#")
    var arrBandwidth = []
    for (var i in stringsSplited) {
        var bandwidth = findBandwidth(stringsSplited[i])
        if (bandwidth > 0) {
            arrBandwidth.push(bandwidth)
        }
    }

    var bandwidthMax = Math.max.apply(null, arrBandwidth)
    for (var i in stringsSplited) {
        if (bandwidthMax == findBandwidth(stringsSplited[i])) {
            return findPlaylistSource(stringsSplited[i])
        }
    }
    return ""
}

function findBandwidth(sourcePlaylist) {
    var stringsSplited = sourcePlaylist.split(/:|,/)
    for (var i in stringsSplited) {
        if (stringsSplited[i].search("BANDWIDTH") == 0) {
            return Number(stringsSplited[i].split("=")[1])
        }
    }
    return -1
}

function findPlaylistSource(sourcePlaylist) {
    var stringsSplited = sourcePlaylist.split("\n")
    for (var i in stringsSplited) {
        if (((stringsSplited[i].search("ext_tw_video") > 0) || (stringsSplited[i].search("amplify_video") > 0)) && (stringsSplited[i].search("m3u8") > 0)) {
            return "https://video.twimg.com" + stringsSplited[i]
        }
    }
    return ""
}

function parseVideoUrls(string) {
    var stringsSplited = string.split("#")
    var arrPlaylist = []
    for (var i in stringsSplited) {
        if ((stringsSplited[i].search("ext_tw_video") > 0) || (stringsSplited[i].search("amplify_video") > 0)) {
            arrPlaylist.push("https://video.twimg.com" + stringsSplited[i].split("\n")[1])
        }
    }
    return arrPlaylist
}

function isRenamerActivated() {
    return chrome.downloads.onDeterminingFilename.hasListener(chromeDownloadRenamer)
}
