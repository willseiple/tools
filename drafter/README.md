# Drafter

A way to explore an idea by feel. You often don't know exactly where a thought is
going, but you know it when you see it, and you can feel the moment something is
off. Drafter is built on that. Claude writes, and when a word, term or idea
doesn't fit, you highlight or click it. Everything from that point is rewritten, and you
keep going until the whole thing feels right.

You never have to explain what you want up front. Each cut tells Claude a bit
more about where you're headed, and the text you keep holds your thought intact
while you explore past it.

**Use it:** https://claude.ai/artifact/WTfHnWF36zSxn1aRUW3kRP (needs a claude.ai account)

## How it works

- It's a normal chat: ask something, reply, keep going. Conversations are listed
  in the sidebar and saved in your browser.
- In any reply, approved text is black and unreviewed text is blue. Highlight or
  click a word and everything after it is struck in red. Pick a reason (wrong
  energy, wrong concept, too technical, wrong direction) or write a note, then
  regenerate from that spot. **Cut here** ends the reply there; **Continue**
  extends it; **Rewrite** starts it over.
- Reworking a reply the conversation has already moved past starts a new branch,
  like editing a message on claude.ai. Later messages stay on the old branch, and
  the ‹ 2/3 › arrows flip between them. Editing one of your own messages branches
  the same way. Nothing is thrown away.
- Each regeneration prompt includes the approved text, every rejected version at
  that spot, your notes, and a running list of flagged words so they don't
  creep back in later.
- Rejected versions are kept under each reply and can be brought back. The
  latest reply has undo/redo. Replies can be edited by hand.
- **Import** takes a pasted chat (lines starting `You:` / `Claude:`), so you can
  carry a claude.ai conversation over and keep working on it here. Export with
  **Copy chat** or **Download .md**.
- Markdown shows lightly styled with its symbols still visible, so every
  character stays clickable.

## Source

[`drafter.html`](drafter.html) is the whole app: one page, no build step. It
calls Claude through the claude.ai artifact runtime (`claude.use("sample")`),
so it only works when opened as a claude.ai artifact. Opened anywhere else it
shows a notice that it needs claude.ai.
