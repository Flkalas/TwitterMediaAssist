const downloadButton = '<div class="ProfileTweet-action tva_download_action"><button class="ProfileTweet-actionButton u-textUserColorHover js-actionButton tva_js_download" type="button"><div class="IconContainer js-tooltip" data-original-title="Video Download"><span class="Icon Icon--medium tva_download_icon"></span><span class="u-hiddenVisually"></span></div></button></div>';
const progressPopup = '<div class="stream-item tva_ext_container tva_hide" aria-live="polite"><div class="tva_ext_spinner"><div class="tva_spinner"></div></div><div class="tva_ext_text_box"><p class="tva_ext_text">GIF Converting...</p></div></div>'

const downloadIcon = '<g xmlns="http://www.w3.org/2000/svg"><g transform="rotate(-180 11.999625205993652,9.00012493133545)"><path d="M17.53 7.47l-5-5c-.293-.293-.768-.293-1.06 0l-5 5c-.294.293-.294.768 0 1.06s.767.294 1.06 0l3.72-3.72V15c0 .414.336.75.75.75s.75-.336.75-.75V4.81l3.72 3.72c.146.147.338.22.53.22s.384-.072.53-.22c.293-.293.293-.767 0-1.06z"/></g><g><path d="M19.708 21.944H4.292C3.028 21.944 2 20.916 2 19.652V14c0-.414.336-.75.75-.75s.75.336.75.75v5.652c0 .437.355.792.792.792h15.416c.437 0 .792-.355.792-.792V14c0-.414.336-.75.75-.75s.75.336.75.75v5.652c0 1.264-1.028 2.292-2.292 2.292z"/></g></g>'
const reactProgressPopup = '<div class="tva-react-spinner-wrapper"><div class="tva_spinner tva_spinner_old"></div><span class="css-901oao css-16my406 r-1qd0xha r-ad9z0x r-bcqeeo r-qvutc0">GIFing...</span></div>'

$(document).ready(initialize);
$(document).on('DOMNodeInserted', injectAdditionalDownloadButtons);
$(document).on({
    mouseenter: function (e) {
        $(e.currentTarget).find('svg').prev().addClass('r-zv2cs0');
        $(e.currentTarget).find('svg').prev().parent().parent().removeClass('r-111h2gw')
        $(e.currentTarget).find('svg').prev().parent().parent().addClass('r-13gxpu9')
    },
    mouseleave: function (e) {
        $(e.currentTarget).find('svg').prev().removeClass('r-zv2cs0');
        $(e.currentTarget).find('svg').prev().parent().parent().addClass('r-111h2gw')
        $(e.currentTarget).find('svg').prev().parent().parent().removeClass('r-13gxpu9')
    }
}, ".tva-download-icon");
browser.runtime.onMessage.addListener(processRequest)

function initialize() {
    $(".tweet").each(function () {
        injectDownloadButton(this);
    });
    $("body").append(progressPopup);
    $(".tva_ext_container").zIndex(getMaximumZindex() + 1);
}

function injectAdditionalDownloadButtons(event) {
    if ($(event.target).html().includes('video')) {
        injectReactDownloadButton($(event.target).find('video'))
    }

    const src = $(event.target).attr('src')
    if (src !== undefined && src.includes('pbs.twimg.com/media')) {
        injectReactDownloadButton($(event.target).closest('div.css-1dbjc4n.r-156q2ks'))
    }

    $(event.target).find('.AdaptiveMedia-video').each(function () {
        injectDownloadButton(this);
    });
}

function injectReactDownloadButton(target) {
    var tweet = target.closest('article');

    if (tweet.find('div[role="group"] div.tva-download-icon').length) {
        return
    }

    var icons = tweet.find('div[role="group"] div:nth-child(4)');
    icons.after(icons.clone())

    var download = icons.next()
    download.addClass('tva-download-icon')
    download.children('div:first-child').data('testid', 'download')
    download.children('div:first-child').attr('aria-label', 'Media Download');
    download.find('svg').html(downloadIcon)
    download.click('article', downloadMediaObject);
}

function injectDownloadButton(target) {
    var tweet = $(target).closest('.tweet');
    if (!isVideoExist(tweet)) {
        return;
    }

    if (isVideoDownloadButton(tweet)) {
        return;
    }

    var favIcon = $(tweet).find('div.ProfileTweet-action--favorite')[0];
    $(favIcon).after(downloadButton);
    $(favIcon).siblings(".tva_download_action").find('button.tva_js_download').click('.tweet', downloadMediaObject);
}

function downloadMediaObject(event) {
    const tweetSelector = event.data
    const tweet = $(event.currentTarget).closest(tweetSelector)
    var videoTag = tweet.find('video')[0];
    var imageTags = tweet.find('img');

    if (videoTag) {
        downloadVideoObject(videoTag)
    } else if (imageTags.length) {
        downloadImageObject(imageTags)
    }
}

function downloadVideoObject(videoTag) {
    var videoSource = videoTag.src
    if (!videoSource) {
        videoSource = tweet.find('source')[0].src
    }

    if (videoSource.includes('blob')) {
        const tweetId = getTweetId(tweet, tweetSelector);
        if (!!tweetId) {
            processBlobVideo(tweetId);
        }
    } else if (videoSource.includes('ext_tw_video')) {
        browser.runtime.sendMessage({
            type: 'mp4Video',
            url: videoSource
        });
    } else {
        processGifVideo(videoSource);
    }
}

function downloadImageObject(imageTags) {
    const uploadedImageQuery = /(https:\/\/pbs.twimg.com\/media\/.*)$/g;
    const nameAttributeQuery = /(name=)(.*)(\&?.*)/g;
    imageTags.each((index, element) => {
        let src = $(element).attr('src')
        const isUploadedImage = src.includes('https://pbs.twimg.com/media')
        if (isUploadedImage) {
            if (nameAttributeQuery.test(src)) {
                src = src.replace(nameAttributeQuery, '$1orig$3')
            } else if (src.includes('=')) {
                src = src + '&name=orig';
            } else {
                src = src + '?name=orig';
            }
            processImageDownload(src)
        }
    })
}

function getTweetId(tweet, selector) {
    const re = /(?:https:\/\/[A-z.]*\/\w*\/status\/)(\d*)(?:\/?\w*)/g;

    if (selector === '.tweet') {
        return tweet.data("tweet-id")
    } else if (selector === 'article') {
        for (const element of tweet.find('a').toArray()) {
            const match = re.exec(element.href)
            if (match) {
                return match[1];
            }
        }
    }
}

function processRequest(request) {
    toggleReactProgressPopup(request);
}

function toggleReactProgressPopup(request) {
    if (!$(".tweet").length) {
        let spinner = $('.tva-react-spinner-wrapper')
        if (spinner.length && request.hideSpinner) {
            spinner.remove();
        } else {
            $('.css-1dbjc4n.r-16y2uox.r-1wbh5a2.r-1pi2tsx.r-1777fci h2:first-child ').append($(reactProgressPopup));
        }
    } else {
        if (request.hideSpinner) {
            $(".tva_ext_container").addClass("tva_hide");
        } else {
            $(".tva_ext_container").removeClass("tva_hide");
        }
    }
}

function getMaximumZindex() {
    var maxZ = 0;
    $('div').each(() => {
        var indexCurrent = parseInt($(this).css("z-index"), 10);
        if (indexCurrent > maxZ) {
            maxZ = indexCurrent;
        }
    });
    return maxZ;
}

function isVideoExist(target) {
    return $(target).find('.AdaptiveMedia-video')[0];
}

function isVideoDownloadButton(target) {
    return $(target).find('button.tva_js_download')[0];
}