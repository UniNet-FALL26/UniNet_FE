# Media fixture

`project-media.webm` is a generated 3-second blue 160x90 VP8 clip with no audio.
Used to verify expanded media playback without external network dependencies.

Regenerate with FFmpeg:

```sh
ffmpeg -f lavfi -i color=c=blue:s=160x90:r=10 -t 3 -c:v libvpx -an -y tests/fixtures/project-media.webm
```
