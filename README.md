# Page / Lab

**C-based virtual memory management, made visible.**

Page / Lab presents the memory-management logic I implemented in C for Georgia Tech's CS2200 Computer Systems and Networks course. The core work covers address translation, page faults, page replacement, and process-level memory management within a provided simulator framework.

My interest is in hardware and computer architecture, particularly how architectural state and operating-system decisions work together to manage memory. I extended this project with Codex to make those mechanisms easier to inspect and explain through an interactive visualization.

[Explore the live demo](https://yaesungseo.github.io/page-lab/)

## Core work: memory management in C

Within the course-provided framework, I implemented:

- **Address translation:** split virtual addresses into virtual page numbers and offsets, locate page-table entries, and compute physical addresses.
- **Page-fault handling:** allocate a physical frame, restore a page from swap or zero-fill a new page, and establish its mapping.
- **Page replacement:** implement Approximate LRU and Second-Chance / Clock Sweep, while keeping protected system frames out of eviction.
- **Dirty-page eviction:** write modified pages to swap before reusing their frames and invalidate the old mappings.
- **Process memory lifecycle:** initialize per-process page tables, switch the page-table base register on context switches, and release frames and swap entries on process termination.
- **Performance accounting:** track memory accesses, page faults, writebacks, and simulated average memory access time (AMAT).

The implementation required keeping page tables, frame ownership, reference bits, dirty bits, and swap metadata consistent as memory was allocated and reused.

## Connection to hardware and architecture

The project explores the hardware–software interface behind virtual memory: address decomposition, page-table state, physical-frame allocation, and the cost of moving data between memory and backing storage.

The simulated system uses 24-bit virtual addresses, 20-bit physical addresses, and 16 KiB pages. The visual demo constrains allocation to five physical frames: two for system structures and three for data.

This is a C systems simulation; it does not include an RTL implementation or a physical processor. It provides a foundation for my continued work in computer architecture and memory systems.

## How I used Codex

I used Codex to turn the existing C implementation into an inspectable demonstration. Codex helped add event instrumentation, build and refine the HTML/CSS/JavaScript interface, automate validation, and publish the viewer with GitHub Pages.

The website's purpose is to communicate the systems work. My primary technical contribution is the course-project memory-management implementation; the visualization and instrumentation are subsequent Codex-assisted extensions. The simulator framework and supporting utilities were supplied by the course.

## From engine execution to visualization

```text
Memory-access trace → C simulator → JSONL events → Browser replay
```

The C engine records address translations, frame snapshots, Clock scan decisions, evictions, and swap activity. The browser displays those recorded results. The public site replays a fixed trace; it does not run the C engine or compute replacement decisions in JavaScript.

The viewer compares **Clock Sweep, Approximate LRU, and the course-provided Random baseline** on the same trace and frame budget. Three synchronized cards show resident pages, the current eviction or hit, and cumulative faults, hits, and writebacks. Select a card to inspect its address translation, frame transitions, and decision explanation. A cumulative fault chart tracks all three policies through the selected access.

Approximate LRU exposes its 8-bit aging counters. The daemon runs before every fifth access, so each recorded “before” snapshot already includes any aging update. Random uses the supplied fixed-state PRNG and ordered coin-flip scan with a last-frame fallback; it is not uniform random selection, and this replay is one reproducible run rather than an average.

## What to inspect

- **Clock Sweep, access 5:** three referenced pages receive a second chance. Dirty P0 is then evicted and written to swap.
- **Clock Sweep, access 9:** P0 is restored from swap, preserving the previously written value **42**.
- **Compare access 9:** Clock Sweep evicts P3, Approximate LRU evicts P4, and Random evicts P2 for the same read of P0.
- **After 20 accesses:** Clock Sweep has 17 faults / 3 hits / 3 writebacks; Approximate LRU has 12 / 8 / 2; Random has 13 / 7 / 2. These results describe this small synthetic trace, not a general policy ranking.

Step through the trace with Previous/Next, the timeline, or arrow keys, or use automatic playback.

During local validation, the original nine C unit tests passed. After instrumentation was added, all 15 full outputs across five course traces and three existing policies matched both the pre-extension engine and the supplied reference outputs. The comparison extension passes ten Python tests (including the nine original C unit tests), checking instrumentation neutrality, swap data preservation, process isolation, exact browser-payload agreement for all three policies, identical access sequences, aging boundaries, and Random replay reproducibility. These checks ran against the local engine; the public repository does not contain an independently runnable C test suite.

AMAT uses the course's simulation cost model, including a fault cost for first-time allocation. It is not measured hardware latency.

## Public repository scope

This repository contains the viewer, a synthetic demo replay, and raw JSONL events. Course-provided C source, assignment solutions, original course traces, and assignment documents are excluded from the public repository.

To view locally, open `index.html` in a browser, or run:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```
