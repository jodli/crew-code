---
theme: default
title: "Agent Teams Under the Hood"
info: |
  Jan-Olaf Becker
  How AI agents coordinate through files on disk
class: text-center
transition: slide-left
addons:
  - slidev-addon-asciinema
duration: 15min
---

# Agent Teams Under the Hood

How AI agents coordinate through files on disk

<div class="pt-12">
  <span class="px-2 py-1 rounded text-sm opacity-75">
    Jan-Olaf Becker
  </span>
</div>

<!--
Hi, I'm Jan-Olaf, I've been at Paessler since 2019, currently working as an architect. In this talk I want to show you how I stumbled over the concept of agent teams in Claude Code. In the beginning I didn't get why I would need that — I already had sub-agents to delegate work to. Let's start with the actual difference between the two.
-->

---

# What Are Agent Teams?

<div class="grid grid-cols-2 gap-12 pt-4">
<div>

<v-clicks>

<span class="text-xl font-bold text-gray-400">Sub-agents</span>

- Short-lived, get a prompt from the main agent
- Report results back to the main agent
- Main agent does the actual work
- No persistent context

</v-clicks>

</div>
<div>

<v-clicks>

<span class="text-xl font-bold text-blue-400">Agent Teams</span>

- Full Claude sessions, like running `claude` in the terminal
- Own working directory, own memory, own CLAUDE.md
- Talk to each other directly, work in parallel
- Sessions persist, you can resume them later

</v-clicks>

</div>
</div>

<!--
Every AI harness has sub-agents. It's a short-lived task — gets a prompt, reports back, done. The main agent does the actual work.

Agent teams are different. Each one is just a full Claude session, like what you get when you run `claude` in the terminal. It runs in a specific working directory, loads its own CLAUDE.md and settings, keeps its own memories. They work in parallel and they can send messages to each other when they think it's useful. And because it's a normal session, you can resume it later.

So there is a difference, but I never really understood why I'd use agent teams when sub-agents already felt good enough.
-->

---
layout: center
---

# What Can You Build With This?

<!--
After some more thought, a few use cases came to mind where sub-agents are not enough.
-->

---

# Use Case: Code Review Swarm

<div class="flex flex-col justify-center items-center h-[calc(100%-4rem)]">

<div class="border-2 border-gray-400 rounded-xl px-6 py-3 text-center">
  <div class="text-lg font-bold">Pull Request</div>
  <div class="text-xs opacity-60">across 2 repos</div>
</div>

<div class="text-2xl opacity-40 mt-1">↓</div>

<div class="border-2 border-amber-400 rounded-xl px-8 py-3 text-center bg-amber-900/20">
  <div class="text-xl font-bold text-amber-400">Team Lead</div>
</div>

<div class="text-2xl opacity-40 mt-1">↓ distributes ↓</div>

<div class="grid grid-cols-4 gap-4 mt-1 text-center">
  <div class="border-2 border-blue-400 rounded-xl p-3 bg-blue-900/20">
    <div class="font-bold text-blue-400">API Code</div>
    <div class="text-xs opacity-60">linting, tests, conventions</div>
  </div>
  <div class="border-2 border-blue-400 rounded-xl p-3 bg-blue-900/20">
    <div class="font-bold text-blue-400">API Design</div>
    <div class="text-xs opacity-60">REST, performance, naming</div>
  </div>
  <div class="border-2 border-emerald-400 rounded-xl p-3 bg-emerald-900/20">
    <div class="font-bold text-emerald-400">UI Code</div>
    <div class="text-xs opacity-60">components, build, bundle</div>
  </div>
  <div class="border-2 border-emerald-400 rounded-xl p-3 bg-emerald-900/20">
    <div class="font-bold text-emerald-400">UX / Design</div>
    <div class="text-xs opacity-60">a11y, design system, UX</div>
  </div>
</div>

<div class="text-2xl opacity-40 mt-1">↓ consolidates ↓</div>

<div class="border-2 border-gray-400 rounded-xl px-6 py-3 text-center">
  <div class="text-lg font-bold">Consolidated Review Report</div>
</div>

<div class="text-center mt-2 text-sm">Each agent runs in <strong>their repo's directory</strong> — picks up its CLAUDE.md, memory, and project context automatically.</div>

</div>

<!--
This is what I'll show later in the demo. It's a code review for a full-stack feature that touched multiple repos. Different coding guidelines, different quality gates. But it's not only about code — we also review design principles, performance, accessibility. Every finding gets consolidated into one report that we can then work with further.
-->

---

# More Patterns

<div class="flex flex-col justify-center items-center h-[calc(100%-4rem)]">
<div class="grid grid-cols-3 gap-6">

<v-clicks>

<div class="border border-gray-600 rounded-xl p-5">
  <div class="text-lg font-bold mb-2">Root cause analysis</div>
  <div class="text-sm opacity-70">Build fails, agents investigate their layer, team-lead correlates.</div>
</div>

<div class="border border-gray-600 rounded-xl p-5">
  <div class="text-lg font-bold mb-2">Full-stack features</div>
  <div class="text-sm opacity-70">Each agent in its own repo, coordinating through messages.</div>
</div>

<div class="border border-gray-600 rounded-xl p-5">
  <div class="text-lg font-bold mb-2">API negotiation</div>
  <div class="text-sm opacity-70">Backend and frontend agents resolve mismatches directly.</div>
</div>

</v-clicks>

</div>
</div>

<!--
Some more use cases: root cause analysis spanning multiple repos when a build fails, cross-repo feature implementation where each agent works in its own repo, agents negotiating API changes directly with each other.

The first use case I actually tried was implementing a full-stack feature across two repos. And I did it manually — because again, I still didn't get why I'd need agent teams.
-->

---

# How I Got Here

<div class="flex flex-col justify-center items-center h-[calc(100%-4rem)]">

<div class="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-center text-center">
  <div class="border-2 border-gray-400 rounded-xl p-5">
    <div class="text-xl font-bold">Claude</div>
    <div class="text-xs opacity-60 mt-1">Backend Repo</div>
  </div>
  <div class="text-2xl opacity-40">→</div>
  <div class="border-2 border-amber-400 rounded-xl p-5 bg-amber-900/20">
    <div class="text-xl font-bold text-amber-400">Me</div>
    <div class="text-xs opacity-60 mt-1">copy-paste</div>
  </div>
  <div class="text-2xl opacity-40">→</div>
  <div class="border-2 border-gray-400 rounded-xl p-5">
    <div class="text-xl font-bold">Claude</div>
    <div class="text-xs opacity-60 mt-1">Frontend Repo</div>
  </div>
</div>

<v-click>

<div class="text-center mt-8 text-lg">

It worked. But **I was the message bus.**

</div>

</v-click>

</div>

<!--
I opened two terminal panes, launched Claude in two different repos and started working on a feature. At one point one agent told me there's a problem with the API and they need to change it. It gave me a prompt for the other agent. So I copy-pasted it. Got a response, copy-pasted it back.

I was the relay, the message bus between two agents. And it was weird. But that's when it clicked — this is exactly what agent teams automate. So the question was: how does it actually work?
-->

---

# The Protocol

<div class="flex flex-col justify-center items-center h-[calc(100%-4rem)]">

<div class="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-center text-center">
  <div class="border-2 border-gray-400 rounded-xl p-6">
    <div class="text-2xl font-bold">Agent A</div>
    <div class="text-sm opacity-60 mt-1">Backend Repo</div>
  </div>
  <div class="text-3xl opacity-40">&harr;</div>
  <div class="border-2 border-blue-400 rounded-xl p-6 bg-blue-900/20">
    <div class="text-2xl font-bold text-blue-400">Inbox Files</div>
    <div class="text-sm opacity-60 mt-1">JSON on disk</div>
  </div>
  <div class="text-3xl opacity-40">&harr;</div>
  <div class="border-2 border-gray-400 rounded-xl p-6">
    <div class="text-2xl font-bold">Agent B</div>
    <div class="text-sm opacity-60 mt-1">Frontend Repo</div>
  </div>
</div>

<div class="text-3xl opacity-40 mt-2">&varr;</div>

<div class="border-2 border-gray-400 rounded-xl px-8 py-4 text-center">
  <div class="text-2xl font-bold">Team Lead</div>
</div>

<div class="mt-4">All of this is just JSON files in a folder.</div>

</div>

<!--
So I did some reverse engineering — with the help of Claude. I used the tool to reverse-engineer the tool, yes :D And I found out that everything is just files in the .claude directory in my home folder.
-->

---

# The File Layout

```
~/.claude/teams/<team-name>/
    config.json              # Team registry
    inboxes/
        team-lead.json       # Team lead's inbox
        api-reviewer.json    # API reviewer's inbox
        ui-reviewer.json     # UI reviewer's inbox
```

- `config.json` — who's on the team, their roles, their working directories
- `inboxes/*.json` — per-agent message queues (JSON arrays)
- Agents poll their inbox, process new messages, mark them `read: true`

<!--
There's a config.json with all registered agents and a JSON file per agent as their inbox. The agents poll the inbox for unread entries, run the prompt, and mark it as read. I was really surprised how simple this is. And because I knew this was an experimental feature...
-->

---

# The Compat Test Suite

We turned every protocol behavior into a test.

```ts {all|3-4|8-9|13-14|16-17|all}
// peer-to-peer.compat.ts — Can agents talk without a team lead?

// Register two agents: alice and bob
await registerAgent(team, "alice");
await registerAgent(team, "bob");

// Tell alice to greet bob
await seedInbox(team, "alice",
  "Hello alice! Please send a short greeting to bob.");

// Launch both agents
const alicePane = await launchAgent(team, "alice");
const bobPane = await launchAgent(team, "bob");

// Bob should receive a message from alice
const bobMessages = await pollInbox(team, "bob");
const fromAlice = bobMessages.find(m => m.from === "alice");
expect(fromAlice).toBeDefined();  // ✓
```

<!--
...I tried to bake everything we found into automated compatibility tests. This is one of them: it registers an agent by creating files on disk, seeds the inbox by writing a prompt to the inbox file, launches the agent by starting a tmux pane and running `claude` with some flags, and then waits for the agents to communicate. These tests turn the protocol behavior into a runnable suite.
-->

---

# A Living Contract

<div class="bg-gray-900 rounded-xl p-6 font-mono text-sm mt-4">
  <div><span class="text-green-400 font-bold"> PASS </span> env-var-required <span class="opacity-40 float-right">(2.1s)</span></div>
  <div><span class="text-green-400 font-bold"> PASS </span> minimum-flags <span class="opacity-40 float-right">(4.3s)</span></div>
  <div><span class="text-green-400 font-bold"> PASS </span> optional-flags <span class="opacity-40 float-right">(3.1s)</span></div>
  <div><span class="text-green-400 font-bold"> PASS </span> hot-inject <span class="opacity-40 float-right">(8.7s)</span></div>
  <div><span class="text-green-400 font-bold"> PASS </span> peer-to-peer <span class="opacity-40 float-right">(12.4s)</span></div>
  <div><span class="text-green-400 font-bold"> PASS </span> inbox-on-launch <span class="opacity-40 float-right">(5.2s)</span></div>
  <div><span class="text-green-400 font-bold"> PASS </span> inbox-response <span class="opacity-40 float-right">(6.1s)</span></div>
  <div><span class="text-green-400 font-bold"> PASS </span> inbox-format <span class="opacity-40 float-right">(3.8s)</span></div>
  <div><span class="text-green-400 font-bold"> PASS </span> config-format <span class="opacity-40 float-right">(2.9s)</span></div>
  <div class="mt-3 border-t border-gray-700 pt-3">
    <span class="text-green-400 font-bold">Tests</span>  9 passed (9) <span class="opacity-40 float-right">Time 48.6s</span>
  </div>
</div>

New Claude Code version? **Run the suite.**

<!--
We can run all of these with every new version of Claude Code to check if something changed in the protocol. 

Okay, so why do we actually need all of this when the feature is already included natively?
-->

---
layout: center
---

# The Problem with the Native Feature

<!--
Claude Code has agent teams built in, but it's still experimental. And you feel that. The accessibility of the feature is weird — you have to rely on Claude understanding your request to create an agent team and using the right tools to do so.
-->

---

# Three Problems

<div class="flex flex-col justify-center items-center h-[calc(100%-4rem)]">
<div class="grid grid-cols-3 gap-6">

<v-clicks>

<div class="border border-red-400/40 rounded-xl p-5 bg-red-900/10 text-center">
  <div class="text-3xl mb-3">💨</div>
  <div class="font-bold mb-2">Teams vanish</div>
  <div class="text-sm opacity-70">Task done → team gone.<br/>Found a mistake? Start over.</div>
</div>

<div class="border border-red-400/40 rounded-xl p-5 bg-red-900/10 text-center">
  <div class="text-3xl mb-3">🔁</div>
  <div class="font-bold mb-2">Not reproducible</div>
  <div class="text-sm opacity-70">You rely on the LLM to do<br/>the right thing every time.</div>
</div>

<div class="border border-red-400/40 rounded-xl p-5 bg-red-900/10 text-center">
  <div class="text-3xl mb-3">🎛️</div>
  <div class="font-bold mb-2">No control</div>
  <div class="text-sm opacity-70">Can't specify working dirs,<br/>prompts, or which agents to use.</div>
</div>

</v-clicks>

</div>
</div>

<!--
The native flow is always: spawn a team, delegate, think it's done, tear everything down. Then you look at the result and spot a mistake — but the team is already gone.

And you can't save a team that worked well. You rely on the LLM to do the right thing next time.

But the biggest thing: you can't really control what the agents do. Claude does what it thinks is best. You can't tell it which working directories to use, which CLAUDE.md to load, what the agents should focus on.

All of this made me think about a small tool to help with these problems. I called it crew-code — like claude-code, but for crews.
-->

---
layout: center
class: text-center
---

# crew-code

like claude-code, but for crews

<!--
It does the same scaffolding that Claude Code would do when spinning up an agent team, but you can specify and hard-code things. Working directories, agent prompts, team composition — everything under your control.
-->

---

# 100% Vibe-Coded

<div class="flex flex-col justify-center items-center h-[calc(100%-4rem)]">
<div class="grid grid-cols-3 gap-6">

<v-clicks>

<div class="border border-gray-600 rounded-xl p-5 text-center">
  <div class="text-3xl font-bold text-blue-400">157</div>
  <div class="text-sm opacity-70 mt-1">tests passing</div>
</div>

<div class="border border-gray-600 rounded-xl p-5 text-center">
  <div class="text-3xl font-bold text-blue-400">3</div>
  <div class="text-sm opacity-70 mt-1">frontends: CLI, TUI, Web</div>
</div>

<div class="border border-gray-600 rounded-xl p-5 text-center">
  <div class="text-3xl font-bold text-blue-400">0</div>
  <div class="text-sm opacity-70 mt-1">lines written by me</div>
</div>

</v-clicks>

</div>

<v-click>

<div class="text-center mt-6">

At some point, **crew-code spawned a crew that continued building crew-code.**

</div>

</v-click>

</div>

<!--
The whole thing is vibe-coded. I didn't write a single line myself. It started as a quick CLI, then I wantea TUI to watch the agents, and finally I added a web UI. Every time the architecture wasn't clean enough for the next frontend, I refactored it to get rid of external dependencies, clean API borders, proper dependency injection so I could do Test-driven development. Not because I planned it, but because I needed it.

157 tests, all generated. The compat tests are kind of meta — they test the protocol, written by the tool that was built on the protocol.

And at one point crew was far enough along that I used crew spawn to spawn agents that continued building crew. The tool was building itself. That was a fun moment.

But the main thing I want to show you today is what crew actually enables: blueprints.
-->

---

# Blueprints: Capture and Repeat a Workflow

```yaml {all|1-2|4-5|7-11|12-16|17-20|all}
name: review-swarm
description: "Multi-repo code review team"

agents:
  - name: team-lead
    agentType: team-lead

  - name: api-reviewer
    prompt: "You review backend API code. Focus on error handling,
             test coverage, and our REST conventions."
    cwd: ~/repos/guestbook-api

  - name: ui-reviewer
    prompt: "You review frontend code. Focus on component structure,
             accessibility, and bundle size."
    cwd: ~/repos/guestbook-ui

  - name: ux-reviewer
    prompt: "You review UI changes from a design perspective.
             Check design system compliance and UX consistency."
    cwd: ~/repos/guestbook-ui
```

<!--
A blueprint has a name and description, there's always a team-lead that coordinates, and you define agents with system prompts and working directories. 
When you're happy with the team, you load the blueprint and deploy it. After that you have a running agent team you can send messages to. And if you notice a problem, you change the prompt, add more agents, and re-deploy.

This is the actual blueprint I want to try out now.
-->

---
layout: center
class: text-center
---

# Demo Time

Let's see if the demo gods are on our side today.

<!--
Depending on the demo gods being with me today, I'll run this live. I do have a backup video in case of emergency :D

The demo is a full-stack feature addition to a small guestbook app — you can now add emoji reactions to guestbook entries.
-->

---
layout: center
class: text-center
---

# Thanks!

I hope I could give you some ideas for our new shiny tools :)

<div class="pt-8 opacity-75">
  Jan-Olaf Becker
</div>

<!--
That was my talk about Claude Code agent teams and what you can do with them. Questions?
-->
