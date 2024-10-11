'use strict';

var Dashboard = {
  getMedias: function() {
    var url = new URL('https://api.wistia.com/v1/medias.json');
    return axios.get(String(url), { headers: { Authorization: `Bearer ${TOKEN}` } });
  },

  getRailsVideos: function() {
    // Fetch video data from Rails API to get visibility status and tags
    var railsApiUrl = 'http://localhost:3000/api/v1/videos';
    return axios.get(railsApiUrl);
  },

  fetchVideos: function() {
    // Fetch videos from both APIs
    return Promise.all([Dashboard.getRailsVideos(), Dashboard.getMedias()])
      .then(function([railsResponse, wistiaResponse]) {
        const railsVideos = railsResponse.data; // Data from Rails API
        const wistiaVideos = wistiaResponse.data; // Data from Wistia API

        // Combine both data sets using the wistia_hash as the key
        const combinedVideos = wistiaVideos.map(wistiaVideo => {
          const railsVideo = railsVideos.find(video => video.wistia_hash === wistiaVideo.hashed_id);
          return {
            ...wistiaVideo,
            visible: railsVideo ? railsVideo.visible : false,
            playCount: railsVideo ? railsVideo.play_count : 0,
            tags: railsVideo ? railsVideo.tags : [] // Include tags from Rails API
          };
        });

        return combinedVideos;
      });
  },

  renderTag: function(mediaEl, tag) {
    var template = document.getElementById('tag-template');
    var clone = template.content.cloneNode(true);
    var tagEl = clone.children[0];

    tagEl.innerText = tag.name; // Updated to show tag name from Rails API
    mediaEl.querySelector('.tags').append(tagEl);
  },

  renderTags: function(mediaEl, tags) {
    tags.forEach(function(tag) {
      Dashboard.renderTag(mediaEl, tag);
    });
  },

  renderMedia: function(media) {
    var template = document.getElementById('media-template');
    var clone = template.content.cloneNode(true);
    var el = clone.children[0];

    el.querySelector('.thumbnail').setAttribute('src', media.thumbnail.url);
    el.querySelector('.title').innerText = media.name;
    el.querySelector('.duration').innerText = Utils.formatTime(media.duration);
    el.querySelector('.count').innerText = media.playCount; // Handle undefined stats
    el.setAttribute('data-hashed-id', media.hashed_id);

    // Set visibility icon
    const visibleIcon = el.querySelector('.media--visible');
    const hiddenIcon = el.querySelector('.media--hidden');
    if (media.visible) {
      visibleIcon.style.display = 'inline';
      hiddenIcon.style.display = 'none';
    } else {
      visibleIcon.style.display = 'none';
      hiddenIcon.style.display = 'inline';
    }

    this.renderTags(el, media.tags || []); // Render associated tags

    document.getElementById('medias').appendChild(el);
  },

  toggleVisibility: function(hashedId) {
    // Get video element and toggle visibility icon
    const videoEl = document.querySelector(`[data-hashed-id="${hashedId}"]`);
    const visibleIcon = videoEl.querySelector('.media--visible');
    const hiddenIcon = videoEl.querySelector('.media--hidden');

    // Determine new visibility status
    const isCurrentlyVisible = visibleIcon.style.display === 'inline';
    const newVisibility = !isCurrentlyVisible;

    // Update the visibility status on the Rails backend
    axios
      .patch(`http://localhost:3000/api/v1/videos/${hashedId}`, {
        video: { visible: newVisibility }
      })
      .then(response => {
        // Update UI based on the new visibility status
        if (newVisibility) {
          visibleIcon.style.display = 'inline';
          hiddenIcon.style.display = 'none';
        } else {
          visibleIcon.style.display = 'none';
          hiddenIcon.style.display = 'inline';
        }
      })
      .catch(error => {
        console.error('Failed to update visibility:', error);
      });
  },

  openModal: function(videoId) {
    document.querySelector('.modal').classList.add('modal--open');
    document.querySelector('.modal').setAttribute('data-video-id', videoId);
  },

  closeModal: function() {
    document.querySelector('.modal').classList.remove('modal--open');
  },

  addTag: function(videoId, tagName) {
    axios
      .post(`http://localhost:3000/api/v1/videos/${videoId}/video_tags`, {
        tag: { name: tagName }
      })
      .then(function(response) {
        Dashboard.closeModal();

        // Add the tag to the appropriate video on the UI
        const videoEl = document.querySelector(`[data-hashed-id="${videoId}"]`);
        if (videoEl) {
          Dashboard.renderTag(videoEl, response.data);
        }
      })
      .catch(function(error) {
        console.error('Failed to add tag:', error);
      });
  }
};

(function() {
  document.addEventListener(
    'DOMContentLoaded',
    function() {
      Dashboard.fetchVideos().then(function(combinedVideos) {
        combinedVideos.map(function(media) {
          Dashboard.renderMedia(media);
        });
      });
    },
    { useCapture: false }
  );

  document.addEventListener(
    'click',
    function(event) {
      if (event && event.target.matches('.visibility-toggle')) {
        const hashedId = event.target.closest('.media').getAttribute('data-hashed-id');
        Dashboard.toggleVisibility(hashedId);
      }

      if (event && event.target.matches('.tag-button')) {
        const videoId = event.target.closest('.media').getAttribute('data-hashed-id');
        Dashboard.openModal(videoId);
      }

      if (event && event.target.matches('.modal__button--close')) {
        Dashboard.closeModal();
      }
    },
    { useCapture: true }
  );

  document.getElementById('tag-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const tagName = document.getElementById('tag-name').value.trim();
    const videoId = document.querySelector('.modal').getAttribute('data-video-id');

    if (tagName && videoId) {
      Dashboard.addTag(videoId, tagName);
    }
  });
})();
