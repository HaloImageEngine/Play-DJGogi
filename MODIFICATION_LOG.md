# Modification Log

## 2026-06-22

### Summary
- Added PID-based multi-card flow (`/slidecardbypid`), new CallList REST APIs (`Get_Existing_Cards_ByPID`, `Check_Called_Number`), guest auto-login for PID cards, square-tap called-number verification on single/PID card views, phone input formatting on login, and nav update from Multi Card to PID Cards.

### Files Changed
- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`
- `src/app/models/player-game.model.ts`
- `src/app/models/check-called-number.model.ts` (new)
- `src/app/utils/phone-input.ts` (new)
- `src/app/services/player-calllist.service.ts`
- `src/app/services/player-context.service.ts`
- `src/app/services/printed-cards.service.ts`
- `src/app/services/login.service.ts`
- `src/app/services/slidecard-bypid-auth.guard.ts` (new)
- `src/app/shared/top-banner/top-banner.component.html`
- `src/app/shared/bingo-card/bingo-card.component.ts`
- `src/app/shared/bingo-card/bingo-card.component.html`
- `src/app/shared/bingo-card/bingo-card.component.scss`
- `src/app/pages/slidecardbypid/slidecardbypid.component.ts` (new)
- `src/app/pages/slidecardbypid/slidecardbypid.component.html` (new)
- `src/app/pages/slidecardbypid/slidecardbypid.component.scss` (new)
- `src/app/pages/singlecard/singlecard.component.ts`
- `src/app/pages/singlecard/singlecard.component.html`
- `src/app/pages/singlecard/singlecard.component.scss`
- `src/app/pages/login/login.component.ts`
- `src/app/pages/login/login.component.html`
- `src/app/app.routes.ts`

### API
- Added `bingoExistingCardsByPidApiUrl` — `GET …/Get_Existing_Cards_ByPID/{PIDT}` with summary, inning breakdown, and card details models.
- Added `bingoCheckCalledNumberApiUrl` — `POST …/Check_Called_Number` with `{ Game_ID, Call_List_ID, Inning, Song_ID }` → `{ WasCalled }`.
- `PlayerCallListService`: `getExistingCardsByPid()`, `checkCalledNumber()`.
- `PrintedCardsService`: maps `Game_Inning` / `GameInning` for inning on printed-card rows.
- `/slidecardbypid` loads card IDs from ByPID, fetches full grids via `Get_Printed_Cards_byCardID`, merges inning/call-list metadata, sorts cards by inning ascending (1→2→3), and persists `Game_ID` + `Call_List_ID` to player context storage.

### UI
- New `/slidecardbypid` and `/slidecardbypid/:pid` pages with PID picker, previous/next card navigation, and meta strip (PID, CLID, Inning, CID).
- Nav button renamed **Multi Card** → **PID Cards**, linked to `/slidecardbypid`.
- PID picker label: **Packet ID : PID**.
- **Single card** and **PID cards**: interactive square taps call `Check_Called_Number`; confirmed calls mark pink, unconfirmed show light blue + popup (*"Song may not have been called, wait for update"*).
- `BingoCardComponent`: `verifyCalledOnTap` mode, `markedPositions` / `unverifiedPositions` inputs, `squareTap` output, light-blue `is-unverified` style.
- Login phone field formats as `###-###-####` while typing; requires 10 digits on submit.
- Guest auto-login (`Guest100` / `test100`) when visiting `/slidecardbypid` without an existing session (`slidecardByPidAuthGuard`).

### Notes
- PID card square marks are stored per `Card_ID` so marks persist when sliding between innings.
- `LoginService.completeSession()` shared between login page and guest guard.
- Square-check state resets when card ID (singlecard) or PID (slidecardbypid) changes.

## 2026-06-02

### Summary
- Implemented shared global header + nav, added `singlecard`, `slidecard`, and `winnercard` flows, aligned card UI with caller style, and completed requested page/content cleanup and mobile behavior updates.

### Files Changed
- `src/app/shared/top-banner/top-banner.component.ts`
- `src/app/shared/top-banner/top-banner.component.html`
- `src/app/shared/top-banner/top-banner.component.scss`
- `src/app/shared/bingo-card/bingo-card.component.ts`
- `src/app/shared/bingo-card/bingo-card.component.html`
- `src/app/shared/bingo-card/bingo-card.component.scss`
- `src/app/app.routes.ts`
- `src/app/app.config.ts`
- `src/app/interceptors/dev-api-proxy.interceptor.ts` (new)
- `src/app/services/auth-user.service.ts`
- `src/app/pages/login/login.component.ts`
- `src/app/pages/login/login.component.html`
- `src/app/pages/game-setup/game-setup.component.ts`
- `src/app/pages/game-setup/game-setup.component.html`
- `src/app/pages/game-setup/game-setup.component.scss`
- `src/app/pages/my-cards/my-cards.component.ts`
- `src/app/pages/my-cards/my-cards.component.html`
- `src/app/pages/my-cards/my-cards.component.scss`
- `src/app/pages/card-view/card-view.component.ts`
- `src/app/pages/card-view/card-view.component.html`
- `src/app/pages/card-view/card-view.component.scss`
- `src/app/pages/singlecard/singlecard.component.ts` (new)
- `src/app/pages/singlecard/singlecard.component.html` (new)
- `src/app/pages/singlecard/singlecard.component.scss` (new)
- `src/app/pages/slidecard/slidecard.component.ts` (new)
- `src/app/pages/slidecard/slidecard.component.html` (new)
- `src/app/pages/slidecard/slidecard.component.scss` (new)
- `src/app/pages/winnercard/winnercard.component.ts` (new)
- `src/app/pages/winnercard/winnercard.component.html` (new)
- `src/app/pages/winnercard/winnercard.component.scss` (new)
- `src/styles.scss`
- `src/styles/mobile.scss`
- `src/environments/environment.ts`
- `package.json`
- `public/assets/images/DJGogi.png` (added)
- `public/assets/images/HillTop5.png` (added)

### API
- Added `devApiProxyHintInterceptor` to convert proxy-misconfiguration parse failures into a clear developer-facing message.
- Wired conditional interceptor registration in `app.config.ts` for non-production builds.
- Continued to use existing printed-cards APIs and added winner-card filtering client-side (`CardIsWinner`) for the new winner page.
- Added `serve` script alias with proxy config to match local dev startup behavior.

### UI
- Added global top banner on all pages with title, `UserId`, and `UserAlias`.
- Added global nav line under banner:
  - `Game Setup`, `Single Card`, `Multi Card`, `Cards`, `Winner Card`
  - `Login/Logoff` action on far right (state-based)
  - Active-page button highlighting.
- Updated shared bingo-card layout/styles to caller-aligned format and metadata ordering.
- Added GID/CLID/Inning/CID metadata strips to single/multi/winner pages and aligned these strips left.
- Setup page cleanup: removed in-page "Choose your game" and middle "Log off", retained horizontal input row.
- My Cards page cleanup: removed "My cards" and "Your bingo cards" heading text.

### Notes
- Mobile-first compatibility updates retained (numeric keypad behavior for numeric fields, iOS/Android style handling).
- No print workflow is used; card display remains screen-first.
- End-of-session cleanup: stopped running local Angular dev-server processes.

