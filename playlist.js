'use strict';

// Constants
const COUNTDOWN_DURATION = 5; // Number of seconds for countdown
const API_HEADERS = { headers: { Authorization: `Bearer ${TOKEN}` } }; // API headers configuration

// State Variables
let currentVideoIndex = 0;
let videoQueue = [];
let countdownStarted = false;
let countdownInterval;

const Playlist = {
  // Fetch video data from Rails API to get visibility status
  getRailsVideos() {
    const railsApiUrl = 'http://localhost:3000/api/v1/videos';
    return axios.get(railsApiUrl).catch(handleApiError);
  },

  // Fetch video data from the Wistia API
  getWistiaMedias() {
    const url = new URL('https://api.wistia.com/v1/medias.json');
    return axios.get(url.toString(), API_HEADERS).catch(handleApiError);
  },

  // Fetch videos from both APIs
  async fetchVideos() {
    try {
      const [railsResponse, wistiaResponse] = await Promise.all([this.getRailsVideos(), this.getWistiaMedias()]);
      const visibleVideos = railsResponse.data;
      const wistiaVideos = wistiaResponse.data;

      // Combine both data sets using the wistia_hash as the key
      return wistiaVideos.filter((wistiaVideo) =>
        visibleVideos.some(
          (video) => video.wistia_hash === wistiaVideo.hashed_id && video.visible
        )
      );
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      return [];
    }
  },

  // Render media elements for the playlist
  renderMedia(media) {
    const template = document.getElementById('media-template');
    const clone = template.content.cloneNode(true);
    const el = clone.children[0];

    el.querySelector('.thumbnail').setAttribute('src', media.thumbnail.url);
    el.querySelector('.title').innerText = media.name;
    el.querySelector('.duration').innerText = Utils.formatTime(media.duration);
    el.querySelector('.media-content').setAttribute('href', `#wistia_${media.hashed_id}`);
    el.setAttribute('data-hashed-id', media.hashed_id);
    el.setAttribute('data-index', videoQueue.indexOf(media)); // Set the video index

    document.getElementById('medias').appendChild(el);
  },

  // Set up the initial playlist
  setupPlaylist() {
    if (videoQueue.length === 0) {
      console.warn('No videos available in the queue.');
      return;
    }

    // Load and play the first video in the playlist
    this.loadAndPlayVideo(currentVideoIndex);
  },

  // Load and play a video by index
  loadAndPlayVideo(videoIndex) {
    countdownStarted = false; // Reset countdown flag at the beginning of each video
    clearCountdown(); // Clear any existing countdown interval

    currentVideoIndex = videoIndex;
    const currentVideo = videoQueue[videoIndex];

    // Update the Wistia embed container with the new video
    document.querySelector('.wistia_embed').className = `wistia_embed wistia_async_${currentVideo.hashed_id} playlistLinks=auto`;

    // Initialize the Wistia player for the current video
    window._wq = window._wq || [];
    _wq.push({
      id: currentVideo.hashed_id,
      onReady: (videoApi) => {
        videoApi.play(); // Play the current video

        // Update UI to show "Playing" overlay for the current video
        this.updatePlayingOverlay(currentVideo.hashed_id);

        // Bind to the timechange event to trigger countdown in the last 5 seconds
        videoApi.bind('timechange', (t) => {
          if (videoApi.duration() - t <= COUNTDOWN_DURATION && !countdownStarted) {
            countdownStarted = true;
            const nextVideoIndex = currentVideoIndex + 1;
            const nextVideo = videoQueue[nextVideoIndex];
            showCountdownOverlay(nextVideo, () => {
              this.loadAndPlayVideo(nextVideoIndex);
            });
          }
        });

        // Bind to end event to handle when video finishes playing
        videoApi.bind('end', () => {
          videoApi.unbind('timechange');
          videoApi.unbind('end');
        });
      },
    });
  },

  // Update "Playing" overlay on the current video thumbnail
  updatePlayingOverlay(currentHashedId) {
    // Remove "Playing" overlay from all videos first
    document.querySelectorAll('.media-overlay').forEach((overlay) => {
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

// Utility function to show the countdown overlay
function showCountdownOverlay(nextVideo, callback) {
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownTimer = document.getElementById('countdown-timer');
  const nextVideoTitle = document.getElementById('next-video-title');
  const nextVideoThumbnail = document.getElementById('next-video-thumbnail');

  // Update overlay with the next video info
  nextVideoTitle.innerText = nextVideo.name;
  nextVideoThumbnail.src = nextVideo.thumbnail.url;

  countdownOverlay.classList.remove('hidden');
  let countdown = COUNTDOWN_DURATION;
  countdownTimer.innerText = countdown;

  clearCountdown(); // Clear any existing countdown interval

  countdownInterval = setInterval(() => {
    countdown -= 1;
    countdownTimer.innerText = countdown;

    if (countdown === 0) {
      clearCountdown();
      countdownOverlay.classList.add('hidden');
      if (callback) {
        callback(); // Proceed with the next video when countdown ends
      }
    }
  }, 1000);
}

// Utility function to clear the countdown interval
function clearCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
}

// Utility function to handle API errors
function handleApiError(error) {
  console.error('API request failed:', error);
  return Promise.reject(error);
}

// Event listener to handle manual video selection
document.getElementById('medias').addEventListener('click', (event) => {
  if (event.target.closest('.media-content')) {
    event.preventDefault();

    const videoEl = event.target.closest('.media');
    if (videoEl) {
      const videoIndex = parseInt(videoEl.getAttribute('data-index'), 10);
      Playlist.loadAndPlayVideo(videoIndex);
    }
  }
});

// Initialize the playlist on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    videoQueue = await Playlist.fetchVideos();

    if (videoQueue.length === 0) {
      console.warn('No videos available to display.');
      return;
    }

    // Render the videos in the playlist
    videoQueue.forEach((media) => {
      Playlist.renderMedia(media);
    });

    // Set up the playlist in the Wistia player
    Playlist.setupPlaylist();
  } catch (error) {
    console.error('Failed to initialize the playlist:', error);
  }
});
