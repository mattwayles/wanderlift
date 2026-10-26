/**
 * Track 53 — library audit. One-shot authoring helper for the exercises the audit found missing:
 * siblings for thin ladder rungs, bodyweight options for accessory patterns that had none, and
 * common core, cardio, stretch and warm-up moves. Every entry is an established, named exercise.
 *
 *   node scripts/add_library_audit_exercises.js
 *
 * Idempotent: an exercise id already present is left alone, and a level already listing it is
 * not appended to twice. Tagged to the 37c standard (contraindications.test.ts guards the cue
 * wording). Same record shape as `add_sibling_exercises.js`.
 */
const fs = require('fs');
const path = require('path');

const LIB = path.join(__dirname, '..', 'library');

const BEARING = ['pullup-bar', 'body-support', 'low-bar'];

function anchorClass(anchor) {
  if (BEARING.includes(anchor)) return 'bodyweight_bearing';
  if (anchor === 'none' || anchor === 'jump-rope') return 'none';
  return 'band_tension';
}

function videoSearch(o) {
  const q = o.name.replace(/ /g, '+');
  if (o.roles.length === 1 && o.roles[0] === 'cooldown') {
    return `https://www.youtube.com/results?search_query=${q}+how+to+stretch`;
  }
  return o.band
    ? `https://www.youtube.com/results?search_query=loop+resistance+band+${q}+proper+form+tutorial`
    : `https://www.youtube.com/results?search_query=${q}+proper+form+tutorial`;
}

function exercise(o) {
  const level = o.level ?? null;
  const record = {
    id: o.id,
    name: o.name,
    aliases: o.aliases ?? [],
    focus: o.focus,
    pattern: o.pattern,
    primary: o.primary,
    secondary: o.secondary ?? [],
    equipment: o.band ? 'band' : 'bodyweight',
    band: o.band ?? null,
    anchor: o.anchor ?? 'none',
    anchor_alt: o.anchor_alt ?? null,
    anchor_class: anchorClass(o.anchor ?? 'none'),
    unilateral: o.unilateral ?? false,
  };
  if (o.alternating) record.alternating = true;
  Object.assign(record, {
    metric: o.metric ?? 'reps',
    default_seconds: o.metric === 'time' ? (o.default_seconds ?? 30) : null,
    tier: o.tier ?? (level ? 'core' : 'fill'),
    roles: o.roles ?? ['main'],
    difficulty: o.difficulty,
    progression_family: level ? level.split('.')[0] : null,
    progression_level_id: level,
    contraindications: o.contraindications,
    setup: o.setup,
    video_search: videoSearch({ ...o, roles: o.roles ?? ['main'] }),
  });
  return record;
}

/* ---------------------------------------------------------------------------------------------
 * 1. Ladder siblings — rungs that held one exercise (or one bodyweight exercise), so the
 *    current-rung draw kept repeating it.
 * ------------------------------------------------------------------------------------------- */
const LADDER_SIBLINGS = [
  // --- squat ---
  {
    id: 'bw-assisted-squat',
    name: 'Assisted Squat',
    aliases: ['supported squat'],
    level: 'squat.l0',
    focus: ['legs'],
    pattern: 'squat',
    primary: ['quads'],
    secondary: ['glutes'],
    difficulty: 'easy',
    contraindications: ['knee_flexion_loaded'],
    setup:
      'Hold a doorframe, sturdy counter edge or chair back with both hands, feet shoulder width. Sit down and back as deep as is comfortable, using your hands only as much as you need, then stand tall. Lean on them less as it gets easier.',
  },
  {
    id: 'bw-prisoner-squat',
    name: 'Prisoner Squat',
    level: 'squat.l1',
    focus: ['legs', 'full'],
    pattern: 'squat',
    primary: ['quads'],
    secondary: ['glutes', 'upper_back'],
    difficulty: 'easy',
    contraindications: ['knee_flexion_loaded'],
    setup:
      'Fingertips behind your head, elbows wide and chest tall. Sit down and back to at least parallel, knees tracking over the toes, then stand and squeeze the glutes. Keep the elbows pulled back the whole set.',
  },
  {
    id: 'bw-shrimp-squat',
    name: 'Shrimp Squat',
    level: 'squat.l7',
    focus: ['legs'],
    pattern: 'squat',
    primary: ['quads'],
    secondary: ['glutes', 'abs'],
    unilateral: true,
    difficulty: 'hard',
    contraindications: ['hip', 'knee_flexion_loaded'],
    setup:
      'Stand on one leg, bend the other knee and hold that foot behind you. Lower until the back knee touches the floor, then drive back up through the standing heel. Reach the free arm forward to balance; touch something sturdy while learning.',
  },

  // --- lunge ---
  {
    id: 'bw-low-step-up',
    name: 'Low Step-Up',
    level: 'lunge.l0',
    focus: ['legs'],
    pattern: 'lunge',
    primary: ['quads'],
    secondary: ['glutes'],
    anchor: 'body-support',
    unilateral: true,
    difficulty: 'easy',
    contraindications: ['hip', 'knee_flexion_loaded'],
    setup:
      'Face a single stair or a low, sturdy step. Step up with one foot, press through that heel to stand tall on the step, then step down with control. Finish one side, then switch. Hold a rail if you need balance.',
  },
  {
    id: 'bw-forward-lunge',
    name: 'Forward Lunge',
    aliases: ['front lunge'],
    level: 'lunge.l1',
    focus: ['legs'],
    pattern: 'lunge',
    primary: ['quads'],
    secondary: ['glutes', 'hamstrings'],
    unilateral: true,
    difficulty: 'easy',
    contraindications: ['knee_flexion_loaded'],
    setup:
      'Stand tall and step one foot well forward. Lower until both knees are near 90 degrees, front knee over the foot, then push back through the front heel to the start.',
  },
  {
    id: 'bw-skater-squat',
    name: 'Skater Squat',
    level: 'lunge.l7',
    focus: ['legs'],
    pattern: 'lunge',
    primary: ['quads'],
    secondary: ['glutes', 'hamstrings'],
    unilateral: true,
    difficulty: 'hard',
    contraindications: ['hip', 'knee_flexion_loaded'],
    setup:
      'Stand on one leg with the other knee bent and that foot off the floor behind you. Lean forward slightly and lower until the back knee lightly touches the floor (a folded towel under it helps), then drive up through the standing foot. Reach the arms forward to counterbalance.',
  },

  // --- hinge ---
  {
    id: 'banded-pull-through',
    name: 'Banded Pull-Through',
    aliases: ['pull-through', 'pull through'],
    level: 'hinge.l3',
    focus: ['legs', 'full'],
    pattern: 'hinge',
    primary: ['glutes'],
    secondary: ['hamstrings'],
    band: 'B2-B3',
    anchor: 'anchor-low',
    difficulty: 'easy',
    contraindications: ['lower_back_extension'],
    setup:
      'Anchor the band low behind you and face away, the band running between your legs with both hands holding it. Walk out to tension. Push the hips back with a flat back, then drive them forward to stand tall and squeeze the glutes. Arms stay straight; the hips do the work.',
  },
  {
    id: 'banded-kickstand-rdl',
    name: 'Banded Kickstand RDL',
    level: 'hinge.l4',
    focus: ['legs'],
    pattern: 'hinge',
    primary: ['hamstrings'],
    secondary: ['glutes', 'lower_back'],
    band: 'B2-B3',
    anchor: 'stance',
    unilateral: true,
    difficulty: 'medium',
    contraindications: ['lower_back_flexion', 'lower_back_extension'],
    setup:
      'Stand on the band with your front foot, an end in each hand, and rest the other toe a step behind you for balance. Push your hips back with a flat back until you feel the front hamstring, then drive them forward to stand. Most of the weight stays on the front leg.',
  },
  {
    id: 'bw-single-leg-slider-curl',
    name: 'Single-Leg Hamstring Slider Curl',
    aliases: ['single leg slider curl'],
    level: 'hinge.l7',
    focus: ['legs'],
    pattern: 'hinge',
    primary: ['hamstrings'],
    secondary: ['glutes'],
    unilateral: true,
    difficulty: 'hard',
    contraindications: ['knee_flexion_loaded', 'lower_back_extension', 'lying_supine'],
    setup:
      'Lie on your back with one heel on a towel on a smooth floor and the other leg lifted. Lift your hips, slide the heel out until the leg is nearly straight, then pull it back in, hips up throughout. Finish one side, then switch.',
  },

  // --- horizontal_push ---
  {
    id: 'bw-hand-release-push-up',
    name: 'Hand-Release Push-Up',
    level: 'horizontal_push.l4',
    focus: ['upper', 'full'],
    pattern: 'horizontal_push',
    primary: ['chest'],
    secondary: ['triceps', 'front_delts', 'abs'],
    difficulty: 'medium',
    contraindications: ['shoulder_horizontal', 'wrist_extension', 'lying_prone'],
    setup:
      'From a high plank, lower all the way until your chest and thighs touch the floor. Lift your hands an inch off the floor, place them back beside your chest and press up to the plank in one straight line. Every rep starts from a dead stop.',
  },
  {
    id: 'bw-plyo-push-up',
    name: 'Plyometric Push-Up',
    aliases: ['clap push-up', 'explosive push-up'],
    level: 'horizontal_push.l7',
    focus: ['upper'],
    pattern: 'horizontal_push',
    primary: ['chest'],
    secondary: ['triceps', 'front_delts'],
    difficulty: 'hard',
    contraindications: ['elbow', 'shoulder_horizontal', 'wrist_extension'],
    setup:
      'From a high plank, lower under control, then press up hard enough that your hands leave the floor. Land with soft elbows and flow into the next rep. Add a clap only once the landings are quiet.',
  },
  {
    id: 'bw-typewriter-push-up',
    name: 'Typewriter Push-Up',
    level: 'horizontal_push.l8',
    focus: ['upper'],
    pattern: 'horizontal_push',
    primary: ['chest'],
    secondary: ['triceps', 'front_delts', 'abs'],
    difficulty: 'hard',
    contraindications: ['shoulder_horizontal', 'wrist_extension'],
    setup:
      'High plank with your hands very wide. Lower to the bottom, slide your chest across toward one hand, then back across to the other, staying low, and press up. One slide each way is one rep.',
  },

  // --- vertical_push ---
  {
    id: 'bw-wall-hspu-negative',
    name: 'Wall Handstand Push-Up Negative',
    aliases: ['eccentric handstand push-up', 'negative handstand push-up'],
    level: 'vertical_push.l6b',
    focus: ['upper'],
    pattern: 'vertical_push',
    primary: ['front_delts'],
    secondary: ['triceps', 'abs'],
    difficulty: 'hard',
    contraindications: ['core_pressure', 'neck', 'shoulder_overhead', 'wrist_extension'],
    setup:
      'Kick up into a handstand against a wall, chest facing the wall, hands shoulder-width. Lower your head toward a folded towel as slowly as you can, about four seconds, then come down off the wall and kick back up. Only the lowering is trained; skip it without a wall and a clear head-landing zone.',
  },

  // --- vertical_pull ---
  {
    id: 'bw-negative-pull-up',
    name: 'Negative Pull-Up',
    level: 'vertical_pull.l6b',
    focus: ['upper'],
    pattern: 'vertical_pull',
    primary: ['lats'],
    secondary: ['biceps', 'upper_back'],
    anchor: 'pullup-bar',
    difficulty: 'hard',
    contraindications: ['elbow', 'shoulder_overhead'],
    setup:
      'Step or jump up to the top of a pull-up, chin over the bar, palms facing away. Lower yourself as slowly as you can, about five seconds, to a full hang.',
  },
  {
    id: 'bw-wide-grip-pull-up',
    name: 'Wide-Grip Pull-Up',
    aliases: ['wide pull-up'],
    level: 'vertical_pull.l8',
    focus: ['upper'],
    pattern: 'vertical_pull',
    primary: ['lats'],
    secondary: ['upper_back', 'biceps'],
    anchor: 'pullup-bar',
    difficulty: 'hard',
    contraindications: ['elbow', 'shoulder_overhead'],
    setup:
      'Overhand grip a hand-width or two outside shoulder width. From a full hang, pull until your chin clears the bar, driving the elbows down and out, then lower all the way.',
  },
  {
    id: 'bw-typewriter-pull-up',
    name: 'Typewriter Pull-Up',
    level: 'vertical_pull.l9',
    focus: ['upper'],
    pattern: 'vertical_pull',
    primary: ['lats'],
    secondary: ['biceps', 'upper_back', 'abs'],
    anchor: 'pullup-bar',
    difficulty: 'hard',
    contraindications: ['elbow', 'shoulder_overhead'],
    setup:
      'Wide overhand grip. Pull your chin over the bar, slide across toward one hand, then back across to the other with your chin at bar height, and lower. One slide each way is one rep.',
  },

  // --- anti_extension ---
  {
    id: 'bw-rkc-plank',
    name: 'RKC Plank',
    aliases: ['hardstyle plank'],
    level: 'anti_extension.l4',
    focus: ['abs'],
    pattern: 'anti_extension',
    primary: ['abs'],
    secondary: ['glutes', 'front_delts'],
    metric: 'time',
    default_seconds: 20,
    difficulty: 'hard',
    contraindications: ['core_pressure'],
    setup:
      'Forearm plank with elbows a little in front of your shoulders. Squeeze fists, glutes and thighs as hard as you can and pull your elbows toward your toes without moving them. Short, maximal holds.',
  },
  {
    id: 'bw-star-side-plank',
    name: 'Star Side Plank',
    level: 'anti_extension.l6',
    focus: ['abs'],
    pattern: 'anti_extension',
    primary: ['obliques'],
    secondary: ['abductors', 'glutes'],
    metric: 'time',
    default_seconds: 20,
    unilateral: true,
    difficulty: 'hard',
    contraindications: ['core_pressure', 'wrist_extension'],
    setup:
      'Side plank on a straight arm, hand under the shoulder. Reach the top arm to the ceiling and lift the top leg as high as you can control, body in one line. Finish one side, then switch.',
  },
  {
    id: 'bw-hollow-rock',
    name: 'Hollow Body Rock',
    aliases: ['hollow rock'],
    level: 'anti_extension.l7',
    focus: ['abs'],
    pattern: 'anti_extension',
    primary: ['abs'],
    secondary: ['hip_flexors'],
    difficulty: 'hard',
    contraindications: ['core_pressure', 'lower_back_flexion', 'lying_supine', 'neck'],
    setup:
      'On your back, press the low back flat and lift into a hollow hold, arms and legs extended and hovering. Keep that exact shape and rock from shoulders to hips. End the set when the low back lifts.',
  },
];

const BATCHES = [LADDER_SIBLINGS];

const exPath = path.join(LIB, 'exercises.json');
const famPath = path.join(LIB, 'families.json');
const exDoc = JSON.parse(fs.readFileSync(exPath, 'utf8'));
const famDoc = JSON.parse(fs.readFileSync(famPath, 'utf8'));
const have = new Set(exDoc.exercises.map((e) => e.id));
const levels = new Map(famDoc.families.flatMap((f) => f.levels.map((l) => [l.level_id, l])));

let added = 0;
let placed = 0;
for (const batch of BATCHES) {
  for (const o of batch) {
    if (!have.has(o.id)) {
      exDoc.exercises.push(exercise(o));
      have.add(o.id);
      added++;
    }
    if (o.level) {
      const level = levels.get(o.level);
      if (!level) throw new Error(`${o.id}: unknown level ${o.level}`);
      if (!level.exercise_ids.includes(o.id)) {
        level.exercise_ids.push(o.id);
        placed++;
      }
    }
  }
}

fs.writeFileSync(exPath, JSON.stringify(exDoc, null, 2) + '\n');
fs.writeFileSync(famPath, JSON.stringify(famDoc, null, 2) + '\n');
console.log(`add_library_audit_exercises: ${added} exercises added, ${placed} rung placements`);
