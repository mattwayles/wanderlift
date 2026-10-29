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

/* ---------------------------------------------------------------------------------------------
 * 2. Accessory patterns — template slots that had one record (hip_extension), only band records
 *    (knee flexion/extension, biceps), or almost no bodyweight option, so a no-band day left the
 *    slot empty and a band day repeated the same move.
 * ------------------------------------------------------------------------------------------- */
const ACCESSORIES = [
  // --- hip_extension (was: banded donkey kick only) ---
  {
    id: 'bw-prone-hip-extension',
    name: 'Prone Hip Extension',
    aliases: ['prone leg lift'],
    focus: ['legs'],
    pattern: 'hip_extension',
    primary: ['glutes'],
    secondary: ['hamstrings', 'lower_back'],
    unilateral: true,
    roles: ['main', 'warmup'],
    difficulty: 'easy',
    contraindications: ['lower_back_extension', 'lying_prone'],
    setup:
      'Lie face down, forehead resting on your hands. Squeeze one glute and lift that straight leg a few inches off the floor without arching the low back or twisting the hips. Pause, lower slowly. Finish one side, then switch.',
  },
  {
    id: 'bw-bench-reverse-hyper',
    name: 'Bench Reverse Hyperextension',
    aliases: ['reverse hyper'],
    focus: ['legs'],
    pattern: 'hip_extension',
    primary: ['glutes'],
    secondary: ['hamstrings', 'lower_back'],
    anchor: 'body-support',
    difficulty: 'medium',
    contraindications: ['lower_back_extension', 'lying_prone'],
    setup:
      'Lie face down on a sturdy bench or table with your hips at the edge and legs hanging, holding the sides. Squeeze the glutes to raise straight legs until they are level with your body, pause, lower with control. Do not swing above level.',
  },

  // --- knee_flexion (was: two anchor-low band curls) ---
  {
    id: 'banded-seated-hamstring-curl',
    name: 'Banded Seated Hamstring Curl',
    focus: ['legs'],
    pattern: 'knee_flexion',
    primary: ['hamstrings'],
    band: 'B1-B2',
    anchor: 'anchor-low',
    unilateral: true,
    difficulty: 'easy',
    contraindications: ['knee_flexion_loaded'],
    setup:
      'Anchor the band low in front of you and sit on a chair facing it, band looped around one ankle with that leg straight out. Pull the heel down and back under the chair against the band, pause, return slowly. Finish one side, then switch.',
  },
  {
    id: 'bw-glute-bridge-walkout',
    name: 'Glute Bridge Walkout',
    aliases: ['hamstring walkout'],
    focus: ['legs'],
    pattern: 'knee_flexion',
    primary: ['hamstrings'],
    secondary: ['glutes'],
    difficulty: 'medium',
    contraindications: ['knee_flexion_loaded', 'lower_back_extension', 'lying_supine'],
    setup:
      'Lie on your back, knees bent, and lift into a glute bridge. Keeping the hips up, walk the heels out in small steps until the legs are nearly straight, then walk them back in. That out-and-back is one rep.',
  },

  // --- knee_extension (was: TKE and seated leg extension, both banded) ---
  {
    id: 'bw-sissy-squat',
    name: 'Sissy Squat',
    focus: ['legs'],
    pattern: 'knee_extension',
    primary: ['quads'],
    secondary: ['hip_flexors', 'abs'],
    difficulty: 'hard',
    contraindications: ['knee_flexion_loaded'],
    setup:
      'Hold a doorframe or sturdy post with one hand, feet hip width. Rise onto the balls of your feet and lean back, bending only at the knees, so the knees travel forward while hips and torso stay in one line. Go only as deep as you control, then press back up.',
  },
  {
    id: 'bw-reverse-nordic',
    name: 'Reverse Nordic',
    aliases: ['reverse nordic curl'],
    focus: ['legs'],
    pattern: 'knee_extension',
    primary: ['quads'],
    secondary: ['hip_flexors'],
    difficulty: 'medium',
    contraindications: ['knee_flexion_loaded'],
    setup:
      'Kneel on something soft, knees hip width, body upright. Keeping one straight line from knees to head, lean back as far as you can control, then pull yourself upright with the quads. Do not bend at the hips.',
  },
  {
    id: 'banded-spanish-squat',
    name: 'Banded Spanish Squat',
    aliases: ['spanish squat'],
    focus: ['legs'],
    pattern: 'knee_extension',
    primary: ['quads'],
    secondary: ['glutes'],
    band: 'B3-B5',
    anchor: 'anchor-low',
    difficulty: 'medium',
    contraindications: ['knee_flexion_loaded'],
    setup:
      'Loop a heavy band around something immovable and step into it so it sits behind both knees. Walk back to strong tension, feet hip width. Sit back into a squat with shins vertical and torso upright, letting the band hold your knees, then stand.',
  },

  // --- adduction (was: two records) ---
  {
    id: 'bw-copenhagen-plank',
    name: 'Copenhagen Plank',
    aliases: ['copenhagen adductor plank'],
    focus: ['legs'],
    pattern: 'adduction',
    primary: ['adductors'],
    secondary: ['obliques', 'abs'],
    anchor: 'body-support',
    metric: 'time',
    default_seconds: 20,
    unilateral: true,
    difficulty: 'hard',
    contraindications: ['core_pressure', 'hip'],
    setup:
      'Side plank on your forearm with the top foot resting on a bench and the bottom leg hanging free beneath it. Lift the hips into a straight line and hold. Finish one side, then switch.',
  },
  {
    id: 'bw-short-lever-copenhagen-plank',
    name: 'Short-Lever Copenhagen Plank',
    aliases: ['bent-knee copenhagen plank'],
    focus: ['legs'],
    pattern: 'adduction',
    primary: ['adductors'],
    secondary: ['obliques', 'abs'],
    anchor: 'body-support',
    metric: 'time',
    default_seconds: 20,
    unilateral: true,
    difficulty: 'medium',
    contraindications: ['core_pressure', 'hip'],
    setup:
      'Side plank on your forearm with the inside of your top knee resting on a bench and the bottom leg tucked under. Press the top knee down into the bench to lift the hips into a straight line and hold. Finish one side, then switch.',
  },

  // --- abduction ---
  {
    id: 'bw-side-lying-hip-abduction',
    name: 'Side-Lying Hip Abduction',
    aliases: ['side-lying leg raise'],
    focus: ['legs'],
    pattern: 'abduction',
    primary: ['abductors'],
    secondary: ['glutes'],
    unilateral: true,
    roles: ['main', 'warmup'],
    difficulty: 'easy',
    contraindications: ['hip'],
    setup:
      'Lie on your side, bottom knee bent for balance, top leg straight and slightly behind your body. Lift the top leg toward the ceiling, heel leading and toes facing forward, pause, lower slowly. Finish one side, then switch.',
  },
  {
    id: 'banded-seated-hip-abduction',
    name: 'Banded Seated Hip Abduction',
    focus: ['legs'],
    pattern: 'abduction',
    primary: ['abductors'],
    secondary: ['glutes'],
    band: 'B1-B2',
    anchor: 'thigh-loop',
    difficulty: 'easy',
    contraindications: ['hip'],
    setup:
      'Sit on the edge of a chair with the band around your thighs just above the knees, feet hip width. Press the knees out against the band, pause, return with control. Lean slightly forward to bias the glutes.',
  },
  {
    id: 'banded-fire-hydrant',
    name: 'Banded Fire Hydrant',
    focus: ['legs'],
    pattern: 'abduction',
    primary: ['abductors'],
    secondary: ['glutes'],
    band: 'B1',
    anchor: 'thigh-loop',
    unilateral: true,
    roles: ['main', 'warmup'],
    difficulty: 'easy',
    contraindications: ['hip', 'wrist_extension'],
    setup:
      'On hands and knees with the band around your thighs just above the knees. Lift one knee out to the side against the band, keeping it bent and the hips square. Finish one side, then switch.',
  },
  {
    id: 'banded-glute-bridge-abduction',
    name: 'Banded Glute Bridge Abduction',
    focus: ['legs'],
    pattern: 'abduction',
    primary: ['abductors'],
    secondary: ['glutes', 'hamstrings'],
    band: 'B1-B2',
    anchor: 'thigh-loop',
    difficulty: 'easy',
    contraindications: ['lower_back_extension', 'lying_supine'],
    setup:
      'Lie on your back, band around your thighs just above the knees, feet flat. Lift into a glute bridge, then press the knees out against the band and back in while the hips stay up. Lower at the end of the set.',
  },

  // --- calf ---
  {
    id: 'bw-deficit-calf-raise',
    name: 'Deficit Calf Raise',
    aliases: ['step calf raise'],
    focus: ['legs'],
    pattern: 'calf',
    primary: ['calves'],
    anchor: 'body-support',
    difficulty: 'medium',
    contraindications: ['ankle'],
    setup:
      'Stand with the balls of your feet on the edge of a stair, holding a rail. Lower the heels below the step for a full stretch, then rise as high as you can. Do it on one leg to make it harder.',
  },

  // --- elbow_flexion (was: band only) ---
  {
    id: 'bw-inverted-bicep-curl',
    name: 'Bodyweight Bicep Curl',
    aliases: ['inverted bicep curl', 'low bar bicep curl'],
    focus: ['upper'],
    pattern: 'elbow_flexion',
    primary: ['biceps'],
    secondary: ['forearms'],
    anchor: 'low-bar',
    difficulty: 'medium',
    contraindications: ['elbow'],
    setup:
      'Grip a sturdy waist-height bar underhand, shoulder width, and lean back under it with straight arms and a straight body. Curl your forehead toward the bar by bending only the elbows, then lower slowly. Walk the feet back to make it easier.',
  },
  {
    id: 'banded-bayesian-curl',
    name: 'Banded Bayesian Curl',
    aliases: ['bayesian curl'],
    focus: ['upper'],
    pattern: 'elbow_flexion',
    primary: ['biceps'],
    secondary: ['forearms'],
    band: 'B1-B2',
    anchor: 'anchor-low',
    unilateral: true,
    difficulty: 'medium',
    contraindications: ['elbow'],
    setup:
      'Anchor the band low behind you and hold it in one hand, facing away. Step forward until the arm is drawn slightly behind your body. Keeping that elbow back, curl to the shoulder, then lower slowly into the stretch. Finish one side, then switch.',
  },
  {
    id: 'banded-zottman-curl',
    name: 'Banded Zottman Curl',
    aliases: ['zottman curl'],
    focus: ['upper'],
    pattern: 'elbow_flexion',
    primary: ['biceps'],
    secondary: ['forearms'],
    band: 'B1-B2',
    anchor: 'stance',
    difficulty: 'medium',
    contraindications: ['elbow'],
    setup:
      'Stand mid-band, palms up, elbows at your sides. Curl to the shoulders, turn the palms over to an overhand grip at the top, lower slowly overhand, then turn them back up at the bottom.',
  },

  // --- elbow_extension ---
  {
    id: 'bw-bodyweight-triceps-extension',
    name: 'Bodyweight Triceps Extension',
    aliases: ['bodyweight skull crusher'],
    focus: ['upper'],
    pattern: 'elbow_extension',
    primary: ['triceps'],
    anchor: 'low-bar',
    anchor_alt: 'body-support',
    difficulty: 'medium',
    contraindications: ['elbow', 'wrist_extension'],
    setup:
      'Grip a sturdy waist-height bar, or the edge of a bench, shoulder width, and walk your feet back into a straight-body lean. Bend only the elbows to lower your head below your hands, then press back to straight arms. A more upright lean is easier.',
  },

  // --- shoulder_isolation ---
  {
    id: 'banded-cuban-press',
    name: 'Banded Cuban Press',
    aliases: ['cuban press'],
    focus: ['upper'],
    pattern: 'shoulder_isolation',
    primary: ['rear_delts'],
    secondary: ['side_delts', 'front_delts', 'traps'],
    band: 'B1',
    anchor: 'anchor-mid',
    difficulty: 'medium',
    contraindications: ['shoulder_overhead'],
    setup:
      'Anchor the band at chest height and face it, a hand on each side, arms straight. Row the hands to your chest with elbows high and wide, rotate the forearms up until they point at the ceiling, then press up overhead. Reverse each step slowly.',
  },
  {
    id: 'banded-scaption-raise',
    name: 'Banded Scaption Raise',
    aliases: ['scaption'],
    focus: ['upper'],
    pattern: 'shoulder_isolation',
    primary: ['front_delts'],
    secondary: ['side_delts', 'traps'],
    band: 'B1',
    anchor: 'stance',
    roles: ['main', 'warmup'],
    difficulty: 'easy',
    contraindications: ['shoulder_overhead'],
    setup:
      'Stand mid-band, thumbs up. Raise straight arms to shoulder height in a Y, about 30 degrees forward of your sides, then lower slowly.',
  },
  {
    id: 'banded-single-arm-external-rotation',
    name: 'Banded Single-Arm External Rotation',
    focus: ['upper'],
    pattern: 'shoulder_isolation',
    primary: ['rear_delts'],
    secondary: ['upper_back'],
    band: 'B1',
    anchor: 'anchor-mid',
    unilateral: true,
    roles: ['main', 'warmup'],
    difficulty: 'easy',
    contraindications: [],
    setup:
      'Anchor the band at waist height beside you and hold it in the far hand, elbow bent 90 degrees and pinned to your side. Rotate the forearm out away from your belly, pause, return slowly. Finish one side, then switch.',
  },
  {
    id: 'bw-wall-slide',
    name: 'Wall Slide',
    focus: ['upper', 'full'],
    pattern: 'shoulder_isolation',
    primary: ['traps'],
    secondary: ['upper_back', 'front_delts'],
    roles: ['warmup'],
    difficulty: 'easy',
    contraindications: ['shoulder_overhead'],
    setup:
      'Stand with your back, head and arms against a wall, elbows bent 90 degrees and forearms flat on it. Slide the arms up as far as you can without anything leaving the wall, then draw them back down, squeezing the shoulder blades.',
  },
];

/* ---------------------------------------------------------------------------------------------
 * 3. Common core, cardio, stretch and warm-up moves the library lacked — including the quad
 *    stretch (a Cardio cool-down could not target quads) and the hanging raises.
 * ------------------------------------------------------------------------------------------- */
const CORE_CARDIO_STRETCH = [
  // --- core ---
  {
    id: 'bw-hanging-knee-raise',
    name: 'Hanging Knee Raise',
    focus: ['abs'],
    pattern: 'flexion',
    primary: ['abs'],
    secondary: ['hip_flexors', 'forearms'],
    anchor: 'pullup-bar',
    difficulty: 'medium',
    contraindications: ['core_pressure', 'lower_back_flexion', 'shoulder_overhead'],
    setup:
      'Hang from a pull-up bar with straight arms and shoulders engaged. Curl the knees up toward the chest by tilting the pelvis, pause, then lower slowly without swinging.',
  },
  {
    id: 'bw-hanging-leg-raise',
    name: 'Hanging Leg Raise',
    focus: ['abs'],
    pattern: 'flexion',
    primary: ['abs'],
    secondary: ['hip_flexors', 'forearms'],
    anchor: 'pullup-bar',
    difficulty: 'hard',
    contraindications: ['core_pressure', 'hip', 'lower_back_flexion', 'shoulder_overhead'],
    setup:
      'Hang from a pull-up bar with shoulders engaged. Keeping the legs straight, raise them to at least hip height, pause, then lower slowly without swinging. Bend the knees to make it easier.',
  },
  {
    id: 'bw-toe-touch-crunch',
    name: 'Toe-Touch Crunch',
    aliases: ['toe reach', 'toe touches'],
    focus: ['abs'],
    pattern: 'flexion',
    primary: ['abs'],
    difficulty: 'easy',
    contraindications: ['core_pressure', 'lower_back_flexion', 'lying_supine', 'neck'],
    setup:
      'Lie on your back with your legs straight up toward the ceiling. Reach both hands toward your toes, lifting the shoulder blades off the floor, then lower slowly.',
  },
  {
    id: 'bw-seated-knee-tuck',
    name: 'Seated Knee Tuck',
    aliases: ['seated in and out', 'in and outs'],
    focus: ['abs'],
    pattern: 'flexion',
    primary: ['abs'],
    secondary: ['hip_flexors'],
    difficulty: 'medium',
    contraindications: ['core_pressure', 'lower_back_flexion'],
    setup:
      'Sit with your hands on the floor behind you, lean back slightly and lift your feet. Draw the knees in toward the chest, then extend the legs out long without letting the feet touch down.',
  },
  {
    id: 'bw-plank-hip-dip',
    name: 'Plank Hip Dip',
    aliases: ['plank hip twist'],
    focus: ['abs'],
    pattern: 'anti_rotation',
    primary: ['obliques'],
    secondary: ['abs'],
    alternating: true,
    difficulty: 'medium',
    contraindications: ['core_pressure'],
    setup:
      'Forearm plank, feet together. Rotate the hips to dip one hip toward the floor, back through the middle, then to the other side. The shoulders stay still over the elbows.',
  },
  {
    id: 'bw-side-plank-reach-through',
    name: 'Side Plank Reach-Through',
    aliases: ['side plank thread the needle'],
    focus: ['abs'],
    pattern: 'anti_rotation',
    primary: ['obliques'],
    secondary: ['abs', 'upper_back'],
    unilateral: true,
    difficulty: 'medium',
    contraindications: ['core_pressure'],
    setup:
      'Side plank on your forearm, top arm reaching to the ceiling. Sweep the top arm under your body, rotating the chest toward the floor, then open back up. The hips stay high. Finish one side, then switch.',
  },

  // --- cardio ---
  {
    id: 'bw-squat-jack',
    name: 'Squat Jack',
    focus: ['cardio'],
    pattern: 'conditioning',
    primary: ['quads'],
    secondary: ['glutes', 'calves'],
    metric: 'time',
    difficulty: 'medium',
    contraindications: ['ankle', 'knee_flexion_loaded', 'knee_impact'],
    setup:
      'Jump the feet out wide and drop into a squat, hands at your chest, then jump them back together as you stand. Land softly through the whole foot.',
  },
  {
    id: 'bw-step-touch',
    name: 'Step Touch',
    focus: ['cardio'],
    pattern: 'conditioning',
    primary: ['abductors'],
    secondary: ['calves'],
    metric: 'time',
    roles: ['main', 'warmup'],
    difficulty: 'easy',
    contraindications: [],
    setup:
      'Step one foot out to the side and bring the other in to tap beside it, then go back the other way. Add an arm swing or a clap to lift the pace. No jumping.',
  },
  {
    id: 'bw-grapevine',
    name: 'Grapevine',
    focus: ['cardio'],
    pattern: 'conditioning',
    primary: ['abductors'],
    secondary: ['calves', 'adductors'],
    metric: 'time',
    difficulty: 'easy',
    contraindications: [],
    setup:
      'Step to the side, cross the trailing foot behind, step to the side again and tap the trailing foot in. Reverse direction. Light and rhythmic, no jumping.',
  },
  {
    id: 'bw-front-kick',
    name: 'Front Kick',
    aliases: ['front kicks'],
    focus: ['cardio'],
    pattern: 'conditioning',
    primary: ['hip_flexors'],
    secondary: ['quads', 'abs'],
    metric: 'time',
    alternating: true,
    difficulty: 'easy',
    contraindications: ['hip'],
    setup:
      'Fighting stance, hands up. Lift one knee and snap the foot forward at hip height or lower, striking with the ball of the foot, then pull it back and set it down. Alternate legs at a steady pace.',
  },
  {
    id: 'bw-cross-body-mountain-climber',
    name: 'Cross-Body Mountain Climber',
    aliases: ['twisting mountain climber'],
    focus: ['cardio'],
    pattern: 'conditioning',
    primary: ['obliques'],
    secondary: ['abs', 'hip_flexors', 'front_delts'],
    metric: 'time',
    difficulty: 'medium',
    contraindications: ['core_pressure', 'lower_back_flexion', 'wrist_extension'],
    setup:
      'High plank. Drive each knee toward the opposite elbow at pace, hips low and level.',
  },
  {
    id: 'bw-pogo-hop',
    name: 'Pogo Hop',
    aliases: ['pogo jumps'],
    focus: ['cardio'],
    pattern: 'conditioning',
    primary: ['calves'],
    secondary: ['quads'],
    metric: 'time',
    difficulty: 'medium',
    contraindications: ['ankle', 'knee_impact'],
    setup:
      'Stand tall with soft knees and bounce on the balls of your feet, using the ankles like springs. Small, quick, quiet hops; the heels never touch down.',
  },
  {
    id: 'bw-lateral-shuffle',
    name: 'Lateral Shuffle',
    focus: ['cardio'],
    pattern: 'conditioning',
    primary: ['abductors'],
    secondary: ['glutes', 'quads', 'calves'],
    metric: 'time',
    difficulty: 'medium',
    contraindications: ['ankle', 'knee_flexion_loaded'],
    setup:
      'Quarter-squat stance, weight on the balls of the feet. Shuffle quickly several steps one way without letting the feet clap together, then reverse. Stay low throughout.',
  },
  {
    id: 'bw-a-skip',
    name: 'A-Skip',
    aliases: ['a skip'],
    focus: ['cardio'],
    pattern: 'conditioning',
    primary: ['hip_flexors'],
    secondary: ['calves', 'quads'],
    metric: 'time',
    difficulty: 'medium',
    contraindications: ['ankle', 'knee_impact'],
    setup:
      'Skip forward over a short stretch, or in place, driving one knee to hip height while the other foot pushes off the floor, opposite arm swinging. Stay tall on the balls of the feet.',
  },
  {
    id: 'rope-criss-cross',
    name: 'Jump Rope Criss-Cross',
    focus: ['cardio'],
    pattern: 'conditioning',
    primary: ['calves'],
    secondary: ['front_delts', 'forearms'],
    anchor: 'jump-rope',
    metric: 'time',
    difficulty: 'hard',
    contraindications: ['ankle', 'knee_impact'],
    setup:
      'On every other jump, cross your arms in front of your body so the rope makes a loop to jump through, then uncross on the next. Hands cross at the hips, not the chest.',
  },
  {
    id: 'rope-single-leg-hop',
    name: 'Jump Rope Single-Leg Hop',
    focus: ['cardio'],
    pattern: 'conditioning',
    primary: ['calves'],
    secondary: ['quads'],
    anchor: 'jump-rope',
    metric: 'time',
    difficulty: 'hard',
    contraindications: ['ankle', 'knee_impact'],
    setup:
      'Jump on one foot for several turns, then switch, keeping the hop low and the landing quiet. Go back to two feet whenever the rhythm breaks.',
  },

  // --- cool-down stretches ---
  {
    id: 'cd-standing-quad-stretch',
    name: 'Standing Quad Stretch',
    focus: ['legs', 'full', 'cardio'],
    pattern: 'knee_extension',
    primary: ['quads'],
    secondary: ['hip_flexors'],
    metric: 'time',
    unilateral: true,
    tier: 'stretch',
    roles: ['cooldown'],
    difficulty: 'easy',
    contraindications: [],
    setup:
      'Stand tall holding a wall or chair. Bend one knee and hold that ankle behind you, knees together, and press the hip forward until you feel the front of the thigh. 30s per side.',
  },
  {
    id: 'cd-standing-hamstring-stretch',
    name: 'Standing Hamstring Stretch',
    focus: ['legs', 'full', 'cardio'],
    pattern: 'hinge',
    primary: ['hamstrings'],
    secondary: ['calves'],
    metric: 'time',
    unilateral: true,
    tier: 'stretch',
    roles: ['cooldown'],
    difficulty: 'easy',
    contraindications: [],
    setup:
      'Rest one heel on a low step, leg straight and toes up. Hinge forward from the hips with a flat back until you feel the back of the thigh. 30s per side.',
  },
  {
    id: 'cd-butterfly-stretch',
    name: 'Butterfly Stretch',
    focus: ['legs', 'full'],
    pattern: 'adduction',
    primary: ['adductors'],
    secondary: ['glutes'],
    metric: 'time',
    tier: 'stretch',
    roles: ['cooldown'],
    difficulty: 'easy',
    contraindications: ['hip'],
    setup:
      'Sit tall with the soles of your feet together and knees falling out. Hold your ankles and hinge forward slightly from the hips, letting the knees relax down. 30s.',
  },
  {
    id: 'cd-cross-body-shoulder-stretch',
    name: 'Cross-Body Shoulder Stretch',
    focus: ['upper', 'full'],
    pattern: 'shoulder_isolation',
    primary: ['rear_delts'],
    secondary: ['upper_back'],
    metric: 'time',
    unilateral: true,
    tier: 'stretch',
    roles: ['cooldown'],
    difficulty: 'easy',
    contraindications: ['shoulder_horizontal'],
    setup:
      'Bring one straight arm across your chest and hug it in with the other forearm just above the elbow. Keep the shoulder down, away from the ear. 30s per side.',
  },
  {
    id: 'cd-overhead-triceps-stretch',
    name: 'Overhead Triceps Stretch',
    focus: ['upper', 'full'],
    pattern: 'elbow_extension',
    primary: ['triceps'],
    secondary: ['lats'],
    metric: 'time',
    unilateral: true,
    tier: 'stretch',
    roles: ['cooldown'],
    difficulty: 'easy',
    contraindications: ['shoulder_overhead'],
    setup:
      'Reach one arm overhead, bend the elbow to drop the hand behind your head, and gently press the elbow back with the other hand. 30s per side.',
  },
  {
    id: 'cd-supine-spinal-twist',
    name: 'Supine Spinal Twist',
    aliases: ['reclined twist'],
    focus: ['abs', 'legs', 'full'],
    pattern: 'anti_rotation',
    primary: ['lower_back'],
    secondary: ['obliques', 'glutes'],
    metric: 'time',
    unilateral: true,
    tier: 'stretch',
    roles: ['cooldown'],
    difficulty: 'easy',
    contraindications: ['lying_supine'],
    setup:
      'Lie on your back, arms out wide. Draw one knee across your body toward the floor while both shoulders stay down, and breathe into it. 30s per side.',
  },
  {
    id: 'cd-downward-dog',
    name: 'Downward Dog',
    aliases: ['down dog'],
    focus: ['legs', 'upper', 'full'],
    pattern: 'hinge',
    primary: ['hamstrings'],
    secondary: ['calves', 'lats'],
    metric: 'time',
    tier: 'stretch',
    roles: ['cooldown'],
    difficulty: 'easy',
    contraindications: ['shoulder_overhead', 'wrist_extension'],
    setup:
      'From hands and knees, tuck the toes and lift the hips up and back into an upside-down V. Press the chest toward the thighs and the heels toward the floor, knees soft if needed. 30s.',
  },

  // --- warm-up ---
  {
    id: 'wu-leg-swings',
    name: 'Leg Swings',
    focus: ['legs', 'full', 'cardio'],
    pattern: 'hip_extension',
    primary: ['hip_flexors'],
    secondary: ['hamstrings', 'glutes', 'adductors'],
    unilateral: true,
    roles: ['warmup'],
    difficulty: 'easy',
    contraindications: ['hip'],
    setup:
      'Hold a wall for balance and swing one straight leg forward and back, letting the range grow with each swing. Then face the wall and swing it side to side across your body. Finish one leg, then switch.',
  },
];

const BATCHES = [LADDER_SIBLINGS, ACCESSORIES, CORE_CARDIO_STRETCH];

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
