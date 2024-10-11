'use strict';

var currentVideoIndex = 0;
var videoQueue = [];
var countdownStarted = false; // Declare countdownStarted globally

var Playlist = {
  getMedias: function() {
    var url = new URL('https://api.wistia.com/v1/medias.json');
    return axios.get(String(url), { headers: { Authorization: `Bearer ${TOKEN}` } });
  },

  renderMedia: function(media) {
    var template = document.getElementById('media-template');
    var clone = template.content.cloneNode(true);
    var el = clone.children[0];

    el.querySelector('.thumbnail').setAttribute('src', media.thumbnail.url);
    el.querySelector('.title').innerText = media.name;
    el.querySelector('.duration').innerText = Utils.formatTime(media.duration);
    el.querySelector('.media-content').setAttribute('href', '#wistia_' + media.hashed_id);

    document.getElementById('medias').appendChild(el);
  },

  setupPlaylist: function() {
    if (videoQueue.length === 0) {
      return;
    }

    // Load and play the first video in the playlist
    Playlist.loadAndPlayVideo(currentVideoIndex);
  },

  loadAndPlayVideo: function(videoIndex) {
    countdownStarted = false; // Reset countdown flag at the beginning of each video

    var currentVideo = videoQueue[videoIndex];

    // Update the Wistia embed container with the new video
    document.querySelector('.wistia_embed').className = `wistia_embed wistia_async_${currentVideo.hashed_id} playlistLinks=auto playlistLoop=true`;

    // Initialize the Wistia player for the current video
    window._wq = window._wq || [];
    _wq.push({
      id: currentVideo.hashed_id,
      onReady: function(videoApi) {
        // Play the current video
        videoApi.play();

        // Bind to the timechange event to trigger countdown in the last 5 seconds
        videoApi.bind("timechange", function(t) {
          if (videoApi.duration() - t <= 5 && !countdownStarted) {
            countdownStarted = true;

            // Update countdown overlay with the next video's info
            let nextVideoIndex = (currentVideoIndex + 1) % videoQueue.length;
            let nextVideo = videoQueue[nextVideoIndex];
            showCountdownOverlay(nextVideo, function() {
              // After countdown ends, load the next video
              currentVideoIndex = nextVideoIndex;
              Playlist.loadAndPlayVideo(currentVideoIndex);
            });
          }
        });

        // Unbind all events when video ends to avoid overlapping issues
        videoApi.bind("end", function() {
          videoApi.unbind("timechange");
          videoApi.unbind("end");
        });
      }
    });
  }
};

// Function to show the countdown overlay and execute a callback after countdown ends
function showCountdownOverlay(nextVideo, callback) {
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownTimer = document.getElementById('countdown-timer');
  const nextVideoTitle = document.getElementById('next-video-title');
  const nextVideoThumbnail = document.getElementById('next-video-thumbnail');

  // Update overlay with the next video info
  nextVideoTitle.innerText = nextVideo.name;
  nextVideoThumbnail.src = nextVideo.thumbnail.url;

  countdownOverlay.classList.remove('hidden');

  let countdown = 5;
  countdownTimer.innerText = countdown;

  const countdownInterval = setInterval(() => {
    countdown -= 1;
    countdownTimer.innerText = countdown;

    if (countdown === 0) {
      clearInterval(countdownInterval);
      countdownOverlay.classList.add('hidden');
      if (callback) {
        callback(); // Execute the callback to proceed with the next video when countdown ends
      }
    }
  }, 1000);
}

(function() {
  document.addEventListener(
    'DOMContentLoaded',
    function() {
      Playlist.getMedias().then(function(response) {
        videoQueue = response.data;
        if (videoQueue.length === 0) {
          return;
        }

        // Render the videos in the playlist
        videoQueue.forEach(function(media) {
          Playlist.renderMedia(media);
        });

        // Set up the playlist in the Wistia player
        Playlist.setupPlaylist();
      });
    },
    false
  );
})();
