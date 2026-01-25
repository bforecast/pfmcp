---
name: Download Video
description: Download videos from YouTube, Twitter/X, and other platforms using yt-dlp. Supports format selection, audio extraction, and quality options.
---

# Download Video Skill

This skill enables downloading videos from various platforms including YouTube, Twitter/X, Vimeo, TikTok, and 1000+ other sites using `yt-dlp`.

## Prerequisites

### Required: yt-dlp

Before using this skill, ensure `yt-dlp` is installed:

```bash
# Windows (with pip)
pip install yt-dlp

# Windows (with winget)
winget install yt-dlp

# Or download directly from: https://github.com/yt-dlp/yt-dlp/releases
```

Verify installation:
```bash
yt-dlp --version
```

### Recommended: FFmpeg

FFmpeg is **highly recommended** for:
- Automatic merging of video + audio streams (best quality)
- Format conversion
- Thumbnail embedding
- Subtitle embedding

```bash
# Windows (with winget) - Recommended
winget install --id Gyan.FFmpeg -e

# Or download from: https://ffmpeg.org/download.html
```

Verify installation:
```bash
ffmpeg -version
```

> **Note**: Without FFmpeg, yt-dlp can only download pre-merged formats (typically lower quality like 360p/720p). With FFmpeg, it will automatically download the best video + best audio and merge them.

## Basic Usage

### Download a Video (Best Quality)

```bash
yt-dlp "VIDEO_URL"
```

### Download to Specific Directory

```bash
yt-dlp -o "D:/Downloads/%(title)s.%(ext)s" "VIDEO_URL"
```

### Download with Custom Filename

```bash
yt-dlp -o "my_video.%(ext)s" "VIDEO_URL"
```

## Quality & Format Options

### List Available Formats

```bash
yt-dlp -F "VIDEO_URL"
```

### Download Specific Format by ID

```bash
yt-dlp -f 22 "VIDEO_URL"
```

### Download Best MP4 (max 1080p)

```bash
yt-dlp -f "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" "VIDEO_URL"
```

### Download Best Quality (any format)

```bash
yt-dlp -f "bestvideo+bestaudio/best" "VIDEO_URL"
```

### Download 720p or Lower

```bash
yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]" "VIDEO_URL"
```

## Audio Extraction

### Extract Audio Only (Best Quality)

```bash
yt-dlp -x "VIDEO_URL"
```

### Extract as MP3

```bash
yt-dlp -x --audio-format mp3 "VIDEO_URL"
```

### Extract as MP3 with Quality Setting

```bash
yt-dlp -x --audio-format mp3 --audio-quality 0 "VIDEO_URL"
```

Audio quality: 0 (best) to 10 (worst)

## Platform-Specific Examples

### YouTube

```bash
# Single video
yt-dlp "https://www.youtube.com/watch?v=VIDEO_ID"

# Playlist (all videos)
yt-dlp "https://www.youtube.com/playlist?list=PLAYLIST_ID"

# Playlist (specific range)
yt-dlp --playlist-start 1 --playlist-end 5 "PLAYLIST_URL"

# Channel videos
yt-dlp "https://www.youtube.com/@ChannelName/videos"
```

### Twitter/X

```bash
# Single tweet video
yt-dlp "https://twitter.com/user/status/TWEET_ID"
yt-dlp "https://x.com/user/status/TWEET_ID"
```

### TikTok

```bash
yt-dlp "https://www.tiktok.com/@user/video/VIDEO_ID"
```

### Instagram

```bash
# Post/Reel
yt-dlp "https://www.instagram.com/p/POST_ID/"
yt-dlp "https://www.instagram.com/reel/REEL_ID/"
```

## Advanced Options

### Download with Subtitles

```bash
# Embed subtitles
yt-dlp --write-subs --embed-subs "VIDEO_URL"

# Download all available subtitles
yt-dlp --all-subs "VIDEO_URL"

# Download specific language
yt-dlp --write-subs --sub-lang en "VIDEO_URL"
```

### Thumbnail Options

```bash
# Download thumbnail
yt-dlp --write-thumbnail "VIDEO_URL"

# Embed thumbnail in video
yt-dlp --embed-thumbnail "VIDEO_URL"
```

### Metadata

```bash
# Write metadata to file
yt-dlp --write-info-json "VIDEO_URL"

# Add metadata to video file
yt-dlp --add-metadata "VIDEO_URL"
```

### Rate Limiting & Retries

```bash
# Limit download speed
yt-dlp --limit-rate 1M "VIDEO_URL"

# Number of retries
yt-dlp --retries 10 "VIDEO_URL"

# Sleep between downloads (for playlists)
yt-dlp --sleep-interval 5 "PLAYLIST_URL"
```

### Authentication (for private videos)

```bash
# Using cookies file
yt-dlp --cookies cookies.txt "VIDEO_URL"

# Using browser cookies
yt-dlp --cookies-from-browser chrome "VIDEO_URL"
```

## Output Template Variables

Use these in the `-o` option:

| Variable | Description |
|----------|-------------|
| `%(title)s` | Video title |
| `%(id)s` | Video ID |
| `%(ext)s` | File extension |
| `%(uploader)s` | Uploader name |
| `%(upload_date)s` | Upload date (YYYYMMDD) |
| `%(duration)s` | Duration in seconds |
| `%(view_count)s` | View count |
| `%(playlist_index)s` | Playlist position |

### Example Output Template

```bash
yt-dlp -o "%(uploader)s/%(upload_date)s - %(title)s.%(ext)s" "VIDEO_URL"
```

## Troubleshooting

### Update yt-dlp

Many issues are fixed by updating:

```bash
pip install -U yt-dlp
# or
yt-dlp -U
```

### Check Supported Sites

```bash
yt-dlp --list-extractors
```

### Verbose Output for Debugging

```bash
yt-dlp -v "VIDEO_URL"
```

### Common Issues

1. **"Video unavailable"**: The video may be region-locked or private
2. **"HTTP Error 403"**: Try updating yt-dlp or using `--cookies-from-browser`
3. **Slow downloads**: YouTube may throttle; try `--concurrent-fragments 4`

## Recommended Default Command

For most use cases, this command provides a good balance:

```bash
yt-dlp -f "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --embed-thumbnail --add-metadata -o "D:/Downloads/%(title)s.%(ext)s" "VIDEO_URL"
```

This downloads:
- Best quality up to 1080p in MP4 format
- Embeds thumbnail and metadata
- Saves to Downloads folder with video title as filename
