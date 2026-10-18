# Audio library

20 free instrumental recordings by Kevin MacLeod (incompetech.com), downloaded on October 18, 2026, under Creative Commons Attribution 4.0 International.

The original MP3s are kept here and ignored by Git. `licenses/tracks.json` records each title, filename, source, download URL, and license; `licenses/source-catalog.html` preserves the catalog and its attribution statement. `licenses/CC-BY-4.0.txt` contains the license text. The source catalog describes these as calm instrumentals; no manual listening review has been performed.

Reel audio selections are explicit in `content/YYYY.json`. `npm run audio:rotate` cycles all 20 tracks over enabled reels in chronological order, continuing across year boundaries. Rendering uses those choices without randomness. `shared/audio-library.ts` provides credits; the scheduler places the selected credit and edit notice in the Reel caption. Keep those credits when posting manually. Existing queued jobs and already rendered media must be regenerated/requeued separately if their track changes.

To restore the local library after a fresh checkout, run `npm run audio:download`. It verifies each downloaded file against the recorded SHA-256 checksum before saving it.
