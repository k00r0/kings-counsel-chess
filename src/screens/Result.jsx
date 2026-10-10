// After the game: result, rating change, and "three things to remember".
import { useEffect, useState } from 'preact/hooks';
import { S, isPro, update } from '../store.js';
import { native, CFG } from '../native.js';
import { go } from '../ui/nav.js';
import { CoachFace } from '../ui/Avatar.jsx';
import { MiniBoard } from '../ui/MiniBoard.jsx';
import { confetti } from '../ui/fx.js';
import { speak } from '../services/voice.js';
import { kidsMode } from '../game/session.js';

const REASON = { checkmate: 'by checkmate', time: 'on time', resign: 'by resignation', stalemate: 'by stalemate', repetition: 'by repetition', insufficient: 'insufficient material', fifty: '50-move rule', agreement: 'by agreement' };

async function maybeInterstitial() {
  if (isPro() || !native.isNative) return;
  if (S.ads.gamesSince >= (CFG.admob.interstitialEvery || 2)) {
    const shown = await native.ads.showInterstitial();
    if (shown) update(s => { s.ads.gamesSince = 0; });
  }
}

export function Result({ res }) {
  const kids = kidsMode();
  const [open, setOpen] = useState(null);
  const { sum, card, before, after, report, meta } = res;
  const won = sum.result === 'win';
  const delta = after - before;
  useEffect(() => {
    if (won) confetti(kids);
    const t = setTimeout(() => speak(card.intro + ' ' + card.items.map(i => i.text + (i.tip ? ' ' + i.tip : '')).join(' '), S.profile.persona), 700);
    return () => clearTimeout(t);
  }, []);
  const leave = (name, params) => { maybeInterstitial(); go(name, params, { replace: true }); };
  return (
    <div class={'page result' + (won ? ' won' : '')}>
      <div class="result-head">
        <div class="res-title">{won ? (kids ? 'You won! 🎉' : 'Victory') : sum.result === 'loss' ? (kids ? 'Good try!' : 'Defeat') : 'Draw'}</div>
        <div class="res-sub">{kids ? `against ${meta.opp.name}` : `vs ${meta.opp.name} · ${REASON[sum.reason] || ''}`}</div>
        {!kids && meta.mode !== 'lesson' && (
          <div class="res-stats">
            <div><small>{meta.mode === 'test' ? 'Rating' : 'Estimated rating'}</small><b>{after}</b><span class={delta >= 0 ? 'up' : 'down'}>{delta >= 0 ? '+' : ''}{delta}</span></div>
            <div><small>Accuracy</small><b>{sum.accuracy}%</b></div>
            <div><small>Best moves</small><b>{sum.counts.best}</b></div>
          </div>
        )}
        {kids && <div class="kid-stars">{'⭐'.repeat(won ? 3 : sum.counts.blunder === 0 ? 2 : 1)}</div>}
      </div>

      <div class="card3">
        <div class="card3-head"><CoachFace persona={S.profile.persona} mood={won ? 'happy' : 'calm'} size={48} /><p>{card.intro}</p></div>
        {card.items.map((it, i) => (
          <div class={'thing ' + it.kind} key={i}>
            <div class="ticon">{it.icon}</div>
            <div class="tbody">
              <b>{it.title}</b>
              <p>{it.text}</p>
              {it.tip && <p class="tip">{it.tip}</p>}
              {it.fen && <button class="link" onClick={() => setOpen(open === i ? null : i)}>{open === i ? 'Hide position' : 'See the position'}</button>}
              {open === i && it.fen && <MiniBoard fen={it.fen} arrow={it.best} />}
              {it.drill && <button class="link" onClick={() => leave('drills', { theme: it.theme })}>Practise these</button>}
            </div>
          </div>
        ))}
      </div>

      {report && (
        <button class="report-ready" onClick={() => leave('report', { n: report.number })}>
          <span>📜</span><span><b>Your advisor's report is ready</b><small>{kids ? 'See how you did in your last 10 games!' : 'Blind spots, style, and three things to focus on'}</small></span>
        </button>
      )}

      <div class="result-actions">
        <button class="btn primary big" onClick={() => leave('setup', { mode: meta.mode === 'test' ? 'test' : 'coached' })}>{kids ? 'Play again!' : 'Play again'}</button>
        <button class="btn soft" onClick={() => leave('review', { n: meta.gameNo })}>{kids ? 'Watch my game' : 'Review the game'}</button>
        <button class="link" onClick={() => leave('home')}>Home</button>
      </div>
    </div>
  );
}
