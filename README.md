# Emma-Arabic 🦋

Arabic games for Emma, built from Lesson 2 of the textbook: **عناوين من الصحف العربية** (headlines from Arabic newspapers), pages 12–13.
A single static page (`index.html`) in the same style as Sofia's English and Maya's games — open it or host it on GitHub Pages.

**Headlines (7 headlines א–ז from the book):** read & listen (tap a word for its meaning), listen & choose, translate, build the headline, fill the missing word, the book's questions ("who met whom?").
**Words (45):** flashcards, word quiz, listen & choose, spelling (letters join as the word grows), memory, dictionary — filterable by people / places / verbs / other.

Every word and headline has a recorded Arabic voice in `audio/` (device voice as a fallback). Stars are saved on the device.

## Editing
- Content lives in `data.js`.
- After adding words/headlines: `pip install gtts && python3 tools/make_audio.py` creates the missing clips and `audio/map.js`.
- Test: serve the folder (`python3 -m http.server`) and run `SMOKE_URL=http://localhost:8000/index.html node tests/smoke.js` (needs `playwright`).
