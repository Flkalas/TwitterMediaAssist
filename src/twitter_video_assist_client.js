const downloadButton = '<div class="ProfileTweet-action tva_download_action"><button class="ProfileTweet-actionButton u-textUserColorHover js-actionButton tva_js_download" type="button"><div class="IconContainer js-tooltip" data-original-title="Video Download"><span class="Icon Icon--medium tva_download_icon"></span><span class="u-hiddenVisually"></span></div></button></div>'
const progressPopup = '<div class="stream-item tva_ext_container tva_hide" aria-live="polite"><div class="tva_ext_spinner"><div class="tva_spinner"></div></div><div class="tva_ext_text_box"><p class="tva_ext_text">GIF Converting...</p></div></div>'

const downloadIcon = '<g xmlns="http://www.w3.org/2000/svg"><g transform="rotate(-180 11.999625205993652,9.00012493133545)"><path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12"/></g><g><path d="M12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"/></g></g>'
const reactProgressPopup = '<div class="tva-react-spinner-wrapper"><div class="tva_spinner tva_spinner_old"></div><span class="css-901oao css-16my406 r-1qd0xha r-ad9z0x r-bcqeeo r-qvutc0">GIFing...</span></div>'

const modalCalss = 'div[aria-modal="true"]'

$(document).ready(initialize)
$(document).on('DOMNodeInserted', injectAdditionalDownloadButtons)
$(document).on({
    mouseenter: function (e) {
        $(e.currentTarget).find('svg').prev().addClass('r-zv2cs0')
        $(e.currentTarget).find('svg').prev().parent().parent().removeClass('r-111h2gw')
        $(e.currentTarget).find('svg').prev().parent().parent().addClass('r-13gxpu9')
    },
    mouseleave: function (e) {
        $(e.currentTarget).find('svg').prev().removeClass('r-zv2cs0')
        $(e.currentTarget).find('svg').prev().parent().parent().addClass('r-111h2gw')
        $(e.currentTarget).find('svg').prev().parent().parent().removeClass('r-13gxpu9')
    }
}, ".tva-download-icon")
browser.runtime.onMessage.addListener(processRequest)

function initialize() {
    $(".tweet").each(function () {
        injectDownloadButton(this)
    })
    $("body").append(progressPopup)
    $(".tva_ext_container").css("z-index", getMaximumZindex() + 1)
}

function injectAdditionalDownloadButtons(event) {
    const tweets = $(event.target).find('article')

    if (tweets.length) {
        tweets.each((index, element) => {
            analysisDom(element)
        })
    } else {
        analysisDom(event.target)
    }

    $(event.target).find('.AdaptiveMedia-video').each(function () {
        injectDownloadButton(this)
    })
}

function hasMedia(element) {
    const isImage = element.outerHTML.includes('pbs.twimg.com/media')
    const isVideo = $(element).html().includes('video')

    return isImage || isVideo
}

function analysisDom(content) {
    if (hasMedia(content)) {
        injectReactDownloadButton(content)
    }
}

function injectReactModalDownloadButton(modal) {
    if (modal.find('div[role="group"] div.tva-modal-download-icon').length) {
        return
    }

    var icon = modal.find('div[role="group"] div:nth-child(4)')

    icon.after(icon.clone())

    var download = icon.next()
    download.addClass('tva-modal-download-icon')
    download.children('div:first-child').data('testid', 'download')
    download.children('div:first-child').attr('aria-label', 'Media Download')
    download.find('svg').html(downloadIcon)
    download.click(modalCalss, downloadMediaObject)

    icon.attr('class', icon.prev().attr('class'))
}

function injectReactDownloadButton(target) {
    var tweet = $(target).closest('article')

    if (!tweet.length) {
        const modal = $(target).closest(modalCalss)
        injectReactModalDownloadButton(modal)
        return
    }

    if (tweet.find('div[role="group"] div.tva-download-icon').length) {
        return
    }

    var icons = tweet.find('div[role="group"] div:nth-child(4)')
    icons.after(icons.clone())
    icons.attr('class', icons.prev().attr('class'))

    var download = icons.next()
    download.addClass('tva-download-icon')
    download.children('div:first-child').data('testid', 'download')
    download.children('div:first-child').attr('aria-label', 'Media Download')
    download.find('svg').html(downloadIcon)
    download.click('article', downloadMediaObject)
}

function injectDownloadButton(target) {
    var tweet = $(target).closest('.tweet')
    if (!isVideoExist(tweet)) {
        return
    }

    if (isVideoDownloadButton(tweet)) {
        return
    }

    var favIcon = $(tweet).find('div.ProfileTweet-action--favorite')[0]
    $(favIcon).after(downloadButton)
    $(favIcon).siblings(".tva_download_action").find('button.tva_js_download').click('.tweet', downloadMediaObject)
}

function indexOfImage(selector) {
    if (selector !== modalCalss) {
        return
    }
    const splited = window.location.pathname.split('/')
    return Number(splited[splited.length - 1]) - 1
}

function downloadMediaObject(event) {
    const tweetSelector = event.data
    const tweet = $(event.currentTarget).closest(tweetSelector)
    var videoTag = tweet.find('video')[0]
    var imageTags = tweet.find('img')

    if (tweetSelector === modalCalss && imageTags.length) {
        imageTags = $(imageTags[indexOfImage(tweetSelector)])
    }

    if (videoTag) {
        downloadVideoObject(tweet, tweetSelector, videoTag)
    } else if (imageTags.length) {
        downloadImageObject(tweet, tweetSelector, imageTags)
    }
}

function downloadVideoObject(tweet, tweetSelector, videoTag) {
    var videoSource = videoTag.src
    if (!videoSource) {
        videoSource = tweet.find('source')[0].src
    }

    browser.runtime.sendMessage({
        type: 'video',
        videoSource: videoSource,
        tweetId: getTweetId(tweet, tweetSelector),
        readerableFilename: readerableFilename(tweet, tweetSelector),
        tweetSelector: tweetSelector,
        token: getCookie("ct0")
    })
}

function downloadImageObject(tweet, tweetSelector, imageTags) {
    // const uploadedImageQuery = /(https:\/\/pbs.twimg.com\/media\/.*)$/g;
    const nameAttributeQuery = /(name=)(.*)(\&?.*)/g

    imageTags.each((index, element) => {
        let src = $(element).attr('src')
        const isUploadedImage = src.includes('https://pbs.twimg.com/media')
        if (isUploadedImage) {
            if (nameAttributeQuery.test(src)) {
                src = src.replace(nameAttributeQuery, '$1orig$3')
            } else if (src.includes('=')) {
                src = src + '&name=orig'
            } else {
                src = src + '?name=orig'
            }
            const index = getTweetIndex($(element).parents('a')[0].href)
            processImageDownload(src, readerableFilename(tweet, tweetSelector, index))
        }
    })
}

function readerableFilename(tweet, selector, index) {
    if (selector === modalCalss) {
        return `${getTweetOwner(tweet, selector)}-${getTweetId(tweet, selector)}-${indexOfImage(selector) + 1}`
    } else if (!!index) {
        return `${getTweetOwner(tweet, selector)}-${getTweetId(tweet, selector)}-${index}`
    } else {
        return `${getTweetOwner(tweet, selector)}-${getTweetId(tweet, selector)}`
    }
}

function getTweetOwner(tweet, selector) {
    const re = /(?:https:\/\/[A-z.]*\/(\w*)\/status\/)(?:\d*)(?:\/?\w*)/g
    return getTweetData(tweet, selector, re)
}

function getTweetId(tweet, selector) {
    const re = /(?:https:\/\/[A-z.]*\/\w*\/status\/)(\d*)(?:\/?\w*)/g
    return getTweetData(tweet, selector, re)
}

function getTweetIndex(statusUrl) {
    const re = /(?:https:\/\/[A-z.]*\/\w*\/status\/)(?:\d*\/?\w*\/)(\d)/g
    const match = re.exec(statusUrl)
    if (match) {
        return match[1]
    }
    return 0
}

function getTweetData(tweet, selector, re) {
    if (selector === '.tweet') {
        return tweet.data("tweet-id")
    } else if (selector === 'article') {
        for (const element of tweet.find('a').toArray()) {
            const match = re.exec(element.href)
            if (match) {
                return match[1]
            }
        }
    } else if (selector === modalCalss) {
        const match = re.exec(window.location.href)
        if (match) {
            return match[1]
        }
    }
}

function processRequest(request) {
    toggleReactProgressPopup(request)
}

function toggleReactProgressPopup(request) {
    if (!$(".tweet").length) {
        let spinner = $('.tva-react-spinner-wrapper')
        if (request.hideSpinner) {
            if (spinner.length) {
                spinner.remove()
            }
        } else {
            if (!spinner.length) {
                $('.css-1dbjc4n.r-16y2uox.r-1wbh5a2.r-1pi2tsx.r-1777fci h2:first-child ').append($(reactProgressPopup))
            }
        }
    } else {
        if (request.hideSpinner) {
            $(".tva_ext_container").addClass("tva_hide")
        } else {
            $(".tva_ext_container").removeClass("tva_hide")
        }
    }
}

function getMaximumZindex() {
    function intOrNaN(x) {
        return /^\d+$/.test(x) ? +x : NaN
    }

    let maxZ = 0
    $('div').each((element, index) => {
        try {
            var indexCurrent = intOrNaN($(element).css("z-index"))
            if (indexCurrent > maxZ) {
                maxZ = indexCurrent
            }
        } catch {

        }
    })
    return maxZ
}

function isVideoExist(target) {
    return $(target).find('.AdaptiveMedia-video')[0]
}

function isVideoDownloadButton(target) {
    return $(target).find('button.tva_js_download')[0]
}