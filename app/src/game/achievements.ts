// Achievements, play statistics and the daily streak. Stored per viewer in localStorage.
import { create } from 'zustand';
import type { Localized } from '../i18n';
import { CHAPTERS, EVERY_LEVEL } from '../levels';
import { L } from '../levels/build';
import { maxStars } from '../levels/evaluate';
import { chapterComplete } from './progress';
import { sfx } from './sfx';
import { useToasts } from './toast';

export interface Achievement { id: string; icon: string; title: Localized; desc: Localized; secret?: boolean }

export const ACHV_XP = 15;
export const FINAL_LEVEL = '10-1';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_sim', icon: 'bolt', title: L('通電！', 'Power on!'), desc: L('跑出第一次模擬。', 'Run your first simulation.') },
  { id: 'first_pass', icon: 'check', title: L('第一個電路', 'First circuit'), desc: L('第一次過關。', 'Pass your first level.') },
  { id: 'first_try', icon: 'bolt', title: L('一次到位', 'First try'), desc: L('第一次挑戰某關，第一次模擬就過關。', 'Clear a new level on your very first simulation.') },
  { id: 'speed', icon: 'clock', title: L('閃電手', 'Lightning hands'), desc: L('60 秒內首次通過一關。', 'Clear a new level within 60 seconds.') },
  { id: 'comeback', icon: 'live', title: L('永不放棄', 'Never give up'), desc: L('失敗 10 次以上後終於過關。', 'Pass a level after 10 or more failed runs.') },
  { id: 'perfect', icon: 'star', title: L('完美主義', 'Perfectionist'), desc: L('在一關拿到滿星（至少兩顆星的關卡）。', 'Earn every star on a level with two or more.') },
  { id: 'perfect10', icon: 'trophy', title: L('星光大道', 'Walk of stars'), desc: L('10 關拿到滿星。', 'Earn every star on 10 levels.') },
  { id: 'on_par', icon: 'chip', title: L('標準桿', 'On par'), desc: L('用不超過標準桿的元件數過關。', 'Pass using no more parts than par.') },
  { id: 'under_par', icon: 'chip', title: L('精簡設計', 'Lean design'), desc: L('用比標準桿更少的元件過關。', 'Pass with fewer parts than par.') },
  { id: 'record', icon: 'trophy', title: L('刷新紀錄', 'Record breaker'), desc: L('打破自己在某一關的設計紀錄。', 'Beat one of your own design records.') },
  { id: 'live', icon: 'live', title: L('即時調校', 'Live tuner'), desc: L('在「即時模擬」模式下過關。', 'Pass a level with live simulation on.') },
  { id: 'tweaker', icon: 'flow', title: L('旋鈕玩家', 'Knob twiddler'), desc: L('用 [ / ] 調整數值 30 次。', 'Nudge values with [ / ] 30 times.') },
  { id: 'sat', icon: 'chip', title: L('進入飽和', 'Saturated'), desc: L('讓 MOS 工作在飽和區。', 'Bias a MOSFET in saturation.') },
  { id: 'pvt', icon: 'factory', title: L('天時地利', 'All corners'), desc: L('通過含 PVT 角落或 Monte Carlo 的規格。', 'Pass a level checked over PVT corners or Monte Carlo.') },
  { id: 'chapter', icon: 'book', title: L('章節完成', 'Chapter done'), desc: L('完成任一章。', 'Complete a chapter.') },
  { id: 'half', icon: 'cap', title: L('半程', 'Halfway there'), desc: L('完成 5 章。', 'Complete 5 chapters.') },
  { id: 'grad', icon: 'cap', title: L('下線成功', 'Taped out'), desc: L('通過最終專題。', 'Pass the final project.') },
  { id: 'sandbox', icon: 'flask', title: L('自由實驗家', 'Free experimenter'), desc: L('在沙盒跑一次模擬。', 'Run a simulation in the sandbox.') },
  { id: 'sims100', icon: 'bolt', title: L('模擬狂人', 'Sim addict'), desc: L('累計 100 次模擬。', 'Run 100 simulations in total.') },
  { id: 'streak3', icon: 'flame', title: L('熱身完成', 'Warming up'), desc: L('連續 3 天遊玩。', 'Play 3 days in a row.') },
  { id: 'streak7', icon: 'flame', title: L('一週不斷電', 'Week without a blackout'), desc: L('連續 7 天遊玩。', 'Play 7 days in a row.') },
  { id: 'smoke', icon: 'smoke', secret: true, title: L('神奇的煙', 'Magic smoke'), desc: L('讓元件超過額定功率冒煙。電路靠的就是裡面的煙！', 'Push a part past its power rating. Circuits run on the smoke inside!') },
  { id: 'pyro', icon: 'smoke', secret: true, title: L('縱火犯', 'Arsonist'), desc: L('累計燒掉 10 個元件。', 'Burn out 10 parts in total.') },
  { id: 'night', icon: 'moon', secret: true, title: L('夜貓子', 'Night owl'), desc: L('在凌晨 0–5 點跑模擬。', 'Simulate between midnight and 5 a.m.') },
];

interface Stats { sims: number; burns: number; nudges: number; streak: number; bestStreak: number; lastDay: string }
const STATS_KEY = 'adg.stats.v1', ACHV_KEY = 'adg.achv.v1';
const read = <T,>(k: string, d: T): T => { try { const s = localStorage.getItem(k); return s ? { ...d, ...JSON.parse(s) } : d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

interface AchvState {
  unlocked: Record<string, number>;
  stats: Stats;
  /** quiet: no toast or sound (the caller shows it, e.g. in the success window); returns true if new */
  unlock: (id: string, quiet?: boolean) => boolean;
}

export const useAchv = create<AchvState>((set, get) => ({
  unlocked: read<Record<string, number>>(ACHV_KEY, {}),
  stats: read<Stats>(STATS_KEY, { sims: 0, burns: 0, nudges: 0, streak: 0, bestStreak: 0, lastDay: '' }),
  unlock: (id, quiet = false) => {
    if (get().unlocked[id]) return false;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return false;
    const unlocked = { ...get().unlocked, [id]: Date.now() };
    set({ unlocked });
    write(ACHV_KEY, unlocked);
    if (!quiet) {
      sfx.achievement();
      useToasts.getState().push({ kind: 'achv', icon: def.icon, title: def.title, body: def.desc, xp: ACHV_XP });
    }
    return true;
  },
}));

function bump(patch: (s: Stats) => Partial<Stats>) {
  const st = useAchv.getState();
  const stats = { ...st.stats, ...patch(st.stats) };
  useAchv.setState({ stats });
  write(STATS_KEY, stats);
  return stats;
}

/** Counts today toward the daily streak (any simulation or layout check). */
export function touchDay(): Stats {
  return bump((s) => {
    const today = dayKey();
    if (s.lastDay === today) return {};
    const streak = s.lastDay === yesterday() ? s.streak + 1 : 1;
    return { lastDay: today, streak, bestStreak: Math.max(s.bestStreak, streak) };
  });
}

/** The streak shown on the home screen: still alive if the player played today or yesterday. */
export function liveStreak(s: Stats): number {
  return s.lastDay === dayKey() || s.lastDay === yesterday() ? s.streak : 0;
}

const unlock = (id: string) => useAchv.getState().unlock(id);

/** After every simulation (levels and sandbox). */
export function trackSim(e: { sandbox: boolean; saturated: boolean }) {
  const s = touchDay();
  const st = bump((x) => ({ sims: x.sims + 1 }));
  unlock('first_sim');
  if (e.sandbox) unlock('sandbox');
  if (e.saturated) unlock('sat');
  if (st.sims >= 100) unlock('sims100');
  if (s.streak >= 3) unlock('streak3');
  if (s.streak >= 7) unlock('streak7');
  const h = new Date().getHours();
  if (h < 5) unlock('night');
}

/** After a level is passed (schematic or layout). `stars` is the whole progress map after recording.
 *  With `quiet`, new achievements are returned for the success window instead of popping up. */
export function trackPass(e: {
  levelId: string; earned: number; max: number; before: number; stars: Record<string, number>;
  sims?: number; fails?: number; seconds?: number; live?: boolean; swept?: boolean;
  parts?: number; par?: number; improved?: boolean;
}, quiet = false): Achievement[] {
  touchDay();
  const got: Achievement[] = [];
  const unlock = (id: string) => { if (useAchv.getState().unlock(id, quiet)) got.push(ACHIEVEMENTS.find((a) => a.id === id)!); };
  unlock('first_pass');
  const firstClear = e.before === 0;
  if (firstClear && e.sims === 1) unlock('first_try');
  if (firstClear && e.seconds !== undefined && e.seconds <= 60) unlock('speed');
  if ((e.fails ?? 0) >= 10) unlock('comeback');
  if (e.max >= 2 && e.earned >= e.max) unlock('perfect');
  if (e.live) unlock('live');
  if (e.swept) unlock('pvt');
  if (e.improved) unlock('record');
  if (e.par && e.parts !== undefined) {
    if (e.parts <= e.par) unlock('on_par');
    if (e.parts < e.par) unlock('under_par');
  }
  if (e.levelId === FINAL_LEVEL) unlock('grad');
  const perfect = EVERY_LEVEL.filter((l) => maxStars(l) >= 2 && (e.stars[l.id] ?? 0) >= maxStars(l)).length;
  if (perfect >= 10) unlock('perfect10');
  const chapters = CHAPTERS.filter((c) => chapterComplete(e.stars, c.id)).length;
  if (chapters >= 1) unlock('chapter');
  if (chapters >= 5) unlock('half');
  return got;
}

export function trackBurn(n: number) {
  const st = bump((x) => ({ burns: x.burns + n }));
  unlock('smoke');
  if (st.burns >= 10) unlock('pyro');
}

export function trackNudge() {
  const st = bump((x) => ({ nudges: x.nudges + 1 }));
  if (st.nudges >= 30) unlock('tweaker');
}
