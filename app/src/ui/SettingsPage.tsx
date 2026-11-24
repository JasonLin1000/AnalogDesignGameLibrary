// Settings: display (language, font size, theme), sound, learning options, progress, references and about.
import { useRef, useState } from 'react';
import { backupProgress, restoreProgress } from '../game/backup';
import { useProgress } from '../game/progress';
import { FONT_SCALES, useSettings } from '../game/settings';
import { useSound } from '../game/sfx';
import { useTheme } from '../game/theme';
import { useLang, useT, type Localized, type MessageKey } from '../i18n';
import { L } from '../levels/build';
import { Icon } from './Icon';

function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T; options: { v: T; text: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.v)} role="radio" aria-checked={o.v === value} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>{o.text}</button>
      ))}
    </div>
  );
}

const Row = ({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) => (
  <div className="set-row">
    <div className="set-text"><span className="set-title">{title}</span>{help && <span className="set-help">{help}</span>}</div>
    <div className="set-control">{children}</div>
  </div>
);

interface Ref { title: string; detail: Localized; url?: string }
const REFS: { group: Localized; items: Ref[] }[] = [
  {
    group: L('製程與模擬器', 'Process and simulator'),
    items: [
      { title: 'SkyWater SKY130 PDK', detail: L('本遊戲使用的開源 130 nm 製程：元件模型、設計規則、圖層定義。', 'The open 130 nm process used here: device models, design rules, layer definitions.'), url: 'https://skywater-pdk.readthedocs.io/' },
      { title: 'ngspice', detail: L('開源 SPICE 模擬器，本遊戲把 ngspice-47 編譯成 WebAssembly 在瀏覽器裡執行。', 'The open-source SPICE simulator; this game runs ngspice-47 compiled to WebAssembly in your browser.'), url: 'https://ngspice.sourceforge.io/docs.html' },
      { title: 'BSIM4', detail: L('SKY130 電晶體使用的模型（UC Berkeley）。', 'The transistor model behind SKY130 (UC Berkeley).'), url: 'https://bsim.berkeley.edu/models/bsim4/' },
    ],
  },
  {
    group: L('教科書（依章節）', 'Textbooks (by chapter)'),
    items: [
      { title: 'Sedra & Smith, Microelectronic Circuits', detail: L('第 0–2 章：電路基礎、二極體、MOSFET 入門。', 'Chapters 0–2: circuit basics, diodes, MOSFET fundamentals.') },
      { title: 'B. Razavi, Design of Analog CMOS Integrated Circuits', detail: L('第 2–5 章：MOS 模型、單級放大器、差動對、運放、補償、雜訊。最推薦的入門書。', 'Chapters 2–5: MOS models, single-stage amplifiers, differential pairs, op-amps, compensation, noise. The recommended first book.') },
      { title: 'Gray, Hurst, Lewis & Meyer, Analysis and Design of Analog Integrated Circuits', detail: L('第 5–6 章：運放、雙極電晶體、能隙參考電壓的深入推導。', 'Chapters 5–6: op-amps, bipolar devices and in-depth bandgap derivations.') },
      { title: 'Allen & Holberg, CMOS Analog Circuit Design', detail: L('第 5–6 章：兩級運放的設計流程與 LDO、參考電壓。', 'Chapters 5–6: a step-by-step two-stage op-amp design flow, regulators and references.') },
      { title: 'A. Hastings, The Art of Analog Layout', detail: L('第 7–10 章：匹配、共質心、井與基體接點、寄生效應。', 'Chapters 7–10: matching, common centroid, wells and taps, parasitics.') },
      { title: 'R. J. Baker, CMOS: Circuit Design, Layout, and Simulation', detail: L('第 7–9 章：layout、DRC / LVS 與 SPICE 實作。', 'Chapters 7–9: layout, DRC / LVS and hands-on SPICE.') },
    ],
  },
  {
    group: L('經典論文', 'Classic papers'),
    items: [
      { title: 'M. Pelgrom et al., "Matching properties of MOS transistors", IEEE JSSC, 1989', detail: L('隨機不匹配 σ ∝ 1/√(W·L)——第 4、8、10 章 Monte Carlo 的依據。', 'Random mismatch σ ∝ 1/√(W·L): the basis of the Monte Carlo in chapters 4, 8 and 10.') },
      { title: 'A. P. Brokaw, "A simple three-terminal IC bandgap reference", IEEE JSSC, 1974', detail: L('第 6 章能隙參考電壓的經典架構。', 'The classic bandgap architecture behind chapter 6.') },
    ],
  },
  {
    group: L('真實的開源設計工具', 'Real open-source design tools'),
    items: [
      { title: 'xschem', detail: L('電路圖編輯器，可以直接搭配 SKY130 與 ngspice。', 'A schematic editor that works with SKY130 and ngspice.'), url: 'https://xschem.sourceforge.io/' },
      { title: 'KLayout', detail: L('Layout 檢視與編輯、DRC / LVS。', 'Layout viewing and editing, DRC / LVS.'), url: 'https://www.klayout.de/' },
      { title: 'Magic VLSI', detail: L('經典的 layout 工具，支援 SKY130 的寄生參數萃取。', 'A classic layout tool with SKY130 parasitic extraction.'), url: 'http://opencircuitdesign.com/magic/' },
    ],
  },
];

const ABOUT: [MessageKey, Localized][] = [
  ['set.about.sim', L('ngspice-47（WebAssembly），每次模擬都是真的 SPICE 運算，在你的瀏覽器裡執行。', 'ngspice-47 (WebAssembly): every simulation is a real SPICE run, inside your browser.')],
  ['set.about.models', L('SKY130 nfet_01v8 / pfet_01v8（tt、ff、ss、sf、fs 五個 corner）、pnp_05v5；Monte Carlo 不匹配以 Pelgrom 模型的 ΔVth 加在閘極。', 'SKY130 nfet_01v8 / pfet_01v8 (tt, ff, ss, sf, fs corners) and pnp_05v5; Monte Carlo mismatch adds a Pelgrom ΔVth at each gate.')],
  ['set.about.layout', L('Layout：SKY130 設計規則的子集、連線萃取與 LVS、分散式 RC 寄生萃取、梯度與 N 井鄰近效應。數值是教學用的近似，不能取代晶圓廠的簽核工具。', 'Layout: a subset of SKY130 design rules, connectivity extraction and LVS, distributed RC parasitics, gradients and the well proximity effect. Numbers are teaching approximations, not a substitute for foundry sign-off tools.')],
  ['set.about.license', L('程式碼 Apache-2.0；關卡與教材 CC BY-SA 4.0。歡迎投稿關卡。', 'Code Apache-2.0; levels and course material CC BY-SA 4.0. Level contributions welcome.')],
];

export function SettingsPage({ onStory }: { onStory: () => void }) {
  const { t, L: tr, lang } = useT();
  const setLang = useLang((s) => s.setLang);
  const settings = useSettings();
  const theme = useTheme();
  const sound = useSound();
  const p = useProgress();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const resetCards = () => {
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('adg.intro.')) localStorage.removeItem(k); } catch { /* ignore */ }
    setMsg(t('set.cardsReset'));
  };

  return (
    <main className="home settings-page">
      <header className="page-head"><h1>{t('set.title')}</h1></header>

      <section className="set-card">
        <h2>{t('set.display')}</h2>
        <Row title={t('set.lang')}>
          <Segmented label={t('set.lang')} value={lang} onChange={setLang} options={[{ v: 'zh-TW', text: '繁體中文' }, { v: 'en', text: 'English' }]} />
        </Row>
        <Row title={t('set.font')} help={t('set.fontHelp')}>
          <Segmented label={t('set.font')} value={settings.fontScale} onChange={settings.setFontScale}
            options={FONT_SCALES.map((v, i) => ({ v, text: t((['set.fontS', 'set.fontM', 'set.fontL', 'set.fontXL'] as const)[i]) }))} />
        </Row>
        <Row title={t('set.theme')}>
          <Segmented label={t('set.theme')} value={theme.theme} onChange={(v) => { if (v !== theme.theme) theme.toggle(); }}
            options={[{ v: 'light', text: t('nav.light') }, { v: 'dark', text: t('nav.dark') }]} />
        </Row>
        <Row title={t('set.sound')}>
          <Segmented label={t('set.sound')} value={sound.muted ? 'off' : 'on'} onChange={(v) => { if ((v === 'off') !== sound.muted) sound.toggle(); }}
            options={[{ v: 'on', text: t('set.on') }, { v: 'off', text: t('set.off') }]} />
        </Row>
      </section>

      <section className="set-card">
        <h2>{t('set.learning')}</h2>
        <Row title={t('home.unlockAll')} help={t('set.unlockHelp')}>
          <label className="switch"><input type="checkbox" checked={p.unlockAll} onChange={(e) => p.setUnlockAll(e.target.checked)} /><span /></label>
        </Row>
        <Row title={t('set.cards')} help={t('set.cardsHelp')}><button onClick={resetCards}>{t('set.cardsBtn')}</button></Row>
        <Row title={t('nav.story')}><button onClick={onStory}>{t('set.storyBtn')}</button></Row>
      </section>

      <section className="set-card">
        <h2>{t('set.progress')}</h2>
        <Row title={t('rec.backup')} help={t('rec.note')}>
          <div className="btn-row">
            <button onClick={backupProgress}><Icon name="save" /> {t('rec.backup')}</button>
            <button onClick={() => file.current?.click()}><Icon name="folder" /> {t('rec.restore')}</button>
            <input ref={file} type="file" accept="application/json,.json" hidden
              onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f && !(await restoreProgress(f, t('rec.restoreConfirm')))) setMsg(t('rec.badFile')); }} />
          </div>
        </Row>
        <Row title={t('home.reset')} help={t('set.resetHelp')}>
          <button className="danger" onClick={() => { if (confirm(t('home.resetConfirm'))) p.reset(); }}>{t('home.reset')}</button>
        </Row>
        {msg && <p className="note" role="status">{msg}</p>}
      </section>

      <section className="set-card">
        <h2>{t('set.refs')}</h2>
        <p className="note">{t('set.refsIntro')}</p>
        {REFS.map((g) => (
          <div key={g.group.en} className="ref-group">
            <h3>{tr(g.group)}</h3>
            <ul className="refs">
              {g.items.map((r) => (
                <li key={r.title}>
                  {r.url ? <a href={r.url} target="_blank" rel="noreferrer noopener">{r.title}</a> : <cite>{r.title}</cite>}
                  <span>{tr(r.detail)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="set-card">
        <h2>{t('set.about')}</h2>
        <dl className="about">
          {ABOUT.map(([k, v]) => <div key={k}><dt>{t(k)}</dt><dd>{tr(v)}</dd></div>)}
        </dl>
      </section>
    </main>
  );
}
