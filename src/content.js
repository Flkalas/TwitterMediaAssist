
//appends our injections to the page
const downloaderScript = document.createElement('script');
downloaderScript.src = chrome.runtime.getURL('twitter_video_downloader.js');
downloaderScript.onload = () => {
  downloaderScript.remove();

  const interceptorScript = document.createElement('script');
  interceptorScript.src = chrome.runtime.getURL('inject.js');
  interceptorScript.onload = () => interceptorScript.remove();
  (document.head || document.documentElement).appendChild(interceptorScript);
};

(document.head || document.documentElement).appendChild(downloaderScript);



//receive messages from the injected script and send them to our listeners
window.addEventListener('message', (event) => {

  //making sure we're processing only our extension and tab events
  if (event.source !== window) return;
  if (event.data?.source === 'rectifying@gmail.com' && event.data.type === 'UPDATE_SESSION_DATA') {

    //pass the events further to the main code outside
    chrome.runtime.sendMessage({
      type: 'UPDATE_SESSION_DATA',
      data: event.data.data
    });
  }
});