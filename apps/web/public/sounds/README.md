# Notification Sounds

This directory contains notification sound files for the SmartMed queue management system.

## Required Files

The following audio files should be placed in this directory:

- `notification-default.mp3` - Default notification sound
- `notification-gentle.mp3` - Gentle/soft notification sound
- `notification-alert.mp3` - Alert/urgent notification sound
- `notification-chime.mp3` - Chime notification sound

## Sound Specifications

- **Format**: MP3 (also provide OGG for broader browser support)
- **Duration**: 0.5-2 seconds
- **File Size**: Under 50KB each
- **Sample Rate**: 44.1kHz
- **Bit Rate**: 128kbps

## Sound Usage

| Event | Sound |
|-------|-------|
| New patient joins queue | `notification-default.mp3` |
| Patient is next in line | `notification-alert.mp3` |
| Patient cancels/leaves | `notification-gentle.mp3` |
| Urgent notification | `notification-alert.mp3` |

## Licensing

Please ensure all audio files are:
- Royalty-free
- Licensed for commercial use
- Properly attributed if required

## Recommended Sources

- [Freesound](https://freesound.org/) - Free sounds with various licenses
- [Mixkit](https://mixkit.co/free-sound-effects/) - Free sound effects
- [Pixabay](https://pixabay.com/sound-effects/) - Royalty-free sounds
