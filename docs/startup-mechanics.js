/* Local Web Audio machinery. Shared by live playback and OfflineAudioContext QA. */
(() => {
  'use strict';
  const noiseCache=new WeakMap();
  const reference=[2.8,2.8,3.4,3.2,2.8,3];
  function noiseFor(context) {
    if(noiseCache.has(context))return noiseCache.get(context);
    const length=Math.max(1,Math.floor(context.sampleRate));
    const buffer=context.createBuffer(1,length,context.sampleRate),data=buffer.getChannelData(0);
    let seed=7139;
    for(let i=0;i<length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=(seed>>>0)/2147483648-1;}
    noiseCache.set(context,buffer);return buffer;
  }
  class Engine {
    constructor(context,output) {
      this.context=context;this.sources=new Set();this.noise=noiseFor(context);
      this.mix=context.createGain();this.mix.gain.value=.86;this.ducked=false;
      if(context.createDynamicsCompressor){
        const compressor=context.createDynamicsCompressor();
        compressor.threshold.value=-16;compressor.knee.value=14;compressor.ratio.value=4;
        compressor.attack.value=.004;compressor.release.value=.16;
        this.mix.connect(compressor);compressor.connect(output);this.compressor=compressor;
      }else this.mix.connect(output);
    }
    duck(active) {
      if(this.ducked===active||this.context.state==='closed')return;
      this.ducked=active;const gain=this.mix.gain,value=active?.44:.86,now=this.context.currentTime;
      if(gain.setTargetAtTime)gain.setTargetAtTime(value,now,.035);else gain.setValueAtTime(value,now);
    }
    stop() {
      for(const source of [...this.sources]){try{source.stop();}catch{/* Already ended. */}}
    }
    register(sources,nodes,at,duration) {
      let remaining=sources.length;
      for(const source of sources){
        this.sources.add(source);let ended=false;
        source.onended=()=>{
          if(ended)return;ended=true;this.sources.delete(source);source.disconnect();
          if(--remaining===0)for(const node of nodes)node.disconnect();
        };
        source.start(at);source.stop(at+duration+.012);
      }
    }
    envelope(at,duration,gain,attack=.008) {
      const node=this.context.createGain();node.gain.setValueAtTime(0,at);
      node.gain.linearRampToValueAtTime(gain,at+Math.min(attack,duration*.2));
      node.gain.exponentialRampToValueAtTime(.0001,at+duration);return node;
    }
    tone(at,hz,duration,gain,type='sine',endHz=hz,cutoff=4000) {
      const source=this.context.createOscillator(),filter=this.context.createBiquadFilter();
      source.type=type;source.frequency.setValueAtTime(hz,at);
      source.frequency.exponentialRampToValueAtTime(Math.max(1,endHz),at+duration);
      filter.type='lowpass';filter.frequency.value=cutoff;filter.Q.value=.65;
      const envelope=this.envelope(at,duration,gain);
      source.connect(filter);filter.connect(envelope);envelope.connect(this.mix);
      this.register([source],[filter,envelope],at,duration);
    }
    air(at,duration,gain,center=1600) {
      const source=this.context.createBufferSource(),filter=this.context.createBiquadFilter();
      source.buffer=this.noise;source.loop=true;filter.type='bandpass';filter.frequency.value=center;filter.Q.value=.7;
      const envelope=this.envelope(at,duration,gain,.004);
      source.connect(filter);filter.connect(envelope);envelope.connect(this.mix);
      this.register([source],[filter,envelope],at,duration);
    }
    motor(at,duration,strength,startHz=45,endHz=95) {
      const source=this.context.createOscillator(),pulse=this.context.createOscillator();
      const filter=this.context.createBiquadFilter(),vca=this.context.createGain(),modulation=this.context.createGain();
      source.type='sawtooth';source.frequency.setValueAtTime(startHz,at);
      source.frequency.exponentialRampToValueAtTime(endHz,at+duration*.38);
      source.frequency.exponentialRampToValueAtTime(Math.max(1,endHz*.68),at+duration);
      filter.type='lowpass';filter.frequency.setValueAtTime(430,at);filter.frequency.exponentialRampToValueAtTime(950,at+duration*.4);filter.Q.value=.7;
      const envelope=this.context.createGain();
      envelope.gain.setValueAtTime(0,at);
      envelope.gain.linearRampToValueAtTime(.085*strength,at+Math.min(.075,duration*.2));
      envelope.gain.linearRampToValueAtTime(.068*strength,at+duration*.72);
      envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
      vca.gain.value=.78;modulation.gain.value=.22;
      pulse.type='square';pulse.frequency.setValueAtTime(24,at);pulse.frequency.exponentialRampToValueAtTime(36,at+duration);
      source.connect(filter);filter.connect(envelope);envelope.connect(vca);vca.connect(this.mix);
      pulse.connect(modulation);modulation.connect(vca.gain);
      this.register([source,pulse],[filter,envelope,vca,modulation],at,duration);
      this.tone(at,startHz*.5,duration,.045*strength,'sine',endHz*.45,220);
    }
    metal(at,strength,scale=1) {
      [[980,.095,.029],[1670,.065,.019],[2630,.035,.012]].forEach(([hz,duration,gain],i)=>
        this.tone(at+i*.003*scale,hz*1.025,duration*scale,gain*strength,'sine',hz*.82,3600));
    }
    relay(at,strength,scale=1) {
      this.air(at,.022*scale,.055*strength,2300);
      this.tone(at+.006*scale,240,.052*scale,.035*strength,'triangle',110,1500);
      this.metal(at+.012*scale,strength*.45,scale*.65);
    }
    servo(at,duration,strength,from=560,to=180) {
      this.tone(at,from,duration,.034*strength,'sawtooth',to,1800);
      this.air(at,duration*.55,.024*strength,1900);
    }
    latch(at,strength,scale=1) {
      this.tone(at,88,.29*scale,.135*strength,'sine',38,350);
      this.air(at,.065*scale,.07*strength,900);
      this.metal(at+.018*scale,strength,scale);
      this.relay(at+.072*scale,strength*.48,scale*.8);
    }
    click() { this.relay(this.context.currentTime+.008,.48,.85); }
    phase(index,{duration=reference[index],elapsed=0,speed=1,startTime=this.context.currentTime+.02}={}) {
      if(!Number.isInteger(index)||index<0||index>5||!Number.isFinite(duration)||duration<=0||!Number.isFinite(speed)||speed<=0)return;
      this.stop();
      const ratio=duration/reference[index],scale=ratio/speed;
      const event=(position,play)=>{const at=position*ratio;if(at>=elapsed-.025)play(startTime+Math.max(0,at-elapsed)/speed);};
      const motor=(at,len,strength,from,to)=>event(at,time=>this.motor(time,len*scale,strength,from,to));
      const relay=(at,strength=1)=>event(at,time=>this.relay(time,strength,scale));
      const servo=(at,len,strength,from,to)=>event(at,time=>this.servo(time,len*scale,strength,from,to));
      const latch=(at,strength=1)=>event(at,time=>this.latch(time,strength,scale));
      const air=(at,len,strength,hz)=>event(at,time=>this.air(time,len*scale,strength,hz));
      switch(index){
        case 0:
          motor(.02,1.78,.9,45,90);air(.06,.2,.035,700);relay(.38,.7);servo(.75,.45,.65,340,100);latch(2.1,.95);break;
        case 1:
          motor(.02,1.9,.5,70,50);[.12,.24,.44,.92,1.08].forEach(at=>relay(at,.65));servo(1.75,.32,.7,520,180);latch(2.15,.6);break;
        case 2:
          motor(.05,2.45,.25,50,62);[.1,.6,1.25].forEach(at=>relay(at,.62));servo(1.55,.46,.65,680,220);latch(2.55,.85);break;
        case 3:
          motor(.02,2.35,.65,52,120);servo(.25,.55,.6,240,620);[.3,.85,1.45].forEach(at=>relay(at,.5));air(1.65,.2,.04,1000);latch(2.5,.72);break;
        case 4:
          [.06,.65,1.25].forEach((at,i)=>relay(at,.7+i*.1));servo(.7,.32,.45,240,110);latch(2.08,1);break;
        case 5:
          motor(.01,.95,.5,68,42);servo(.18,.35,.65,650,160);latch(1.3,1.15);air(1.3,.18,.07,900);break;
      }
    }
  }
  globalThis.DSHMechanics=Object.freeze({Engine});
})();
