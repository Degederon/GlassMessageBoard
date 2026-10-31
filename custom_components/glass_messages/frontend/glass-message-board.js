/*
 * Glass Message Board card for Home Assistant
 * A frosted-glass household message board: notes, handwriting, dictation,
 * reactions, pinning/expiry and an ambient wall-tablet mode.
 * No build step, no dependencies. Served automatically by the glass_messages integration.
 */
(() => {
  const VERSION = "1.1.0";
  const TAG = "glass-message-board";
  if (customElements.get(TAG)) return;

  const TINTS = {
    clear: "255,255,255",
    rose: "255,128,170",
    amber: "255,196,92",
    mint: "96,232,176",
    sky: "110,182,255",
    violet: "176,138,255",
  };
  const REACTIONS = ["❤️", "😂", "👍", "🎉", "😮", "🙏"];
  const INSERT_EMOJI = ["😀", "😘", "❤️", "🎉", "🍕", "🛒", "🐶", "☕", "🌙", "⭐", "🔑", "🧺"];
  const INK = ["#ffffff", "#ffe066", "#ff8fab", "#7ee8fa", "#b4f8c8", "#ffb26b"];
  const WIDTHS = [0.006, 0.012, 0.022];
  const EXPIRY = [
    { k: "1h", label: "1 hour" },
    { k: "tonight", label: "Tonight" },
    { k: "1d", label: "1 day" },
    { k: "1w", label: "1 week" },
    { k: "never", label: "Keep" },
  ];
  const AVATAR_HUES = [200, 280, 330, 20, 150, 50, 240, 100];
  const MEMBER_EMOJI = ["🙂", "😎", "🥰", "🤓", "🦊", "🐱", "🐶", "🐼", "🦄", "🐸", "🌻", "🌙", "⭐", "🚀", "🎸", "⚽", "🍩", "👵", "👴", "👶"];
  const HUES = [210, 260, 300, 340, 15, 40, 140, 175];
  const LAST_SENDER_KEY = "glass-message-board:last-sender";
  const storage = {
    get(k) {
      try {
        return window.localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set(k, v) {
      try {
        window.localStorage.setItem(k, v);
      } catch (e) {
        /* storage unavailable */
      }
    },
  };

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const initials = (name) =>
    String(name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?";

  const ICON = {
    pin: '<svg viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2z"/></svg>',
    undo: '<svg viewBox="0 0 24 24"><path d="M12.5 8c-2.6 0-5 1-6.9 2.6L2 7v9h9l-3.6-3.6A8 8 0 0 1 20.1 16l2.4-.8A10.5 10.5 0 0 0 12.5 8z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
    reply: '<svg viewBox="0 0 24 24"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
    people: '<svg viewBox="0 0 24 24"><path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1a4.2 4.2 0 0 1 2 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M3 17.3V21h3.8l11-11.1-3.7-3.7zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7z"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><path d="M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6z"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>',
  };

  const STYLE = `
  :host { display:block; --gm-radius: 26px; --gm-text: #f4f7ff; --gm-dim: rgba(244,247,255,.66);
    font-family: var(--paper-font-body1_-_font-family, "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif); }
  * { box-sizing:border-box; }
  button { font:inherit; color:inherit; cursor:pointer; border:0; background:none; -webkit-tap-highlight-color:transparent; }
  svg { width:1em; height:1em; fill:currentColor; flex:none; }
  .root { position:relative; overflow:hidden; border-radius: var(--ha-card-border-radius, 18px);
    color: var(--gm-text); background:#070b1c; min-height: var(--gm-height); height: var(--gm-height); isolation:isolate; }

  /* aurora */
  .aurora { position:absolute; inset:-20%; z-index:-1; filter: blur(70px) saturate(140%); }
  .aurora i { position:absolute; border-radius:50%; opacity:.75; mix-blend-mode:screen; animation: drift 28s ease-in-out infinite alternate; }
  .aurora .b1 { width:60%; height:60%; left:5%; top:5%; background: radial-gradient(circle, #5b6cff 0%, transparent 65%); }
  .aurora .b2 { width:55%; height:65%; right:0; top:20%; background: radial-gradient(circle, #ff5fa2 0%, transparent 65%); animation-duration: 34s; animation-delay:-8s; }
  .aurora .b3 { width:70%; height:55%; left:20%; bottom:-5%; background: radial-gradient(circle, #22d3c5 0%, transparent 65%); animation-duration: 40s; animation-delay:-16s; }
  .bgimg { position:absolute; inset:0; z-index:-1; background-size:cover; background-position:center; opacity:.85; }
  .grain { position:absolute; inset:0; z-index:-1; opacity:.06; pointer-events:none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
  @keyframes drift { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(8%, -6%) scale(1.12); } 100% { transform: translate(-6%, 7%) scale(.95); } }

  /* glass */
  .glass { position:relative; border-radius: var(--gm-radius);
    background: linear-gradient(140deg, rgba(var(--tint, 255,255,255), .20), rgba(var(--tint,255,255,255), .06) 60%, rgba(var(--tint,255,255,255), .10));
    -webkit-backdrop-filter: blur(24px) saturate(170%); backdrop-filter: blur(24px) saturate(170%);
    border: 1px solid rgba(255,255,255,.22);
    box-shadow: 0 18px 50px -18px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.38), inset 0 -1px 0 rgba(255,255,255,.06); }
  .glass::before { content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
    background: linear-gradient(115deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,0) 32%); mix-blend-mode: overlay; }

  .ui { position:absolute; inset:0; display:flex; flex-direction:column; padding: clamp(14px, 2.2vw, 28px); gap: clamp(14px, 2vw, 22px);
    transition: opacity .8s ease, filter .8s ease, transform .8s ease; }
  .ambient-on .ui { opacity:0; filter: blur(12px); transform: scale(.98); pointer-events:none; }

  header { display:flex; align-items:center; gap:18px; padding: 14px 18px 14px 24px; flex-wrap:wrap; }
  .clock { display:flex; flex-direction:column; line-height:1; min-width: 7ch; }
  .time { font-size: clamp(30px, 4.2vw, 50px); font-weight:250; letter-spacing:-.02em; font-variant-numeric: tabular-nums; }
  .date { font-size: 13px; color: var(--gm-dim); margin-top:6px; letter-spacing:.04em; text-transform: uppercase; }
  .title { font-size: 15px; color: var(--gm-dim); font-weight:500; padding-left:18px; border-left: 1px solid rgba(255,255,255,.18); align-self:stretch; display:flex; align-items:center; }
  .filters { display:flex; gap:8px; flex:1; justify-content:flex-end; flex-wrap:wrap; align-items:center; }
  .chip { display:inline-flex; align-items:center; gap:8px; padding: 7px 14px 7px 8px; border-radius: 999px; font-size: 14px; min-height:40px;
    background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); transition: background .2s, border-color .2s, transform .15s; }
  .chip.text { padding: 7px 16px; }
  .chip:active { transform: scale(.96); }
  .chip.on { background: rgba(255,255,255,.26); border-color: rgba(255,255,255,.55); box-shadow: inset 0 1px 0 rgba(255,255,255,.4); }
  .chip .n { font-size: 11px; background: rgba(255,255,255,.22); border-radius: 999px; padding: 1px 7px; }
  .new { display:inline-flex; align-items:center; gap:8px; padding: 12px 22px; border-radius:999px; font-weight:600; font-size:15px;
    background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(225,232,255,.85)); color:#121735; box-shadow: 0 10px 30px -8px rgba(120,140,255,.7); }
  .new svg { font-size:20px; }

  .avatar { width:32px; height:32px; border-radius:50%; flex:none; display:grid; place-items:center; font-size:13px; font-weight:600; overflow:hidden;
    background: linear-gradient(135deg, hsl(var(--h) 80% 65%), hsl(calc(var(--h) + 40) 80% 50%)); color:#fff; border: 1.5px solid rgba(255,255,255,.55); }
  .avatar img { width:100%; height:100%; object-fit:cover; }
  .avatar.lg { width:44px; height:44px; font-size:16px; }
  .avatar.home { --h: 210; }

  main { flex:1; overflow-y:auto; overflow-x:hidden; margin: 0 -8px; padding: 8px 8px 40px; scrollbar-width: none;
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 40px), transparent); mask-image: linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 40px), transparent); }
  main::-webkit-scrollbar { display:none; }
  .board { columns: var(--gm-col, 300px); column-gap: 20px; }
  .note { break-inside: avoid; margin: 0 0 20px; padding: 18px 20px 16px; display:block; width:100%; text-align:left; cursor:pointer;
    animation: rise .6s cubic-bezier(.2,.8,.2,1) both; transition: transform .25s ease, box-shadow .25s ease; }
  .note:hover { transform: translateY(-3px); }
  .note.pinned { border-color: rgba(255,255,255,.45); }
  .note.forme { box-shadow: 0 0 0 1.5px rgba(var(--tint), .7), 0 0 40px -6px rgba(var(--tint), .75), 0 18px 50px -18px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.38); }
  @keyframes rise { from { opacity:0; transform: translateY(18px) scale(.97); } to { opacity:1; transform:none; } }
  .meta { display:flex; align-items:center; gap:10px; font-size:13px; }
  .who { flex:1; min-width:0; color: var(--gm-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .who b { color: var(--gm-text); font-weight:600; }
  .when { color: var(--gm-dim); font-size:12px; white-space:nowrap; }
  .pin { font-size:16px; color: rgba(255,255,255,.9); transform: rotate(30deg); }
  .badge { font-size:11px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; padding:3px 9px; border-radius:999px; background: rgba(var(--tint),.35); }
  .text { margin: 14px 2px 4px; white-space: pre-wrap; word-break: break-word; line-height:1.38; font-size: 17px; }
  .text.lg { font-size: 22px; line-height:1.3; }
  .text.xl { font-size: clamp(26px, 2.6vw, 34px); line-height:1.15; font-weight:500; letter-spacing:-.01em; }
  .drawing { display:block; width:100%; height:auto; margin-top:12px; filter: drop-shadow(0 2px 6px rgba(0,0,0,.25)); }
  .drawing path { fill:none; stroke-linecap:round; stroke-linejoin:round; }
  footer { display:flex; align-items:center; gap:6px; margin-top:12px; flex-wrap:wrap; min-height: 6px; }
  .rx { display:inline-flex; align-items:center; gap:4px; padding: 3px 9px; border-radius:999px; background: rgba(255,255,255,.12); font-size:14px; }
  .rx.mine { background: rgba(255,255,255,.3); }
  .rx small { font-size:11px; color: var(--gm-dim); }
  .life { margin-left:auto; font-size:12px; color: var(--gm-dim); display:inline-flex; gap:6px; align-items:center; }

  .empty, .problem { max-width: 520px; margin: 8vh auto 0; padding: 36px; text-align:center; }
  .empty h2, .problem h2 { margin: 0 0 8px; font-weight:500; font-size: 24px; }
  .empty p, .problem p { margin:0; color: var(--gm-dim); line-height:1.5; }
  .empty .big { font-size: 46px; margin-bottom: 10px; }

  /* overlays */
  .scrim { position:absolute; inset:0; z-index:5; display:grid; place-items:center; padding: 16px; background: rgba(5,8,24,.35);
    -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); animation: fade .25s ease both; }
  .scrim[hidden] { display:none; }
  @keyframes fade { from { opacity:0; } }
  .sheet { width: min(760px, 100%); max-height: 100%; overflow:auto; padding: 22px 26px 24px; animation: pop .35s cubic-bezier(.2,.9,.25,1.1) both; scrollbar-width:none; }
  @keyframes pop { from { opacity:0; transform: translateY(24px) scale(.97); } }
  .sheet-head { display:flex; align-items:center; justify-content:space-between; margin-bottom: 14px; }
  .sheet-head h2 { margin:0; font-weight:500; font-size: 24px; }
  .icon-btn { width:44px; height:44px; border-radius:50%; display:grid; place-items:center; font-size:22px; background: rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.16); }
  .icon-btn.on { background: #ff4f7b; border-color: transparent; animation: pulse 1.4s ease infinite; }
  @keyframes pulse { 50% { box-shadow: 0 0 0 10px rgba(255,79,123,0); } 0% { box-shadow: 0 0 0 0 rgba(255,79,123,.6); } }
  .row { display:flex; align-items:center; gap:12px; margin: 12px 0; flex-wrap:wrap; }
  .row > label { width: 54px; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color: var(--gm-dim); }
  .row .chips { display:flex; gap:8px; flex-wrap:wrap; flex:1; }
  .tabs { display:inline-flex; padding:4px; border-radius:999px; background: rgba(0,0,0,.2); margin: 8px 0 12px; }
  .tabs button { padding: 9px 20px; border-radius:999px; font-size:14px; color: var(--gm-dim); }
  .tabs button.on { background: rgba(255,255,255,.22); color: var(--gm-text); }
  textarea { width:100%; min-height: 120px; resize:vertical; border-radius: 20px; padding: 16px 18px; font: inherit; font-size: 20px; line-height:1.4;
    color: var(--gm-text); background: rgba(0,0,0,.18); border: 1px solid rgba(255,255,255,.16); outline:none; }
  textarea:focus { border-color: rgba(255,255,255,.45); }
  textarea::placeholder { color: rgba(255,255,255,.4); }
  .tools { display:flex; align-items:center; gap:8px; margin-top:10px; flex-wrap:wrap; }
  .emoji { font-size: 22px; width:40px; height:40px; border-radius:12px; display:grid; place-items:center; }
  .emoji:hover, .emoji:active { background: rgba(255,255,255,.14); }
  .count { margin-left:auto; font-size:12px; color: var(--gm-dim); }
  .pad { position:relative; border-radius: 20px; overflow:hidden; background: rgba(0,0,0,.22); border: 1px solid rgba(255,255,255,.16); aspect-ratio: 16/9; touch-action:none; }
  .pad canvas { position:absolute; inset:0; width:100%; height:100%; cursor: crosshair; }
  .pad .hint { position:absolute; inset:0; display:grid; place-items:center; color: rgba(255,255,255,.35); pointer-events:none; font-size:18px; }
  .swatch { width:32px; height:32px; border-radius:50%; border: 2px solid rgba(255,255,255,.3); }
  .swatch.on { border-color:#fff; box-shadow: 0 0 0 3px rgba(255,255,255,.25); }
  .width { width:40px; height:40px; border-radius:12px; display:grid; place-items:center; }
  .width i { display:block; border-radius:50%; background:#fff; }
  .width.on { background: rgba(255,255,255,.2); }
  .tint-dot { width:34px; height:34px; border-radius:50%; border:2px solid rgba(255,255,255,.3);
    background: linear-gradient(135deg, rgba(var(--tint),.9), rgba(var(--tint),.35)); }
  .tint-dot.on { border-color:#fff; box-shadow: 0 0 0 3px rgba(255,255,255,.25); }
  .sheet-foot { display:flex; align-items:center; gap:12px; margin-top: 18px; }
  .compose-scrim .sheet-foot { position: sticky; bottom: -24px; margin: 12px -26px -24px; padding: 14px 26px 20px;
    background: linear-gradient(to top, rgba(14,18,44,.92) 55%, rgba(14,18,44,0)); border-radius: 0 0 var(--gm-radius) var(--gm-radius); }
  .err { color: #ffb3c4; font-size:14px; flex:1; }
  .primary { display:inline-flex; align-items:center; gap:10px; padding: 14px 28px; border-radius:999px; font-weight:600; font-size:16px;
    background: linear-gradient(135deg, #fff, #dfe5ff); color:#121735; box-shadow: 0 10px 30px -8px rgba(120,140,255,.8); }
  .primary[disabled] { opacity:.45; box-shadow:none; }

  .detail { width: min(640px, 100%); padding: 26px 28px; animation: pop .35s cubic-bezier(.2,.9,.25,1.1) both; max-height:100%; overflow:auto; }
  .detail .text { font-size: 26px; }
  .detail .text.xl { font-size: 40px; }
  .reactbar { display:flex; gap:6px; margin-top:18px; padding: 6px; border-radius: 999px; background: rgba(0,0,0,.18); width:max-content; max-width:100%; flex-wrap:wrap; }
  .reactbar button { font-size: 26px; width:50px; height:50px; border-radius:50%; transition: transform .15s; }
  .reactbar button:active { transform: scale(1.35); }
  .reactbar button.mine { background: rgba(255,255,255,.22); }
  .actions { display:flex; gap:10px; margin-top: 18px; flex-wrap:wrap; }
  .actions button { display:inline-flex; align-items:center; gap:8px; padding: 11px 18px; border-radius:999px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); font-size:15px; }
  .actions button.danger { color:#ffc2d1; }
  .actions svg { font-size:18px; }

  /* ambient */
  .ambient { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 6vh 6vw; text-align:center;
    opacity:0; pointer-events:none; transition: opacity 1.2s ease; }
  .ambient-on .ambient { opacity:1; pointer-events:auto; cursor:pointer; }
  .a-time { font-size: clamp(80px, 15vw, 190px); font-weight: 200; letter-spacing:-.04em; line-height:.9; font-variant-numeric: tabular-nums; text-shadow: 0 10px 60px rgba(0,0,0,.25); }
  .a-date { font-size: clamp(16px, 2vw, 24px); color: var(--gm-dim); margin-top: 10px; letter-spacing:.08em; text-transform: uppercase; }
  .a-spot { margin-top: 6vh; width: min(680px, 90%); padding: 24px 30px; text-align:left; transition: opacity .8s ease, transform .8s ease; }
  .a-spot.out { opacity:0; transform: translateY(12px); }
  .a-spot .text { font-size: clamp(22px, 2.6vw, 32px); }
  .a-hint { position:absolute; bottom: 24px; font-size:13px; color: rgba(255,255,255,.4); letter-spacing:.1em; text-transform: uppercase; }

  .ghost-btn { display:inline-flex; align-items:center; gap:8px; padding: 12px 18px; border-radius:999px; font-size:15px; font-weight:500;
    background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); }
  .ghost-btn svg { font-size:20px; }
  .empty .cta { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top: 20px; }

  /* steps + tiles */
  .step { margin: 18px 0 6px; }
  .step-h { display:flex; align-items:center; gap:10px; margin: 0 0 10px; font-size: 15px; font-weight:600; }
  .step-h i { font-style:normal; width:26px; height:26px; border-radius:50%; display:grid; place-items:center; font-size:13px;
    background: rgba(255,255,255,.9); color:#121735; }
  .step-h small { font-weight:400; color: var(--gm-dim); font-size: 13px; }
  .tiles { display:grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap:10px; }
  .tile { display:flex; flex-direction:column; align-items:center; gap:8px; padding: 12px 6px 10px; border-radius: 20px; min-width:0;
    background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); font-size:14px; transition: background .2s, border-color .2s, transform .15s; }
  .tile span:last-child { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .tile:active { transform: scale(.96); }
  .tile.on { background: rgba(255,255,255,.26); border-color: rgba(255,255,255,.65); box-shadow: inset 0 1px 0 rgba(255,255,255,.4); }
  .tile .avatar { width:54px; height:54px; font-size: 26px; }
  .tile.add { color: var(--gm-dim); }
  .tile.add .ring { width:54px; height:54px; border-radius:50%; display:grid; place-items:center; font-size:24px; border: 1.5px dashed rgba(255,255,255,.5); }
  .everyone-av { width:54px; height:54px; border-radius:50%; display:grid; place-items:center; font-size:26px;
    background: linear-gradient(135deg, rgba(255,255,255,.35), rgba(255,255,255,.1)); border: 1.5px solid rgba(255,255,255,.55); }
  .quick-add { grid-column: 1 / -1; display:flex; gap:8px; align-items:center; padding: 8px; border-radius: 20px; background: rgba(0,0,0,.2); border:1px solid rgba(255,255,255,.2); }
  .field { flex:1; min-width:0; height: 52px; border-radius: 16px; padding: 0 16px; font: inherit; font-size: 18px; color: var(--gm-text);
    background: rgba(0,0,0,.2); border: 1px solid rgba(255,255,255,.18); outline:none; }
  .field:focus { border-color: rgba(255,255,255,.55); }
  .field::placeholder { color: rgba(255,255,255,.4); }
  select.field { appearance:none; -webkit-appearance:none; font-size:16px; cursor:pointer;
    background-image: linear-gradient(45deg, transparent 50%, rgba(255,255,255,.7) 50%), linear-gradient(135deg, rgba(255,255,255,.7) 50%, transparent 50%);
    background-position: calc(100% - 22px) 23px, calc(100% - 16px) 23px; background-size: 6px 6px; background-repeat:no-repeat; padding-right: 40px; }
  select.field option { color:#121735; }
  .small-btn { padding: 0 18px; height: 44px; border-radius: 999px; font-weight:600; background:#fff; color:#121735; }
  .more { display:inline-flex; align-items:center; gap:6px; margin-top: 16px; font-size:14px; color: var(--gm-dim); padding: 6px 0; }
  .more svg { transition: transform .2s; font-size:18px; }
  .more.open svg { transform: rotate(90deg); }

  /* people panel */
  .lead { margin: -4px 0 16px; color: var(--gm-dim); line-height:1.5; }
  .card-inset { padding: 18px; border-radius: 22px; background: rgba(0,0,0,.18); border: 1px solid rgba(255,255,255,.12); }
  .card-inset h3, .people-sec h3 { margin: 0 0 12px; font-size: 13px; letter-spacing:.08em; text-transform:uppercase; color: var(--gm-dim); font-weight:600; }
  .pform-top { display:flex; gap:14px; align-items:center; }
  .avatar.xl { width:64px; height:64px; font-size:32px; }
  .label { margin: 16px 0 8px; font-size:13px; color: var(--gm-dim); }
  .label .opt { opacity:.7; font-style: italic; }
  .emoji-grid { display:flex; flex-wrap:wrap; gap:4px; }
  .emoji.on { background: rgba(255,255,255,.26); box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.7); }
  .hues { display:flex; gap:10px; flex-wrap:wrap; }
  .hue { width:36px; height:36px; border-radius:50%; border:2px solid rgba(255,255,255,.3);
    background: linear-gradient(135deg, hsl(var(--h) 80% 65%), hsl(calc(var(--h) + 40) 80% 50%)); }
  .hue.on { border-color:#fff; box-shadow: 0 0 0 3px rgba(255,255,255,.25); }
  .pform-foot { display:flex; align-items:center; gap:10px; margin-top: 18px; flex-wrap:wrap; }
  .people-sec { margin-top: 22px; }
  .person-row { display:flex; align-items:center; gap:12px; padding: 10px 6px; border-top: 1px solid rgba(255,255,255,.1); }
  .person-row .pinfo { flex:1; min-width:0; }
  .person-row b { display:block; font-weight:500; font-size:16px; }
  .person-row small { color: var(--gm-dim); font-size: 13px; }
  .person-row .ghost-btn { padding: 8px 14px; font-size:14px; }
  .person-row .ghost-btn.danger, .ghost-btn.danger { color:#ffc2d1; }
  .muted { color: var(--gm-dim); margin: 4px 0 0; }
  .switch { position:relative; width:52px; height:30px; border-radius:999px; background: rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.25); flex:none; }
  .switch::after { content:""; position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:#fff; transition: transform .2s; }
  .switch.on { background: #6e7cff; }
  .switch.on::after { transform: translateX(22px); }
  .sec-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .sec-head h3 { margin:0; }

  @media (max-width: 600px) { .title { display:none; } header { padding: 12px 14px; } .row > label { width:100%; } .new span, .people-btn span { display:none; }
    .sheet { padding: 18px 18px 20px; } .compose-scrim .sheet-foot { margin: 12px -18px -20px; padding: 12px 18px 16px; bottom: -20px; }
    .avatar.xl { width:48px; height:48px; font-size:24px; } .pform-top { gap:10px; } .card-inset { padding: 14px; } }
  @media (prefers-reduced-motion: reduce) { .aurora i, .note, .sheet, .detail { animation: none !important; } }
  `;

  class GlassMessageBoard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._messages = new Map();
      this._serverConfig = {};
      this._filter = "all";
      this._built = false;
      this._ambient = false;
      this._spotIndex = 0;
      this._compose = null;
      this._members = [];
      this._settings = { include_ha_people: true };
      this._peopleUi = null;
    }

    static getStubConfig() {
      return { title: "Family notes" };
    }

    static getConfigForm() {
      return {
        schema: [
          { name: "title", selector: { text: {} } },
          { name: "height", selector: { text: {} } },
          { name: "ambient_after", selector: { number: { min: 0, max: 900, step: 5, unit_of_measurement: "s", mode: "box" } } },
          { name: "column_width", selector: { number: { min: 200, max: 600, step: 10, unit_of_measurement: "px", mode: "box" } } },
          { name: "background_image", selector: { text: {} } },
          { name: "show_clock", selector: { boolean: {} } },
        ],
        computeLabel: (s) =>
          ({
            title: "Title",
            height: "Height (CSS, e.g. 100vh or 720px)",
            ambient_after: "Ambient mode after (0 = off)",
            column_width: "Note width",
            background_image: "Background image URL (optional)",
            show_clock: "Show clock",
          })[s.name],
      };
    }

    setConfig(config) {
      this._config = {
        title: "Messages",
        height: "calc(100vh - var(--header-height, 56px) - 16px)",
        ambient_after: 90,
        column_width: 300,
        show_clock: true,
        background_image: "",
        ...config,
      };
      if (this._built) this._applyConfig();
    }

    set hass(hass) {
      const first = !this._hass;
      this._hass = hass;
      if (!this._built) this._build();
      const sig = this._people()
        .map((p) => p.id + p.name + p.pic)
        .join("|");
      if (sig !== this._peopleSig) {
        this._peopleSig = sig;
        this._renderFilters();
        this._renderBoard();
      }
      if (first && this.isConnected) this._subscribe();
    }

    connectedCallback() {
      if (this._hass && !this._unsub) this._subscribe();
      this._tick();
      this._clockTimer = setInterval(() => this._tick(), 15000);
      this._relTimer = setInterval(() => this._renderBoard(), 60000);
      this._resetIdle();
    }

    disconnectedCallback() {
      clearInterval(this._clockTimer);
      clearInterval(this._relTimer);
      clearInterval(this._spotTimer);
      clearTimeout(this._idleTimer);
      if (this._unsub) {
        Promise.resolve(this._unsub).then((u) => typeof u === "function" && u()).catch(() => {});
        this._unsub = null;
      }
      this._stopMic();
    }

    getCardSize() {
      return 12;
    }

    getGridOptions() {
      return { columns: "full", rows: 10, min_rows: 6 };
    }

    // ---------------------------------------------------------------- data
    async _subscribe() {
      if (this._unsub || this._subscribing || !this._hass) return;
      this._subscribing = true;
      try {
        this._unsub = await this._hass.connection.subscribeMessage((ev) => this._onEvent(ev), {
          type: "glass_messages/subscribe",
        });
        this._problem = null;
      } catch (err) {
        this._problem = err && (err.code === "unknown_command" || err.code === "not_loaded") ? "setup" : (err && err.message) || String(err);
        this._renderBoard();
      }
      this._subscribing = false;
    }

    _onEvent(ev) {
      if (ev.action === "snapshot") {
        this._messages = new Map(ev.messages.map((m) => [m.id, m]));
        this._serverConfig = ev.config || {};
        this._members = ev.members || [];
        this._settings = ev.settings || { include_ha_people: true };
        this._loaded = true;
      } else if (ev.action === "people") {
        this._members = ev.message.members || [];
        this._settings = ev.message.settings || this._settings;
      } else if (ev.action === "removed") {
        this._messages.delete(ev.message.id);
        if (this._openId === ev.message.id) this._closeDetail();
      } else if (ev.message) {
        const isNew = !this._messages.has(ev.message.id);
        this._messages.set(ev.message.id, ev.message);
        if (isNew && this._ambient) this._spotIndex = 0;
        if (this._openId === ev.message.id) this._renderDetail();
      }
      this._renderFilters();
      this._renderBoard();
      if (this._ambient) this._renderSpot(true);
      if (ev.action === "snapshot" || ev.action === "people") {
        if (this._compose) this._syncCompose();
        if (this._peopleUi) this._renderPeople();
      }
    }

    _sorted() {
      return [...this._messages.values()].sort(
        (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.created < b.created ? 1 : -1)
      );
    }

    _haPeople() {
      const states = (this._hass && this._hass.states) || {};
      return Object.keys(states)
        .filter((id) => id.startsWith("person."))
        .map((id) => ({
          id,
          name: states[id].attributes.friendly_name || id.slice(7),
          pic: states[id].attributes.entity_picture || "",
          user: states[id].attributes.user_id,
          ha: true,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    _people() {
      const members = (this._members || []).map((m) => ({ id: m.id, name: m.name, emoji: m.emoji, hue: m.hue, notify: m.notify || [], member: true }));
      const ha = this._settings && this._settings.include_ha_people === false ? [] : this._haPeople();
      return [...members, ...ha].sort((a, b) => a.name.localeCompare(b.name));
    }

    _notifyServices() {
      const svcs = Object.keys((this._hass && this._hass.services && this._hass.services.notify) || {}).filter(
        (s) => !["send_message", "persistent_notification"].includes(s)
      );
      const pretty = (s) => {
        const mobile = s.startsWith("mobile_app_");
        const base = (mobile ? s.slice(11) : s).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return mobile ? `${base} (phone app)` : base;
      };
      return svcs
        .sort((a, b) => (b.startsWith("mobile_app_") - a.startsWith("mobile_app_")) || a.localeCompare(b))
        .map((s) => ({ value: `notify.${s}`, label: pretty(s) }));
    }

    _me() {
      const uid = this._hass && this._hass.user && this._hass.user.id;
      return this._people().find((p) => p.user && p.user === uid) || null;
    }

    _myReactKey() {
      const me = this._me();
      return me ? me.id : `user:${this._hass && this._hass.user ? this._hass.user.id : ""}`;
    }

    _person(id, fallbackName) {
      const p = id && [...this._people(), ...this._haPeople()].find((x) => x.id === id);
      if (p) return p;
      return { id: id || "home", name: fallbackName || "Home", pic: "", home: !id };
    }

    _visible() {
      const f = this._filter;
      const all = this._sorted();
      if (f === "all") return all;
      if (f === "mine") {
        const me = this._me();
        return me ? all.filter((m) => m.recipient === me.id || (m.recipient === "everyone" && m.sender !== me.id)) : all;
      }
      return all.filter((m) => m.sender === f || m.recipient === f);
    }

    // ------------------------------------------------------------- render
    _build() {
      this._built = true;
      this.shadowRoot.innerHTML = `
        <style>${STYLE}</style>
        <div class="root">
          <div class="aurora"><i class="b1"></i><i class="b2"></i><i class="b3"></i></div>
          <div class="bgimg"></div>
          <div class="grain"></div>
          <div class="ui">
            <header class="glass">
              <div class="clock"><div class="time"></div><div class="date"></div></div>
              <div class="title"></div>
              <nav class="filters"></nav>
              <button class="ghost-btn people-btn" data-action="people" aria-label="People">${ICON.people}<span>People</span></button>
              <button class="new" data-action="compose">${ICON.plus}<span>Leave a note</span></button>
            </header>
            <main><div class="board"></div></main>
          </div>
          <div class="ambient" data-action="wake">
            <div class="a-time"></div><div class="a-date"></div>
            <div class="a-spot glass"></div>
            <div class="a-hint">Tap anywhere to wake</div>
          </div>
          <div class="scrim compose-scrim" hidden></div>
          <div class="scrim detail-scrim" hidden></div>
          <div class="scrim people-scrim" hidden></div>
        </div>`;
      const root = this.shadowRoot.querySelector(".root");
      root.addEventListener("click", (e) => this._onClick(e));
      root.addEventListener("pointerdown", () => this._resetIdle(), { passive: true });
      root.addEventListener("keydown", () => this._resetIdle(), { passive: true });
      this._applyConfig();
    }

    _applyConfig() {
      const c = this._config || {};
      const root = this.shadowRoot.querySelector(".root");
      root.style.setProperty("--gm-height", c.height);
      root.style.setProperty("--gm-col", `${Number(c.column_width) || 300}px`);
      this.shadowRoot.querySelector(".title").textContent = c.title || "";
      this.shadowRoot.querySelector(".title").style.display = c.title ? "" : "none";
      this.shadowRoot.querySelector(".clock").style.display = c.show_clock === false ? "none" : "";
      const bg = this.shadowRoot.querySelector(".bgimg");
      bg.style.backgroundImage = c.background_image ? `url("${String(c.background_image).replace(/["\\]/g, "")}")` : "";
      this._tick();
      this._resetIdle();
    }

    _avatar(p, cls = "") {
      const hue = p.hue ?? AVATAR_HUES[hash(p.id) % AVATAR_HUES.length];
      const inner = p.home ? "🏠" : p.emoji ? esc(p.emoji) : p.pic ? `<img src="${esc(p.pic)}" alt="">` : esc(initials(p.name));
      return `<span class="avatar ${cls} ${p.home ? "home" : ""}" style="--h:${hue}">${inner}</span>`;
    }

    _renderFilters() {
      if (!this._built) return;
      const nav = this.shadowRoot.querySelector(".filters");
      const me = this._me();
      const all = this._sorted();
      const count = (fn) => all.filter(fn).length;
      let html = `<button class="chip text ${this._filter === "all" ? "on" : ""}" data-action="filter" data-f="all">All <span class="n">${all.length}</span></button>`;
      if (me) {
        const n = count((m) => m.recipient === me.id || (m.recipient === "everyone" && m.sender !== me.id));
        html += `<button class="chip text ${this._filter === "mine" ? "on" : ""}" data-action="filter" data-f="mine">For me <span class="n">${n}</span></button>`;
      }
      for (const p of this._people()) {
        html += `<button class="chip ${this._filter === p.id ? "on" : ""}" data-action="filter" data-f="${esc(p.id)}" title="${esc(p.name)}">${this._avatar(p)}<span>${esc(p.name.split(" ")[0])}</span></button>`;
      }
      nav.innerHTML = html;
    }

    _relTime(iso, future = false) {
      const t = new Date(iso).getTime();
      if (!t) return "";
      const lang = (this._hass && this._hass.locale && this._hass.locale.language) || navigator.language;
      const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto", style: "short" });
      let diff = (t - Date.now()) / 1000;
      const abs = Math.abs(diff);
      if (!future && abs < 45) return "just now";
      const units = [
        [60, "second"],
        [3600, "minute", 60],
        [86400, "hour", 3600],
        [604800, "day", 86400],
        [Infinity, "week", 604800],
      ];
      for (let i = 1; i < units.length; i++) {
        if (abs < units[i][0]) return rtf.format(Math.round(diff / units[i][2]), units[i][1]);
      }
      return "";
    }

    _drawingSVG(d) {
      if (!d || !d.strokes) return "";
      const W = 1000;
      const H = Math.round(W / (d.ar || 1.6));
      const paths = d.strokes
        .map((s) => {
          const pts = s.p.map(([x, y]) => [x * W, y * H]);
          if (!pts.length) return "";
          let path = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
          if (pts.length === 1) path += " l0.1 0";
          for (let i = 1; i < pts.length - 1; i++) {
            const mx = (pts[i][0] + pts[i + 1][0]) / 2;
            const my = (pts[i][1] + pts[i + 1][1]) / 2;
            path += ` Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
          }
          if (pts.length > 1) {
            const l = pts[pts.length - 1];
            path += ` L${l[0].toFixed(1)} ${l[1].toFixed(1)}`;
          }
          return `<path d="${path}" stroke="${esc(s.c)}" stroke-width="${(s.w * W).toFixed(1)}"/>`;
        })
        .join("");
      return `<svg class="drawing" viewBox="0 0 ${W} ${H}" role="img" aria-label="Handwritten note">${paths}</svg>`;
    }

    _noteHTML(m, opts = {}) {
      const me = this._me();
      const s = this._person(m.sender, m.sender_name);
      const to = m.recipient === "everyone" ? "Everyone" : this._person(m.recipient, m.recipient_name || "Someone").name;
      const forMe = me && m.recipient === me.id;
      const tint = TINTS[m.tint] || TINTS.clear;
      const len = (m.text || "").length;
      const size = len && len < 40 ? "xl" : len < 120 ? "lg" : "";
      const mine = this._myReactKey();
      const reactions = Object.entries(m.reactions || {})
        .filter(([, who]) => who.length)
        .map(([e, who]) => `<span class="rx ${who.includes(mine) ? "mine" : ""}">${esc(e)}${who.length > 1 ? `<small>${who.length}</small>` : ""}</span>`)
        .join("");
      const life = m.pinned ? `${ICON.pin} Pinned` : m.expires_at ? `⏳ ${esc(this._relTime(m.expires_at, true))}` : "";
      const inner = `
          <div class="meta">
            ${this._avatar(s)}
            <div class="who"><b>${esc(s.name)}</b> → ${esc(to)}</div>
            ${forMe ? `<span class="badge">For you</span>` : ""}
            <span class="when">${esc(this._relTime(m.created))}</span>
            ${m.pinned ? `<span class="pin">${ICON.pin}</span>` : ""}
          </div>
          ${m.text ? `<div class="text ${size}">${esc(m.text)}</div>` : ""}
          ${this._drawingSVG(m.drawing)}
          ${reactions || life ? `<footer>${reactions}<span class="life">${life}</span></footer>` : ""}`;
      if (opts.bare) return inner;
      return `<button class="note glass ${m.pinned ? "pinned" : ""} ${forMe ? "forme" : ""}" style="--tint:${tint}; ${opts.delay ? `animation-delay:${opts.delay}ms` : ""}" data-action="open" data-id="${esc(m.id)}">${inner}</button>`;
    }

    _renderBoard() {
      if (!this._built) return;
      const board = this.shadowRoot.querySelector(".board");
      if (this._problem === "setup") {
        board.innerHTML = `<div class="problem glass" style="column-span:all"><div class="big">🧩</div><h2>Almost there</h2>
          <p>Add the <b>Glass Message Board</b> integration in <b>Settings → Devices &amp; services → Add integration</b>, then reload this page.</p></div>`;
        return;
      }
      if (this._problem) {
        board.innerHTML = `<div class="problem glass" style="column-span:all"><h2>Couldn't load notes</h2><p>${esc(this._problem)}</p></div>`;
        return;
      }
      if (!this._loaded) {
        board.innerHTML = "";
        return;
      }
      const list = this._visible();
      if (!list.length) {
        const noPeople = !this._people().length;
        const fresh = !this._messages.size;
        board.innerHTML = `<div class="empty glass" style="column-span:all"><div class="big">${fresh && noPeople ? "👋" : "✨"}</div>
          <h2>${!fresh ? "Nothing here" : noPeople ? "Welcome to your message board" : "The board is clear"}</h2>
          <p>${!fresh ? "No notes match this filter." : noPeople ? "Start by adding the people in your home. Then anyone can leave them a note." : "Leave the first note: a reminder, a doodle, or just a little love."}</p>
          ${fresh ? `<div class="cta">${noPeople ? `<button class="new" data-action="people">${ICON.people}<span>Add people</span></button>` : ""}
            <button class="${noPeople ? "ghost-btn" : "new"}" data-action="compose">${ICON.plus}<span>Leave a note</span></button></div>` : ""}</div>`;
        return;
      }
      const animate = !this._renderedOnce;
      board.innerHTML = list.map((m, i) => this._noteHTML(m, { delay: animate ? i * 60 : 0 })).join("");
      if (!animate) board.querySelectorAll(".note").forEach((n) => (n.style.animation = "none"));
      this._renderedOnce = true;
    }

    _tick() {
      if (!this._built) return;
      const now = new Date();
      const lang = (this._hass && this._hass.locale && this._hass.locale.language) || navigator.language;
      const time = now.toLocaleTimeString(lang, { hour: "numeric", minute: "2-digit" });
      const date = now.toLocaleDateString(lang, { weekday: "long", month: "long", day: "numeric" });
      this.shadowRoot.querySelector(".time").textContent = time;
      this.shadowRoot.querySelector(".date").textContent = date;
      this.shadowRoot.querySelector(".a-time").textContent = time;
      this.shadowRoot.querySelector(".a-date").textContent = date;
    }

    // ------------------------------------------------------------- events
    _onClick(e) {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const a = el.dataset.action;
      const id = el.dataset.id;
      switch (a) {
        case "wake":
          this._setAmbient(false);
          break;
        case "filter":
          this._filter = el.dataset.f;
          this._renderedOnce = false;
          this._renderFilters();
          this._renderBoard();
          break;
        case "compose":
          this._openCompose();
          break;
        case "people":
          this._openPeople();
          break;
        case "open":
          this._openDetail(id);
          break;
        case "close-detail":
          this._closeDetail();
          break;
        case "react":
          this._call({ type: "glass_messages/react", message_id: this._openId, emoji: el.dataset.emoji });
          break;
        case "pin": {
          const m = this._messages.get(this._openId);
          if (m) this._call({ type: "glass_messages/pin", message_id: m.id, pinned: !m.pinned });
          break;
        }
        case "delete":
          if (el.dataset.confirm) {
            this._call({ type: "glass_messages/delete", message_id: this._openId }).then((ok) => ok && this._closeDetail());
          } else {
            el.dataset.confirm = "1";
            el.querySelector("span").textContent = "Tap again to delete";
          }
          break;
        case "reply": {
          const m = this._messages.get(this._openId);
          this._closeDetail();
          this._openCompose(m && m.sender ? { to: m.sender } : {});
          break;
        }
        default:
          if (a.startsWith("p-")) this._onPeopleClick(el, a);
          else if (this._compose) this._onComposeClick(el, a);
      }
    }

    async _call(msg) {
      try {
        await this._hass.callWS(msg);
        return true;
      } catch (err) {
        this._toastError((err && err.message) || String(err));
        return false;
      }
    }

    _toastError(text) {
      const target =
        this.shadowRoot.querySelector(".detail .err") ||
        this.shadowRoot.querySelector(".people-scrim:not([hidden]) .err") ||
        this.shadowRoot.querySelector(".compose-scrim:not([hidden]) .sheet-foot .err");
      if (target) target.textContent = text;
      else console.warn("[glass-message-board]", text);
    }

    // --------------------------------------------------------------- detail
    _openDetail(id) {
      this._openId = id;
      this._renderDetail();
      this.shadowRoot.querySelector(".detail-scrim").hidden = false;
    }

    _closeDetail() {
      this._openId = null;
      const s = this.shadowRoot.querySelector(".detail-scrim");
      s.hidden = true;
      s.innerHTML = "";
    }

    _canModify(m) {
      const u = this._hass && this._hass.user;
      if (!u) return false;
      if (u.is_admin || m.sender_user_id === u.id) return true;
      const me = this._me();
      return !!me && (m.sender === me.id || m.recipient === me.id);
    }

    _renderDetail() {
      const m = this._messages.get(this._openId);
      const scrim = this.shadowRoot.querySelector(".detail-scrim");
      if (!m) return this._closeDetail();
      const mine = this._myReactKey();
      const reacted = (e) => ((m.reactions || {})[e] || []).includes(mine);
      const canEdit = this._canModify(m);
      scrim.innerHTML = `
        <div class="detail glass" style="--tint:${TINTS[m.tint] || TINTS.clear}">
          ${this._noteHTML(m, { bare: true })}
          <div class="reactbar">${REACTIONS.map((e) => `<button class="${reacted(e) ? "mine" : ""}" data-action="react" data-emoji="${e}" aria-label="React ${e}">${e}</button>`).join("")}</div>
          <div class="actions">
            ${m.sender ? `<button data-action="reply">${ICON.reply}<span>Reply</span></button>` : ""}
            <button data-action="pin">${ICON.pin}<span>${m.pinned ? "Unpin" : "Pin"}</span></button>
            ${canEdit ? `<button class="danger" data-action="delete">${ICON.trash}<span>Delete</span></button>` : ""}
            <span style="flex:1"></span>
            <button data-action="close-detail">${ICON.close}<span>Close</span></button>
          </div>
          <div class="err" style="margin-top:10px"></div>
        </div>`;
      scrim.onclick = (e) => {
        if (e.target === scrim) this._closeDetail();
      };
    }

    // -------------------------------------------------------------- compose
    _defaultExpiry() {
      const h = this._serverConfig.default_expiry_hours;
      if (h === 0) return "never";
      if (h === undefined || h === null) return "1d";
      if (h <= 1) return "1h";
      if (h <= 24) return "1d";
      return "1w";
    }

    _defaultSender() {
      const me = this._me();
      if (me) return me.id;
      const last = storage.get(LAST_SENDER_KEY);
      return last && this._people().some((p) => p.id === last) ? last : null;
    }

    _openCompose(preset = {}) {
      this._compose = {
        from: this._defaultSender(),
        to: preset.to || "everyone",
        mode: "write",
        tint: "clear",
        expiry: this._defaultExpiry(),
        pinned: false,
        more: false,
        adding: null,
        newName: "",
        ink: INK[0],
        width: WIDTHS[1],
        strokes: [],
        sending: false,
      };
      const scrim = this.shadowRoot.querySelector(".compose-scrim");
      scrim.innerHTML = `
        <div class="sheet glass">
          <div class="sheet-head"><h2>Leave a note</h2><button class="icon-btn" data-action="c-close" aria-label="Close">${ICON.close}</button></div>
          <section class="step">
            <h3 class="step-h"><i>1</i>Who's writing?</h3>
            <div class="tiles c-from"></div>
          </section>
          <section class="step">
            <h3 class="step-h"><i>2</i>Who's it for?</h3>
            <div class="tiles c-to"></div>
          </section>
          <section class="step">
            <h3 class="step-h"><i>3</i>Your message</h3>
            <div class="tabs"><button data-action="c-mode" data-mode="write">✍️ Write</button><button data-action="c-mode" data-mode="draw">🖍️ Draw</button></div>
            <div class="pane-write">
              <textarea id="gm-c-text" maxlength="2000" placeholder="Write something nice…"></textarea>
              <div class="tools">
                <button class="icon-btn c-mic" data-action="c-mic" aria-label="Speak your message" title="Speak your message">${ICON.mic}</button>
                ${INSERT_EMOJI.map((e) => `<button class="emoji" data-action="c-emoji" data-emoji="${e}" aria-label="Insert ${e}">${e}</button>`).join("")}
                <span class="count">0 / 2000</span>
              </div>
            </div>
            <div class="pane-draw" hidden>
              <div class="pad"><canvas></canvas><div class="hint">Draw with your finger ✨</div></div>
              <div class="tools">
                ${INK.map((c) => `<button class="swatch" data-action="c-ink" data-ink="${c}" style="background:${c}" aria-label="Ink ${c}"></button>`).join("")}
                <span style="width:10px"></span>
                ${WIDTHS.map((w) => `<button class="width" data-action="c-width" data-w="${w}" aria-label="Pen size"><i style="width:${Math.round(w * 600)}px;height:${Math.round(w * 600)}px"></i></button>`).join("")}
                <span style="flex:1"></span>
                <button class="icon-btn" data-action="c-undo" aria-label="Undo">${ICON.undo}</button>
                <button class="icon-btn" data-action="c-clear" aria-label="Clear drawing">${ICON.trash}</button>
              </div>
            </div>
          </section>
          <button class="more" data-action="c-more">${ICON.chevron}<span>More options: colour, how long it stays, pin</span></button>
          <div class="c-options" hidden>
            <div class="row"><label>Colour</label><div class="chips">${Object.keys(TINTS)
              .map((t) => `<button class="tint-dot" data-action="c-tint" data-tint="${t}" style="--tint:${TINTS[t]}" aria-label="${t}" title="${t}"></button>`)
              .join("")}</div></div>
            <div class="row"><label>Stays</label><div class="chips">${EXPIRY.map(
              (x) => `<button class="chip text" data-action="c-exp" data-exp="${x.k}">${x.label}</button>`
            ).join("")}<button class="chip text c-pin" data-action="c-pin">📌 Pin</button></div></div>
          </div>
          <div class="sheet-foot"><span class="err"></span><button class="primary" data-action="c-send">${ICON.send}<span class="send-label">Send</span></button></div>
        </div>`;
      scrim.hidden = false;
      scrim.onclick = (e) => {
        if (e.target === scrim) this._closeCompose();
      };
      const ta = scrim.querySelector("textarea");
      ta.addEventListener("input", () => this._syncCompose(false));
      scrim.addEventListener("input", (e) => {
        if (e.target.classList.contains("q-name") && this._compose) this._compose.newName = e.target.value;
      });
      scrim.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target.classList.contains("q-name")) {
          e.preventDefault();
          this._quickAdd();
        }
      });
      if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) scrim.querySelector(".c-mic").style.display = "none";
      this._setupPad(scrim.querySelector(".pad"));
      this._syncCompose();
      if (this._compose.from || !this._people().length) setTimeout(() => ta.focus(), 60);
    }

    _closeCompose() {
      this._stopMic();
      if (this._padObserver) this._padObserver.disconnect();
      this._compose = null;
      const s = this.shadowRoot.querySelector(".compose-scrim");
      s.hidden = true;
      s.innerHTML = "";
      this._resetIdle();
    }

    _tile(p, action, on) {
      return `<button class="tile ${on ? "on" : ""}" data-action="${action}" data-id="${esc(p.id)}" aria-pressed="${on}">${this._avatar(p)}<span>${esc(p.name)}</span></button>`;
    }

    _addTile(which, label) {
      const c = this._compose;
      if (c.adding === which) {
        return `<div class="quick-add"><input class="field q-name" id="gm-q-${which}" maxlength="40" placeholder="Type a name" value="${esc(c.newName)}" autocomplete="off">
          <button class="small-btn" data-action="c-add-save">Add</button><button class="icon-btn" data-action="c-add-cancel" aria-label="Cancel">${ICON.close}</button></div>`;
      }
      return `<button class="tile add" data-action="c-add" data-which="${which}"><span class="ring">+</span><span>${label}</span></button>`;
    }

    _syncCompose(full = true) {
      const c = this._compose;
      if (!c) return;
      const root = this.shadowRoot.querySelector(".compose-scrim .sheet");
      if (!root) return;
      const people = this._people();
      if (full) {
        root.querySelector(".c-from").innerHTML =
          people.map((p) => this._tile(p, "c-from", c.from === p.id)).join("") + this._addTile("from", people.length ? "Add name" : "Add your name");
        root.querySelector(".c-to").innerHTML =
          `<button class="tile ${c.to === "everyone" ? "on" : ""}" data-action="c-to" data-id="everyone" aria-pressed="${c.to === "everyone"}"><span class="everyone-av">🏡</span><span>Everyone</span></button>` +
          people
            .filter((p) => p.id !== c.from)
            .map((p) => this._tile(p, "c-to", c.to === p.id))
            .join("") +
          this._addTile("to", "Add name");
        if (c.adding) {
          const input = root.querySelector(`#gm-q-${c.adding}`);
          if (input && this.shadowRoot.activeElement !== input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        }
        root.querySelectorAll("[data-action=c-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === c.mode));
        root.querySelector(".pane-write").hidden = c.mode !== "write";
        root.querySelector(".pane-draw").hidden = c.mode !== "draw";
        root.querySelector(".c-options").hidden = !c.more;
        root.querySelector(".more").classList.toggle("open", c.more);
        root.querySelectorAll("[data-action=c-tint]").forEach((b) => b.classList.toggle("on", b.dataset.tint === c.tint));
        root.querySelectorAll("[data-action=c-exp]").forEach((b) => b.classList.toggle("on", !c.pinned && b.dataset.exp === c.expiry));
        root.querySelector(".c-pin").classList.toggle("on", c.pinned);
        root.querySelectorAll("[data-action=c-ink]").forEach((b) => b.classList.toggle("on", b.dataset.ink === c.ink));
        root.querySelectorAll("[data-action=c-width]").forEach((b) => b.classList.toggle("on", Number(b.dataset.w) === c.width));
        root.style.setProperty("--tint", TINTS[c.tint]);
      }
      root.querySelector(".pad .hint").style.display = c.strokes.length ? "none" : "";
      const ta = root.querySelector("textarea");
      root.querySelector(".count").textContent = `${ta.value.length} / 2000`;
      const toName = c.to === "everyone" ? "everyone" : this._person(c.to, "them").name;
      root.querySelector(".send-label").textContent = `Send to ${toName}`;
      const ready = ta.value.trim().length > 0 || c.strokes.length > 0;
      root.querySelector("[data-action=c-send]").disabled = !ready || c.sending;
    }

    _usedLook() {
      const used = new Set((this._members || []).map((m) => m.emoji));
      const emoji = MEMBER_EMOJI.find((e) => !used.has(e)) || MEMBER_EMOJI[hash(String(Date.now())) % MEMBER_EMOJI.length];
      const hue = HUES[(this._members || []).length % HUES.length];
      return { emoji, hue };
    }

    async _quickAdd() {
      const c = this._compose;
      if (!c || !c.adding) return;
      const name = (c.newName || "").trim();
      if (!name) return;
      const which = c.adding;
      try {
        const member = await this._hass.callWS({ type: "glass_messages/member/save", name, ...this._usedLook() });
        if (!this._compose) return;
        this._members = [...this._members.filter((m) => m.id !== member.id), member];
        c.adding = null;
        c.newName = "";
        if (which === "from") {
          c.from = member.id;
          if (c.to === c.from) c.to = "everyone";
        } else {
          c.to = member.id;
        }
        this._syncCompose();
      } catch (err) {
        this._toastError((err && err.message) || String(err));
      }
    }

    _onComposeClick(el, a) {
      const c = this._compose;
      const ta = this.shadowRoot.querySelector(".compose-scrim textarea");
      switch (a) {
        case "c-close":
          return this._closeCompose();
        case "c-from":
          c.from = el.dataset.id;
          if (c.to === c.from) c.to = "everyone";
          break;
        case "c-to":
          c.to = el.dataset.id;
          break;
        case "c-add":
          c.adding = el.dataset.which;
          c.newName = "";
          break;
        case "c-add-cancel":
          c.adding = null;
          break;
        case "c-add-save":
          return this._quickAdd();
        case "c-more":
          c.more = !c.more;
          break;
        case "c-mode":
          c.mode = el.dataset.mode;
          if (c.mode === "draw") {
            this._stopMic();
            requestAnimationFrame(() => this._resizePad());
          }
          break;
        case "c-tint":
          c.tint = el.dataset.tint;
          break;
        case "c-exp":
          c.expiry = el.dataset.exp;
          c.pinned = false;
          break;
        case "c-pin":
          c.pinned = !c.pinned;
          break;
        case "c-ink":
          c.ink = el.dataset.ink;
          break;
        case "c-width":
          c.width = Number(el.dataset.w);
          break;
        case "c-undo":
          c.strokes.pop();
          this._redrawPad();
          break;
        case "c-clear":
          c.strokes = [];
          this._redrawPad();
          break;
        case "c-emoji": {
          const pos = ta.selectionStart ?? ta.value.length;
          ta.value = (ta.value.slice(0, pos) + el.dataset.emoji + ta.value.slice(ta.selectionEnd ?? pos)).slice(0, 2000);
          ta.focus();
          ta.selectionStart = ta.selectionEnd = pos + el.dataset.emoji.length;
          break;
        }
        case "c-mic":
          this._toggleMic();
          break;
        case "c-send":
          return this._send();
      }
      this._syncCompose();
    }

    // --------------------------------------------------------------- people
    _openPeople() {
      this._peopleUi = this._blankPerson();
      const scrim = this.shadowRoot.querySelector(".people-scrim");
      scrim.hidden = false;
      scrim.onclick = (e) => {
        if (e.target === scrim) this._closePeople();
      };
      scrim.oninput = (e) => {
        if (e.target.id === "gm-p-name" && this._peopleUi) this._peopleUi.name = e.target.value;
      };
      scrim.onchange = (e) => {
        if (e.target.id === "gm-p-notify" && this._peopleUi) this._peopleUi.notify = e.target.value;
      };
      scrim.onkeydown = (e) => {
        if (e.key === "Enter" && e.target.id === "gm-p-name") {
          e.preventDefault();
          this._savePerson();
        }
      };
      this._renderPeople();
      setTimeout(() => {
        const input = scrim.querySelector("#gm-p-name");
        if (input && !this._people().length) input.focus();
      }, 60);
    }

    _blankPerson() {
      return { editId: null, name: "", notify: "", confirm: null, error: "", ...this._usedLook() };
    }

    _closePeople() {
      this._peopleUi = null;
      const s = this.shadowRoot.querySelector(".people-scrim");
      s.hidden = true;
      s.innerHTML = "";
      this._resetIdle();
    }

    _renderPeople() {
      const ui = this._peopleUi;
      const scrim = this.shadowRoot.querySelector(".people-scrim");
      if (!ui || !scrim) return;
      const services = this._notifyServices();
      const label = (v) => (services.find((s) => s.value === v) || { label: String(v).replace(/^notify\./, "") }).label;
      const members = this._members || [];
      const ha = this._haPeople();
      const haOn = !(this._settings && this._settings.include_ha_people === false);
      const scrollTop = scrim.querySelector(".sheet") ? scrim.querySelector(".sheet").scrollTop : 0;
      scrim.innerHTML = `
        <div class="sheet glass">
          <div class="sheet-head"><h2>People</h2><button class="icon-btn" data-action="p-close" aria-label="Close">${ICON.close}</button></div>
          <p class="lead">Add everyone who uses the board. Their names appear when someone leaves a note.</p>
          <section class="card-inset">
            <h3>${ui.editId ? "Edit person" : "Add a person"}</h3>
            <div class="pform-top">
              ${this._avatar({ id: "preview", name: ui.name || "?", emoji: ui.emoji, hue: ui.hue }, "xl")}
              <input id="gm-p-name" class="field" maxlength="40" placeholder="Name, for example Maya" value="${esc(ui.name)}" autocomplete="off">
            </div>
            <div class="label">Picture</div>
            <div class="emoji-grid">${MEMBER_EMOJI.map((e) => `<button class="emoji ${e === ui.emoji ? "on" : ""}" data-action="p-emoji" data-emoji="${e}" aria-label="Picture ${e}">${e}</button>`).join("")}</div>
            <div class="label">Colour</div>
            <div class="hues">${HUES.map((h) => `<button class="hue ${h === ui.hue ? "on" : ""}" data-action="p-hue" data-hue="${h}" style="--h:${h}" aria-label="Colour"></button>`).join("")}</div>
            <div class="label">Send a phone notification when they get a note <span class="opt">(optional)</span></div>
            <select id="gm-p-notify" class="field">
              <option value="">Don't notify</option>
              ${services.map((s) => `<option value="${esc(s.value)}" ${s.value === ui.notify ? "selected" : ""}>${esc(s.label)}</option>`).join("")}
            </select>
            ${services.length ? "" : `<p class="muted">Install the Home Assistant app on a phone to enable notifications.</p>`}
            <div class="pform-foot">
              <span class="err">${esc(ui.error)}</span>
              ${ui.editId ? `<button class="ghost-btn" data-action="p-cancel">Cancel</button>` : ""}
              <button class="primary" data-action="p-save">${ui.editId ? "Save changes" : `${ICON.plus}<span>Add person</span>`}</button>
            </div>
          </section>
          <section class="people-sec">
            <h3>On the board</h3>
            ${
              members.length
                ? members
                    .map(
                      (m) => `<div class="person-row">${this._avatar({ id: m.id, name: m.name, emoji: m.emoji, hue: m.hue })}
                  <div class="pinfo"><b>${esc(m.name)}</b><small>${m.notify && m.notify.length ? `Notifies ${esc(label(m.notify[0]))}` : "No notifications"}</small></div>
                  <button class="ghost-btn" data-action="p-edit" data-id="${esc(m.id)}">${ICON.edit}<span>Edit</span></button>
                  <button class="ghost-btn danger" data-action="p-remove" data-id="${esc(m.id)}">${ui.confirm === m.id ? "Tap again to remove" : "Remove"}</button></div>`
                    )
                    .join("")
                : `<p class="muted">No one yet. Add the first person above.</p>`
            }
          </section>
          ${
            ha.length
              ? `<section class="people-sec">
            <div class="sec-head"><h3>Home Assistant users</h3><button class="switch ${haOn ? "on" : ""}" data-action="p-ha" role="switch" aria-checked="${haOn}" aria-label="Show Home Assistant users"></button></div>
            <p class="muted">${haOn ? "These people from Home Assistant are also on the board." : "Hidden. Turn on to also show people from Home Assistant."}</p>
            ${haOn ? ha.map((p) => `<div class="person-row">${this._avatar(p)}<div class="pinfo"><b>${esc(p.name)}</b><small>From Home Assistant</small></div></div>`).join("") : ""}
          </section>`
              : ""
          }
        </div>`;
      const sheet = scrim.querySelector(".sheet");
      if (sheet) sheet.scrollTop = scrollTop;
    }

    async _savePerson() {
      const ui = this._peopleUi;
      if (!ui) return;
      const name = (ui.name || "").trim();
      if (!name) {
        ui.error = "Please type a name.";
        return this._renderPeople();
      }
      const payload = { type: "glass_messages/member/save", name, emoji: ui.emoji, hue: ui.hue, notify: ui.notify ? [ui.notify] : [] };
      if (ui.editId) payload.member_id = ui.editId;
      try {
        const member = await this._hass.callWS(payload);
        this._members = [...this._members.filter((m) => m.id !== member.id), member].sort((a, b) => a.name.localeCompare(b.name));
        if (!this._peopleUi) return;
        this._peopleUi = this._blankPerson();
        this._renderPeople();
        this._renderFilters();
        this._renderBoard();
        const input = this.shadowRoot.querySelector("#gm-p-name");
        if (input) input.focus();
      } catch (err) {
        ui.error = (err && err.message) || String(err);
        this._renderPeople();
      }
    }

    _onPeopleClick(el, a) {
      const ui = this._peopleUi;
      if (!ui) return;
      switch (a) {
        case "p-close":
          return this._closePeople();
        case "p-emoji":
          ui.emoji = el.dataset.emoji;
          break;
        case "p-hue":
          ui.hue = Number(el.dataset.hue);
          break;
        case "p-save":
          return this._savePerson();
        case "p-cancel":
          this._peopleUi = this._blankPerson();
          break;
        case "p-edit": {
          const m = this._members.find((x) => x.id === el.dataset.id);
          if (m) this._peopleUi = { editId: m.id, name: m.name, emoji: m.emoji, hue: m.hue, notify: (m.notify || [])[0] || "", confirm: null, error: "" };
          const sheet = this.shadowRoot.querySelector(".people-scrim .sheet");
          if (sheet) sheet.scrollTo({ top: 0, behavior: "smooth" });
          break;
        }
        case "p-remove":
          if (ui.confirm === el.dataset.id) {
            this._call({ type: "glass_messages/member/remove", member_id: el.dataset.id });
            ui.confirm = null;
            if (ui.editId === el.dataset.id) this._peopleUi = this._blankPerson();
          } else {
            ui.confirm = el.dataset.id;
          }
          break;
        case "p-ha":
          this._call({ type: "glass_messages/settings", include_ha_people: this._settings.include_ha_people === false });
          break;
      }
      this._renderPeople();
    }

    _expiryDate(k) {
      const now = new Date();
      switch (k) {
        case "1h":
          return new Date(now.getTime() + 3600e3);
        case "tonight": {
          const d = new Date(now);
          d.setHours(23, 59, 0, 0);
          return d.getTime() - now.getTime() < 3600e3 ? new Date(d.getTime() + 86400e3) : d;
        }
        case "1d":
          return new Date(now.getTime() + 86400e3);
        case "1w":
          return new Date(now.getTime() + 7 * 86400e3);
        default:
          return null;
      }
    }

    async _send() {
      const c = this._compose;
      if (!c || c.sending) return;
      const text = this.shadowRoot.querySelector(".compose-scrim textarea").value.trim();
      const payload = { type: "glass_messages/post", text, to: c.to, tint: c.tint, pinned: c.pinned, notify: true };
      if (c.from) {
        payload.from = c.from;
        storage.set(LAST_SENDER_KEY, c.from);
      }
      const exp = c.pinned ? null : this._expiryDate(c.expiry);
      if (exp) payload.expires_at = exp.toISOString();
      if (c.strokes.length) payload.drawing = { ar: Number(this._padAspect.toFixed(4)), strokes: c.strokes };
      c.sending = true;
      this._syncCompose();
      const ok = await this._call(payload);
      if (ok) {
        this._filter = "all";
        this._renderFilters();
        this._closeCompose();
        const main = this.shadowRoot.querySelector("main");
        if (main) main.scrollTo({ top: 0, behavior: "smooth" });
      } else if (this._compose) {
        this._compose.sending = false;
        this._syncCompose();
      }
    }

    // ------------------------------------------------------------ drawing
    _setupPad(pad) {
      const canvas = pad.querySelector("canvas");
      this._pad = { pad, canvas, ctx: canvas.getContext("2d"), active: null };
      this._padAspect = 16 / 9;
      this._padObserver = new ResizeObserver(() => this._resizePad());
      this._padObserver.observe(pad);

      const point = (e) => {
        const r = canvas.getBoundingClientRect();
        return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
      };
      canvas.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        const stroke = { c: this._compose.ink, w: this._compose.width, p: [point(e).map((v) => +v.toFixed(4))] };
        this._compose.strokes.push(stroke);
        this._pad.active = stroke;
        this._redrawPad();
        this._syncCompose();
      });
      canvas.addEventListener("pointermove", (e) => {
        const s = this._pad.active;
        if (!s) return;
        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        for (const ev of events) {
          const p = point(ev);
          const last = s.p[s.p.length - 1];
          if (Math.hypot(p[0] - last[0], (p[1] - last[1]) / this._padAspect) > 0.004 && s.p.length < 1500) s.p.push(p.map((v) => +v.toFixed(4)));
        }
        this._redrawPad();
      });
      const end = () => (this._pad.active = null);
      canvas.addEventListener("pointerup", end);
      canvas.addEventListener("pointercancel", end);
    }

    _resizePad() {
      if (!this._pad) return;
      const { pad, canvas } = this._pad;
      const r = pad.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      this._padAspect = r.width / r.height;
      this._redrawPad();
    }

    _redrawPad() {
      if (!this._pad || !this._compose) return;
      const { canvas, ctx } = this._pad;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(0,0,0,.25)";
      ctx.shadowBlur = 4;
      for (const s of this._compose.strokes) {
        const pts = s.p.map(([x, y]) => [x * W, y * H]);
        ctx.strokeStyle = s.c;
        ctx.lineWidth = s.w * W;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        if (pts.length === 1) ctx.lineTo(pts[0][0] + 0.1, pts[0][1]);
        for (let i = 1; i < pts.length - 1; i++) {
          ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
        }
        if (pts.length > 1) ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        ctx.stroke();
      }
    }

    // -------------------------------------------------------------- voice
    _toggleMic() {
      if (this._rec) return this._stopMic();
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      const sheet = this.shadowRoot.querySelector(".compose-scrim .sheet");
      const ta = sheet.querySelector("textarea");
      const base = ta.value ? ta.value.replace(/\s*$/, " ") : "";
      const rec = new SR();
      rec.lang = (this._hass && this._hass.locale && this._hass.locale.language) || navigator.language;
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (e) => {
        let said = "";
        for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
        ta.value = (base + said).slice(0, 2000);
        this._syncCompose();
      };
      rec.onerror = (e) => {
        const err = sheet.querySelector(".err");
        if (err) err.textContent = e.error === "not-allowed" ? "Microphone blocked. Dictation needs HTTPS and mic permission." : `Dictation: ${e.error}`;
      };
      rec.onend = () => {
        this._rec = null;
        const b = this.shadowRoot.querySelector(".c-mic");
        if (b) b.classList.remove("on");
      };
      try {
        rec.start();
        this._rec = rec;
        sheet.querySelector(".c-mic").classList.add("on");
      } catch (err) {
        this._rec = null;
      }
    }

    _stopMic() {
      if (this._rec) {
        try {
          this._rec.stop();
        } catch (e) {
          /* already stopped */
        }
        this._rec = null;
      }
    }

    // ------------------------------------------------------------ ambient
    _resetIdle() {
      clearTimeout(this._idleTimer);
      const after = Number(this._config && this._config.ambient_after) || 0;
      if (this._ambient) this._setAmbient(false);
      if (after > 0 && this.isConnected) {
        this._idleTimer = setTimeout(() => {
          if (!this._compose && !this._openId) this._setAmbient(true);
          else this._resetIdle();
        }, after * 1000);
      }
    }

    _setAmbient(on) {
      if (on === this._ambient || !this._built) return;
      this._ambient = on;
      this.shadowRoot.querySelector(".root").classList.toggle("ambient-on", on);
      clearInterval(this._spotTimer);
      if (on) {
        this._spotIndex = 0;
        this._renderSpot(true);
        this._spotTimer = setInterval(() => {
          this._spotIndex++;
          this._renderSpot();
        }, 9000);
      } else {
        this._resetIdle();
      }
    }

    _spotlightList() {
      const me = this._me();
      const all = this._sorted();
      const score = (m) => (me && m.recipient === me.id ? 2 : 0) + (m.pinned ? 1 : 0);
      return all.slice().sort((a, b) => score(b) - score(a) || (a.created < b.created ? 1 : -1)).slice(0, 12);
    }

    _renderSpot(immediate = false) {
      const spot = this.shadowRoot.querySelector(".a-spot");
      const list = this._spotlightList();
      if (!list.length) {
        spot.style.display = "none";
        return;
      }
      spot.style.display = "";
      const m = list[this._spotIndex % list.length];
      const paint = () => {
        spot.style.setProperty("--tint", TINTS[m.tint] || TINTS.clear);
        spot.innerHTML = this._noteHTML(m, { bare: true });
        spot.classList.remove("out");
      };
      if (immediate) return paint();
      spot.classList.add("out");
      setTimeout(paint, 700);
    }
  }

  customElements.define(TAG, GlassMessageBoard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: TAG,
    name: "Glass Message Board",
    description: "A frosted-glass household message board with handwriting, dictation and reactions.",
    preview: false,
    documentationURL: "https://github.com/your-name/glass-message-board",
  });
  console.info(`%c GLASS MESSAGE BOARD %c ${VERSION} `, "background:#5b6cff;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px", "background:#ff5fa2;color:#fff;border-radius:0 4px 4px 0;padding:2px 6px");
})();
