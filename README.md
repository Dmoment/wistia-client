# Wistia Full Stack Developer Challenge - Summary

## Overview

The task was to enhance an existing lightweight video application with the Wistia API, including features for video playback and management using a Rails backend and a JavaScript/HTML/CSS frontend.

- ***Video Overview:*** https://share.vidyard.com/watch/WMswkKtNnVo5iMoH665w18? (Recorder a video to showcase the working)

## Setup and Run Instructions

**Backend (Rails API):

Navigate to the api folder.

Run ```bundle install``` to install dependencies.

Set up the database by running ```rails db:create db:migrate```.

Start the Rails server with ```rails s```.

***Frontend (JavaScript Client):***

Navigate to the client folder.

```
npm install  http-server  -g

cd /client

http-server
```

***Browser and OS Used***

Browser: Google Chrome (latest version).

Operating System: macOS.



## Architecture & Tech Stack

- Frontend: Plain JavaScript, HTML, CSS.

- Backend: Ruby on Rails (API-only).

- Database: PostgreSQL.

- APIs Used: Wistia API, Rails API.

## System Description

The video application has two views:

- Playlist Page: Used to autoplay videos in a queue, with specific enhancements.

- Dashboard Page: Enables the video owner to manage visibility and add tags to videos.

## Playlist Page Enhancements

**Autoplay Feature:**

- Videos are played automatically from the playlist.

- After each video, a 5-second countdown is shown before the next video plays.

- Countdown appears over the next video thumbnail.

**Loop through Playlist:**

- All videos play in a continuous loop after the last video finishes.

- On-screen Overlay Information:

- While a video is about to end, a countdown appears on the next video in the playlist.

- The overlay includes information about the next video, such as the title and thumbnail.

**Playing Status:**

- The current video playing has a "Playing" overlay on its thumbnail in the video list.

- The overlay appears only on the thumbnail, not on the description.

- Dashboard Page Enhancements

**Visibility Management:**

- Videos fetched from both Wistia API and Rails API.

- Eye icon toggles visibility of videos, updating the Rails backend.

**Play Count:**

- Play count fetched from Wistia Stats API and displayed on each video.

- Integrated play count data with the Rails model to persist the information.

**Tag Management:**

- Users can click a tag icon to add tags to a video.

- Tags are stored in the Rails backend.

- Each video in the dashboard displays the associated tags.

## Implementation Highlights

**Backend (Rails API)**

**VideosController:**

- Added endpoints to manage visibility and fetch video data. 

- Created an endpoint for updating visibility status.

- Added tag associations to the index method to return tags for each video.

**TagsController:**

- Endpoint to create new tags.

- Managed linking of tags to videos.

**Database Migrations:**

- Added play_count to videos table to persist Wistia play counts.

- Created tables for tags and video_tags to support tagging functionality.

**Wistia Sync:**

- Added a rake task to sync videos with Wistia.

- Stored basic video information and updated play count from Wistia Stats API.

**Frontend (JavaScript, HTML, CSS)**

**API Integration:**

- Fetched data from both Rails API and Wistia API.

- Combined data to manage visibility and play count.

**Countdown Overlay:**

- Implemented countdown functionality to appear for the next video, positioned directly on the video thumbnail.

**Tag Management UI:**

- Modal opens to add a new tag when the tag button is clicked.

- Dashboard fetches and renders tags from Rails API.

## Design Decisions

**Dual API Data Source:**

Combined Wistia and Rails API data for the playlist and dashboard to ensure visibility and play count data is synced and managed efficiently.

**Countdown Implementation:**

The countdown occurs during the final 5 seconds of a video and overlays the next video in the playlist. This provides a seamless transition for users.

**Handling Mutability of Video Data:**

Video data persisted on the Rails backend was enhanced to include visibility, play counts, and tags for easier management and integration.

**Rails for Backend-only API:**

Using Rails API enabled seamless integration of video management features while keeping frontend and backend operations decoupled.

## Design the database for “search by tag” for the owner dashboard
1. Query to Print the Total Number of Videos with at Least 1 Play Count
```
SELECT COUNT(*) AS total_videos
FROM videos
WHERE play_count >= 1;
```
ActiveRecord ORM:
```
Video.where("play_count >= ?", 1).count
```
2. Schema(s) to Support Tags
Raw SQL 
```
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE video_tags (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (video_id) REFERENCES videos(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);
```
ActiveRecord ORM
```
# Migration for tags
class CreateTags < ActiveRecord::Migration[7.0]
  def change
    create_table :tags do |t|
      t.string :name, null: false
      t.timestamps
    end
  end
end

# Migration for video_tags
class CreateVideoTags < ActiveRecord::Migration[7.0]
  def change
    create_table :video_tags do |t|
      t.references :video, null: false, foreign_key: true
      t.references :tag, null: false, foreign_key: true
      t.timestamps
    end
  end
end
```
3. Query to Find the Video with the Most Number of Tags
```
SELECT v.*
FROM videos v
JOIN video_tags vt ON v.id = vt.video_id
GROUP BY v.id
ORDER BY COUNT(vt.tag_id) DESC, v.created_at DESC
LIMIT 1;
```
Active Record ORM
```
Video.joins(:tags)
     .group("videos.id")
     .order("COUNT(tags.id) DESC, videos.created_at DESC")
     .limit(1)
     .first
```

## Performance Characteristics

**Frontend Performance:**

JavaScript was used to manage video autoplay and overlays, which allowed us to efficiently handle asynchronous Wistia player events and countdown.

**Backend Performance:**

Combined data retrieval from both Rails and Wistia ensured that the minimal necessary data was fetched to improve page load times.


## Learnings and Future Improvements

**Countdown Improvements:**

The countdown implementation could be made more dynamic, such as allowing users to customize the countdown duration.

**Frontend State Management:**

To better manage UI states like visibility and playing status, a lightweight state management library might be introduced in future iterations.

**Backend Optimization:**

The backend could benefit from adding an external caching mechanism like Redis for frequently accessed video or tag data.


***Conclusion***

This project provided a good opportunity to demonstrate full-stack integration, including working with third-party APIs, building a backend with Rails, and implementing a seamless video management experience with a responsive frontend.