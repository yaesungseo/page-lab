# Page / Lab

An interactive Clock Sweep page-replacement visualizer. Explore virtual-to-physical address translation, reference bits, dirty-page eviction, and swap restoration one memory access at a time.

## Live demo

https://yaesungseo.github.io/page-lab/

## What this repository contains

- A dependency-free HTML/CSS/JavaScript viewer with Korean explanations.
- A synthetic 20-access replay exported from a local C virtual-memory simulator.
- Raw JSONL events, including before/after frame snapshots and Clock scan decisions.

The browser replays actual C-engine output; it does not reimplement the replacement algorithm. This first version uses one process, five virtual pages, and three data frames plus two protected system frames.

The C engine originated from a Georgia Tech CS2200 course project. Course-provided source code, assignment solutions, original traces, and assignment documents are intentionally not included in this public repository. The viewer and instrumentation were developed with Codex assistance.

## Run locally

Open `index.html` in a browser, or run:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

## Explore

- Access 5: Clock clears three reference bits, then evicts dirty P0.
- Access 9: P0 is restored from swap and the value 42 is preserved.
- Use Previous/Next, the timeline, arrow keys, or automatic playback.

AMAT is a simulation cost model, not measured hardware latency. The demo completes with 20 accesses, 17 faults, 3 hits, and 3 writebacks.
