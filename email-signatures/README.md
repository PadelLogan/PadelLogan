# Padel Logan - Email Signatures

Lightweight, table-based HTML email signatures with inline CSS only. No external
libraries, no web fonts - built to render consistently in **Gmail, Outlook
(desktop + web) and Apple Mail**, on desktop and mobile.

## Files

| File | Who it's for |
|------|--------------|
| `signature-steven-linskey.html` | **Steven Linskey** - General Manager |
| `signature-general-info.html`   | **Padel Logan** - general/info contact (07 3299 6653 / info@padellogan.com.au) |
| `preview.html`                  | Visual preview of both signatures on one page |
| `assets/padel-logan-horizontal.png` | Primary logo (navy wordmark, transparent) |
| `assets/padel-logan-stacked.png`    | Stacked logo (alternate, for tighter/mobile use) |
| `png/`                          | Flat PNG image versions of each signature (see below) |
| `text/`                         | Plain-text wording for each signature (for the editable install method) |

## Preview them first

Open `preview.html` in any browser to see both signatures together:

```
open preview.html
```

(or double-click the file). The preview uses the local logo so it shows even
offline.

## Brand details baked in

- **Colours** (from the Padel Logan logo): navy `#0F3B59` (primary / logo /
  names), fresh court-blue accent `#1E7BA6` (titles + web link), muted slate
  `#6B7A88` (labels), hairline `#E4E9ED`.
- **Logo**: horizontal navy wordmark, shown at 34px tall (`max-width:100%` so it
  scales down on narrow phones). The stacked logo is included as an alternate.
- **Fallbacks**: if images are blocked, the logo's `alt` text ("Padel Logan")
  shows in navy, and all text/links keep their brand colours - the signature
  still reads cleanly.
- **Clickable**: phone numbers use `tel:` links, emails use `mailto:` links, and
  the logo + web address link to `https://padellogan.com.au`.

## General info signature - contact details

`signature-general-info.html` is populated with the general contact details:

- **Phone:** 07 3299 6653 (`tel:0732996653`)
- **Email:** info@padellogan.com.au (`mailto:info@padellogan.com.au`)

To change them later, edit both the link (`href`) and the visible text in that
file, then re-render its PNG (see "PNG image versions").

## Install as an EDITABLE signature (recommended for Spark + Outlook)

This method builds the signature straight into the mail app, so **every line
stays editable** (name, phone, email) and the phone/email are clickable. The
logo is inserted as a picture, so it **embeds into the signature - nothing to
host, nothing that can fail to load**.

The logo to insert is in this folder: `assets/padel-logan-horizontal.png`
The exact wording for each signature is in the matching text file:
`text/steven-linskey.txt` and `text/general-info.txt`.

### Spark (Mac / iOS)
1. **Spark -> Settings (or Preferences) -> Signatures -> "+"** to add one.
2. Type the lines (or paste from the `text/…​.txt` file).
3. Click the **image / picture icon** in the editor and choose
   `assets/padel-logan-horizontal.png`.
4. Name it and set it as your default. Edit any line any time.

### Outlook - New Outlook (Windows / Mac) and Outlook on the web
1. **Settings (gear) -> Mail -> Compose and reply / Signatures -> New signature.**
2. Type the lines (or paste from the text file).
3. Click **Insert picture** (the mountain icon) and choose the logo.
4. Save, and set it for **new messages** and **replies**.

### Outlook Classic (Windows desktop)
1. **File -> Options -> Mail -> Signatures... -> New.**
2. Type the lines -> **Insert Picture** button -> choose the logo.
3. Assign it to your account for new messages/replies -> **OK**.

> Tip: after inserting the logo you can drag its corner to resize it. Around
> 360-400px wide reads well. To make the logo itself a link, select it and use
> "Insert link" -> `https://padellogan.com.au`.

## Alternative: paste the whole thing in one step (HTML)

If you'd rather paste the finished signature in one go (still editable
afterwards), open the `.html` file in a browser, select all (`Cmd/Ctrl + A`),
copy, and paste into the signature editor. This needs the logo to be hosted
first - see **Image hosting** below.

## Image hosting (important)

Email clients can't show local files or base64 images reliably, so the
signatures load the logo from a **public URL**:

```
https://raw.githubusercontent.com/PadelLogan/PadelLogan/main/email-signatures/assets/padel-logan-horizontal.png
```

This works **once this folder is committed and pushed** to the
`PadelLogan/PadelLogan` GitHub repo (the repo is public, so the raw URL serves
the image). Until then the logo won't display in a real email.

Options:
1. **Push this folder** to the repo (recommended) - the URL above goes live.
2. When `padellogan.com.au` is connected to GitHub Pages, you can switch the
   `src` to `https://padellogan.com.au/email-signatures/assets/padel-logan-horizontal.png`.
3. **Host elsewhere** (e.g. your website's media library) and swap the `src` in
   both `.html` files to that URL.

## PNG image versions

The `png/` folder contains flat image versions of each signature
(`png/padel-logan-signature-steven-linskey.png`, `png/padel-logan-signature-general-info.png`),
rendered at 2x for sharpness. Use these when a platform only accepts an uploaded
image rather than pasted HTML.

Trade-off: a PNG is a **single flat image** - the phone number, email and web
address are **not clickable**, and text isn't selectable. Prefer the HTML
signatures wherever the client supports pasting them; use the PNGs only as a
fallback.

## Required image assets

Already included in `assets/` (pulled from the Padel Logan brand files
`Option2-Horizontal (1).png` and `Option2-Stacked.jpg`):

- `padel-logan-horizontal.png` - primary, used in both signatures.
- `padel-logan-stacked.png` - alternate stacked lockup.

If you rebuild from scratch, drop a navy (or transparent) Padel Logan logo into
`assets/` and point each signature's `<img src="...">` at its public HTTPS URL.
Recommended: horizontal wordmark ~760px wide (it's displayed at 34px tall).
