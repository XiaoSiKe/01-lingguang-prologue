/* Original Zero → One machinery. Playback, identity, inventory and audio stay
 * in the upstream host. This renderer consumes their actual state only. */
(() => {
  'use strict';
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => 1 - Math.pow(1 - clamp(x), 4);
  const logo = new Image();
  logo.onload = () => { if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('resize')); };
  logo.src = 'assets/rixin-logo.jpg';
  const labels = ['序章', '本地连接', '身份确认', '能力读取', '结果确认', '从零到一'];
  const palette = light => light
    ? {bg:'#f5f5f5',ink:'#161616',soft:'#595959',line:'#b8b8b8',accent:'#161616',cool:'#777777',ghostA:'#555555',ghostB:'#999999'}
    : {bg:'#000000',ink:'#f2f2f2',soft:'#a3a3a3',line:'#383838',accent:'#f2f2f2',cool:'#a3a3a3',ghostA:'#888888',ghostB:'#cccccc'};
  let ui;
  function elements() {
    return ui ||= Object.fromEntries(['rxPrimary','rxPrimaryLabel','rxPrimaryHint','rxPhase','rxConnection','rxBrandEnglish','rxSteps'].map(id => [id, document.getElementById(id)]));
  }
  function update(state) {
    const u = elements();
    if (!u.rxPrimary) return;
    const label = state.starting ? '正在开启' : state.playing ? '序列运行中' : state.completed ? '重新体验' : state.phase === 0 ? '开启序列' : state.phase === 2 ? (state.locked ? '请先验证访问密码' : state.connection === 'local' ? '确认身份，继续' : '继续离线演出') : state.phase === 4 ? (state.connection === 'local' ? '确认本机清单' : '查看离线结果') : '继续序列';
    if (u.rxPrimaryLabel.textContent !== label) u.rxPrimaryLabel.textContent = label;
    u.rxPrimary.disabled = state.playing || state.starting || (state.locked && state.phase >= 2);
    const hint = state.playing ? 'P 暂停 · M 静音 · Esc 跳过' : state.locked && state.phase >= 2 ? '在身份卡中输入访问密码' : state.completed ? 'R 重播 · 可在右上角调整播放' : 'Enter / Space 确认 · M 静音';
    if (u.rxPrimaryHint.textContent !== hint) u.rxPrimaryHint.textContent = hint;
    const phase = String(state.phase + 1).padStart(2,'0') + ' / ' + labels[state.phase];
    if (u.rxPhase.textContent !== phase) u.rxPhase.textContent = phase;
    const connection = state.connection === 'local' ? '本地连接已建立' : state.connection === 'connecting' ? '正在连接本机服务' : '离线预览 · 未读取本机数据';
    if (u.rxConnection.textContent !== connection) u.rxConnection.textContent = connection;
    const english = state.phase === 5 ? 'A NEW POSSIBILITY STARTS HERE' : 'ZERO TO ONE / RIXIN AI';
    if (u.rxBrandEnglish.textContent !== english) u.rxBrandEnglish.textContent = english;
    [...u.rxSteps.children].forEach((node, i) => {
      const current = String(i === state.phase), past = String(i < state.phase);
      if (node.dataset.current !== current) node.dataset.current = current;
      if (node.dataset.past !== past) node.dataset.past = past;
    });
  }
  function emblem(ctx, x, y, size, alpha = 1, color = '#f2f2f2', assembly = 1) {
    if (!logo.complete || !logo.naturalWidth) return;
    const t=ease(assembly);
    ctx.save();
    ctx.globalAlpha=clamp(alpha*t);
    if(color==='#f2f2f2')ctx.globalCompositeOperation='screen';
    const settledSize=size*(1+(1-t)*.12);
    // Preserve the original silver artwork. Crop only its empty outer margins.
    ctx.drawImage(logo,342,365,580,600,x-settledSize/2,y-settledSize*600/580/2,settledSize,settledSize*600/580);
    ctx.restore();
  }
  function engravePart(ctx, index, background, strength) {
    // Static grooves are clipped to the original moving component. Its upstream
    // translation, rotation, overshoot and timing remain untouched.
    ctx.save();ctx.clip('evenodd');ctx.globalAlpha=clamp(strength*.28);
    ctx.strokeStyle=background;ctx.lineWidth=.7;ctx.beginPath();
    if(index<2) {
      const side=index===0?-1:1;
      ctx.moveTo(side*63,30);ctx.lineTo(side*7,-67);
      ctx.moveTo(side*57,29);ctx.lineTo(side*20,-35);
    } else {
      ctx.moveTo(-75,79.5);ctx.lineTo(62,79.5);
      ctx.moveTo(67,79.5);ctx.lineTo(78,79.5);
    }
    ctx.stroke();ctx.restore();
  }
  function decorateSeal(ctx,{assembly,alpha,fill,color,background,reduced}) {
    if(fill<=.1)return;
    const reveal=reduced?1:ease((assembly-.2)/.65);
    ctx.save();ctx.globalAlpha=clamp(alpha*reveal);ctx.fillStyle=background;
    ctx.beginPath();ctx.moveTo(0,-42.7);ctx.lineTo(48,40.42);ctx.lineTo(-48,40.42);ctx.closePath();ctx.fill();
    // Three subtle registration marks keep the original central void legible.
    ctx.strokeStyle=color;ctx.lineWidth=.55;ctx.globalAlpha=clamp(alpha*reveal*.32);
    ctx.beginPath();ctx.moveTo(-3,-32);ctx.lineTo(0,-37);ctx.lineTo(3,-32);
    ctx.moveTo(-37,32);ctx.lineTo(-40,37);ctx.lineTo(-34,37);
    ctx.moveTo(37,32);ctx.lineTo(40,37);ctx.lineTo(34,37);ctx.stroke();ctx.restore();
    emblem(ctx,0,15,44,alpha*reveal,color,1);
  }
  // Every phase runs the actual upstream renderer. This module only supplies
  // the neutral palette, literal club artwork, engravings and the existing UI.
  function draw(ctx,width,height,state) { return window.DSHVisuals.draw(ctx,width,height,state); }
  window.DSHRixin=Object.freeze({draw,palette,emblem,update,engravePart,decorateSeal});
})();
