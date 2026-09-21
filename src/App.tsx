import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, SkipBack, SkipForward, Music, Sun, Moon } from 'lucide-react';
import DomeGallery from './components/DomeGallery';
import CardSwap, { Card } from './components/CardSwap';
import GradientWaves from './components/GradientWaves';
import { type MenuItem, getSelectionCode } from './lib/jukebox';
import { useSpotifyPlayback } from './lib/spotify/useSpotifyPlayback';

/* ═══════════════════════════════════════════════
   THEMES
   ☀️  sunset  — praia ao pôr do sol
   🌙  moonlit — praia ao luar
═══════════════════════════════════════════════ */
type Theme = 'sunset' | 'moonlit';

const THEMES = {
  sunset: {
    /* GradientWaves */
    horizonColor: '#ffb347',  // laranja dourado — céu quente
    waveColor:    '#c83820',  // coral profundo — água reflectindo o sol
    crestColor:   '#f0c030',  // dourado — espuma brilhante ao sol

    /* Painéis */
    panelLeft:   'rgba(255, 200, 140, 0.12)',
    panelRight:  'rgba(255, 180, 110, 0.10)',
    divider:     'rgba(255, 160, 80,  0.25)',

    /* Texto / labels */
    label:       'rgba(80, 25, 0, 0.65)',
    labelShadow: '0 1px 6px rgba(180, 60, 0, 0.4)',
    textPrimary: '#3d1500',
    textSoft:    'rgba(255, 200, 150, 0.85)',

    /* Player bar */
    playerGradient: 'linear-gradient(to top, rgba(100,30,0,0.92) 0%, rgba(180,70,10,0.5) 60%, transparent 100%)',
    playerGlass:    'rgba(255,230,180,0.18)',
    playerBorder:   'rgba(255,180,100,0.40)',
    playerShadow:   '0 2px 24px rgba(200,80,10,0.25), 0 1px 0 rgba(255,255,220,0.20) inset',

    /* Thumb placeholder */
    thumbBg: 'linear-gradient(135deg, rgba(220,80,20,0.5), rgba(240,180,20,0.5))',
    thumbBorder: 'rgba(255,180,80,0.35)',

    /* Botão play */
    btnGradient: 'linear-gradient(135deg, #e05020, #f0b030)',
    btnGlow:     '0 0 20px rgba(224,80,32,0.9), 0 0 40px rgba(240,176,48,0.5)',
    btnShadow:   '0 2px 12px rgba(200,60,10,0.5)',

    /* Disco */
    discBody:    '#1a0808',
    discGroove:  'rgba(255,180,100,0.07)',
    discRingA:   '#e05020',
    discRingB:   '#f0b030',
    discHole:    '#f0d080',
    discCenter:  '#e05020',
    discCenterGlow: '0 0 12px #e05020, 0 0 24px #f0b030',

    /* Orientação warning */
    warningBg:   'linear-gradient(135deg, #ffe8c0, #ffd0a0)',
    warningIcon: '#e05020',
    warningH2:   '#4a1500',
    warningP:    '#9a3010',

    /* range thumb */
    thumbColor:  '#e05020',
    rangeTrack:  'rgba(255,160,80,0.35)',

    /* accentColor for slider */
    accent: '#e05020',

    /* Disco flourishes — mirror-ball facets, jukebox marquee & tubes */
    facet:     'rgba(255, 220, 170, 0.18)',
    marquee:   '#ffb347',
    neonTube:  'rgba(240, 130, 40, 0.35)',
  },

  moonlit: {
    /* GradientWaves */
    horizonColor: '#0a1628',  // azul noturno profundo — céu escuro
    waveColor:    '#0d2a54',  // azul oceano noite
    crestColor:   '#88b8d8',  // prata-azulado — reflexo da lua nas ondas

    /* Painéis */
    panelLeft:   'rgba(10, 30, 80, 0.22)',
    panelRight:  'rgba(8,  25, 70, 0.18)',
    divider:     'rgba(60, 100, 180, 0.25)',

    /* Texto / labels */
    label:       'rgba(180, 215, 248, 0.70)',
    labelShadow: '0 1px 8px rgba(0, 30, 80, 0.6)',
    textPrimary: '#e0eeff',
    textSoft:    'rgba(150, 190, 230, 0.75)',

    /* Player bar */
    playerGradient: 'linear-gradient(to top, rgba(5,12,35,0.95) 0%, rgba(15,40,100,0.55) 60%, transparent 100%)',
    playerGlass:    'rgba(20, 55, 110, 0.30)',
    playerBorder:   'rgba(80, 140, 210, 0.35)',
    playerShadow:   '0 2px 24px rgba(10,40,120,0.4), 0 1px 0 rgba(120,180,255,0.12) inset',

    /* Thumb placeholder */
    thumbBg: 'linear-gradient(135deg, rgba(20,60,140,0.6), rgba(80,140,200,0.5))',
    thumbBorder: 'rgba(80,140,210,0.35)',

    /* Botão play */
    btnGradient: 'linear-gradient(135deg, #1a4a9a, #5090c8)',
    btnGlow:     '0 0 20px rgba(80,150,220,0.9), 0 0 40px rgba(26,74,154,0.5)',
    btnShadow:   '0 2px 12px rgba(10,40,120,0.6)',

    /* Disco */
    discBody:    '#060c1e',
    discGroove:  'rgba(140,190,240,0.06)',
    discRingA:   '#4a90d0',
    discRingB:   '#a0d0f0',
    discHole:    '#1a3060',
    discCenter:  '#5090d0',
    discCenterGlow: '0 0 12px #4a90d0, 0 0 24px #a0d0f0',

    /* Orientação warning */
    warningBg:   'linear-gradient(135deg, #0a1628, #0d2a54)',
    warningIcon: '#5090d0',
    warningH2:   '#e0eeff',
    warningP:    '#88b8d8',

    /* range thumb */
    thumbColor:  '#5090d0',
    rangeTrack:  'rgba(80,140,210,0.35)',

    accent: '#5090d0',

    /* Disco flourishes — mirror-ball facets, jukebox marquee & tubes */
    facet:     'rgba(160, 208, 240, 0.18)',
    marquee:   '#88b8d8',
    neonTube:  'rgba(74, 144, 208, 0.35)',
  },
} as const;

/* ─── Playlist ─── */
const playlistItems: MenuItem[] = [
  { image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=600&auto=format&fit=crop', link: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', title: 'Synthwave Night',  description: 'Neon Track'       },
  { image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop', link: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', title: 'Acoustic Vibes',  description: 'Guitar Session'   },
  { image: 'https://images.unsplash.com/photo-1598385396964-6f8b8b8b8b8b?q=80&w=600&auto=format&fit=crop', link: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', title: 'Deep House',      description: 'Late Night Groove' },
  { image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=600&auto=format&fit=crop', link: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', title: 'Ambient Drift',   description: 'Floating'          },
  { image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop', link: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', title: 'Retro Wave',      description: '80s Dream'         },
];

const GALLERY_PHOTO_COUNT = 21;
const galleryImages = Array.from({ length: GALLERY_PHOTO_COUNT }, (_, i) => ({
  src: `/L${i + 1}.jpeg`,
  alt: `Foto ${i + 1}`,
}));

/* ═══════════════════════════════════════════════ */

export default function App() {
  const [theme,      setTheme]      = useState<Theme>('sunset');
  const [activeSong, setActiveSong] = useState<MenuItem | null>(null);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [volume,     setVolume]     = useState(0.7);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const t = THEMES[theme];
  const isSunset = theme === 'sunset';

  const spotify = useSpotifyPlayback();
  const isSpotifyReady = spotify.status === 'ready' && spotify.tracks.length > 0;

  const handleActiveIndexChange = useCallback(
    (i: number) => setActiveSong(playlistItems[i] ?? null),
    []
  );

  const handleNext = useCallback(() => {
    setActiveSong(prev => {
      const idx = prev ? playlistItems.indexOf(prev) : -1;
      return playlistItems[(idx + 1) % playlistItems.length];
    });
  }, []);

  const handlePrev = useCallback(() => {
    setActiveSong(prev => {
      const idx = prev ? playlistItems.indexOf(prev) : -1;
      return playlistItems[idx <= 0 ? playlistItems.length - 1 : idx - 1];
    });
  }, []);

  useEffect(() => {
    if (isSpotifyReady) return; // playback comes from the Spotify SDK instead
    if (audioRef.current && activeSong) {
      audioRef.current.src    = activeSong.link;
      audioRef.current.volume = volume;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [activeSong, volume, isSpotifyReady]);

  const togglePlay = () => {
    if (isSpotifyReady) { spotify.togglePlay(); return; }
    if (!audioRef.current || !activeSong) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else           { audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {}); }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (isSpotifyReady) spotify.setVolume(v);
    else if (audioRef.current) audioRef.current.volume = v;
  };

  /* Discos exibidos no jukebox: playlist do Spotify quando conectada, senão a demo local */
  const discTracks = isSpotifyReady
    ? spotify.tracks.map(tr => ({ image: tr.image, title: tr.name, description: tr.artist }))
    : playlistItems.map(tr => ({ image: tr.image, title: tr.title, description: tr.description }));

  const spotifyCurrentTrack = isSpotifyReady
    ? spotify.tracks.find(tr => tr.uri === spotify.currentTrackUri) ?? null
    : null;

  const nowPlaying = isSpotifyReady
    ? (spotifyCurrentTrack && { image: spotifyCurrentTrack.image, title: spotifyCurrentTrack.name, description: spotifyCurrentTrack.artist })
    : (activeSong && { image: activeSong.image, title: activeSong.title, description: activeSong.description });

  const nowPlayingCode = isSpotifyReady
    ? (spotifyCurrentTrack ? getSelectionCode(spotify.tracks.indexOf(spotifyCurrentTrack)) : null)
    : (activeSong ? getSelectionCode(playlistItems.indexOf(activeSong)) : null);

  const nowIsPlaying = isSpotifyReady ? spotify.isPlaying : isPlaying;
  const playDisabled = isSpotifyReady ? spotify.tracks.length === 0 : !activeSong;

  const handleCardClick = isSpotifyReady ? spotify.playTrackAt : handleActiveIndexChange;
  const handleCardAutoSwap = isSpotifyReady ? undefined : handleActiveIndexChange;

  /* inject range track color dynamically */
  const rangeStyle = `
    input[type="range"] { background: ${t.rangeTrack}; }
    input[type="range"]::-webkit-slider-thumb { background: ${t.thumbColor}; box-shadow: 0 0 6px ${t.thumbColor}88; }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: rangeStyle }} />

      {/* ══ ROOT 852 × 393 ══ */}
      <div
        className="relative overflow-hidden"
        style={{
          width: '852px',
          height: '393px',
          transition: 'background 0.8s ease',
          background: isSunset ? '#3d1500' : '#060c1e',
        }}
      >
        {/* ── BACKGROUND: GradientWaves ── */}
        <div className="absolute inset-0 z-0" style={{ transition: 'opacity 0.6s ease' }}>
          <GradientWaves
            horizonColor={t.horizonColor}
            waveColor={t.waveColor}
            crestColor={t.crestColor}
            speed={0.25}
            amplitude={4.5}
            waveScale={0.45}
            waveRatio={0.75}
            swell={60}
            turbulence={30}
            tilt={0.78}
            zoom={0.7}
            height={1.8}
            fogDepth={18}
            detail="high"
            brightness={isSunset ? 1.1 : 0.95}
            opacity={1}
            mouseInteraction
            parallaxStrength={0.5}
            grain
            grainIntensity={isSunset ? 0.04 : 0.03}
          />
        </div>

        {/* ── Cinematic vignette ── */}
        <div
          className="absolute inset-0 z-[5] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.28) 100%)' }}
        />

        {/* ── UI ── */}
        <div className="relative z-10 flex w-full h-full">

          {/* ── ESQUERDA: Crystal Dome ── */}
          <div
            className="relative h-full"
            style={{ width: '511px', paddingLeft: 'env(safe-area-inset-left)' }}
          >
            <div className="absolute inset-0" style={{ background: t.panelLeft, backdropFilter: 'blur(1.5px)', WebkitBackdropFilter: 'blur(1.5px)' }} />
            <div className="absolute inset-0" style={{ overflow: 'hidden' }}>
              <DomeGallery
                images={galleryImages}
                fit={0.42}
                minRadius={150}
                grayscale={false}
                segments={24}
                facetColor={t.facet}
                sparkleColor={t.accent}
              />
            </div>
            <div className="absolute top-2 left-3 z-10 pointer-events-none">
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase',
                  color: t.label, textShadow: t.labelShadow,
                }}
              >
                <span
                  style={{
                    width: '4px', height: '4px', borderRadius: '50%', background: t.accent,
                    boxShadow: `0 0 6px ${t.accent}`, animation: 'sparkle-twinkle 2.4s ease-in-out infinite',
                  }}
                />
                Crystal Dome
              </span>
            </div>
          </div>

          {/* ── DIREITA: Vinyl Jukebox ── */}
          <div
            className="relative flex flex-col h-full"
            style={{ width: '341px', paddingRight: 'env(safe-area-inset-right)' }}
          >
            <div className="absolute inset-0" style={{ background: t.panelRight, backdropFilter: 'blur(1.5px)', WebkitBackdropFilter: 'blur(1.5px)' }} />

            {/* Marquee bulbs — top edge, like a jukebox light strip */}
            <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none flex justify-between" style={{ padding: '0 10px', height: '4px' }}>
              {Array.from({ length: 16 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: '3px', height: '3px', borderRadius: '50%', background: t.marquee,
                    boxShadow: `0 0 4px ${t.marquee}`,
                    animation: `marquee-blink 2.2s ease-in-out ${(i % 8) * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>

            {/* Neon tubes flanking the jukebox column */}
            <div className="absolute inset-y-0 left-0 z-0 pointer-events-none" style={{ width: '44px', background: `linear-gradient(to right, ${t.neonTube}, transparent)`, filter: 'blur(2px)' }} />
            <div className="absolute inset-y-0 right-0 z-0 pointer-events-none" style={{ width: '44px', background: `linear-gradient(to left, ${t.neonTube}, transparent)`, filter: 'blur(2px)' }} />

            <div className="absolute top-2 right-3 z-20 pointer-events-none">
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase',
                  color: t.label, textShadow: t.labelShadow,
                }}
              >
                Vinyl Jukebox
                <span
                  style={{
                    width: '4px', height: '4px', borderRadius: '50%', background: t.accent,
                    boxShadow: `0 0 6px ${t.accent}`, animation: 'sparkle-twinkle 2.4s ease-in-out 1.1s infinite',
                  }}
                />
              </span>
            </div>

            {/* Conectar Spotify — só aparece quando configurado e ainda sem login neste dispositivo */}
            {spotify.status === 'logged_out' && (
              <button
                onClick={spotify.login}
                className="absolute top-7 right-3 z-20"
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em',
                  color: t.accent, background: t.playerGlass, border: `1px solid ${t.playerBorder}`,
                  padding: '3px 8px', borderRadius: '999px', cursor: 'pointer',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                }}
              >
                Conectar Spotify
              </button>
            )}

            {/* Record changer — a stack de vinis que troca sozinha como um jukebox de verdade */}
            <div className="relative z-10" style={{ height: '329px' }}>
              <CardSwap
                width={148}
                height={148}
                cardDistance={16}
                verticalDistance={13}
                delay={4500}
                skewAmount={4}
                pauseOnHover={false}
                onActiveChange={handleCardAutoSwap}
                onCardClick={handleCardClick}
              >
                {discTracks.map((song, i) => (
                  <Card key={song.title + i} style={{ borderRadius: '50%', border: 'none', background: 'transparent' }}>
                    <div
                      className="relative w-full h-full rounded-full"
                      style={{
                        background: `repeating-radial-gradient(circle at center, ${t.discBody} 0px, ${t.discBody} 2px, ${t.discGroove} 3px, ${t.discBody} 4px)`,
                        boxShadow: `0 0 0 1.5px ${t.discRingA}88, 0 10px 26px rgba(0,0,0,0.55)`,
                      }}
                    >
                      {/* Album label */}
                      <div
                        className="absolute overflow-hidden rounded-full"
                        style={{ inset: '32%', border: `1px solid ${t.discRingB}` }}
                      >
                        <img
                          src={song.image}
                          alt={song.title}
                          className="w-full h-full object-cover pointer-events-none"
                          draggable={false}
                        />
                      </div>
                      {/* Center hole */}
                      <div
                        className="absolute rounded-full"
                        style={{
                          top: '50%', left: '50%', width: '6%', height: '6%',
                          background: t.discHole, transform: 'translate(-50%, -50%)',
                        }}
                      />
                      {/* Selection code tab */}
                      <div
                        className="absolute flex items-center justify-center"
                        style={{
                          bottom: '-4px', left: '50%', transform: 'translateX(-50%)',
                          fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700,
                          color: t.discRingB, background: 'rgba(10,10,15,0.75)',
                          padding: '1px 6px', borderRadius: '4px', letterSpacing: '0.02em',
                          border: `1px solid ${t.discRingA}55`, whiteSpace: 'nowrap',
                        }}
                      >
                        {getSelectionCode(i)}
                      </div>
                    </div>
                  </Card>
                ))}
              </CardSwap>
            </div>

            {/* ── Player bar 64px ── */}
            <div
              className="absolute bottom-0 left-0 right-0 z-20"
              style={{ height: '64px', padding: '0 12px', background: t.playerGradient }}
            >
              <div
                className="flex items-center gap-2 h-full"
                style={{
                  background: t.playerGlass,
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: `1px solid ${t.playerBorder}`,
                  borderRadius: '14px',
                  padding: '0 12px',
                  boxShadow: t.playerShadow,
                  transition: 'background 0.6s ease, border-color 0.6s ease, box-shadow 0.6s ease',
                }}
              >
                {/* Album thumb 40×40 */}
                <div
                  className={`flex-shrink-0 flex items-center justify-center overflow-hidden ${nowIsPlaying ? 'animate-pulse' : ''}`}
                  style={{ width: '40px', height: '40px', borderRadius: '10px', background: t.thumbBg, border: `1px solid ${t.thumbBorder}` }}
                >
                  {nowPlaying
                    ? <img src={nowPlaying.image} alt={nowPlaying.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Music size={16} color={t.textSoft} />
                  }
                </div>

                {/* Track info */}
                <div className="flex flex-col flex-1 min-w-0" style={{ gap: '2px' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    {nowPlayingCode && (
                      <span
                        style={{
                          fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700,
                          color: t.accent, background: t.thumbBorder, padding: '1px 5px', borderRadius: '4px',
                          flexShrink: 0, letterSpacing: '0.02em',
                        }}
                      >
                        {nowPlayingCode}
                      </span>
                    )}
                    <span
                      className="truncate"
                      style={{
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                        fontSize: '12px', fontWeight: 700, color: t.textPrimary, lineHeight: 1.2, transition: 'color 0.4s',
                      }}
                    >
                      {nowPlaying?.title || 'Selecione um disco'}
                    </span>
                  </div>
                  <span className="truncate" style={{ fontSize: '10px', fontWeight: 300, color: t.textSoft, lineHeight: 1.2, transition: 'color 0.4s' }}>
                    {nowPlaying?.description || 'Gire para escolher'}
                  </span>
                </div>

                {/* Volume — sempre visível */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  <Volume2 size={12} color={t.textSoft} />
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={volume} onChange={handleVolume}
                    style={{ width: '34px' }} aria-label="Volume"
                  />
                </div>

                {/* Anterior — 30×30 */}
                <button
                  onClick={isSpotifyReady ? spotify.previous : handlePrev}
                  disabled={playDisabled}
                  aria-label="Faixa anterior"
                  style={{
                    flexShrink: 0, width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: t.playerGlass, border: `1px solid ${t.playerBorder}`, color: t.textPrimary,
                    transition: 'transform 0.15s ease', opacity: playDisabled ? 0.3 : 1,
                  }}
                  onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
                  onPointerUp={e   => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <SkipBack size={13} fill="currentColor" />
                </button>

                {/* Play/Pause — 44×44 */}
                <button
                  onClick={togglePlay}
                  disabled={playDisabled}
                  aria-label={nowIsPlaying ? 'Pausar' : 'Tocar'}
                  style={{
                    flexShrink: 0, width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: t.btnGradient,
                    boxShadow: nowIsPlaying ? t.btnGlow : t.btnShadow,
                    transition: 'transform 0.15s ease, box-shadow 0.3s ease, background 0.6s ease',
                    opacity: playDisabled ? 0.3 : 1,
                  }}
                  onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
                  onPointerUp={e   => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {nowIsPlaying ? <Pause size={18} fill="#fff" color="#fff" /> : <Play size={18} fill="#fff" color="#fff" style={{ marginLeft: '2px' }} />}
                </button>

                {/* Próxima — 30×30 */}
                <button
                  onClick={isSpotifyReady ? spotify.next : handleNext}
                  disabled={playDisabled}
                  aria-label="Próxima faixa"
                  style={{
                    flexShrink: 0, width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: t.playerGlass, border: `1px solid ${t.playerBorder}`, color: t.textPrimary,
                    transition: 'transform 0.15s ease', opacity: playDisabled ? 0.3 : 1,
                  }}
                  onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
                  onPointerUp={e   => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <SkipForward size={13} fill="currentColor" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── LIGHT BEAM — divisor entre os dois ambientes, em 511px ── */}
        <div
          className="absolute top-0 bottom-0 z-20 pointer-events-none"
          style={{ left: '511px', width: '2px', transform: 'translateX(-50%)' }}
        >
          <div
            style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(to bottom, transparent, ${t.marquee}, transparent)`,
              boxShadow: `0 0 14px 2px ${t.marquee}`,
              animation: 'beam-pulse 5s ease-in-out infinite',
              transition: 'background 0.6s ease, box-shadow 0.6s ease',
            }}
          />
        </div>

        {/* ── THEME TOGGLE — sobre o divisor em 511px ── */}
        <div
          className="absolute top-2 z-30"
          style={{ left: '511px', transform: 'translateX(-50%)' }}
        >
          <button
            onClick={() => setTheme(isSunset ? 'moonlit' : 'sunset')}
            className="theme-toggle"
            aria-label={isSunset ? 'Mudar para tema luar' : 'Mudar para tema pôr do sol'}
            style={{
              background:   isSunset ? 'rgba(255,200,120,0.22)' : 'rgba(20,60,130,0.30)',
              borderColor:  isSunset ? 'rgba(255,170,80,0.45)'  : 'rgba(80,140,210,0.40)',
              color:        isSunset ? 'rgba(80,25,0,0.85)'      : 'rgba(180,215,248,0.85)',
              fontFamily: "'Bricolage Grotesque', sans-serif",
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {isSunset
              ? <><Sun  size={11} strokeWidth={2} /> <span>Pôr do sol</span></>
              : <><Moon size={11} strokeWidth={2} /> <span>Luar</span></>
            }
          </button>
        </div>

        <audio ref={audioRef} onEnded={handleNext} />
      </div>

      {/* ── Portrait warning ── */}
      <div className="orientation-warning" style={{ background: t.warningBg }}>
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={t.warningIcon} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '18px', fontWeight: 700, color: t.warningH2 }}>Gire o celular</h2>
          <p  style={{ margin: 0, fontSize: '13px', color: t.warningP, maxWidth: '240px', textAlign: 'center' }}>
            Esta experiência foi feita para o modo paisagem. Vire seu iPhone na horizontal.
          </p>
        </div>
      </div>
    </>
  );
}
