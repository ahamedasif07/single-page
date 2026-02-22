// ─── STATE ───────────────────────────────────────────────
let currentStep = "R";
const steps = ["R", "I", "S", "E"];
const stepOrder = { R: 0, I: 1, S: 2, E: 3 };
let selectedStyle = "";
let selectedEsgOpt = "";
let score = 0;

// ─── NAVIGATION ──────────────────────────────────────────
function goTo(step) {
  document
    .querySelectorAll(".step-screen")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById("screen-" + step).classList.add("active");

  document.querySelectorAll(".step-btn").forEach((b) => {
    b.className = "step-btn";
    const s = b.id.replace("btn-", "");
    if (stepOrder[s] < stepOrder[step]) b.classList.add("done");
  });
  document.getElementById("btn-" + step).classList.add("active-" + step);

  // Progress segments
  steps.forEach((s, i) => {
    const seg = document.getElementById("prog-" + s);
    seg.className = "prog-seg prog-" + s;
    if (i < stepOrder[step]) seg.classList.add("done");
    else if (i === stepOrder[step]) seg.classList.add("active");
  });

  currentStep = step;
  updateScore();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── CHIPS ───────────────────────────────────────────────
function toggleChip(el, step) {
  const group = el.dataset.group;
  const siblings = document.querySelectorAll(`[data-group="${group}"]`);
  const multiGroups = [
    "videoType",
    "audience",
    "emotion",
    "success",
    "followup",
    "channel",
  ];

  if (multiGroups.includes(group)) {
    if (el.classList.contains("sel-" + step)) {
      el.className = "chip";
    } else {
      el.classList.add("sel-" + step);
    }
  } else {
    siblings.forEach((s) => (s.className = "chip"));
    el.classList.add("sel-" + step);
  }
  updateScore();
}

function getChipValues(group) {
  return Array.from(
    document.querySelectorAll(
      `[data-group="${group}"].sel-R,[data-group="${group}"].sel-I,[data-group="${group}"].sel-S,[data-group="${group}"].sel-E`,
    ),
  ).map((c) => c.textContent.trim());
}

// ─── EXAMPLES ────────────────────────────────────────────
function useExample(card, fieldId, text) {
  document
    .querySelectorAll(".ex-card")
    .forEach((c) => c.classList.remove("used"));
  card.classList.add("used");
  document.getElementById(fieldId).value = text;
  updateScore();
}

// ─── STYLE / ESG OPTS ────────────────────────────────────
function setStyleOpt(el, val) {
  document
    .querySelectorAll("#screen-I .s-opt")
    .forEach((o) => o.classList.remove("active"));
  el.classList.add("active");
  selectedStyle = val;
  updateScore();
}

function setEsgOpt(el, val) {
  document
    .querySelectorAll("#screen-S .s-opt")
    .forEach((o) => o.classList.remove("active"));
  el.classList.add("active");
  selectedEsgOpt = val;
  const box = document.getElementById("esg-idea");
  box.style.display = "block";
  box.textContent = "💡 " + val;
}

// ─── AMP CARDS ───────────────────────────────────────────
function toggleAmpCard(el) {
  el.classList.toggle("chosen");
}

// ─── SIMPLIFY MESSAGE ────────────────────────────────────
async function simplifyMessage() {
  const raw = document.getElementById("msg-raw").value.trim();
  if (!raw) return;

  const loading = document.getElementById("simplify-loading");
  const result = document.getElementById("msg-result");
  loading.classList.add("show");
  result.style.display = "none";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system:
          "You are an expert in the Made to Stick framework and safety communications. When given a complex message, strip it down to its single irreducible core — one sentence, human, concrete, and impossible to ignore. Format: [Core message]: <one sentence>\n[Why it sticks]: <one sentence>\n[Suggested opening line]: <punchy 10-word max hook>",
        messages: [
          {
            role: "user",
            content: `Strip this message to its sticky core:\n\n${raw}`,
          },
        ],
      }),
    });
    const data = await response.json();
    const text =
      data.content?.[0]?.text ||
      "Could not simplify. Try being more specific about the problem.";
    result.style.display = "block";
    result.innerHTML = text
      .replace(
        /\[(.+?)\]/g,
        '<strong style="color:rgba(115,163,109,0.9)">[$1]</strong>',
      )
      .replace(/\n/g, "<br>");
  } catch (e) {
    result.style.display = "block";
    result.textContent =
      "Unable to connect. Make sure you've filled in your message and try again.";
  }
  loading.classList.remove("show");
}

// ─── SCORE ───────────────────────────────────────────────
function updateScore() {
  let pts = 0,
    max = 0;

  const checks = [
    { id: "r-problem", pts: 15 },
    { id: "r-tried", pts: 10 },
    { id: "i-core-message", pts: 20 },
    { id: "s-hook", pts: 15 },
    { id: "s-human", pts: 10 },
    { id: "s-cta", pts: 10 },
    { id: "e-name", pts: 5 },
  ];
  checks.forEach((c) => {
    max += c.pts;
    const el = document.getElementById(c.id);
    if (el && el.value.trim().length > 10) pts += c.pts;
  });

  const chipChecks = [
    "videoType",
    "audience",
    "barriers",
    "style",
    "emotion",
    "length",
    "channel",
    "success",
    "followup",
  ];
  chipChecks.forEach((g) => {
    max += 5;
    if (getChipValues(g).length > 0) pts += 5;
  });

  score = Math.round((pts / max) * 100);
  document.getElementById("sticky-fill").style.width = score + "%";
  document.getElementById("sticky-pct").textContent = score + "%";

  const pct = document.getElementById("progress-pct");
  if (pct) pct.textContent = score + "%";
}

// ─── GENERATE BRIEF ──────────────────────────────────────
async function generateBrief() {
  document.getElementById("loading-overlay").classList.add("show");

  // Collect all data
  const data = {
    videoType: getChipValues("videoType").join(", ") || "—",
    audience: getChipValues("audience").join(", ") || "—",
    problem: document.getElementById("r-problem").value.trim() || "—",
    tried: document.getElementById("r-tried").value.trim() || "—",
    barriers: getChipValues("barriers").join(", ") || "—",
    coreMessage: document.getElementById("i-core-message").value.trim() || "—",
    style: getChipValues("style").join(", ") || selectedStyle || "—",
    emotion: getChipValues("emotion").join(", ") || "—",
    hook: document.getElementById("s-hook").value.trim() || "—",
    human: document.getElementById("s-human").value.trim() || "—",
    cta: document.getElementById("s-cta").value.trim() || "—",
    length: getChipValues("length").join(", ") || "—",
    channel: getChipValues("channel").join(", ") || "—",
    success: getChipValues("success").join(", ") || "—",
    followup: getChipValues("followup").join(", ") || "—",
    name: document.getElementById("e-name").value.trim() || "—",
    budget: getChipValues("budget").join(", ") || "—",
    notes: document.getElementById("e-notes").value.trim() || "—",
  };

  const prompt = `You are a world-class safety communications strategist and video producer at GotSafe Media. Based on the RISE brief below, generate a complete, compelling production brief that would excite a creative director.

RISE BRIEF DATA:
- Video Type: ${data.videoType}
- Audience: ${data.audience}
- Core Problem: ${data.problem}
- What's Been Tried: ${data.tried}
- Barriers: ${data.barriers}
- Core Message: ${data.coreMessage}
- Style: ${data.style}
- Desired Emotion: ${data.emotion}
- Opening Hook: ${data.hook}
- Human Moment: ${data.human}
- Call to Action: ${data.cta}
- Video Length: ${data.length}
- Distribution Channel: ${data.channel}
- Success Metrics: ${data.success}
- Follow-Up Plan: ${data.followup}
- Client: ${data.name}
- Timeline: ${data.budget}
- Additional Notes: ${data.notes}

Generate a JSON object with these exact keys (no markdown, pure JSON):
{
  "headline": "A punchy 8-10 word brief title",
  "oneLiner": "The core message rewritten as a cinematic opening line (one sentence, vivid, human)",
  "productionNotes": "3-4 sentences on recommended production approach, visual style, tone",
  "scriptDirection": "3 bullet points for scriptwriter: opening beat, emotional pivot, closing call to action (format as bullet • points)",
  "audienceInsight": "2 sentences: who this audience really is and what will make them actually pay attention",
  "stickinessScore": A number 1-100 rating how sticky this brief is based on Made to Stick principles,
  "stickinessNote": "One sentence explaining the score and the #1 thing that would improve it",
  "redFlag": "One sentence: the biggest risk if this video is NOT made well",
  "quickWin": "One concrete, specific production suggestion that would elevate this video above average"
}`;

  let aiData = null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system:
          "You are a world-class safety communications and video production strategist. Always respond with pure JSON only — no markdown, no backticks, no preamble.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const raw = await res.json();
    const text = raw.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    aiData = JSON.parse(clean);
  } catch (e) {
    aiData = {
      headline: "Your RISE Video Brief",
      oneLiner:
        data.coreMessage || "A message your people will actually remember.",
      productionNotes: `For ${data.audience}, this ${data.videoType} should use ${data.style} to create an emotional connection. Focus on real human moments over compliance language. Keep it under ${data.length}.`,
      scriptDirection: `• Open with: "${data.hook}"\n• Human anchor: ${data.human}\n• Close with clear action: "${data.cta}"`,
      audienceInsight: `${data.audience} need to feel seen, not lectured. Lead with their world, not yours.`,
      stickinessScore: score,
      stickinessNote:
        "Strong foundation — the more specific your human moment, the stickier this gets.",
      redFlag:
        "Generic visuals and compliance language will kill this message before the first 10 seconds.",
      quickWin:
        "Open on a real face, not a logo. Human connection in frame 1 changes everything.",
    };
  }

  document.getElementById("loading-overlay").classList.remove("show");
  renderOutput(data, aiData);
}

// ─── RENDER OUTPUT ───────────────────────────────────────
function renderOutput(formData, ai) {
  document.getElementById("form-screen").style.display = "none";
  document.getElementById("output-screen").style.display = "block";
  window.scrollTo(0, 0);

  const finalScore = ai.stickinessScore || score;
  document.getElementById("final-score").textContent = finalScore + "%";
  document.getElementById("score-insight").textContent =
    ai.stickinessNote || "";

  const getScoreColor = (s) => {
    if (s >= 75) return "#73a36d";
    if (s >= 50) return "#c9a228";
    return "#e07832";
  };
  document.getElementById("final-score").style.background =
    `linear-gradient(135deg, ${getScoreColor(finalScore)}, #c8d832)`;
  document.getElementById("final-score").style.webkitBackgroundClip = "text";
  document.getElementById("final-score").style.webkitTextFillColor =
    "transparent";

  const tagR = (t) => `<span class="brief-tag R">${t}</span>`;
  const tagI = (t) => `<span class="brief-tag I">${t}</span>`;
  const tagS = (t) => `<span class="brief-tag S">${t}</span>`;
  const tagE = (t) => `<span class="brief-tag E">${t}</span>`;

  const scriptBullets = (ai.scriptDirection || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(
      (l) =>
        `<div style="margin-bottom:8px;font-size:13px;color:var(--gs-cream);line-height:1.55">${l}</div>`,
    )
    .join("");

  document.getElementById("brief-output").innerHTML = `
    <div class="brief-header">
      <h3>📋 ${ai.headline}</h3>
      <div style="font-size:11px;color:rgba(184,173,151,0.35);font-weight:300">${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</div>
    </div>

    <div class="brief-section">
      <div class="brief-key">Opening Line</div>
      <div class="brief-val" style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:var(--gs-white);line-height:1.3">"${ai.oneLiner}"</div>
    </div>

    <div class="brief-section">
      <div class="brief-key">Research — What We Know</div>
      <div class="brief-val">
        ${tagR(formData.videoType)} ${formData.audience
          .split(", ")
          .map((a) => tagR(a))
          .join("")}
        <div style="margin-top:12px;font-size:13px;color:rgba(184,173,151,0.65);line-height:1.6"><strong style="color:var(--gs-white)">Problem:</strong> ${formData.problem}</div>
        ${formData.tried !== "—" ? `<div style="margin-top:8px;font-size:13px;color:rgba(184,173,151,0.65);line-height:1.6"><strong style="color:var(--gs-white)">What failed:</strong> ${formData.tried}</div>` : ""}
      </div>
    </div>

    <div class="brief-section">
      <div class="brief-key">Audience Insight</div>
      <div class="brief-val">${ai.audienceInsight}</div>
    </div>

    <div class="brief-section">
      <div class="brief-key">Imagine — Core Message & Style</div>
      <div class="brief-val">
        <div style="font-size:15px;font-weight:500;color:var(--gs-white);margin-bottom:10px;line-height:1.4">${formData.coreMessage}</div>
        ${formData.style
          .split(", ")
          .map((s) => tagI(s))
          .join("")}
        ${formData.emotion
          .split(", ")
          .map((e) => tagI(e))
          .join("")}
        <div style="margin-top:14px">${ai.productionNotes}</div>
      </div>
    </div>

    <div class="brief-section">
      <div class="brief-key">Shape — Script Direction</div>
      <div class="brief-val">
        <div style="background:rgba(58,158,136,0.04);border:1px solid rgba(58,158,136,0.12);border-radius:10px;padding:16px;margin-bottom:12px">
          ${scriptBullets}
        </div>
        ${formData.channel
          .split(", ")
          .map((c) => tagS(c))
          .join("")}
        ${formData.length !== "—" ? tagS(formData.length) : ""}
      </div>
    </div>

    <div class="brief-section">
      <div class="brief-key">Engage — Measurement & Follow-Through</div>
      <div class="brief-val">
        ${formData.success
          .split(", ")
          .map((s) => tagE(s))
          .join("")}
        ${formData.followup
          .split(", ")
          .map((f) => tagE(f))
          .join("")}
        ${formData.budget !== "—" ? `<div style="margin-top:12px;font-size:13px;color:rgba(184,173,151,0.55)">⏱ Timeline: <strong style="color:var(--gs-white)">${formData.budget}</strong></div>` : ""}
        ${formData.notes !== "—" ? `<div style="margin-top:8px;font-size:13px;color:rgba(184,173,151,0.55)">Notes: ${formData.notes}</div>` : ""}
      </div>
    </div>

    <div class="brief-section" style="background:rgba(200,216,50,0.02)">
      <div class="brief-key">⚡ Quick Win</div>
      <div class="brief-val" style="color:rgba(200,216,50,0.85)">${ai.quickWin}</div>
    </div>

    <div class="brief-section" style="background:rgba(200,60,60,0.02)">
      <div class="brief-key">⚠️ Red Flag — If this is done wrong</div>
      <div class="brief-val" style="color:rgba(200,100,100,0.75)">${ai.redFlag}</div>
    </div>

    ${
      formData.name !== "—"
        ? `
    <div class="brief-section" style="border-bottom:none">
      <div class="brief-key">Submitted By</div>
      <div class="brief-val" style="font-weight:400">${formData.name}</div>
    </div>`
        : ""
    }
  `;
}

// ─── RESET ───────────────────────────────────────────────
function resetTool() {
  document.getElementById("form-screen").style.display = "block";
  document.getElementById("output-screen").style.display = "none";
  document.querySelectorAll(".chip").forEach((c) => (c.className = "chip"));
  document.querySelectorAll(".gs-input").forEach((i) => {
    if (i.tagName === "TEXTAREA") i.value = "";
    else i.value = "";
  });
  document
    .querySelectorAll(".s-opt")
    .forEach((o) => o.classList.remove("active"));
  document.querySelectorAll(".ex-card,.amp-card").forEach((c) => {
    c.classList.remove("used");
    c.classList.remove("chosen");
  });
  document.getElementById("msg-result").style.display = "none";
  document.getElementById("esg-idea").style.display = "none";
  selectedStyle = "";
  selectedEsgOpt = "";
  score = 0;
  goTo("R");
}

// ─── INIT ─────────────────────────────────────────────────
goTo("R");
