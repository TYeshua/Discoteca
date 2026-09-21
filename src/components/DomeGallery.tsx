import { useEffect, useMemo, useRef, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import gsap from 'gsap';
import { X } from 'lucide-react';

type Sparkle = { top: number; left: number; size: number; delay: number; duration: number };

function makeSparkles(count: number): Sparkle[] {
  return Array.from({ length: count }, () => ({
    top: 12 + Math.random() * 72,
    left: 12 + Math.random() * 72,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 4,
    duration: 2.2 + Math.random() * 2.4,
  }));
}

type ImageItem = string | { src: string; alt?: string };

type DomeGalleryProps = {
  images?: ImageItem[];
  fit?: number;
  fitBasis?: 'auto' | 'min' | 'max' | 'width' | 'height';
  minRadius?: number;
  maxRadius?: number;
  padFactor?: number;
  overlayBlurColor?: string;
  maxVerticalRotationDeg?: number;
  dragSensitivity?: number;
  enlargeTransitionMs?: number;
  segments?: number;
  dragDampening?: number;
  openedImageWidth?: string;
  openedImageHeight?: string;
  imageBorderRadius?: string;
  openedImageBorderRadius?: string;
  grayscale?: boolean;
  facetColor?: string;
  sparkleColor?: string;
};

type ItemDef = {
  src: string;
  alt: string;
  x: number;
  y: number;
  sizeX: number;
  sizeY: number;
  glintDelay: number;
  glintDuration: number;
};

const DEFAULT_IMAGES: ImageItem[] = [
  { src: 'https://images.unsplash.com/photo-1755331039789-7e5680e26e8f?q=80&w=774&auto=format&fit=crop', alt: 'Art 1' },
  { src: 'https://images.unsplash.com/photo-1755569309049-98410b94f66d?q=80&w=772&auto=format&fit=crop', alt: 'Art 2' },
  { src: 'https://images.unsplash.com/photo-1755497595318-7e5e3523854f?q=80&w=774&auto=format&fit=crop', alt: 'Art 3' },
  { src: 'https://images.unsplash.com/photo-1755353985163-c2a0fe5ac3d8?q=80&w=774&auto=format&fit=crop', alt: 'Art 4' },
];

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const IDLE_SPIN_DEG_PER_FRAME = 0.045;

/* Tiles are sized larger than their grid step so neighboring hexagons overlap
   slightly and pack tight, like facets on a real mirror ball. */
const TILE_SIZE = 2.7;

function buildItems(pool: ImageItem[], seg: number): ItemDef[] {
  const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
  const evenYs = [-4, -2, 0, 2, 4];
  const oddYs = [-3, -1, 1, 3, 5];
  const coords = xCols.flatMap((x, c) => {
    const ys = c % 2 === 0 ? evenYs : oddYs;
    return ys.map(y => ({ x, y, sizeX: TILE_SIZE, sizeY: TILE_SIZE }));
  });
  const normalizedImages = pool.map(img =>
    typeof img === 'string' ? { src: img, alt: '' } : { src: img.src || '', alt: img.alt || '' }
  );
  const usedImages = Array.from({ length: coords.length }, (_, i) => normalizedImages[i % normalizedImages.length]);
  return coords.map((c, i) => ({
    ...c,
    src: usedImages[i].src,
    alt: usedImages[i].alt,
    glintDelay: Math.random() * 8,
    glintDuration: 3 + Math.random() * 4,
  }));
}

export default function DomeGallery({
  images = DEFAULT_IMAGES,
  fit = 0.5,
  minRadius = 600,
  maxRadius = Infinity,
  overlayBlurColor = '#ffecff',
  maxVerticalRotationDeg = Infinity,
  dragSensitivity = 20,
  segments = 35,
  imageBorderRadius = '30px',
  grayscale = true,
  facetColor = 'rgba(255,255,255,0.14)',
  sparkleColor = '#ffffff',
}: DomeGalleryProps) {
  const sparkles = useMemo(() => makeSparkles(9), []);
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef({ x: 0, y: 0 });
  const startRotRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const isFlingingRef = useRef(false);
  const pressedIndexRef = useRef<number | null>(null);
  const openIndexRef = useRef<number | null>(null);
  const [openIndex, setOpenIndexState] = useState<number | null>(null);

  const setOpenIndex = (i: number | null) => {
    openIndexRef.current = i;
    setOpenIndexState(i);
  };

  const applyTransform = (xDeg: number, yDeg: number) => {
    if (sphereRef.current) {
      sphereRef.current.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
    }
  };

  const items = useMemo(() => buildItems(images, segments), [images, segments]);

  useGesture(
    {
      onDragStart: ({ event }) => {
        draggingRef.current = true;
        isFlingingRef.current = false;
        gsap.killTweensOf(rotationRef.current);
        startRotRef.current = { ...rotationRef.current };
        const evt = event as PointerEvent;
        startPosRef.current = { x: evt.clientX, y: evt.clientY };
        const target = evt.target as HTMLElement | null;
        const tileEl = target?.closest('[data-tile-index]') as HTMLElement | null;
        pressedIndexRef.current = tileEl ? Number(tileEl.dataset.tileIndex) : null;
      },
      onDrag: ({ event }) => {
        if (!draggingRef.current || !startPosRef.current) return;
        const evt = event as PointerEvent;
        const dxTotal = evt.clientX - startPosRef.current.x;
        const dyTotal = evt.clientY - startPosRef.current.y;

        const nextX = clamp(
          startRotRef.current.x - dyTotal / dragSensitivity,
          -maxVerticalRotationDeg,
          maxVerticalRotationDeg
        );
        const nextY = startRotRef.current.y + dxTotal / dragSensitivity;
        rotationRef.current.x = nextX;
        rotationRef.current.y = nextY;
      },
      onDragEnd: ({ tap, velocity, direction }) => {
        draggingRef.current = false;
        startPosRef.current = null;

        if (tap) {
          if (pressedIndexRef.current !== null) setOpenIndex(pressedIndexRef.current);
          return;
        }

        const signedSpeedX = (velocity?.[0] ?? 0) * (direction?.[0] ?? 0);
        const signedSpeedY = (velocity?.[1] ?? 0) * (direction?.[1] ?? 0);
        const flingDegY = clamp((signedSpeedX * 300) / dragSensitivity, -160, 160);
        const flingDegX = clamp((-signedSpeedY * 300) / dragSensitivity, -160, 160);

        if (Math.abs(flingDegY) > 0.5 || Math.abs(flingDegX) > 0.5) {
          isFlingingRef.current = true;
          gsap.to(rotationRef.current, {
            x: clamp(rotationRef.current.x + flingDegX, -maxVerticalRotationDeg, maxVerticalRotationDeg),
            y: rotationRef.current.y + flingDegY,
            duration: 1.15,
            ease: 'power3.out',
            onComplete: () => {
              isFlingingRef.current = false;
            },
          });
        }
      },
    },
    { target: mainRef, eventOptions: { passive: false } }
  );

  /* Single render loop — every input (drag, fling, idle spin) only mutates
     rotationRef; this is the one place that ever touches the DOM, applied
     once per animation frame so the motion stays perfectly smooth. */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (!draggingRef.current && !isFlingingRef.current && openIndexRef.current === null) {
        rotationRef.current.y += IDLE_SPIN_DEG_PER_FRAME;
      }
      applyTransform(rotationRef.current.x, rotationRef.current.y);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIndex(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      const radius = clamp(cr.width * fit, minRadius, maxRadius);
      root.style.setProperty('--radius', `${radius}px`);
      root.style.setProperty('--overlay-blur-color', overlayBlurColor);
      root.style.setProperty('--tile-radius', imageBorderRadius);
      root.style.setProperty('--image-filter', grayscale ? 'grayscale(1)' : 'none');
      root.style.setProperty('--tile-facet-color', facetColor);
      applyTransform(rotationRef.current.x, rotationRef.current.y);
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [fit, minRadius, maxRadius, overlayBlurColor, grayscale, imageBorderRadius, facetColor]);

  const cssStyles = `
    .sphere-root { --radius: 520px; --circ: calc(var(--radius) * 3.14); --item-width: calc(var(--circ) / var(--segments-x)); --item-height: calc(var(--circ) / var(--segments-y)); --rot-y: calc(360deg / var(--segments-x)); --rot-x: calc(360deg / var(--segments-y)); }
    .sphere-root * { box-sizing: border-box; }
    .sphere, .sphere-item, .item__image { transform-style: preserve-3d; }
    .stage { width: 100%; height: 100%; display: grid; place-items: center; position: absolute; inset: 0; margin: auto; perspective: calc(var(--radius) * 2); perspective-origin: 50% 50%; }
    .sphere { transform: translateZ(calc(var(--radius) * -1)); will-change: transform; position: absolute; }
    .sphere-item { width: calc(var(--item-width) * var(--item-size-x)); height: calc(var(--item-height) * var(--item-size-y)); position: absolute; top: -999px; bottom: -999px; left: -999px; right: -999px; margin: auto; transform-origin: 50% 50%; backface-visibility: hidden; transform: rotateY(calc(var(--rot-y) * (var(--offset-x) + ((var(--item-size-x) - 1) / 2)))) rotateX(calc(var(--rot-x) * (var(--offset-y) - ((var(--item-size-y) - 1) / 2)))) translateZ(var(--radius)); }
    .item__image {
      position: absolute; inset: 1px; overflow: hidden; cursor: pointer; backface-visibility: hidden;
      transform: translateZ(0); transition: transform 0.15s ease;
      clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
      -webkit-clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
      box-shadow: 0 0 0 1px var(--tile-facet-color, rgba(255,255,255,0.14)) inset;
    }
    .item__image:active { transform: translateZ(0) scale(0.92); }
    .tile-glint { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: linear-gradient(135deg, transparent 42%, rgba(255,255,255,0.85) 50%, transparent 58%); animation-name: tile-glint; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
  `;

  const openItem = openIndex !== null ? items[openIndex] : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssStyles }} />
      <div
        ref={rootRef}
        className="sphere-root relative w-full h-full"
        style={
          {
            '--segments-x': segments,
            '--segments-y': segments,
          } as React.CSSProperties
        }
      >
        <main
          ref={mainRef}
          className="absolute inset-0 grid place-items-center select-none"
          style={{ touchAction: 'none', background: 'transparent', overflow: 'visible' }}
        >
          <div className="stage">
            <div ref={sphereRef} className="sphere">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="sphere-item"
                  style={
                    {
                      '--offset-x': it.x,
                      '--offset-y': it.y,
                      '--item-size-x': it.sizeX,
                      '--item-size-y': it.sizeY,
                    } as React.CSSProperties
                  }
                >
                  <div className="item__image" data-tile-index={i}>
                    <img
                      src={it.src}
                      alt={it.alt}
                      className="w-full h-full object-cover pointer-events-none"
                      style={{ filter: grayscale ? 'grayscale(1)' : 'none' }}
                    />
                    {i % 5 === 0 && (
                      <div
                        className="tile-glint"
                        style={{ animationDelay: `${it.glintDelay}s`, animationDuration: `${it.glintDuration}s` }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Mirror-ball glint — a slow specular sweep + twinkling facets, non-interactive */}
        <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              margin: 'auto',
              width: '68%',
              aspectRatio: '1 / 1',
              borderRadius: '50%',
              mixBlendMode: 'screen',
              opacity: 0.5,
              filter: 'blur(8px)',
              animation: 'specular-rotate 16s linear infinite',
              background: `conic-gradient(from 0deg, transparent 0deg, ${sparkleColor}66 32deg, transparent 70deg, transparent 250deg, ${sparkleColor}40 290deg, transparent 330deg)`,
            }}
          />
          {sparkles.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${s.top}%`,
                left: `${s.left}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                borderRadius: '50%',
                background: sparkleColor,
                boxShadow: `0 0 6px 1px ${sparkleColor}`,
                animation: `sparkle-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Tap a photo to lift it out of the ball and into the light */}
        {openItem && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            style={{
              background: 'rgba(5,5,10,0.72)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              animation: 'lightbox-fade 0.25s ease',
            }}
            onClick={() => setOpenIndex(null)}
          >
            <div
              className="relative"
              style={{ width: '80%', height: '80%', animation: 'lightbox-pop 0.3s cubic-bezier(0.2,0.8,0.2,1)' }}
              onClick={e => e.stopPropagation()}
            >
              <img
                src={openItem.src}
                alt={openItem.alt}
                className="w-full h-full object-contain"
                style={{
                  borderRadius: '16px',
                  border: `1px solid ${facetColor}`,
                  boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${sparkleColor}55`,
                  background: 'rgba(0,0,0,0.2)',
                }}
              />
              <button
                onClick={() => setOpenIndex(null)}
                aria-label="Fechar"
                style={{
                  position: 'absolute',
                  top: '-14px',
                  right: '-14px',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'rgba(10,10,15,0.85)',
                  color: sparkleColor,
                  boxShadow: `0 0 12px ${sparkleColor}66`,
                }}
              >
                <X size={16} />
              </button>
              {openItem.alt && (
                <div
                  className="absolute left-0 right-0 text-center truncate"
                  style={{
                    bottom: '-24px',
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    color: 'rgba(255,255,255,0.85)',
                    textShadow: '0 1px 6px rgba(0,0,0,0.6)',
                  }}
                >
                  {openItem.alt}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
