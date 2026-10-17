# Drafter

A way to explore an idea by feel. You often don't know exactly where a thought is
going, but you know it when you see it, and you can feel the moment something is
off. Drafter is built on that. Claude writes, and when a word, term or idea
doesn't fit, you highlight it. Everything from that point is rewritten, and you
keep going until the whole thing feels right.

You never have to explain what you want up front. Each cut tells Claude a bit
more about where you're headed, and the text you keep holds your thought intact
while you explore past it.

**Use it:** https://claude.ai/artifact/WTfHnWF36zSxn1aRUW3kRP (needs a claude.ai account)

## How it works

- Approved text is black, unreviewed text is blue. Selecting or clicking a word
  strikes everything after it in red and opens a small box.
- Pick a reason (wrong energy, wrong concept, too technical, wrong direction)
  and/or write a note, then press Enter to regenerate from that spot.
  **Cut here** ends the reply there; **Continue** extends it.
- Each regeneration prompt includes the approved text, every rejected version at
  that spot, your notes, and a running list of flagged words so they don't
  creep back in later.
- Rejected versions are kept under the draft and can be restored. Undo/redo,
  hand editing and copy are on the toolbar. Drafts are saved in your browser.

## Source

[`drafter.html`](drafter.html) is the whole app: one page, no build step. It
calls Claude through the claude.ai artifact runtime (`claude.use("sample")`),
so it only works when opened as a claude.ai artifact. Opened anywhere else it
shows a notice that it needs claude.ai.
