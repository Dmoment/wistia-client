'use strict';

var currentVideoIndex = 0;
var videoQueue = [];
var countdownStarted = false; // Declare countdownStarted globally
var countdownInterval; // Variable to store the countdown interval ID

var Playlist = {
  getRailsVideos: function () {
    // Fetch video data from the Rails API to get visibility status
    var railsApiUrl = 'http://localhost:3000/api/v1/videos';
    return axios.get(railsApiUrl);
  },

  getWistiaMedias: function () {
    // Fetch video data from the Wistia API
    var url = new URL('https://api.wistia.com/v1/medias.json');
    return axios.get(String(url), { headers: { Authorization: `Bearer ${TOKEN}` } });
  },

  fetchVideos: function () {
    // Fetch videos from both APIs
    return Promise.all([Playlist.getRailsVideos(), Playlist.getWistiaMedias()])
      .then(function ([railsResponse, wistiaResponse]) {
        const visibleVideos = railsResponse.data; // Data from Rails API
        const wistiaVideos = wistiaResponse.data; // Data from Wistia API

        // Combine both data sets using the wistia_hash as the key
        const visibleWistiaVideos = wistiaVideos.filter(wistiaVideo => {
          return visibleVideos.some(video => video.wistia_hash === wistiaVideo.hashed_id && video.visible);
        });

        return visibleWistiaVideos;
      });
  },

  renderMedia: function (media) {
    var template = document.getElementById('media-template');
    var clone = template.content.cloneNode(true);
    var el = clone.children[0];

    el.querySelector('.thumbnail').setAttribute('src', media.thumbnail.url);
    el.querySelector('.title').innerText = media.name;
    el.querySelector('.duration').innerText = Utils.formatTime(media.duration);
    el.querySelector('.media-content').setAttribute('href', '#wistia_' + media.hashed_id);
    el.setAttribute('data-hashed-id', media.hashed_id);
    el.setAttribute('data-index', videoQueue.indexOf(media)); // Set the video index

    document.getElementById('medias').appendChild(el);
  },

  setupPlaylist: function () {
    if (videoQueue.length === 0) {
      return;
    }

    // Load and play the first video in the playlist
    Playlist.loadAndPlayVideo(currentVideoIndex);
  },

  loadAndPlayVideo: function (videoIndex) {
    countdownStarted = false; // Reset countdown flag at the beginning of each video

    // Clear any active countdown interval and hide the countdown overlay
    if (countdownInterval) {
      clearInterval(countdownInterval);
      document.getElementById('countdown-overlay').classList.add('hidden');
    }

    currentVideoIndex = videoIndex; // Update the current video index
    var currentVideo = videoQueue[videoIndex];

    // Update the Wistia embed container with the new video
    document.querySelector('.wistia_embed').className = `wistia_embed wistia_async_${currentVideo.hashed_id} playlistLinks=auto playlistLoop=true`;

    // Initialize the Wistia player for the current video
    window._wq = window._wq || [];
    _wq.push({
      id: currentVideo.hashed_id,
      onReady: function (videoApi) {
        // Play the current video
        videoApi.play();

        // Update UI to show "Playing" overlay for the current video in the list
        Playlist.updatePlayingOverlay(currentVideo.hashed_id);

        // Bind to the timechange event to trigger countdown in the last 5 seconds
        videoApi.bind("timechange", function (t) {
          if (videoApi.duration() - t <= 5 && !countdownStarted) {
            countdownStarted = true;

            let nextVideoIndex = currentVideoIndex + 1;
            let nextVideo = videoQueue[nextVideoIndex];
            showCountdownOverlay(nextVideo, function () {
              // After countdown ends, load the next video
              Playlist.loadAndPlayVideo(nextVideoIndex);
            });

          }
        });

        // Bind the end event to handle when a video finishes playing
        videoApi.bind("end", function () {
          videoApi.unbind("timechange");
          videoApi.unbind("end");
        });
      }
    });
  },

  updatePlayingOverlay: function (currentHashedId) {
    // Remove "Playing" overlay from all videos first
    document.querySelectorAll('.media-overlay').forEach(function (overlay) {
      overlay.classList.add('hidden');
    });

    // Show "Playing" overlay for the currently playing video
    if (currentHashedId) {
      const currentMediaEl = document.querySelector(`[data-hashed-id="${currentHashedId}"]`);
      if (currentMediaEl) {
        const playingOverlay = currentMediaEl.querySelector('.thumbnail-container .media-overlay');
        if (playingOverlay) {
          playingOverlay.classList.remove('hidden');
        }
      }
    }
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

  // Clear any existing countdown interval to avoid multiple intervals
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  countdownInterval = setInterval(() => {
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

// Event listener to handle manual video selection
document.getElementById('medias').addEventListener('click', function (event) {
  if (event.target.closest('.media-content')) {
    event.preventDefault();

    const videoEl = event.target.closest('.media');
    if (videoEl) {
      const videoIndex = parseInt(videoEl.getAttribute('data-index'), 10);
      Playlist.loadAndPlayVideo(videoIndex);
    }
  }
});

(function () {
  document.addEventListener(
    'DOMContentLoaded',
    function () {
      Playlist.fetchVideos().then(function (visibleWistiaVideos) {
        videoQueue = visibleWistiaVideos;

        if (videoQueue.length === 0) {
          return;
        }

        // Render the videos in the playlist
        videoQueue.forEach(function (media) {
          Playlist.renderMedia(media);
        });

        // Set up the playlist in the Wistia player
        Playlist.setupPlaylist();
      });
    },
    false
  );
})();
