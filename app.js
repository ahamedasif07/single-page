// ─── STATE ───────────────────────────────────────────────
let currentStep = "R";
const steps = ["R", "I", "S", "E"];
const stepOrder = { R: 0, I: 1, S: 2, E: 3 };
let selectedStyle = "";
let selectedEsgOpt = "";
let score = 0;
let lastAiData = null;
let lastFormData = null;

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
    { id: "r-fullname", pts: 5 },
    { id: "r-email", pts: 5 },
    { id: "r-company", pts: 5 },
  ];
  checks.forEach((c) => {
    max += c.pts;
    const el = document.getElementById(c.id);
    if (el && el.value.trim().length > 2) pts += c.pts;
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

// ─── COLLECT ALL FORM DATA ───────────────────────────────
function collectFormData() {
  return {
    // Contact info
    fullname: document.getElementById("r-fullname").value.trim() || "—",
    email: document.getElementById("r-email").value.trim() || "—",
    phone: document.getElementById("r-phone").value.trim() || "—",
    company: document.getElementById("r-company").value.trim() || "—",
    role: document.getElementById("r-role").value.trim() || "—",
    industry: document.getElementById("r-industry").value.trim() || "—",
    // Brief data
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
    budget: getChipValues("budget").join(", ") || "—",
    notes: document.getElementById("e-notes").value.trim() || "—",
  };
}

// ─── GENERATE BRIEF ──────────────────────────────────────
async function generateBrief() {
  document.getElementById("loading-overlay").classList.add("show");

  const data = collectFormData();
  lastFormData = data;

  const prompt = `You are a world-class safety communications strategist and video producer at GotSafe Media. Based on the RISE brief below, generate a complete, compelling production brief that would excite a creative director.

RISE BRIEF DATA:
- Client Name: ${data.fullname}
- Company: ${data.company}
- Role: ${data.role}
- Industry: ${data.industry}
- Email: ${data.email}
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
- Timeline: ${data.budget}
- Additional Notes: ${data.notes}

Generate a JSON object with these exact keys (no markdown, pure JSON):
{
  "headline": "A punchy 8-10 word brief title",
  "oneLiner": "The core message rewritten as a cinematic opening line (one sentence, vivid, human)",
  "productionNotes": "3-4 sentences on recommended production approach, visual style, tone",
  "scriptDirection": "3 bullet points for scriptwriter: opening beat, emotional pivot, closing call to action (format as bullet • points)",
  "audienceInsight": "2 sentences: who this audience really is and what will make them actually pay attention",
  "stickinessScore": 75,
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

  lastAiData = aiData;
  document.getElementById("loading-overlay").classList.remove("show");

  // Render the full output screen
  renderOutput(data, aiData);

  // Open the modal with the brief
  openBriefModal(data, aiData);
}

// ─── OPEN BRIEF MODAL ────────────────────────────────────
function openBriefModal(data, ai) {
  const finalScore = ai.stickinessScore || score;
  const modalTitle = document.getElementById("modal-headline");
  if (modalTitle) modalTitle.textContent = ai.headline || "Your RISE Brief";

  const tagR = (t) => `<span class="modal-tag R">${t}</span>`;
  const tagI = (t) => `<span class="modal-tag I">${t}</span>`;
  const tagS = (t) => `<span class="modal-tag S">${t}</span>`;
  const tagE = (t) => `<span class="modal-tag E">${t}</span>`;

  const scriptBullets = (ai.scriptDirection || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(
      (l) =>
        `<div style="margin-bottom:7px;font-size:13px;color:var(--gs-cream);line-height:1.55">${l}</div>`,
    )
    .join("");

  const dateStr = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const getScoreColor = (s) => {
    if (s >= 75) return "#73a36d";
    if (s >= 50) return "#c9a228";
    return "#e07832";
  };

  document.getElementById("modal-body").innerHTML = `
    <!-- Score Row -->
    <div class="modal-score-row">
      <div class="modal-score-num" style="background:linear-gradient(135deg,${getScoreColor(finalScore)},#c8d832);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${finalScore}%</div>
      <div class="modal-score-info">
        <div class="modal-score-label">Stickiness Score</div>
        <div class="modal-score-note">${ai.stickinessNote || ""}</div>
        <div style="font-size:10px;color:rgba(184,173,151,0.3);margin-top:6px;letter-spacing:0.06em">${dateStr}</div>
      </div>
    </div>

    <!-- Contact Info -->
    <div class="modal-contact-grid">
      ${data.fullname !== "—" ? `<div class="modal-contact-item"><div class="modal-contact-label">Name</div><div class="modal-contact-val">${data.fullname}</div></div>` : ""}
      ${data.company !== "—" ? `<div class="modal-contact-item"><div class="modal-contact-label">Company</div><div class="modal-contact-val">${data.company}</div></div>` : ""}
      ${data.role !== "—" ? `<div class="modal-contact-item"><div class="modal-contact-label">Role</div><div class="modal-contact-val">${data.role}</div></div>` : ""}
      ${data.email !== "—" ? `<div class="modal-contact-item"><div class="modal-contact-label">Email</div><div class="modal-contact-val">${data.email}</div></div>` : ""}
      ${data.phone !== "—" ? `<div class="modal-contact-item"><div class="modal-contact-label">Phone</div><div class="modal-contact-val">${data.phone}</div></div>` : ""}
      ${data.industry !== "—" ? `<div class="modal-contact-item"><div class="modal-contact-label">Industry</div><div class="modal-contact-val">${data.industry}</div></div>` : ""}
    </div>

    <!-- Opening Line -->
    <div class="modal-opening-line">"${ai.oneLiner}"</div>

    <!-- Research -->
    <div class="modal-section">
      <div class="modal-section-title">🔍 Research — What We Know</div>
      <div class="modal-section-val">
        <div style="margin-bottom:10px">${tagR(data.videoType)} ${data.audience
          .split(", ")
          .map((a) => tagR(a))
          .join("")}</div>
        <div style="margin-bottom:8px"><strong style="color:var(--gs-white)">Problem:</strong> ${data.problem}</div>
        ${data.tried !== "—" ? `<div style="margin-bottom:8px"><strong style="color:var(--gs-white)">What failed:</strong> ${data.tried}</div>` : ""}
        ${data.barriers !== "—" ? `<div><strong style="color:var(--gs-white)">Barriers:</strong> ${data.barriers}</div>` : ""}
      </div>
    </div>

    <!-- Audience Insight -->
    <div class="modal-section">
      <div class="modal-section-title">👥 Audience Insight</div>
      <div class="modal-section-val">${ai.audienceInsight}</div>
    </div>

    <!-- Imagine -->
    <div class="modal-section">
      <div class="modal-section-title">💡 Imagine — Core Message & Style</div>
      <div class="modal-section-val">
        <div style="font-size:15px;font-weight:500;color:var(--gs-white);margin-bottom:10px;line-height:1.4">${data.coreMessage}</div>
        <div style="margin-bottom:10px">${data.style
          .split(", ")
          .map((s) => tagI(s))
          .join("")} ${data.emotion
          .split(", ")
          .map((e) => tagI(e))
          .join("")}</div>
        <div>${ai.productionNotes}</div>
      </div>
    </div>

    <!-- Shape -->
    <div class="modal-section">
      <div class="modal-section-title">📐 Shape — Script Direction</div>
      <div class="modal-section-val">
        <div style="background:rgba(58,158,136,0.04);border:1px solid rgba(58,158,136,0.12);border-radius:10px;padding:14px;margin-bottom:12px">${scriptBullets}</div>
        <div>${data.channel
          .split(", ")
          .map((c) => tagS(c))
          .join("")} ${data.length !== "—" ? tagS(data.length) : ""}</div>
      </div>
    </div>

    <!-- Engage -->
    <div class="modal-section">
      <div class="modal-section-title">📣 Engage — Measurement & Follow-Through</div>
      <div class="modal-section-val">
        <div style="margin-bottom:8px">${data.success
          .split(", ")
          .map((s) => tagE(s))
          .join("")}</div>
        <div style="margin-bottom:8px">${data.followup
          .split(", ")
          .map((f) => tagE(f))
          .join("")}</div>
        ${data.budget !== "—" ? `<div style="font-size:13px;color:rgba(184,173,151,0.55);margin-top:10px">⏱ Timeline: <strong style="color:var(--gs-white)">${data.budget}</strong></div>` : ""}
        ${data.notes !== "—" ? `<div style="font-size:13px;color:rgba(184,173,151,0.45);margin-top:6px">Notes: ${data.notes}</div>` : ""}
      </div>
    </div>

    <!-- Quick Win + Red Flag -->
    <div class="modal-alert-row">
      <div class="modal-alert-box green">
        <span class="modal-alert-label">⚡ Quick Win</span>
        ${ai.quickWin}
      </div>
      <div class="modal-alert-box red">
        <span class="modal-alert-label">⚠️ Red Flag</span>
        ${ai.redFlag}
      </div>
    </div>
  `;

  document.getElementById("brief-modal").classList.add("show");
  document.body.style.overflow = "hidden";
}

// ─── CLOSE MODAL ─────────────────────────────────────────
function closeModal() {
  document.getElementById("brief-modal").classList.remove("show");
  document.body.style.overflow = "";
}

// Close modal on overlay click
document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("brief-modal");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
  }
  // Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
});

// ─── SEND EMAIL FROM MODAL ───────────────────────────────
function sendEmailFromModal() {
  if (!lastFormData || !lastAiData) return;
  const d = lastFormData;
  const ai = lastAiData;
  const dateStr = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subject = encodeURIComponent(
    `RISE Brief — ${d.company !== "—" ? d.company : d.fullname} — ${ai.headline}`,
  );

  const body = encodeURIComponent(
    `
RISE VIDEO BRIEF — GOTSAFE MEDIA
Generated: ${dateStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BRIEF TITLE: ${ai.headline}
STICKINESS SCORE: ${ai.stickinessScore || score}%

━━━ CLIENT DETAILS ━━━━━━━━━━━━━━━━━━━━━
Name:     ${d.fullname}
Company:  ${d.company}
Role:     ${d.role}
Industry: ${d.industry}
Email:    ${d.email}
Phone:    ${d.phone}

━━━ RESEARCH — KNOW YOUR WORLD ━━━━━━━━━
Video Type:   ${d.videoType}
Audience:     ${d.audience}
Core Problem: ${d.problem}
What Failed:  ${d.tried}
Barriers:     ${d.barriers}

━━━ IMAGINE — ONE MESSAGE ━━━━━━━━━━━━━━
Opening Line:  "${ai.oneLiner}"
Core Message:  ${d.coreMessage}
Style:         ${d.style}
Emotion:       ${d.emotion}

Audience Insight:
${ai.audienceInsight}

Production Notes:
${ai.productionNotes}

━━━ SHAPE — SCRIPT DIRECTION ━━━━━━━━━━
Hook (Opening):  ${d.hook}
Human Moment:    ${d.human}
Call to Action:  ${d.cta}
Video Length:    ${d.length}
Distribution:    ${d.channel}

Script Direction:
${ai.scriptDirection}

━━━ ENGAGE — KEEP THE MESSAGE ALIVE ━━━
Success Metrics: ${d.success}
Follow-Up Plan:  ${d.followup}
Timeline:        ${d.budget}
Notes:           ${d.notes}

━━━ AI RECOMMENDATIONS ━━━━━━━━━━━━━━━━
⚡ Quick Win:
${ai.quickWin}

⚠️ Red Flag (if done wrong):
${ai.redFlag}

📊 Stickiness Note:
${ai.stickinessNote}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Built with the RISE Video Brief Builder — GotSafe Media
  `.trim(),
  );

  window.location.href = `mailto:aa@gotsafemedia.com.au?subject=${subject}&body=${body}`;
}

// ─── RENDER OUTPUT (page below) ──────────────────────────
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
      <div class="brief-key">Client</div>
      <div class="brief-val">
        <strong>${formData.fullname}</strong>${formData.company !== "—" ? ` — ${formData.company}` : ""}${formData.role !== "—" ? ` | ${formData.role}` : ""}
        ${formData.email !== "—" ? `<div style="font-size:12px;color:rgba(184,173,151,0.45);margin-top:4px">${formData.email}${formData.phone !== "—" ? " · " + formData.phone : ""}</div>` : ""}
      </div>
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
        <div style="background:rgba(58,158,136,0.04);border:1px solid rgba(58,158,136,0.12);border-radius:10px;padding:16px;margin-bottom:12px">${scriptBullets}</div>
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

    <div class="brief-section" style="border-bottom:none;text-align:center;padding-bottom:28px">
      <button class="btn-lime" style="margin:0 auto" onclick="openBriefModal(lastFormData, lastAiData)">📋 View Full Brief Summary</button>
    </div>
  `;
}

// ─── RESET ───────────────────────────────────────────────
function resetTool() {
  closeModal();
  document.getElementById("form-screen").style.display = "block";
  document.getElementById("output-screen").style.display = "none";
  document.querySelectorAll(".chip").forEach((c) => (c.className = "chip"));
  document.querySelectorAll(".gs-input").forEach((i) => {
    i.value = "";
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
  lastFormData = null;
  lastAiData = null;
  goTo("R");
}

// ─── INIT ─────────────────────────────────────────────────
goTo("R");
