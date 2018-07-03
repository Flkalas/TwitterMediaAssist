var downloadButton = '<div class="ProfileTweet-action tva_download_action"><button class="ProfileTweet-actionButton u-textUserColorHover js-actionButton tva_js_download" type="button"><div class="IconContainer js-tooltip" data-original-title="Video Download"><span class="Icon Icon--medium tva_download_icon"></span><span class="u-hiddenVisually"></span></div></button></div>';
var progressPopup = '<div class="stream-item tva_ext_container tva_hide" aria-live="polite"><div class="tva_ext_spinner"><div class="tva_spinner"></div></div><div class="tva_ext_text_box"><p class="tva_ext_text">GIF Converting...</p></div></div>'

$(document).ready(initialize);
$(document).on('DOMNodeInserted', injectAdditionalDownloadButtons);
browser.runtime.onMessage.addListener(processRequest)

function initialize() {
    $(".tweet").each(function () {
        injectDownloadButton(this);
    });
    $("body").append(progressPopup);
    $(".tva_ext_container").zIndex(getMaximumZindex() + 1);
}

function injectAdditionalDownloadButtons(event) {
    $(event.target).find('.AdaptiveMedia-video').each(function () {
        injectDownloadButton(this);
    });
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
    $(favIcon).siblings(".tva_download_action").find('button.tva_js_download').click(downloadVideoObject);
}

function downloadVideoObject() {
    var videoTag = $(this).closest('.tweet').find('video')[0];
    if (!videoTag) {
        return
    }

    videoSource = videoTag.src
    if (!videoSource) {
        videoSource = $(this).closest('.tweet').find('source')[0].src
    }

    if (videoSource.includes('blob')) {
        processBlobVideo($(this).closest('.tweet').data("tweet-id"));
    } else if (videoSource.includes('ext_tw_video')) {
        browser.runtime.sendMessage({
            type: 'mp4Video',
            address: videoSource
        });
    } else {
        processGifVideo(videoSource);
    }
}

function processRequest(request) {
    if (request.hideSpinner) {
        $(".tva_ext_container").addClass("tva_hide");
    } else {
        $(".tva_ext_container").removeClass("tva_hide");
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