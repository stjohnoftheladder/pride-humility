import { MultiplayerClient } from './client.js';
import { PilgrimAvatars } from './avatars.js';
import { NEARBY_DISTANCE, cleanName, worldName } from '../../multiplayer-worker/protocol.js';
import './fellowship.css';

const make = (tag, text, className) => { const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el; };
export class Fellowship {
  constructor({ parent, level, player, open, close, notify, endpoint }) {
    Object.assign(this, { player, open, close, notify });
    this.status = 'offline'; this.visible = false; this.frame = null; this.generation = 0;
    this.loadDaily = () => import('@daily-co/daily-js');
    this.avatars = new PilgrimAvatars(level.group);
    this.client = new MultiplayerClient(endpoint, message => this.receive(message), status => { this.status = status; this.render(); });
    this.el = make('section', '', 'screen fellowship-screen'); this.el.id = 'fellowship-screen'; this.el.hidden = true;
    this.el.setAttribute('role', 'dialog'); this.el.setAttribute('aria-modal', 'true'); this.el.setAttribute('aria-labelledby', 'fellowship-title');
    const heading = make('h2', 'MEET ON THE PILGRIM WAY'); heading.id = 'fellowship-title';
    const intro = make('p', 'Walk together. Wave to a neighbour. Invite someone nearby to a private 90-second conversation.', 'fellowship-intro');
    this.form = make('form', '', 'gathering-form');
    this.nameInput = make('input'); this.nameInput.maxLength = 24; this.nameInput.required = true;
    this.worldInput = make('input'); this.worldInput.maxLength = 40; this.worldInput.pattern = '[a-z0-9][a-z0-9-]{0,39}'; this.worldInput.required = true;
    this.worldInput.value = worldName(new URLSearchParams(location.search).get('world')) ?? 'pilgrim-way';
    try { this.nameInput.value = localStorage.getItem('pilgrim-display-name') ?? ''; } catch { /* private browsing */ }
    const field = (label, input) => { const el = make('label', label); el.append(input); return el; };
    this.joinButton = this.button('Join gathering', null); this.joinButton.type = 'submit';
    this.joinButton.disabled = !endpoint;
    this.form.append(field('Your name', this.nameInput), field('Gathering name', this.worldInput), this.joinButton);
    this.form.onsubmit = event => {
      event.preventDefault(); if (!endpoint || !worldName(this.worldInput.value)) return;
      const name = cleanName(this.nameInput.value); this.nameInput.value = name;
      try { localStorage.setItem('pilgrim-display-name', name); } catch { /* private browsing */ }
      this.client.connect(this.worldInput.value, name); this.render();
    };
    this.statusEl = make('p', '', 'fellowship-status'); this.statusEl.setAttribute('aria-live', 'polite');
    this.messageEl = make('p', '', 'fellowship-message'); this.messageEl.setAttribute('role', 'status');
    this.controls = make('div', '', 'fellowship-actions');
    this.copyButton = this.button('Copy gathering link', () => this.copyLink());
    this.disconnectButton = this.button('Leave gathering', () => { this.client.disconnect(); this.notice('You have left the gathering.'); });
    this.controls.append(this.copyButton, this.disconnectButton);
    this.conversation = make('section', '', 'conversation'); this.conversation.hidden = true;
    this.callControls = make('div', '', 'fellowship-actions');
    this.callText = make('p'); this.callText.setAttribute('aria-live', 'polite');
    this.videoStage = make('div', '', 'daily-stage'); this.videoStage.hidden = true;
    this.conversation.append(this.callText, this.callControls, this.videoStage);
    this.list = make('div', '', 'fellowship-peers');
    const privacy = make('p', 'Your inventory and story progress stay private. Camera and microphone start off. Either person may decline or leave.', 'fellowship-intro');
    this.returnButton = this.button('Return to the street · F / Escape', () => this.hide());
    this.el.append(heading, intro, this.form, this.statusEl, this.controls, this.messageEl, this.conversation, this.list, privacy, this.returnButton);
    parent.appendChild(this.el);
    this.dock = this.button('F · Fellowship', () => this.show()); this.dock.id = 'fellowship-dock'; parent.appendChild(this.dock);
    // the monastery test area is a single-player test bench
    if (new URLSearchParams(location.search).has('monastery')) this.dock.style.display = 'none';
    window.addEventListener('pagehide', () => { this.disposeCall(); this.client.disconnect(); });
    this.render();
  }
  button(label, action) { const button = make('button', label, 'btn'); button.type = 'button'; if (action) button.onclick = action; return button; }
  show() {
    if (!this.visible && !this.open()) return false;
    const wasVisible = this.visible;
    if (!wasVisible) this.previousFocus = document.activeElement;
    this.visible = true; this.el.hidden = false;
    this.render();
    if (!wasVisible) this.focusControl();
    return true;
  }
  focusControl() {
    (this.callControls.querySelector('button:not(:disabled)') ?? (this.status === 'offline' ? this.nameInput : this.returnButton)).focus();
  }
  hide() {
    if (this.call || this.invitation || this.preparing) { this.notice('Finish or cancel the conversation before returning to the street.'); return; }
    this.el.hidden = true; this.visible = false; this.close(); this.previousFocus?.focus();
  }
  notice(message) { this.messageEl.textContent = message; }
  key(event) {
    if (event.code === 'Escape') { event.preventDefault(); if (!event.repeat) this.hide(); return; }
    if (event.code === 'KeyF' && !['INPUT', 'TEXTAREA'].includes(event.target.tagName)) { event.preventDefault(); if (!event.repeat) this.hide(); return; }
    if (event.code !== 'Tab') return;
    const controls = [...this.el.querySelectorAll('input,button,iframe')].filter(el => !el.disabled && el.getClientRects().length);
    if (!controls.length) return;
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
  }
  receive(message) {
    if (['peer', 'leave', 'welcome'].includes(message.type)) { this.renderPeers(); return; }
    if (message.type === 'reset') {
      this.invitation = null; this.preparing = null; this.call = null; this.endsAt = null;
      this.disposeCall(); this.render(); return;
    }
    if (message.type === 'wave') { this.notify(`${message.name} waves to you.`); this.notice(`${message.name} waves to you.`); }
    if (message.type === 'notice') this.notice(message.message);
    if (message.type === 'invitation') {
      this.invitation = message;
      if (!this.show()) { this.client.send({ type: message.incoming ? 'respond' : 'cancel', inviteId: message.invite.id, accept: false }); return; }
    }
    if (message.type === 'invite-ended' && this.invitation?.invite.id === message.inviteId) { this.invitation = null; this.notice(message.message); }
    if (message.type === 'preparing') { this.invitation = null; this.preparing = message.callId; }
    if (message.type === 'call-ready') {
      if (this.preparing !== message.callId) { this.client.send({ type: 'leave-call' }); return; }
      this.preparing = null; this.call = message; this.endsAt = null;
    }
    if (message.type === 'call-start' && this.call?.callId === message.callId) this.endsAt = message.endsAt;
    if (message.type === 'call-ended' && (this.call?.callId === message.callId || this.preparing === message.callId)) {
      this.call = null; this.preparing = null; this.endsAt = null; this.disposeCall(); this.notice(message.message);
    }
    this.render();
  }
  render() {
    if (!this.el) return;
    const connected = this.status === 'connected', busy = !!(this.call || this.invitation || this.preparing);
    this.dock.textContent = connected ? `F · Fellowship · ${this.client.peers.size + 1} here` : 'F · Fellowship';
    this.statusEl.textContent = !this.client.endpoint ? 'Multiplayer is not configured for this build.'
      : connected ? `${this.client.world} · ${this.client.peers.size + 1} here${this.client.videoEnabled ? '' : ' · Audio/video not configured'}`
      : this.status === 'offline' ? 'Join a gathering to meet other players.' : this.status === 'connecting' ? 'Connecting…' : 'Connection lost. Reconnecting…';
    this.nameInput.disabled = this.worldInput.disabled = this.status !== 'offline';
    this.joinButton.hidden = this.status !== 'offline';
    this.copyButton.hidden = this.disconnectButton.hidden = this.status === 'offline';
    this.renderPeers();
    this.conversation.hidden = !busy;
    const signature = [this.invitation?.invite.id, this.invitation?.incoming, this.preparing, this.call?.callId, !!this.frame, !!this.joining, !!this.endsAt].join('|');
    const controlsChanged = this.controlsSignature !== signature;
    const hadControlFocus = this.callControls.contains(document.activeElement);
    if (controlsChanged) { this.controlsSignature = signature; this.callControls.replaceChildren(); }
    if (this.invitation) {
      const { invite, incoming } = this.invitation;
      this.callText.textContent = incoming ? `${invite.aName} invites you to a private ${invite.mode} conversation.` : `Waiting for ${invite.bName} to reply…`;
      if (controlsChanged) {
        if (incoming) this.callControls.append(this.button('Accept invitation', () => this.client.send({ type: 'respond', inviteId: invite.id, accept: true })));
        this.callControls.append(this.button(incoming ? 'Decline' : 'Cancel invitation', () => this.client.send({ type: incoming ? 'respond' : 'cancel', inviteId: invite.id, accept: false })));
      }
    } else if (this.preparing) this.callText.textContent = 'Preparing your private conversation…';
    else if (this.call) {
      this.callText.textContent = this.endsAt ? `Conversation · ${Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000))}s remaining`
        : this.frame ? 'Waiting for both players to join…' : `${this.call.peerName} is ready. Choose Join when you are ready for Daily’s camera and microphone setup.`;
      if (controlsChanged && !this.frame && !this.joining) this.callControls.append(this.button('Join conversation', () => this.joinCall()));
    }
    if (controlsChanged && (this.preparing || this.call)) this.callControls.append(this.button('End conversation', () => this.endCall()));
    this.returnButton.disabled = busy;
    if (this.visible && controlsChanged && (hadControlFocus || document.activeElement === this.returnButton || document.activeElement === document.body)) this.focusControl();
  }
  renderPeers() {
    if (!this.list) return;
    if (this.status === 'connected') this.statusEl.textContent = `${this.client.world} · ${this.client.peers.size + 1} here${this.client.videoEnabled ? '' : ' · Audio/video not configured'}`;
    this.rows ??= new Map();
    for (const [id, row] of this.rows) if (!this.client.peers.has(id)) { row.remove(); this.rows.delete(id); }
    this.emptyNote ??= make('p', 'You are the first here. Share this gathering link with a friend.');
    this.emptyNote.hidden = this.status !== 'connected' || this.client.peers.size > 0;
    if (!this.emptyNote.parentElement) this.list.append(this.emptyNote);
    this.dock.textContent = this.status === 'connected' ? `F · Fellowship · ${this.client.peers.size + 1} here` : 'F · Fellowship';
    const busy = !!(this.call || this.invitation || this.preparing);
    for (const peer of this.client.peers.values()) {
      let row = this.rows.get(peer.id);
      if (!row) {
        row = make('article', '', 'fellowship-peer'); row.dataset.peerId = peer.id;
        row.append(make('strong', peer.name), make('span'));
        const actions = make('div', '', 'fellowship-actions');
        for (const [label, mode] of [['Wave', null], ['Invite · audio', 'audio'], ['Invite · video', 'video']]) {
          const button = this.button(label, () => this.client.send({ type: mode ? 'invite' : 'wave', peerId: peer.id, ...(mode ? { mode } : {}) }));
          button.dataset.mode = mode ?? 'wave'; actions.append(button);
        }
        actions.append(this.button('Block', () => this.client.send({ type: 'block', peerId: peer.id })));
        row.append(actions); this.list.append(row); this.rows.set(peer.id, row);
      }
      const distance = Math.hypot(this.player.pos.x - peer.x, this.player.pos.z - peer.z);
      row.querySelector('span').textContent = `${Math.round(distance)} paces · ${peer.busy || !peer.available ? 'busy' : distance <= NEARBY_DISTANCE ? 'nearby' : 'walk closer'}`;
      for (const button of row.querySelectorAll('[data-mode]')) button.disabled = distance > NEARBY_DISTANCE
        || (button.dataset.mode !== 'wave' && (!this.client.videoEnabled || busy || peer.busy || !peer.available));
    }
  }
  async copyLink() {
    const url = new URL(location.href); url.searchParams.set('world', this.client.world); url.searchParams.delete('debug');
    try { await navigator.clipboard.writeText(url.href); this.notice('Gathering link copied.'); }
    catch { this.notice(`Gathering link: ${url.href}`); }
  }
  async joinCall() {
    if (!this.call || this.frame || this.joining) return;
    const call = this.call, generation = ++this.generation; this.joining = true; this.render();
    try {
      const { default: Daily } = await this.loadDaily();
      if (generation !== this.generation || this.call !== call) return;
      if (!Daily.supportedBrowser().supported) throw new Error('Unsupported browser');
      this.videoStage.hidden = false;
      const frame = Daily.createFrame(this.videoStage, {
        showLeaveButton: true, showFullscreenButton: false, showUserNameChangeUI: false,
        iframeStyle: { width: '100%', height: '100%', border: '0' },
      });
      this.frame = frame;
      const current = () => this.frame === frame && generation === this.generation;
      frame.on('joined-meeting', () => { if (current()) this.client.send({ type: 'joined', callId: call.callId }); });
      for (const event of ['left-meeting', 'participant-left', 'error']) frame.on(event, () => { if (current()) this.endCall(); });
      await frame.join({ url: call.roomUrl, token: call.token, startVideoOff: true, startAudioOff: true });
    } catch {
      if (generation === this.generation) { this.notice('Daily could not start. Check camera/microphone permissions and try again.'); this.endCall(); }
    } finally { if (generation === this.generation) { this.joining = false; this.render(); } }
  }
  endCall() {
    this.client.send({ type: 'leave-call' }); this.call = null; this.preparing = null; this.endsAt = null;
    this.disposeCall(); this.render();
  }
  async disposeCall() {
    ++this.generation; this.joining = false;
    const frame = this.frame; this.frame = null;
    if (this.videoStage) { this.videoStage.hidden = true; this.videoStage.replaceChildren(); }
    if (!frame) return;
    // Stop both media tracks before attempting network teardown.
    await Promise.allSettled([frame.setLocalAudio(false), frame.setLocalVideo(false)]);
    try { await frame.leave(); } catch { /* disconnected */ }
    try { await frame.destroy(); } catch { /* already destroyed */ }
  }
  update(dt, time, state) {
    this.dock.hidden = !['menu', 'explore', 'paused', 'fellowship'].includes(state);
    this.client.update({ x: this.player.pos.x, z: this.player.pos.z,
      yaw: ((this.player.camera.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2),
      available: ['explore', 'fellowship'].includes(state) && !document.hidden });
    this.avatars.update(this.client.peers, dt, time);
    if (this.endsAt && Date.now() >= this.endsAt) this.endCall();
    if (this.visible && time - (this.lastRender ?? 0) > 1) {
      this.lastRender = time;
      this.renderPeers();
      // Preserve focused input/buttons while a person reads or navigates.
      if (this.call && this.endsAt) this.callText.textContent = `Conversation · ${Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000))}s remaining`;
    }
  }
}
