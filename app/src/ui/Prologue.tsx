// First-launch story: the mentor introduces the journey (can be reopened from the home screen).
import { useState } from 'react';
import { useT, type MessageKey } from '../i18n';
import { Modal } from './Dialogs';
import { Icon, Mentor } from './Icon';

const SLIDES: { icon: string; title: MessageKey; body: MessageKey }[] = [
  { icon: 'mentor', title: 'story.s1.t', body: 'story.s1.b' },
  { icon: 'bolt', title: 'story.s2.t', body: 'story.s2.b' },
  { icon: 'microscope', title: 'story.s3.t', body: 'story.s3.b' },
  { icon: 'factory', title: 'story.s4.t', body: 'story.s4.b' },
];

export const seenPrologue = () => { try { return localStorage.getItem('adg.prologue') === '1'; } catch { return true; } };

export function Prologue({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [i, setI] = useState(0);
  const close = () => { try { localStorage.setItem('adg.prologue', '1'); } catch { /* ignore */ } onClose(); };
  const s = SLIDES[i];
  return (
    <Modal title={t('story.title')} onClose={close}>
      <div className="prologue">
        <div className="pro-icon" aria-hidden="true">{s.icon === 'mentor' ? <Mentor size={64} /> : <Icon name={s.icon} size={44} />}</div>
        <h4>{t(s.title)}</h4>
        <p>{t(s.body)}</p>
        <div className="dots" aria-hidden="true">{SLIDES.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}</div>
        <div className="actions">
          <button onClick={close}>{t('story.skip')}</button>
          {i < SLIDES.length - 1
            ? <button className="primary" onClick={() => setI(i + 1)}>{t('story.next')} →</button>
            : <button className="primary" onClick={close}>{t('story.start')}</button>}
        </div>
      </div>
    </Modal>
  );
}
