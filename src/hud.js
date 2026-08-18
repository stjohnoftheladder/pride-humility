// DOM HUD for explore + battle screens (byzantine gold-on-dark).
import { PRIDE_MAX, GRACE_MAX } from './config.js';

/** Escape text for safe HTML interpolation (defense-in-depth; all game
 *  content is author-controlled, but keep user-visible strings clean). */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export class Hud {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      prideFill: $('pride-fill'),
      graceFill: $('grace-fill'),
      meters: $('meters'),
      room: $('room-label'),
      msg: $('msg'),
      title: $('title-screen'),
      pause: $('pause-screen'),
      fall: $('fall-screen'),
      fallText: $('fall-text'),
      confess: $('confess-screen'),
      confessText: $('confess-text'),
      ending: $('ending-screen'),
      endingTitle: $('ending-title'),
      endingText: $('ending-text'),
      endingVerse: $('ending-verse'),
      battle: $('battle-ui'),
      battleDialog: $('battle-dialog'),
      battleEnemy: $('battle-enemy'),
      battleHp: $('battle-hp-num'),
      battleHpBox: $('battle-hp'),
      prayerFill: $('prayer-fill'),
      fightBar: $('fight-bar'),
      fightZone: $('fight-zone'),
      fightMarker: $('fight-marker'),
      battleMenu: $('battle-main'),
      battleCondition: $('battle-condition'),
      battleHints: $('battle-hints'),
      prompt: $('engage-prompt'),
      mute: $('mute-btn'),
      fps: $('fps'),
    };
    this.msgTimer = null;
    this.onStart = null;
    this.onResume = null;
    this.onRestart = null;
    this.onMute = null;
    this.onFallContinue = null;
    this.onConfess = null;

    $('start-btn')?.addEventListener('click', () => this.onStart?.());
    $('resume-btn')?.addEventListener('click', () => this.onResume?.());
    $('restart-btn')?.addEventListener('click', () => this.onRestart?.());
    $('fall-btn')?.addEventListener('click', () => this.onFallContinue?.());
    $('confess-btn')?.addEventListener('click', () => this.onConfess?.());
    this.el.mute?.addEventListener('click', () => this.onMute?.());
  }

  setMeters(pride, grace) {
    this.el.prideFill.style.width = `${Math.max(0, Math.min(100, (pride / PRIDE_MAX) * 100))}%`;
    this.el.graceFill.style.width = `${Math.max(0, Math.min(100, (grace / GRACE_MAX) * 100))}%`;
  }
  revealMeters() { this.el.meters?.classList.add('revealed'); }

  setRoom(text) { this.el.room.textContent = text; }

  message(text, dur = 2400) {
    this.el.msg.textContent = text;
    this.el.msg.classList.add('show');
    clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => this.el.msg.classList.remove('show'), dur);
  }

  showPrompt(text) {
    if (this.el.prompt) {
      this.el.prompt.textContent = text;
      this.el.prompt.style.display = 'block';
    }
  }

  hidePrompt() {
    if (this.el.prompt) this.el.prompt.style.display = 'none';
  }

  setFps(v) { this.el.fps.textContent = v.toFixed(0); }

  showTitle() {
    this._hideScreens();
    this.el.title.style.display = 'flex';
    this.battleOff();
  }

  showPause() {
    this.el.pause.style.display = 'flex';
  }

  hidePause() { this.el.pause.style.display = 'none'; }

  showExplore() {
    this._hideScreens();
    this.battleOff();
  }

  showFall(text) {
    this._hideScreens();
    this.el.fall.style.display = 'flex';
    this.el.fallText.textContent = text || '';
  }

  showConfess(text) {
    this._hideScreens();
    this.el.confess.style.display = 'flex';
    this.el.confessText.textContent = text || '';
  }

  showEnding(title, text, verse) {
    this._hideScreens();
    this.el.ending.style.display = 'flex';
    this.el.endingTitle.textContent = title;
    this.el.endingText.textContent = text;
    this.el.endingVerse.textContent = verse;
  }

  _hideScreens() {
    for (const id of ['title-screen', 'pause-screen', 'fall-screen', 'confess-screen', 'ending-screen']) {
      document.getElementById(id).style.display = 'none';
    }
  }

  // ---------------- battle ----------------
  battleOn() {
    this.el.battle.classList.add('show');
  }

  battleOff() {
    this.el.battle.classList.remove('show');
    this.showFightBar(false);
    this.setBattleCondition('');
    this.setBattleHints('');
  }

  battleDialog(html) { this.el.battleDialog.innerHTML = html; }
  battleEnemy(name) { this.el.battleEnemy.textContent = name; }
  battleSetHp(v, max) { this.el.battleHp.textContent = `${Math.max(0, v)} / ${max}`; }
  battleHpFlash() {
    this.el.battleHpBox.classList.remove('flash');
    void this.el.battleHpBox.offsetWidth;
    this.el.battleHpBox.classList.add('flash');
  }
  setPrayer(v) {
    this.el.prayerFill.style.width = `${Math.max(0, Math.min(100, v))}%`;
  }
  setBattleCondition(text, ready = false) {
    if (!this.el.battleCondition) return;
    this.el.battleCondition.textContent = text;
    this.el.battleCondition.classList.toggle('ready', ready);
  }
  setBattleHints(text) {
    if (this.el.battleHints) this.el.battleHints.textContent = text;
  }
  showFightBar(show) {
    if (this.el.fightBar) this.el.fightBar.style.display = show ? 'block' : 'none';
  }
  setFightMarker(p) {
    // p in [0,1]; marker sweeps the bar, zone sits around 0.35
    if (!this.el.fightMarker) return;
    const zone = 0.35;
    const zoneHalf = 0.09;
    this.el.fightZone.style.left = `${(zone - zoneHalf) * 100}%`;
    this.el.fightZone.style.width = `${zoneHalf * 2 * 100}%`;
    this.el.fightMarker.style.left = `${p * 100}%`;
  }

  /** Render the direct FIGHT / ALMS / WAIT-or-MERCY menu. */
  renderMenu(items, selected) {
    const cols = [];
    for (const it of items) {
      const cls = ['menu-item'];
      if (it.id === selected) cls.push('selected');
      if (it.enabled === false) cls.push('dim');
      cols.push(`<div class="${cls.join(' ')}" data-id="${it.id}">${it.label}</div>`);
    }
    this.el.battleMenu.innerHTML = cols.join('');
  }
}
