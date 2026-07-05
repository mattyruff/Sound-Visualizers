/* ═══════════════════════════════════════════════════════════
   RETROPARDY! — game engine
   Two rounds of 6×5 clues + a Final wager round.
   Questions come from window.RETRO_BANK (js/data/*.js).
   Question history persists in localStorage so replays draw
   fresh material until the pool runs dry.
   ═══════════════════════════════════════════════════════════ */
(function () {
"use strict";

/* ── category flavor ────────────────────────────────────── */
var CAT_META = {
  "Movies":         { title: "AT THE MOVIES",    sub: "Movies" },
  "Television":     { title: "TUBE TIME",        sub: "Television" },
  "Music":          { title: "MIXTAPE",          sub: "Music" },
  "Video Games":    { title: "HIGH SCORES",      sub: "Video Games" },
  "Sports":         { title: "SPORTS PAGE",      sub: "Sports" },
  "World Events":   { title: "HEADLINES",        sub: "World Events" },
  "Food & Drink":   { title: "DRIVE-THRU",       sub: "Food & Drink" },
  "Cars":           { title: "HORSEPOWER",       sub: "Cars" },
  "Tech & Toys":    { title: "GADGETS & GIZMOS", sub: "Tech & Toys" },
  "Fads & Fashion": { title: "TOTALLY RAD",      sub: "Fads & Fashion" }
};

var FUN_FACTS = [
  "In 1985 a top-loading NES cost $89.99 and came with R.O.B. the robot.",
  "Blockbuster opened its first store in Dallas in October 1985.",
  "The final brick of the Berlin Wall era fell just weeks after 'Girl You Know It's True' went platinum. Coincidence?",
  "A 1989 Game Boy ran about 30 hours on 4 AA batteries. Your phone wishes.",
  "MTV still played music videos for most of this game's era. Really.",
  "In 1995, a 28.8k modem was considered blazing fast.",
  "Crystal Pepsi lasted about a year. This game will last longer.",
  "The Macarena hit the US in 1995 — technically eligible, unfortunately.",
  "Thanks for playing. Be kind, rewind."
];

var ROUND_VALUES = { 1: [200, 400, 600, 800, 1000], 2: [400, 800, 1200, 1600, 2000] };
var TIMER_SECONDS = 20;
var SEEN_KEY = "retropardy_seen_v1";
var MUTE_KEY = "retropardy_mute_v1";

/* ── question bank ──────────────────────────────────────── */
var BANK = (window.RETRO_BANK || []).filter(function (q) {
  return q && q.q && q.c && q.c.length === 3 && q.a >= 0 && q.a <= 2 && CAT_META[q.cat];
});

function qid(q) { // stable id: djb2 hash of the question text
  var h = 5381, s = q.q;
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

var byCatDiff = {}; // cat -> diff -> [q]
BANK.forEach(function (q) {
  q.id = qid(q);
  (byCatDiff[q.cat] = byCatDiff[q.cat] || {})[q.d] = (byCatDiff[q.cat][q.d] || []).concat([q]);
});

var seen = loadSeen();
function loadSeen() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); }
  catch (e) { return new Set(); }
}
function saveSeen() {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen))); } catch (e) {}
}

/* ── audio: tiny synth, no assets ───────────────────────── */
var muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch (e) {}
var actx = null;
function ac() {
  if (!actx) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (AC) actx = new AC();
  }
  if (actx && actx.state === "suspended") actx.resume();
  return actx;
}
function tone(freq, t0, dur, type, gain) {
  var ctx = ac(); if (!ctx || muted) return;
  var o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || "square"; o.frequency.value = freq;
  var at = ctx.currentTime + (t0 || 0);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain || 0.08, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(at); o.stop(at + dur + 0.05);
}
var sfx = {
  pick:    function () { tone(660, 0, 0.09, "square", 0.05); },
  reveal:  function () { tone(392, 0, 0.1, "triangle", 0.06); tone(523, 0.07, 0.12, "triangle", 0.06); },
  correct: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.09, 0.16, "triangle", 0.09); }); },
  wrong:   function () { tone(196, 0, 0.28, "sawtooth", 0.07); tone(147, 0.22, 0.42, "sawtooth", 0.07); },
  dd:      function () { [330, 440, 554, 660, 880].forEach(function (f, i) { tone(f, i * 0.07, 0.14, "square", 0.07); }); },
  tick:    function () { tone(880, 0, 0.03, "square", 0.02); },
  fanfare: function () { [523, 523, 523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.12, 0.2, "triangle", 0.1); }); }
};

/* ── state ──────────────────────────────────────────────── */
var S = {
  nPlayers: 1,
  players: [],           // {name, score, wager, finalDone}
  control: 0,            // index of player in control
  round: 1,
  cells: [],             // 30 cell objects: {q, value, dd, used}
  cats: [],              // 6 cat keys for this round
  remaining: 0,
  gameUsed: new Set(),   // question ids used this game
  current: null,         // active cell
  timerId: null,
  finalQ: null,
  finalPhase: 0          // index of player wagering / answering
};

/* ── dom helpers ────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }
function show(id) { $(id).classList.remove("hidden"); }
function hide(id) { $(id).classList.add("hidden"); }
function money(n) { return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString(); }
function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

/* ── question picking ───────────────────────────────────── */
function pickQuestion(cat, d) {
  var pool = (byCatDiff[cat] && byCatDiff[cat][d]) || [];
  var fresh = pool.filter(function (q) { return !seen.has(q.id) && !S.gameUsed.has(q.id); });
  if (!fresh.length) fresh = pool.filter(function (q) { return !S.gameUsed.has(q.id); });
  if (!fresh.length) fresh = pool;
  if (!fresh.length) return null;
  var q = fresh[Math.floor(Math.random() * fresh.length)];
  S.gameUsed.add(q.id);
  return q;
}

function catsWithFreshCount() {
  return Object.keys(byCatDiff).map(function (cat) {
    var fresh = 0;
    for (var d = 1; d <= 5; d++) {
      ((byCatDiff[cat][d]) || []).forEach(function (q) { if (!seen.has(q.id)) fresh++; });
    }
    return { cat: cat, fresh: fresh };
  });
}

function pickCats(exclude) {
  // favor categories with the most unseen material; light shuffle for variety
  var all = catsWithFreshCount();
  var scored = all.filter(function (c) { return exclude.indexOf(c.cat) === -1; });
  shuffle(scored);
  scored.sort(function (a, b) { return b.fresh - a.fresh; });
  var top = scored.slice(0, 8);
  shuffle(top);
  var picked = top.slice(0, 6).map(function (c) { return c.cat; });
  if (picked.length < 6) { // not enough unused categories — repeat some from last round
    var fill = shuffle(all.filter(function (c) { return picked.indexOf(c.cat) === -1; }));
    while (picked.length < 6 && fill.length) picked.push(fill.shift().cat);
  }
  return picked;
}

/* ── board ──────────────────────────────────────────────── */
function buildRound(round) {
  S.round = round;
  S.cats = pickCats(round === 2 ? S.cats : []);
  S.cells = [];
  var values = ROUND_VALUES[round];
  S.cats.forEach(function (cat, ci) {
    values.forEach(function (v, ri) {
      S.cells.push({ cat: cat, q: pickQuestion(cat, ri + 1), value: v, dd: false, used: false, ci: ci, ri: ri });
    });
  });
  // daily doubles: 1 in round one, 2 in round two — never on the top row
  var eligible = S.cells.filter(function (c) { return c.ri > 0 && c.q; });
  shuffle(eligible).slice(0, round === 1 ? 1 : 2).forEach(function (c) { c.dd = true; });
  S.remaining = S.cells.filter(function (c) { return c.q; }).length;
  renderBoard();
  $("round-label").textContent = round === 1 ? "ROUND 1" : "DOUBLE ROUND";
  sfx.reveal();
}

function renderBoard() {
  var board = $("board");
  board.innerHTML = "";
  S.cats.forEach(function (cat) {
    var meta = CAT_META[cat];
    var el = document.createElement("div");
    el.className = "cat-cell";
    el.innerHTML = '<div class="cat-title">' + meta.title + '</div><div class="cat-sub">' + meta.sub + "</div>";
    board.appendChild(el);
  });
  for (var ri = 0; ri < 5; ri++) {
    for (var ci = 0; ci < 6; ci++) {
      (function (cell) {
        var b = document.createElement("button");
        b.className = "val-cell";
        if (!cell.q || cell.used) {
          b.classList.add("used");
          b.disabled = true;
          b.textContent = "$" + cell.value;
        } else {
          b.textContent = "$" + cell.value;
          b.addEventListener("click", function () { openClue(cell, b); });
        }
        board.appendChild(b);
      })(S.cells[ci * 5 + ri]);
    }
  }
  renderScores("scorebar");
}

function renderScores(elId) {
  var bar = $(elId);
  bar.innerHTML = "";
  S.players.forEach(function (p, i) {
    var d = document.createElement("div");
    d.className = "podium-card" + (i === S.control && S.nPlayers > 1 ? " active" : "");
    d.innerHTML = '<div class="podium-name">' + p.name + '</div>' +
                  '<div class="podium-score' + (p.score < 0 ? " neg" : "") + '">' + money(p.score) + "</div>";
    bar.appendChild(d);
  });
}

/* ── clue flow ──────────────────────────────────────────── */
function openClue(cell, btn) {
  sfx.pick();
  S.current = cell;
  cell.used = true;
  btn.classList.add("used");
  btn.disabled = true;
  seen.add(cell.q.id); saveSeen();

  var value = cell.dd ? cell.value * 2 : cell.value;
  $("clue-cat").textContent = CAT_META[cell.cat].title;
  $("clue-value").textContent = money(value);
  $("clue-player").textContent = S.nPlayers > 1 ? S.players[S.control].name + " HAS THE BOARD" : "";
  $("clue-q").textContent = cell.q.q;
  hide("verdict");
  $("timer").style.visibility = "visible";

  if (cell.dd) { show("dd-flash"); sfx.dd(); } else { hide("dd-flash"); }

  renderAnswers(cell.q, value, function (okay, pickedIdx, timedOut) {
    resolveClue(cell, value, okay, timedOut);
  });
  show("clue");
  startTimer(function () { finishAnswer(null, true); });
}

var finishAnswer = function () {}; // rebound per clue

function renderAnswers(q, value, done) {
  var wrap = $("clue-answers");
  wrap.innerHTML = "";
  var order = shuffle([0, 1, 2]);
  var buttons = [];
  var settled = false;

  finishAnswer = function (pickedIdx, timedOut) {
    if (settled) return;
    settled = true;
    stopTimer();
    var okay = pickedIdx !== null && order[pickedIdx] === q.a;
    buttons.forEach(function (b, i) {
      b.disabled = true;
      if (order[i] === q.a) b.classList.add("reveal-good");
      else if (i === pickedIdx) b.classList.add("reveal-bad");
      else b.classList.add("dim");
    });
    done(okay, pickedIdx, !!timedOut);
  };

  order.forEach(function (srcIdx, i) {
    var b = document.createElement("button");
    b.className = "ans-btn";
    b.innerHTML = '<span class="ans-key">' + (i + 1) + "</span><span>" + escapeHtml(q.c[srcIdx]) + "</span>";
    b.addEventListener("click", function () { finishAnswer(i, false); });
    wrap.appendChild(b);
    buttons.push(b);
  });
}

function resolveClue(cell, value, okay, timedOut) {
  var p = S.players[S.control];
  var vt = $("verdict-text");
  if (okay) {
    p.score += value;
    vt.textContent = pick(["RIGHT ON!", "TUBULAR!", "MOST EXCELLENT!", "BODACIOUS!", "NO DOUBT!"]) + "  +" + money(value).slice(1);
    vt.className = "good";
    sfx.correct();
  } else if (timedOut) {
    vt.textContent = "TIME'S UP!";
    vt.className = "bad";
    sfx.wrong();
    if (S.nPlayers > 1) S.control = (S.control + 1) % S.nPlayers;
  } else {
    p.score -= value;
    vt.textContent = pick(["BOGUS!", "NOT EVEN!", "AS IF!", "GNARLY MISS!"]) + "  -" + money(value).slice(1);
    vt.className = "bad";
    sfx.wrong();
    if (S.nPlayers > 1) S.control = (S.control + 1) % S.nPlayers;
  }
  $("timer").style.visibility = "hidden";
  show("verdict");
  revealContinue();
}

function revealContinue() {
  var b = $("continue-btn");
  function bring() { b.scrollIntoView({ block: "nearest" }); }
  requestAnimationFrame(function () {
    b.focus({ preventScroll: true });
    bring();
    setTimeout(bring, 300); // again once any pending layout/animation settles
  });
}

function closeClue() {
  hide("clue");
  S.remaining--;
  renderBoard();
  if (S.remaining <= 0) {
    if (S.round === 1) buildRound(2);
    else startFinal();
  }
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ── timer ──────────────────────────────────────────────── */
function startTimer(onExpire) {
  stopTimer();
  var fill = $("timer-fill");
  var start = Date.now(), total = TIMER_SECONDS * 1000, lastTick = 0;
  fill.style.width = "100%";
  S.timerId = setInterval(function () {
    var left = total - (Date.now() - start);
    if (left <= 0) { stopTimer(); fill.style.width = "0%"; onExpire(); return; }
    fill.style.width = (left / total * 100) + "%";
    if (left < 5200) { // audible countdown in the last five seconds
      var sec = Math.ceil(left / 1000);
      if (sec !== lastTick) { lastTick = sec; sfx.tick(); }
    }
  }, 80);
}
function stopTimer() { if (S.timerId) { clearInterval(S.timerId); S.timerId = null; } }

/* ── final round ────────────────────────────────────────── */
function startFinal() {
  // hardest unseen question from the category with the most fresh material
  var cats = shuffle(Object.keys(byCatDiff));
  S.finalQ = null;
  for (var i = 0; i < cats.length && !S.finalQ; i++) S.finalQ = pickQuestion(cats[i], 5);
  if (!S.finalQ) { endGame(); return; }
  seen.add(S.finalQ.id); saveSeen();
  S.finalPhase = 0;
  S.players.forEach(function (p) { p.wager = 0; p.finalDone = false; });
  askWager();
}

function askWager() {
  var p = S.players[S.finalPhase];
  var max = Math.max(p.score, 1000);
  $("wager-cat").textContent = "CATEGORY: " + CAT_META[S.finalQ.cat].title;
  $("wager-player").textContent = p.name + " — SET YOUR WAGER";
  var slider = $("wager-slider");
  slider.max = max;
  slider.step = 100;
  slider.value = Math.min(Math.max(Math.round(max / 2 / 100) * 100, 0), max);
  $("wager-amt").textContent = money(+slider.value);
  hide("game"); show("wager");
}

function lockWager() {
  S.players[S.finalPhase].wager = +$("wager-slider").value;
  sfx.pick();
  S.finalPhase++;
  if (S.finalPhase < S.nPlayers) { askWager(); return; }
  hide("wager");
  S.finalPhase = 0;
  askFinalAnswer();
}

function askFinalAnswer() {
  var p = S.players[S.finalPhase];
  $("clue-cat").textContent = "FINAL: " + CAT_META[S.finalQ.cat].title;
  $("clue-value").textContent = "WAGER " + money(p.wager);
  $("clue-player").textContent = S.nPlayers > 1 ? p.name + " ANSWERS" : "";
  $("clue-q").textContent = S.finalQ.q;
  hide("dd-flash"); hide("verdict");
  $("timer").style.visibility = "visible";

  renderAnswers(S.finalQ, p.wager, function (okay) {
    p.score += okay ? p.wager : -p.wager;
    var vt = $("verdict-text");
    vt.textContent = okay ? "CORRECT!  +" + money(p.wager).slice(1) : "WRONG!  -" + money(p.wager).slice(1);
    vt.className = okay ? "good" : "bad";
    if (okay) sfx.correct(); else sfx.wrong();
    $("timer").style.visibility = "hidden";
    show("verdict");
    revealContinue();
  });
  show("clue");
  startTimer(function () { finishAnswer(null, true); });
}

function continueFromVerdict() {
  if (S.finalQ) {
    hide("clue");
    S.finalPhase++;
    if (S.finalPhase < S.nPlayers) askFinalAnswer();
    else endGame();
  } else {
    closeClue();
  }
}

function endGame() {
  hide("clue"); hide("game"); hide("wager");
  var podium = $("podium");
  podium.innerHTML = "";
  var best = Math.max.apply(null, S.players.map(function (p) { return p.score; }));
  S.players.forEach(function (p) {
    var d = document.createElement("div");
    d.className = "podium-card" + (p.score === best ? " winner" : "");
    d.innerHTML = '<div class="podium-name">' + p.name + '</div>' +
                  '<div class="podium-score' + (p.score < 0 ? " neg" : "") + '">' + money(p.score) + "</div>";
    podium.appendChild(d);
  });
  $("fun-fact").textContent = pick(FUN_FACTS);
  show("results");
  sfx.fanfare();
}

/* ── game setup ─────────────────────────────────────────── */
function newGame() {
  var names = ["PLAYER ONE", "PLAYER TWO", "PLAYER THREE"];
  S.players = [];
  for (var i = 0; i < S.nPlayers; i++) S.players.push({ name: names[i], score: 0, wager: 0 });
  S.control = 0;
  S.gameUsed = new Set();
  S.finalQ = null;
  hide("splash"); hide("results"); show("game");
  buildRound(1);
}

/* ── wiring ─────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  var unseenCount = BANK.filter(function (q) { return !seen.has(q.id); }).length;
  $("bank-count").textContent = BANK.length.toLocaleString() + " questions loaded · " + unseenCount.toLocaleString() + " you haven't seen";

  Array.prototype.forEach.call(document.querySelectorAll(".pick-btn"), function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".pick-btn").forEach(function (x) { x.classList.remove("selected"); });
      b.classList.add("selected");
      S.nPlayers = +b.dataset.n;
      sfx.pick();
    });
  });

  $("start-btn").addEventListener("click", function () { ac(); sfx.reveal(); newGame(); });
  $("again-btn").addEventListener("click", function () { newGame(); });
  $("continue-btn").addEventListener("click", continueFromVerdict);
  $("wager-btn").addEventListener("click", lockWager);
  $("wager-slider").addEventListener("input", function () { $("wager-amt").textContent = money(+this.value); });

  $("reset-seen").addEventListener("click", function () {
    seen = new Set(); saveSeen();
    $("bank-count").textContent = BANK.length.toLocaleString() + " questions loaded · all fresh again";
  });

  var muteBtn = $("mute-btn");
  function paintMute() { muteBtn.textContent = muted ? "🔇" : "🔊"; }
  paintMute();
  muteBtn.addEventListener("click", function () {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch (e) {}
    paintMute();
  });

  // keys 1/2/3 answer, Enter continues
  document.addEventListener("keydown", function (e) {
    if (!$("clue").classList.contains("hidden")) {
      if (e.key >= "1" && e.key <= "3" && $("verdict").classList.contains("hidden")) {
        finishAnswer(+e.key - 1, false);
      } else if (e.key === "Enter" && !$("verdict").classList.contains("hidden")) {
        continueFromVerdict();
      }
    }
  });
});

})();
