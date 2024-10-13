'use strict';

// Constants for configuration
const RAILS_API_URL = 'http://localhost:3000/api/v1/videos';
const WISTIA_API_URL = 'https://api.wistia.com/v1/medias.json';

// Dashboard object to manage videos and tags
const Dashboard = {
  // Fetch video data from Wistia API
  getMedias: () => axios.get(WISTIA_API_URL, { headers: { Authorization: `Bearer ${TOKEN}` } }),

  // Fetch video data from Rails API to get visibility status and tags
  getRailsVideos: () => axios.get(RAILS_API_URL),

  // Fetch videos from both APIs and merge them
  fetchVideos: async () => {
    try {
      const [railsResponse, wistiaResponse] = await Promise.all([Dashboard.getRailsVideos(), Dashboard.getMedias()]);
      const railsVideos = railsResponse.data;
      const wistiaVideos = wistiaResponse.data;

      // Combine both data sets using the wistia_hash as the key
      return wistiaVideos.map(wistiaVideo => {
        const railsVideo = railsVideos.find(video => video.wistia_hash === wistiaVideo.hashed_id);
        return {
          ...wistiaVideo,
          visible: railsVideo ? railsVideo.visible : false,
          playCount: railsVideo ? railsVideo.play_count : 0,
          tags: railsVideo ? railsVideo.tags : []
        };
      });
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      return [];
    }
  },

  // Render a single tag
  renderTag: (mediaEl, tag) => {
    const template = document.getElementById('tag-template');
    const clone = template.content.cloneNode(true);
    const tagEl = clone.children[0];
    tagEl.innerText = tag.name;
    mediaEl.querySelector('.tags').append(tagEl);
  },

  // Render tags for a media element
  renderTags: (mediaEl, tags) => {
    tags.forEach(tag => Dashboard.renderTag(mediaEl, tag));
  },

  // Render a media item
  renderMedia: media => {
    const template = document.getElementById('media-template');
    const clone = template.content.cloneNode(true);
    const el = clone.children[0];

    el.querySelector('.thumbnail').setAttribute('src', media.thumbnail.url);
    el.querySelector('.title').innerText = media.name;
    el.querySelector('.duration').innerText = Utils.formatTime(media.duration);
    el.querySelector('.count').innerText = media.playCount;
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

    Dashboard.renderTags(el, media.tags || []);
    document.getElementById('medias').appendChild(el);
  },

  // Toggle visibility of a media item
  toggleVisibility: async hashedId => {
    const videoEl = document.querySelector(`[data-hashed-id="${hashedId}"]`);
    const visibleIcon = videoEl.querySelector('.media--visible');
    const hiddenIcon = videoEl.querySelector('.media--hidden');
    const isCurrentlyVisible = visibleIcon.style.display === 'inline';
    const newVisibility = !isCurrentlyVisible;

    try {
      await axios.patch(`${RAILS_API_URL}/${hashedId}`, { video: { visible: newVisibility } });
      if (newVisibility) {
        visibleIcon.style.display = 'inline';
        hiddenIcon.style.display = 'none';
      } else {
        visibleIcon.style.display = 'none';
        hiddenIcon.style.display = 'inline';
      }
    } catch (error) {
      console.error('Failed to update visibility:', error);
    }
  },

  // Open the tag modal for a media item
  openModal: videoId => {
    const modal = document.querySelector('.modal');
    modal.classList.add('modal--open');
    modal.setAttribute('data-video-id', videoId);
  },

  // Close the tag modal
  closeModal: () => {
    document.querySelector('.modal').classList.remove('modal--open');
  },

  // Add a tag to a media item
  addTag: async (videoId, tagName) => {
    try {
      const response = await axios.post(`${RAILS_API_URL}/${videoId}/video_tags`, { tag: { name: tagName } });
      Dashboard.closeModal();

      // Add the tag to the appropriate video on the UI
      const videoEl = document.querySelector(`[data-hashed-id="${videoId}"]`);
      if (videoEl) {
        Dashboard.renderTag(videoEl, response.data);
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  }
};

// Event listeners
(function() {
  document.addEventListener('DOMContentLoaded', async () => {
    const combinedVideos = await Dashboard.fetchVideos();
    combinedVideos.forEach(media => Dashboard.renderMedia(media));
  });

  document.addEventListener('click', event => {
    if (event.target.matches('.visibility-toggle')) {
      const hashedId = event.target.closest('.media').getAttribute('data-hashed-id');
      Dashboard.toggleVisibility(hashedId);
    }

    if (event.target.matches('.tag-button')) {
      const videoId = event.target.closest('.media').getAttribute('data-hashed-id');
      Dashboard.openModal(videoId);
    }

    if (event.target.matches('.modal__button--close')) {
      Dashboard.closeModal();
    }
  });

  document.getElementById('tag-form').addEventListener('submit', event => {
    event.preventDefault();

    const tagName = document.getElementById('tag-name').value.trim();
    const videoId = document.querySelector('.modal').getAttribute('data-video-id');

    if (tagName && videoId) {
      Dashboard.addTag(videoId, tagName);
    }
  });
})();
