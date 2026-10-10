// The game screen: board, clocks, the coach beside you, and the ways to ask him things.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { S, update, isPro, questionsLeft, useQuestion } from '../store.js';
import { native, CFG } from '../native.js';
import { Board } from '../ui/Board.jsx';
import { CoachFace, OppFace } from '../ui/Avatar.jsx';
import { createGame, recordGame, saveCurrent, kidsMode } from '../game/session.js';
import { speak, stop as stopVoice } from '../services/voice.js';
import { playMoveSound, sound } from '../services/sound.js';
import { askCoach, aiAvailable } from '../services/ai.js';
import { go, back, openSheet } from '../ui/nav.js';
import { pvToSan } from '../chess/core.js';
import { Chess } from 'chess.js';
import { toast } from '../ui/fx.js';
import { pieceImage } from '../ui/pieces.js';

const fmt = ms => {
  if (ms == null) return '';
  const s = Math.ceil(ms / 1000);
  if (s < 20 && ms > 0) return (ms / 1000).toFixed(1);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9 };

function captured(history, color) {
  // pieces `color` has captured
  const out = history.filter(m => m.color === color && m.captured).map(m => m.captured);
  return out.sort((a, b) => VALUE[b] - VALUE[a]);
}

export function Game({ setup }) {
  const game = useMemo(() => createGame(setup), []);
  const { ctl, coach, meta } = game;
  const [st, setSt] = useState(ctl.state);
  const [talking, setTalking] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [menu, setMenu] = useState(false);
  const [waitingAi, setWaitingAi] = useState(false);
  const lastSpoken = useRef(null);
  const histLen = useRef(0);
  const kids = kidsMode();
  const persona = S.profile.persona;
  const flip = ctl.playerColor === 'b';

  useEffect(() => {
    const off = ctl.subscribe(setSt);
    ctl.start(game.intro);
    native.shell.keepAwake(true);
    sound.unlock();
    return () => { off(); saveCurrent(ctl, meta); ctl.destroy(); stopVoice(); native.shell.keepAwake(false); };
  }, []);

  // sounds for every move
  useEffect(() => {
    if (st.history.length !== histLen.current) {
      const grew = st.history.length > histLen.current;
      histLen.current = st.history.length;
      if (grew) playMoveSound(st.history[st.history.length - 1], st.check);
      if (st.status === 'playing' && st.history.length % 2 === 0) saveCurrent(ctl, meta);
    }
  }, [st.history.length]);

  // the coach speaks every new line (the clock waits for him)
  useEffect(() => {
    const c = st.coach;
    if (!c || !c.text || c.id === lastSpoken.current) return;
    lastSpoken.current = c.id;
    if (c.options) sound.warn(); else sound.coach();
    speak(c.text, persona, {
      onStart: () => { ctl.setSpeaking(true); setTalking(true); },
      onEnd: () => { ctl.setSpeaking(false); setTalking(false); },
    });
  }, [st.coach && st.coach.id]);

  // the end
  useEffect(() => {
    if (st.status !== 'over') return;
    const res = recordGame(ctl, coach, meta);
    st.result.outcome === 'win' ? sound.win() : st.result.outcome === 'loss' ? sound.lose() : sound.ok();
    const t = setTimeout(() => go('result', { res }, { replace: true }), 2600);
    return () => clearTimeout(t);
  }, [st.status]);

  const me = ctl.playerColor, opp = me === 'w' ? 'b' : 'w';
  const canMove = st.status === 'playing' && ctl.isPlayersTurn() && !st.busy && !st.awaiting;
  const btn = coach.p.buttons;

  async function ask(kind) {
    setAskOpen(false);
    sound.tap();
    await ctl.ask(kind);
  }
  async function askTyped(e) {
    e && e.preventDefault();
    const q = typed.trim();
    if (!q) return;
    if (questionsLeft() <= 0) { setAskOpen(false); openSheet({ type: 'more', what: 'questions' }); return; }
    setTyped(''); setAskOpen(false); setWaitingAi(true);
    try {
      const pre = ctl.pre ? await ctl.pre : null;
      const facts = {
        fen: ctl.chess.fen(), side: me === 'w' ? 'white' : 'black', toMove: ctl.chess.turn() === me ? 'player' : 'opponent',
        moves: ctl.chess.history().slice(-16), eval: st.eval,
        best: pre && pre.lines[0] ? pvToSan(pre.fen, pre.lines[0].pv, 5) : null,
        threat: pre && pre.threat ? { move: pre.threat.san, wins: pre.threat.captured, mate: pre.threat.mate } : null,
        lastOpp: ctl.oppFacts ? ctl.oppFacts.san : null, rating: S.rating,
        weaknesses: Object.entries(S.memory.themes).sort((a, b) => b[1].count - a[1].count).slice(0, 3).map(([t]) => coach.themeText(t)),
      };
      const answer = await askCoach(q, facts, persona);
      useQuestion();
      ctl.say({ text: answer, mood: 'calm' });
    } catch (err) {
      ctl.say({ text: persona === 'hopper' ? "Hmm, I can't think right now! Try the buttons!" : "I can't reach my library just now. Try one of the quick questions instead.", mood: 'thinking' });
    }
    setWaitingAi(false);
  }

  function leave() {
    if (st.status === 'playing' && ctl.chess.history().length > 1) { setMenu(true); return; }
    back();
  }
  async function moreTakebacks() {
    const ok = await native.ads.showReward();
    if (ok) { ctl.state.takebacks += CFG.limits.rewardTakebacks; ctl.emit(); toast(`+${CFG.limits.rewardTakebacks} take-backs`); }
    else toast('No video available right now');
  }

  const myCaps = captured(st.history, me), oppCaps = captured(st.history, opp);
  const matDiff = myCaps.reduce((a, p) => a + VALUE[p], 0) - oppCaps.reduce((a, p) => a + VALUE[p], 0);
  const c = st.coach;
  const tbLabel = Number.isFinite(st.takebacks) ? st.takebacks : '∞';
  const quickAsks = kids
    ? [['threat', 'Is anything in danger?'], ['hint', 'Help me!']]
    : [['threat', "What's he threatening?"], ['hint', 'Give me a hint'], ['plan', "What's the plan?"], ['why', 'Why did he play that?']];

  return (
    <div class={'game-screen' + (kids ? ' kids' : '')}>
      <header class="game-top">
        <button class="icon-btn" aria-label="Back" onClick={leave}>‹</button>
        <div class="title">{meta.mode === 'test' ? 'Test game' : kids ? 'Play with Hopper' : 'Coached game'}</div>
        <button class="icon-btn" aria-label="Menu" onClick={() => setMenu(true)}>⋯</button>
      </header>

      <div class="game-main">
        <div class="board-col">
          <PlayerBar who={meta.opp} name={meta.opp.name} rating={kids ? null : meta.oppElo} clock={st.clocks && st.clocks[opp]} running={st.running === opp}
            thinking={st.thinking} caps={oppCaps} adv={-matDiff} color={opp} set={S.settings.pieces} />
          <div class="board-wrap">
            <Board fen={st.fen} flip={flip} interactive={canMove} movable={me} onMove={m => ctl.playerMove(m)}
              lastMove={st.lastMove} check={st.check} arrows={st.arrows} marks={st.marks}
              set={S.settings.pieces} theme={S.settings.board} coords={S.settings.coords} kids={kids} />
            {st.status === 'over' && <div class="board-over"><div class="over-badge">{st.result.outcome === 'win' ? (kids ? 'You won! 🎉' : 'Victory') : st.result.outcome === 'loss' ? (kids ? 'Good try!' : 'Defeat') : 'Draw'}</div></div>}
          </div>
          <PlayerBar me name={S.profile.name || 'You'} rating={kids ? null : S.rating} clock={st.clocks && st.clocks[me]} running={st.running === me}
            paused={st.running === me && (talking || st.awaiting)} caps={myCaps} adv={matDiff} color={me} set={S.settings.pieces} />
        </div>

        <div class="side-col">
          {meta.mode !== 'test' || st.status === 'over' ? (
            <div class={'coach-panel' + (c && c.options ? ' urgent' : '')}>
              <div class="coach-face"><CoachFace persona={persona} mood={c ? c.mood : 'calm'} talking={talking} size={kids ? 76 : 64} /></div>
              <div class="bubble" aria-live="polite">
                <div class="who">{coach.p.name}{talking && <span class="dots"><i /><i /><i /></span>}</div>
                <p key={c && c.id}>{waitingAi ? '…' : c ? c.text : (kids ? "I'm watching! Make your move." : 'Your move.')}</p>
                {c && c.options && st.status === 'playing' && (
                  <div class="choices">
                    {c.options.map(o => (
                      <button key={o} class={'choice ' + o} onClick={() => { sound.tap(); ctl.choose(o); }}>
                        {o === 'takeback' ? `${btn.takeback}${Number.isFinite(st.takebacks) ? ` (${tbLabel})` : ''}` : o === 'show' ? btn.show : btn.playon}
                      </button>
                    ))}
                    {!c.options.includes('takeback') && meta.mode === 'coached' && !kids && !isPro() && native.isNative && (
                      <button class="choice ghost" onClick={moreTakebacks}>▶ Watch a video for {CFG.limits.rewardTakebacks} more</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div class="coach-panel quiet">
              <div class="coach-face"><CoachFace persona={persona} mood="calm" size={52} /></div>
              <div class="bubble"><div class="who">{coach.p.name}</div><p>{st.coach ? st.coach.text : 'Watching quietly.'}</p></div>
            </div>
          )}

          {meta.mode === 'coached' && st.status === 'playing' && (
            <div class="ask-row">
              {askOpen ? (
                <div class="ask-menu">
                  {quickAsks.map(([k, label]) => <button key={k} class="chip" onClick={() => ask(k)}>{label}</button>)}
                  {aiAvailable() && (
                    <form class="ask-form" onSubmit={askTyped}>
                      <input value={typed} onInput={e => setTyped(e.currentTarget.value)} placeholder={`Ask ${coach.p.name} anything…`} maxLength={300} enterkeyhint="send" />
                      <button class="send" disabled={!typed.trim()}>Ask</button>
                    </form>
                  )}
                  {aiAvailable() && <div class="ask-left">{questionsLeft()} questions left today{isPro() ? '' : ' · Pro gets more'}</div>}
                  <button class="link" onClick={() => setAskOpen(false)}>Close</button>
                </div>
              ) : (
                <>
                  <button class="btn soft" onClick={() => { sound.tap(); setAskOpen(true); }}>{kids ? '🙋 Ask Hopper' : `Ask ${persona === 'hopper' ? 'Hopper' : 'the Vizier'}`}</button>
                  <button class="btn soft" disabled={!canMove || st.takebacks <= 0 || st.history.length < 2} onClick={() => { sound.tap(); ctl.undo(); }}>↶ Undo <small>{tbLabel}</small></button>
                </>
              )}
            </div>
          )}

          <MoveList history={st.history} startBlack={ctl.startFen.split(' ')[1] === 'b'} />
        </div>
      </div>

      {menu && (
        <div class="sheet-bg" onClick={() => setMenu(false)}>
          <div class="sheet small" onClick={e => e.stopPropagation()}>
            <h3>{st.status === 'playing' ? 'Game menu' : 'Game over'}</h3>
            {st.status === 'playing' && <button class="btn wide" onClick={() => { setMenu(false); back(); }}>Save and leave</button>}
            {st.status === 'playing' && !kids && <button class="btn wide soft" onClick={() => { const ok = ctl.offerDraw(); setMenu(false); if (!ok) toast(`${meta.opp.name} declines the draw.`); }}>Offer a draw</button>}
            {st.status === 'playing' && <button class="btn wide danger" onClick={() => { setMenu(false); ctl.resign(); }}>{kids ? 'Stop this game' : 'Resign'}</button>}
            <SettingsQuick />
            <button class="link" onClick={() => setMenu(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsQuick() {
  const [, set] = useState(0);
  const tog = k => { update(s => { s.settings[k] = !s.settings[k]; }); if (k === 'voice' && !S.settings.voice) stopVoice(); set(n => n + 1); };
  return (
    <div class="quick-settings">
      <label class="switch"><input type="checkbox" checked={S.settings.voice} onChange={() => tog('voice')} /><span>Coach's voice</span></label>
      <label class="switch"><input type="checkbox" checked={S.settings.sound} onChange={() => tog('sound')} /><span>Sounds</span></label>
      <div class="seg">
        {['quiet', 'normal', 'chatty'].map(t => <button key={t} class={S.settings.talk === t ? 'on' : ''} onClick={() => { update(s => { s.settings.talk = t; }); set(n => n + 1); }}>{t[0].toUpperCase() + t.slice(1)}</button>)}
      </div>
      <p class="fine">Talk level applies from the next game.</p>
    </div>
  );
}

function PlayerBar({ me, who, name, rating, clock, running, paused, thinking, caps, adv, color, set }) {
  return (
    <div class={'player-bar' + (me ? ' me' : '')}>
      {who ? <OppFace who={who} size={34} /> : <span class={'me-dot ' + color} />}
      <div class="pname">
        <b>{name}</b>{rating ? <span class="rating">{rating}</span> : null}
        <div class="caps">
          {caps.map((p, i) => <img key={i} class="cap" alt="" src={pieceImage(set === 'kids' ? 'kids' : 'classic', (color === 'w' ? 'b' : 'w') + p)} />)}
          {adv > 0 && <span class="adv">+{adv}</span>}
        </div>
      </div>
      {thinking && <span class="thinking"><i /><i /><i /></span>}
      {clock != null && <div class={'clock' + (running ? ' run' : '') + (paused ? ' paused' : '') + (clock < 30000 ? ' low' : '')}>{paused ? '⏸ ' : ''}{fmt(clock)}</div>}
    </div>
  );
}

function MoveList({ history, startBlack }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [history.length]);
  const rows = [];
  const list = startBlack ? [null, ...history] : history;
  for (let i = 0; i < list.length; i += 2) rows.push([i / 2 + 1, list[i], list[i + 1]]);
  if (!rows.length) return null;
  return (
    <div class="moves" ref={ref}>
      {rows.map(([n, w, b]) => <div class="mrow" key={n}><span class="n">{n}.</span><span>{w ? w.san : '…'}</span><span>{b ? b.san : ''}</span></div>)}
    </div>
  );
}
