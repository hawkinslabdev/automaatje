# Wake Lock Video Fallback

The wake lock fallback requires a small video file at `/public/wake-lock-video.mp4`.

## Quick Solution: Use FFmpeg

Create a 1-second, 1x1 pixel black video:

```bash
ffmpeg -f lavfi -i color=c=black:s=1x1:d=1 -c:v libx264 -tune stillimage -pix_fmt yuv420p public/wake-lock-video.mp4
```

## Alternative: Download Ready-Made File

You can use this tiny (< 1KB) video:
https://github.com/richtr/NoSleep.js/blob/master/dist/nosleepiphone.mp4

Download and save as `public/wake-lock-video.mp4`.

## Why This Is Needed

For browsers that don't support the Wake Lock API (mainly older versions of Firefox), we use a video trick to keep the screen on. The video:
- Must be 1x1 pixel (invisible)
- Should loop continuously
- Should be as small as possible (< 5KB)
- Must be in MP4 format with H.264 codec

## Browser Support

- **Wake Lock API**: Chrome/Edge (Android), Safari (iOS 16.4+)
- **Video Fallback**: Firefox, older browsers

Most modern browsers support Wake Lock API, so the video fallback is rarely used in practice.
