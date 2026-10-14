# terminux

A browser-based terminal that feels like the real thing — a simulated shell with a virtual
filesystem, up to 10 tabs, per-command editor "windows", achievements, and terminal mini games.

Built with React 19 + Vite.

## Features

- **Real terminal feel** — prompt, cursor, command history, `Tab` completion, colored output.
- **Simulated shell** — `ls`, `cd`, `cat`, `mkdir`, `rm`, `echo`, `grep`, `pwd`, and more against
  an in-memory (persisted) virtual filesystem.
- **Tabs** — up to 10 tabs, rename/close, middle-click to close.
- **Editor windows** — run a command to pop open a draggable/resizable window:
  - To-Do list, Notes, Timer / Stopwatch / Alarms / Reminders
  - Unit & currency converter, Random generators, Dev tools (UUID, hashes, base64, JSON)
  - Weather (live via open-meteo), Text editor, Drawing canvas
- **Mini games** — `guess`, `hangman`, `typing`, `adventure`, played right in the terminal.
- **Engagement** — achievements, XP and levels, a guided `tour`, tips, fortunes, and easter eggs.
- **Persistence** — progress, filesystem and app data saved to `localStorage`.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build into dist/
npm run preview  # preview the production build
npm run lint     # eslint
```

## Useful commands

Type `help` in the terminal for the full list. Highlights:

- `apps` / `games` — list available apps and games
- `todo`, `notes`, `timer`, `convert`, `weather`, `random`, `edit`, `draw`
- `panel` — toggle the app dock
- `tour` — guided walkthrough
- `achievements` / `stats` — see your progress

## Tech

- React 19, Vite 8, ESLint (flat config).
- No backend — the shell and virtual filesystem are simulated in the browser.
- Weather data from [open-meteo](https://open-meteo.com/); currency conversion uses offline
  static rates for reference only.

## License

MIT
