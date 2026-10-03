"use strict";

(() => {
  const data = window.VM_DEMO;
  if (!data || !Array.isArray(data.events) || !data.events.length) {
    document.querySelector("main").textContent = "Replay data could not be loaded. Refresh the page or try again later.";
    return;
  }
  const events = data.events;
  const el = (id) => document.getElementById(id);
  const hex = (number) => "0x" + number.toString(16).toUpperCase().padStart(6, "0");
  const frameName = (number) => "F" + String(number).padStart(2, "0");
  const number = (value) => value.toLocaleString("en-US");
  let index = 0;
  let timer = null;

  events.forEach((event, i) => {
    const button = document.createElement("button");
    button.className = "access-chip";
    button.innerHTML = `<small>${String(i + 1).padStart(2, "0")} · ${event.operation.toUpperCase()}</small><span>P${event.vpn}</span>`;
    button.setAttribute("aria-label", `Access ${i + 1}: ${event.operation === "w" ? "write" : "read"} page ${event.vpn}`);
    button.addEventListener("click", () => navigate(i));
    el("timeline").append(button);
  });
  el("seek").max = events.length - 1;

  function show(nextIndex) {
    index = Math.max(0, Math.min(events.length - 1, nextIndex));
    const event = events[index];
    const fault = event.result === "fault";
    el("step-count").textContent = `${String(index + 1).padStart(2, "0")} / ${events.length}`;
    el("seek").value = index;
    el("seek").setAttribute("aria-valuetext", `Access ${index + 1}, page ${event.vpn}`);
    el("previous").disabled = index === 0;
    el("next").disabled = index === events.length - 1;
    [...el("timeline").children].forEach((button, i) => {
      button.className = `access-chip${i <= index ? ` visited ${events[i].result}` : ""}${i === index ? " active" : ""}`;
      button.setAttribute("aria-current", i === index ? "step" : "false");
    });

    el("translation").innerHTML = `
      <div><small>VIRTUAL ADDRESS · ${event.operation === "w" ? "WRITE" : "READ"}</small><strong>${hex(event.address)}</strong><div class="address-parts">VPN ${event.vpn} · Offset ${event.offset}</div></div>
      <span class="arrow" aria-hidden="true">→</span>
      <div><small>RESOLVED MAPPING</small><strong>P${event.vpn} → ${frameName(event.pfn)}</strong><div class="address-parts">PTBR ${event.ptbr}</div></div>
      <span class="arrow" aria-hidden="true">→</span>
      <div><small>PHYSICAL ADDRESS</small><strong>${hex(event.physical_address)}</strong><div class="address-parts">${event.operation === "w" ? "Wrote" : "Read"} value ${event.value}</div></div>`;

    el("frames").innerHTML = event.after.filter((frame) => !frame.protected).map((frame) => {
      const before = event.before.find((item) => item.pfn === frame.pfn);
      const active = frame.pfn === event.pfn;
      const cleared = event.probes.some((probe) => probe.pfn === frame.pfn && probe.action === "second_chance");
      const beforeLabel = before.mapped ? `Was P${before.vpn} · R${before.referenced} D${before.dirty}` : "Previously empty";
      let status = "Unchanged";
      if (!frame.mapped) status = "Available";
      if (cleared) status = "Reference cleared";
      if (active) status = fault ? (event.eviction ? "Replaced" : "Allocated") : "Accessed";
      return `<article class="frame${active ? " selected" : ""}${!frame.mapped ? " empty-frame" : ""}">
        <div class="frame-heading"><b>${frameName(frame.pfn)}</b><span>16 KiB</span></div>
        <div class="frame-body"><div class="before-page">${beforeLabel}</div><div class="page-name">${frame.mapped ? `P${frame.vpn}` : "Empty"}</div>
          <div class="bits"><span class="bit${frame.referenced ? " on" : ""}">R ${frame.referenced}</span><span class="bit${frame.dirty ? " dirty" : ""}">D ${frame.dirty}</span></div>
          <div class="frame-status">${status}</div></div></article>`;
    }).join("");

    el("result-badge").className = `badge ${fault ? "fault" : "hit"}`;
    el("result-badge").textContent = fault ? "PAGE FAULT" : "MEMORY HIT";
    let headline, explanation;
    if (!fault) {
      headline = `P${event.vpn} is already here.`;
      explanation = `${event.operation === "w" ? "Write to" : "Read from"} ${frameName(event.pfn)} directly. No replacement scan is needed; the reference bit is set to 1.`;
    } else if (!event.eviction) {
      headline = "There is room to spare.";
      explanation = `P${event.vpn} is not mapped, so this access faults. Use the empty frame ${frameName(event.pfn)} without evicting another page.`;
    } else {
      headline = `P${event.eviction.vpn} out. P${event.vpn} in.`;
      const chances = event.probes.filter((probe) => probe.action === "second_chance").length;
      explanation = chances
        ? `Memory is full. Give ${chances} referenced ${chances === 1 ? "page" : "pages"} a second chance by clearing R to 0. Then choose ${frameName(event.pfn)}, the first frame encountered with R=0.`
        : `Memory is full. ${frameName(event.pfn)} is the first frame encountered with R=0, so its page is selected for replacement.`;
    }
    el("decision-headline").textContent = headline;
    el("decision-description").textContent = explanation;
    el("sweep").innerHTML = event.probes.map((probe, i) => {
      const text = probe.action === "free" ? "Use free frame" : probe.action === "evict" ? "R=0 · Evict" : "R 1→0 · Pass";
      return `<div class="probe ${probe.action === "evict" ? "evict" : ""}"><b>${i + 1}. ${frameName(probe.pfn)}</b>${text}</div>`;
    }).join("");

    const disk = [];
    if (event.eviction) disk.push(event.eviction.writeback
      ? `P${event.eviction.vpn} is dirty (D=1). Save its modified data to swap.`
      : `P${event.eviction.vpn} is clean (D=0). No writeback is needed.`);
    if (event.load === "swap") disk.push(`Restore P${event.vpn} from swap.`);
    if (event.load === "zero") disk.push(`Zero-fill P${event.vpn} on its first allocation.`);
    if (!fault) disk.push("No swap read or write for this access.");
    el("disk-note").textContent = disk.join(" ");
    el("disk-note").className = `disk-note${event.eviction?.writeback ? " writeback" : ""}`;

    let hand = (event.last_evicted_after + 1) % data.metadata.physical_frames;
    while (event.after[hand].protected) hand = (hand + 1) % data.metadata.physical_frames;
    el("hand-note").textContent = `Next scan starts at ${frameName(hand)}. Protected frames are skipped.`;
    el("fault-count").textContent = number(event.stats.faults);
    el("fault-rate").textContent = `${event.stats.faults} of ${event.stats.accesses} accesses · ${(event.stats.faults / event.stats.accesses * 100).toFixed(0)}% fault rate`;
    el("hit-count").textContent = number(event.stats.hits);
    el("write-count").textContent = number(event.stats.writebacks);
    el("amat").textContent = number(Math.round(event.stats.amat));
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    el("play").textContent = index === events.length - 1 ? "Replay" : "Play";
    el("play").setAttribute("aria-pressed", "false");
  }
  function play() {
    if (index === events.length - 1) show(0);
    el("play").textContent = "Pause";
    el("play").setAttribute("aria-pressed", "true");
    timer = setInterval(() => {
      show(index + 1);
      if (index === events.length - 1) stop();
    }, Number(el("speed").value));
  }
  const navigate = (target) => { stop(); show(target); stop(); };
  el("previous").addEventListener("click", () => navigate(index - 1));
  el("next").addEventListener("click", () => navigate(index + 1));
  el("reset").addEventListener("click", () => navigate(0));
  el("seek").addEventListener("input", (e) => navigate(Number(e.target.value)));
  el("play").addEventListener("click", () => timer ? stop() : play());
  el("speed").addEventListener("change", () => { if (timer) { stop(); play(); } });
  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      navigate(index + (e.key === "ArrowRight" ? 1 : -1));
    }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  show(0);
  stop();
})();
