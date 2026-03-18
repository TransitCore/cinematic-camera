(function () {
  const api = window.SubwayBuilderAPI;
  if (!api) { return; }

  let map = null;
  let keyframes = [];
  let isPlaying = false;
  let flyTimeout = null;
  let currentIndex = 0;
  let zenModeEnabled = false;
  let styleEl = null;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function captureKeyframe() {
    if (!map) return;
    var center = map.getCenter();
    keyframes.push({
      id: 'kf-' + Date.now(),
      label: 'Keyframe ' + (keyframes.length + 1),
      center: [center.lng, center.lat],
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      duration: 3000
    });
  }

  function jumpToKeyframe(kf) {
    if (!map) return;
    map.flyTo({ center: kf.center, zoom: kf.zoom, bearing: kf.bearing, pitch: kf.pitch, duration: 800 });
  }

  function hideUI() {
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'cinematic-zen-css';
      styleEl.textContent = [
        '.relative.flex.flex-col.h-screen > *:not(.maplibregl-map):not(canvas) { opacity: 0 !important; pointer-events: none !important; transition: opacity 0.5s ease !important; }',
        '.maplibregl-ctrl-top-left, .maplibregl-ctrl-top-right, .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right { opacity: 0 !important; pointer-events: none !important; transition: opacity 0.5s ease !important; }'
      ].join(' ');
      document.head.appendChild(styleEl);
    }
    styleEl.disabled = false;
  }

  function showUI() {
    if (styleEl) styleEl.disabled = true;
  }

  function stopPlayback() {
    if (flyTimeout) { clearTimeout(flyTimeout); flyTimeout = null; }
    try { if (map) map.stop(); } catch(e) {}
    isPlaying = false;
    currentIndex = 0;
    if (zenModeEnabled) showUI();
  }

  function flyNext() {
    if (!isPlaying) return;
    currentIndex += 1;
    if (currentIndex >= keyframes.length) {
      api.ui.showNotification('Cinematic complete!', 'success');
      stopPlayback();
      return;
    }
    var kf = keyframes[currentIndex];
    map.flyTo({
      center: kf.center,
      zoom: kf.zoom,
      bearing: kf.bearing,
      pitch: kf.pitch,
      duration: kf.duration,
      easing: easeInOutCubic
    });
    flyTimeout = setTimeout(function() {
      if (isPlaying) flyNext();
    }, kf.duration + 120);
  }

  function startPlayback() {
    if (keyframes.length < 2 || isPlaying) return;
    isPlaying = true;
    currentIndex = 0;
    if (zenModeEnabled) hideUI();
    var first = keyframes[0];
    map.jumpTo({ center: first.center, zoom: first.zoom, bearing: first.bearing, pitch: first.pitch });
    flyTimeout = setTimeout(flyNext, 400);
  }

  var h = api.utils.React.createElement;
  var useState = api.utils.React.useState;
  var useEffect = api.utils.React.useEffect;

  var FONT = 'Inter, ui-sans-serif, system-ui, sans-serif';

  function formatDuration(ms) {
    return ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1) + 's';
  }

  function Toggle(props) {
    return h('div', {
      onClick: props.onClick,
      style: {
        width: '36px', height: '20px', borderRadius: '10px',
        background: props.on ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.35)',
        border: '1px solid ' + (props.on ? 'hsl(var(--primary))' : 'hsl(var(--border))'),
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0
      }
    },
      h('div', {
        style: {
          width: '14px', height: '14px', borderRadius: '50%',
          background: 'white',
          position: 'absolute', top: '2px',
          left: props.on ? '18px' : '2px',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
        }
      })
    );
  }

  function CinematicPanel() {
    var state = useState(0);
    var tick = state[1];
    var forceUpdate = function() { tick(function(n) { return n + 1; }); };

    useEffect(function() {
      var interval = setInterval(forceUpdate, 200);
      return function() { clearInterval(interval); };
    }, []);

    var kfs = keyframes;
    var playing = isPlaying;
    var canPlay = kfs.length >= 2 && !playing;

    return h('div', { style: { padding: '12px', width: '260px', fontFamily: FONT } },

      // Header
      h('div', { style: { marginBottom: '10px', color: 'hsl(var(--primary))', fontWeight: '800', fontSize: '14px' } },
        'Timeline'
      ),

      // Empty state
      kfs.length === 0 && h('div', { style: { color: 'hsl(var(--muted-foreground))', fontSize: '12px', marginBottom: '10px', textAlign: 'center', padding: '16px 0' } },
        'No keyframes yet.', h('br', null), 'Position the map then click Add Keyframe.'
      ),

      // Keyframe list
      kfs.length > 0 && h('div', { style: { maxHeight: '240px', overflowY: 'auto', marginBottom: '10px' } },
        kfs.map(function(kf, i) {
          var isActive = playing && currentIndex === i;
          return h('div', {
            key: kf.id,
            style: {
              background: isActive ? 'hsl(var(--accent))' : 'hsl(var(--muted) / 0.5)',
              border: '1px solid ' + (isActive ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border))'),
              borderRadius: '6px', padding: '6px 8px', marginBottom: '4px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }
          },
            h('span', { style: {
              width: '20px', height: '20px', borderRadius: '50%',
              background: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: '700',
              color: isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
              flexShrink: 0
            }}, i + 1),
            h('span', { style: {
              flex: 1, fontSize: '13px', fontWeight: '500',
              color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'
            }}, kf.label),
            i > 0 && h('span', { style: { fontSize: '11px', color: 'hsl(var(--muted-foreground))', fontVariantNumeric: 'tabular-nums' } },
              formatDuration(kf.duration)
            ),
            h('button', {
              onClick: function() { jumpToKeyframe(kf); },
              style: { background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', fontSize: '13px', padding: '2px', lineHeight: 1 },
              title: 'Jump to view'
            }, '📍'),
            h('button', {
              onClick: function() { keyframes = keyframes.filter(function(k) { return k.id !== kf.id; }); forceUpdate(); },
              style: { background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', fontSize: '13px', padding: '2px', lineHeight: 1 }
            }, '✕')
          );
        })
      ),

      // Duration slider
      kfs.length > 1 && !playing && h('div', { style: { marginBottom: '10px' } },
        h('div', { style: { fontSize: '11px', color: 'hsl(var(--muted-foreground))', marginBottom: '4px' } },
          'Last keyframe fly duration: ' + formatDuration(kfs[kfs.length - 1].duration)
        ),
        h('input', {
          type: 'range', min: 500, max: 15000, step: 500,
          value: kfs[kfs.length - 1].duration,
          onChange: function(e) { keyframes[keyframes.length - 1].duration = parseInt(e.target.value); forceUpdate(); },
          style: { width: '100%', accentColor: 'hsl(var(--primary))' }
        })
      ),

      // Zen mode toggle
      h('div', { style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px', marginBottom: '8px',
        background: 'hsl(var(--muted) / 0.5)',
        border: '1px solid hsl(var(--border))',
        borderRadius: '6px'
      }},
        h('span', { style: { fontSize: '12px', fontWeight: '500', color: 'hsl(var(--foreground))' } },
          'Zen mode during playback'
        ),
        h(Toggle, { on: zenModeEnabled, onClick: function() { zenModeEnabled = !zenModeEnabled; forceUpdate(); } })
      ),

      // Add Keyframe
      h('button', {
        onClick: function() { captureKeyframe(); forceUpdate(); },
        disabled: playing,
        style: {
          width: '100%', padding: '8px', marginBottom: '6px',
          background: playing ? 'hsl(var(--muted))' : 'hsl(var(--primary) / 0.1)',
          border: '1px solid ' + (playing ? 'hsl(var(--border))' : 'hsl(var(--primary) / 0.4)'),
          borderRadius: '6px',
          color: playing ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))',
          cursor: playing ? 'not-allowed' : 'pointer',
          fontSize: '13px', fontWeight: '700', fontFamily: FONT
        }
      }, '+ Add Keyframe'),

      // Play / Stop / Clear row
      h('div', { style: { display: 'flex', gap: '6px' } },
        playing
          ? h('button', {
              onClick: stopPlayback,
              style: {
                flex: 1, padding: '7px',
                background: 'hsl(0 84% 60% / 0.12)',
                border: '1px solid hsl(0 84% 60% / 0.5)',
                borderRadius: '6px', color: 'hsl(0 84% 60%)',
                cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: FONT
              }
            }, '⏹ Stop')
          : h('button', {
              onClick: startPlayback,
              disabled: !canPlay,
              style: {
                flex: 1, padding: '7px',
                background: canPlay ? 'hsl(142 76% 36% / 0.12)' : 'hsl(var(--muted))',
                border: '1px solid ' + (canPlay ? 'hsl(142 76% 36% / 0.5)' : 'hsl(var(--border))'),
                borderRadius: '6px',
                color: canPlay ? 'hsl(142 76% 36%)' : 'hsl(var(--muted-foreground))',
                cursor: canPlay ? 'pointer' : 'not-allowed',
                fontSize: '13px', fontWeight: '700', fontFamily: FONT
              }
            }, canPlay ? '▶ Play' : 'Need 2+ keyframes'),

        h('button', {
          onClick: function() { keyframes = []; if (isPlaying) stopPlayback(); forceUpdate(); },
          disabled: playing || kfs.length === 0,
          style: {
            padding: '7px 10px',
            background: 'hsl(var(--muted))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            color: (playing || kfs.length === 0) ? 'hsl(var(--muted-foreground) / 0.4)' : 'hsl(var(--muted-foreground))',
            cursor: (playing || kfs.length === 0) ? 'not-allowed' : 'pointer',
            fontSize: '13px', fontFamily: FONT
          }
        }, '🗑 Clear')
      ),

      // Status
      playing && h('div', { style: { marginTop: '8px', fontSize: '11px', color: 'hsl(var(--muted-foreground))', textAlign: 'center' } },
        '● Flying to keyframe ' + currentIndex + ' of ' + (kfs.length - 1) + '…'
      )
    );
  }

  api.hooks.onMapReady(function(m) {
    map = m;
    api.ui.addToolbarPanel({
      id: 'cinematic-camera-panel',
      icon: 'Film',
      tooltip: 'Cinematic Camera',
      title: 'Cinematic Camera',
      width: 300,
      render: CinematicPanel
    });
  });

  api.hooks.onGameEnd(function() { stopPlayback(); });

})();
