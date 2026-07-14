'use client';
import { useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

/* ============================================================
   The scroll-built house.

   Geometry is PROCEDURAL — no .glb, no download. Two reasons:
   every part must be individually animatable (the house has to
   assemble piece by piece), and every material reads the active
   palette, so the same house tints itself for all eight palettes
   with no re-export.

   Scroll progress 0 → 1 drives two things at once:
     0.00 – 0.46   the house builds (slab → walls → floor →
                   stairs → roof → glass)
     0.46 – 1.00   the front wall and roof dissolve and the camera
                   walks in: hall → kitchen → up the stairs →
                   bedroom → out the window.

   Nothing here re-renders React. useFrame reads the progress ref
   and mutates object transforms directly, which is the only way
   to keep a scrubbed scene at 60fps.
   ============================================================ */

type Token =
  | 'ink' | 'inkSoft' | 'ivory' | 'cream' | 'bone'
  | 'gold' | 'goldSoft' | 'muted' | 'hairline' | 'hairlineStrong';

/** Pull the live palette off :root. The showcase switcher reloads the page on
 *  a palette change, so reading once at mount is always current. */
function readPalette(): Record<Token, string> {
  const css = getComputedStyle(document.documentElement);
  const get = (n: string, fallback: string) =>
    css.getPropertyValue(n).trim() || fallback;
  return {
    ink: get('--ink', '#16202B'),
    inkSoft: get('--ink-soft', '#27374A'),
    ivory: get('--ivory', '#F4F6F8'),
    cream: get('--cream', '#E9EDF1'),
    bone: get('--bone', '#FFFFFF'),
    gold: get('--gold', '#3E6D9E'),
    goldSoft: get('--gold-soft', '#9DB6D2'),
    muted: get('--muted', '#64748B'),
    hairline: get('--hairline', '#DDE3EA'),
    hairlineStrong: get('--hairline-strong', '#C2CBD6'),
  };
}

interface PieceDef {
  size: [number, number, number];
  pos: [number, number, number];
  rot?: [number, number, number];
  tok: Token;
  /** Build window in scroll progress. */
  t0: number;
  t1: number;
  /** Offset it travels from while building. +ve rises from below, -ve drops in. */
  rise?: number;
  /** Fade-OUT window — the front wall and roof dissolve so we can walk in. */
  fade?: [number, number];
  glass?: boolean;
  /** Cylinders carry the things a box can't sell: stools, pendants, table legs. */
  geo?: 'box' | 'cyl';
}

/** A glazed opening = a dark frame + a translucent pane. Without the frame the
 *  glass sits at the same value as the wall and the facade reads as blank.
 *
 *  The pane must be placed OUTSIDE the wall's face, not at its centreline, or
 *  it is swallowed by the wall's own thickness. The frame grows on the two
 *  broad axes (whichever they are — a side window is thin in X, a front window
 *  in Z), and the glass is deliberately made to protrude through it so no two
 *  faces are ever coplanar (which is what causes z-fighting flicker). */
function window3(
  out: PieceDef[],
  size: [number, number, number],
  pos: [number, number, number],
  t0: number,
  fade?: [number, number]
) {
  const thin = size.indexOf(Math.min(...size));
  const frame: [number, number, number] = [...size];
  const glass: [number, number, number] = [...size];
  const T = 0.16;
  for (let i = 0; i < 3; i++) if (i !== thin) frame[i] = size[i] + T;
  glass[thin] = size[thin] * 1.8;

  out.push({ size: frame, pos, tok: 'ink', t0, t1: t0 + 0.05, rise: 0, fade });
  out.push({
    size: glass,
    pos,
    tok: 'goldSoft',
    t0: t0 + 0.01,
    t1: t0 + 0.06,
    rise: 0,
    glass: true,
    fade,
  });
}

/* -- the house ------------------------------------------------------------ */
const F = 4;      // front wall z
const B = -4;     // back wall z
const HW = 5;     // half width
const H1 = 3.0;   // ground storey height
const Y1 = 3.2;   // upper floor slab y
const H2 = 2.8;   // upper storey height

/* The front wall + roof dissolve only AFTER the camera has shown the finished
   house head-on, and are fully gone before it crosses the threshold. */
const DISSOLVE: [number, number] = [0.50, 0.61];

function buildPieces(): PieceDef[] {
  const p: PieceDef[] = [];

  // Ground
  p.push({ size: [12.5, 0.4, 10.5], pos: [0, -0.2, 0], tok: 'hairlineStrong', t0: 0.00, t1: 0.05, rise: 2 });
  p.push({ size: [10, 0.2, 8], pos: [0, 0.1, 0], tok: 'cream', t0: 0.03, t1: 0.09, rise: 2 });

  // Ground-floor shell
  p.push({ size: [10, H1, 0.25], pos: [0, 1.6, B], tok: 'bone', t0: 0.07, t1: 0.15, rise: 3 });
  p.push({ size: [0.25, H1, 8], pos: [-HW, 1.6, 0], tok: 'bone', t0: 0.09, t1: 0.17, rise: 3 });
  p.push({ size: [0.25, H1, 8], pos: [HW, 1.6, 0], tok: 'bone', t0: 0.11, t1: 0.19, rise: 3 });

  // Front wall — split around a door opening; dissolves on entry.
  p.push({ size: [4, H1, 0.25], pos: [-3, 1.6, F], tok: 'bone', t0: 0.13, t1: 0.21, rise: 3, fade: DISSOLVE });
  p.push({ size: [4, H1, 0.25], pos: [3, 1.6, F], tok: 'bone', t0: 0.13, t1: 0.21, rise: 3, fade: DISSOLVE });
  p.push({ size: [2, 0.7, 0.25], pos: [0, 2.75, F], tok: 'bone', t0: 0.15, t1: 0.23, rise: 3, fade: DISSOLVE });
  p.push({ size: [1.9, 2.35, 0.1], pos: [0, 1.18, F - 0.02], tok: 'gold', t0: 0.40, t1: 0.47, rise: 1, fade: DISSOLVE });

  /* Kitchen (back-left). Base units + a dark worktop + uppers + an island with
     stools and pendants — a bare slab reads as a blue box, not a kitchen. */
  p.push({ size: [4.6, 0.82, 0.68], pos: [-2.4, 0.61, B + 0.6], tok: 'bone', t0: 0.19, t1: 0.25 });   // base units
  p.push({ size: [4.7, 0.08, 0.74], pos: [-2.4, 1.06, B + 0.6], tok: 'ink', t0: 0.20, t1: 0.26 });    // worktop
  p.push({ size: [4.6, 0.62, 0.36], pos: [-2.4, 2.3, B + 0.42], tok: 'bone', t0: 0.21, t1: 0.27 });   // uppers
  p.push({ size: [4.6, 0.5, 0.05], pos: [-2.4, 1.62, B + 0.28], tok: 'goldSoft', t0: 0.22, t1: 0.28 }); // splashback

  p.push({ size: [2.5, 0.82, 1.05], pos: [-2.5, 0.61, -1.9], tok: 'bone', t0: 0.22, t1: 0.28 });      // island
  p.push({ size: [2.7, 0.08, 1.2], pos: [-2.5, 1.06, -1.9], tok: 'gold', t0: 0.23, t1: 0.29 });       // island top
  for (let s = 0; s < 2; s++) {
    p.push({ size: [0.16, 0.62, 0.16], pos: [-3.1 + s * 1.2, 0.31, -1.0], tok: 'ink', t0: 0.24 + s * 0.01, t1: 0.30, geo: 'cyl' });
    p.push({ size: [0.34, 0.07, 0.34], pos: [-3.1 + s * 1.2, 0.65, -1.0], tok: 'inkSoft', t0: 0.25 + s * 0.01, t1: 0.31, geo: 'cyl' });
  }
  for (let s = 0; s < 2; s++) {
    p.push({ size: [0.11, 0.34, 0.11], pos: [-3.1 + s * 1.2, 2.35, -1.9], tok: 'gold', t0: 0.26, t1: 0.31, rise: -1, geo: 'cyl' });
  }

  /* Living area (front) — the room the camera actually stands in. */
  p.push({ size: [3.4, 0.55, 1.35], pos: [2.0, 0.38, 2.2], tok: 'inkSoft', t0: 0.23, t1: 0.29 });     // sofa
  p.push({ size: [3.4, 0.55, 0.3], pos: [2.0, 0.62, 2.8], tok: 'inkSoft', t0: 0.24, t1: 0.30 });      // sofa back
  p.push({ size: [1.5, 0.12, 0.8], pos: [1.4, 0.42, 0.9], tok: 'gold', t0: 0.25, t1: 0.31 });         // low table
  p.push({ size: [4.4, 0.03, 3.0], pos: [1.6, 0.22, 1.8], tok: 'cream', t0: 0.22, t1: 0.28 });        // rug

  // Stairs (back-right) — a flight of treads, each landing in sequence.
  const STEPS = 10;
  for (let i = 0; i < STEPS; i++) {
    const t0 = 0.24 + i * 0.009;
    p.push({
      size: [1.9, 0.16, 0.34],
      pos: [3.6, 0.18 + i * 0.32, -0.5 - i * 0.32],
      tok: 'bone',
      t0,
      t1: t0 + 0.05,
      rise: 1.6,
    });
  }
  // Stair rail
  p.push({ size: [0.08, 0.08, 4.6], pos: [2.6, 2.0, -2.1], rot: [-0.36, 0, 0], tok: 'gold', t0: 0.32, t1: 0.39, rise: 1 });

  // Upper floor — two slabs, leaving a void over the stairwell.
  p.push({ size: [7, 0.2, 8], pos: [-1.5, Y1, 0], tok: 'cream', t0: 0.27, t1: 0.34, rise: -4 });
  p.push({ size: [3, 0.2, 3.4], pos: [3.5, Y1, 2.3], tok: 'cream', t0: 0.29, t1: 0.36, rise: -4 });

  // Upper shell
  const Y2 = Y1 + H2 / 2 + 0.1;
  p.push({ size: [10, H2, 0.25], pos: [0, Y2, B], tok: 'bone', t0: 0.29, t1: 0.36, rise: -4 });
  p.push({ size: [0.25, H2, 8], pos: [-HW, Y2, 0], tok: 'bone', t0: 0.30, t1: 0.37, rise: -4 });
  p.push({ size: [0.25, H2, 8], pos: [HW, Y2, 0], tok: 'bone', t0: 0.30, t1: 0.37, rise: -4 });
  p.push({ size: [10, H2, 0.25], pos: [0, Y2, F], tok: 'bone', t0: 0.32, t1: 0.39, rise: -4, fade: DISSOLVE });

  // Bedroom (upstairs, left) — base, mattress, headboard, rug.
  p.push({ size: [4.4, 0.03, 3.6], pos: [-2.7, Y1 + 0.12, 1.3], tok: 'cream', t0: 0.32, t1: 0.38 });   // rug
  p.push({ size: [2.8, 0.32, 3.1], pos: [-2.9, Y1 + 0.28, 1.3], tok: 'bone', t0: 0.33, t1: 0.39 });    // base
  p.push({ size: [2.6, 0.22, 2.9], pos: [-2.9, Y1 + 0.55, 1.35], tok: 'inkSoft', t0: 0.34, t1: 0.40 });// mattress
  p.push({ size: [2.8, 0.85, 0.16], pos: [-2.9, Y1 + 0.62, -0.28], tok: 'gold', t0: 0.35, t1: 0.41 }); // headboard
  p.push({ size: [0.5, 0.4, 0.5], pos: [-4.5, Y1 + 0.32, -0.05], tok: 'bone', t0: 0.36, t1: 0.42 });   // nightstand

  /* Roof — a gable that folds down into place, then dissolves for the interior.
     Sign matters: rotating +X drops the slab's local +z edge. The RIDGE is the
     edge facing z=0, so the back slab (centred at -z) needs a NEGATIVE angle and
     the front slab a POSITIVE one. Get this backwards and you build a valley. */
  const RY = Y1 + H2 + 0.85;
  p.push({ size: [10.6, 0.22, 4.6], pos: [0, RY, -2.05], rot: [-0.35, 0, 0], tok: 'ink', t0: 0.36, t1: 0.44, rise: -5, fade: DISSOLVE });
  p.push({ size: [10.6, 0.22, 4.6], pos: [0, RY, 2.05], rot: [0.35, 0, 0], tok: 'ink', t0: 0.37, t1: 0.45, rise: -5, fade: DISSOLVE });

  /* Glazing goes in last — the house must read as FINISHED by p≈0.46, which is
     where the camera squares up head-on before walking in. Each is a framed
     opening (see window3), not a bare pane. */
  // Walls are 0.25 thick, so the face sits at ±0.125 — panes go OUTSIDE that.
  const FF = F + 0.19;   // in front of the front wall's outer face
  const XL = -HW - 0.19; // outboard of the left wall
  const XR = HW + 0.19;  // outboard of the right wall

  window3(p, [1.7, 1.5, 0.08], [-3.2, 1.75, FF], 0.40, DISSOLVE);
  window3(p, [1.7, 1.5, 0.08], [3.2, 1.75, FF], 0.40, DISSOLVE);
  window3(p, [0.08, 1.5, 2.2], [XL, 1.75, -1.4], 0.41);
  window3(p, [0.08, 1.5, 2.2], [XR, 1.75, -1.4], 0.41);
  // Upper storey — including the one the camera ends on, looking out.
  window3(p, [1.7, 1.3, 0.08], [-3.0, Y1 + 1.5, FF], 0.42, DISSOLVE);
  window3(p, [1.7, 1.3, 0.08], [3.0, Y1 + 1.5, FF], 0.42, DISSOLVE);
  window3(p, [0.08, 1.4, 2.6], [XL, Y1 + 1.5, 1.6], 0.42);

  return p;
}

/* -- camera path ----------------------------------------------------------- */
interface Key {
  p: number;
  pos: [number, number, number];
  look: [number, number, number];
}

const PATH: Key[] = [
  { p: 0.00, pos: [17, 12, 23], look: [0, 3.0, 0] },   // wide — the empty plot
  { p: 0.18, pos: [14, 8.5, 19], look: [0, 3.0, 0] },  // orbiting as it rises
  { p: 0.34, pos: [9, 6.5, 18], look: [0, 3.6, 0] },
  // Far enough back that the ridge is comfortably inside the frame — this is
  // the "here is your finished building" beat, so nothing may be cropped.
  { p: 0.46, pos: [0, 5.5, 24], look: [0, 3.4, 0] },   // the finished house, head-on
  { p: 0.55, pos: [0, 3.2, 15], look: [0, 2.2, 0] },   // walking up to the door
  { p: 0.62, pos: [0, 1.75, 4.4], look: [0, 1.6, -2] },// crossing the threshold
  { p: 0.68, pos: [0, 1.8, 1.8], look: [0, 1.5, -3] },  // hall
  // Stand back in the room and look ACROSS into the kitchen — parking the
  // camera on top of the island just fills the frame with a blue box.
  { p: 0.76, pos: [0.9, 1.85, 0.9], look: [-3.0, 1.0, -2.8] },   // kitchen
  { p: 0.84, pos: [0.9, 1.85, 0.4], look: [3.6, 2.0, -2.4] },    // turn: stairs
  { p: 0.91, pos: [3.6, 3.4, -1.6], look: [3.6, 4.2, -3.8] },    // climbing
  { p: 0.96, pos: [3.1, 4.7, 3.0], look: [-2.5, 3.9, 1.0] },     // upstairs, bedroom
  { p: 1.00, pos: [-0.9, 4.8, 1.9], look: [-6, 4.5, 1.9] },      // out the window
];

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1e-6)));
  return t * t * (3 - 2 * t);
};

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();

function samplePath(p: number) {
  let i = 0;
  while (i < PATH.length - 2 && p > PATH[i + 1].p) i++;
  const a = PATH[i];
  const b = PATH[i + 1];
  const t = smoothstep(a.p, b.p, p);
  _pos.set(...a.pos).lerp(new THREE.Vector3(...b.pos), t);
  _look.set(...a.look).lerp(new THREE.Vector3(...b.look), t);
  return { pos: _pos, look: _look };
}

function Rig({ progress }: { progress: RefObject<number> }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 2.5, 0));

  useFrame((_, dt) => {
    const { pos, look } = samplePath(progress.current ?? 0);
    // Exponential damping — frame-rate independent, and it takes the edge off
    // a jumpy scroll wheel without lagging behind a fast flick.
    const k = 1 - Math.exp(-7 * Math.min(dt, 0.05));
    camera.position.lerp(pos, k);
    target.current.lerp(look, k);
    camera.lookAt(target.current);
  });

  return null;
}

function House({ progress }: { progress: RefObject<number> }) {
  const pieces = useMemo(buildPieces, []);
  const palette = useMemo(readPalette, []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const glow = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const p = progress.current ?? 0;

    for (let i = 0; i < pieces.length; i++) {
      const mesh = refs.current[i];
      const def = pieces[i];
      if (!mesh) continue;

      const built = smoothstep(def.t0, def.t1, p);
      const gone = def.fade ? smoothstep(def.fade[0], def.fade[1], p) : 0;
      const opacity = built * (1 - gone);

      // Cheap win: stop drawing anything fully transparent.
      mesh.visible = opacity > 0.01;
      if (!mesh.visible) continue;

      const rise = def.rise ?? 3;
      mesh.position.y = def.pos[1] - (1 - built) * rise;

      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = def.glass ? opacity * 0.32 : opacity;

      // The roof folds down rather than just sliding.
      if (def.rot) mesh.rotation.x = def.rot[0] * built;
    }

    // Warm the interior once we're through the door.
    if (glow.current) glow.current.intensity = smoothstep(0.5, 0.68, p) * 26;
  });

  return (
    <group>
      {pieces.map((def, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          position={def.pos}
          rotation={def.rot ?? [0, 0, 0]}
          castShadow={!def.glass}
          receiveShadow
        >
          {def.geo === 'cyl' ? (
            // size = [diameter, height, diameter]
            <cylinderGeometry args={[def.size[0] / 2, def.size[0] / 2, def.size[1], 18]} />
          ) : (
            <boxGeometry args={def.size} />
          )}
          <meshStandardMaterial
            color={palette[def.tok]}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            roughness={def.glass ? 0.1 : 0.78}
            metalness={def.glass ? 0.1 : 0.02}
            depthWrite={!def.glass}
          />
        </mesh>
      ))}
      <pointLight ref={glow} position={[0, 2.4, -1]} intensity={0} color={palette.goldSoft} distance={22} />
    </group>
  );
}

export default function HouseScene({ progress }: { progress: RefObject<number> }) {
  const palette = useMemo(readPalette, []);
  return (
    <Canvas
      // Cap DPR — a scrubbed 3D scene at retina 3× melts laptops for no gain.
      dpr={[1, 1.75]}
      shadows
      camera={{ position: PATH[0].pos, fov: 42, near: 0.1, far: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[palette.ivory]} />
      <fog attach="fog" args={[palette.ivory, 26, 62]} />

      <ambientLight intensity={0.75} />
      <directionalLight
        position={[12, 16, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <directionalLight position={[-10, 6, -8]} intensity={0.35} color={palette.goldSoft} />

      <House progress={progress} />
      <ContactShadows position={[0, -0.38, 0]} opacity={0.32} scale={30} blur={2.4} far={9} />

      <Rig progress={progress} />
    </Canvas>
  );
}
