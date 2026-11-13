import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { COLORS, SHADOWS } from '../theme/tokens';
import { getGreeting } from '../utils/time';

/* ----------------------------- Brand palette ----------------------------- */
const P = {
  study: '#4338CA', // indigo
  wallah: '#F97316', // saffron orange
  ink: '#0F172A',
  physics: '#2563EB',
  physicsBg: '#DBEAFE',
  chem: '#7C3AED',
  chemBg: '#EDE9FE',
  bio: '#059669',
  bioBg: '#D1FAE5',
  gold: '#D97706',
  goldBg: '#FEF3C7',
};

const NCERT_URL = 'https://ncert.nic.in/textbook.php';

/* -------------------------------- Static data ------------------------------- */
const FALLBACK_UPDATES = [
  { title: 'NTA NEET UG: NCERT Rationalised Class 11 & 12 Syllabus Guidelines', source: 'NTA Bulletin', published_at: 'Latest' },
  { title: 'NEET Biology & Organic Chemistry High-Weightage Chapters Checklist', source: 'StudyWallah', published_at: 'Today' },
  { title: 'All India NEET Mock Practice Window Open for Weekend Test', source: 'Academic Cell', published_at: 'Today' },
];

const UPCOMING_BATCHES = [
  {
    id: 'lakshya', title: 'Lakshya NEET 2027', subtitle: 'Class 12 • Starts 1 Dec', badge: 'Class 12',
    schedule: 'Mon – Sat • 4:00 PM – 7:30 PM',
    highlights: ['Complete Class 12 NCERT line-by-line coverage', '1,200+ curated NEET PYQs with video solutions', 'Weekly Sunday full-syllabus mock evaluations'],
    image: require('../../assets/batches/batch_lakshya.png'),
  },
  {
    id: 'yakeen', title: 'Yakeen NEET 2.0', subtitle: 'Dropper • Starts 25 Nov', badge: 'Dropper',
    schedule: 'Daily • 9:00 AM – 1:30 PM',
    highlights: ['Accelerated Class 11 + 12 integrated revision', 'Daily Practice Problems (DPP) after every lecture', 'Dedicated OMR accuracy & speed booster tests'],
    image: require('../../assets/batches/batch_yakeen.png'),
  },
  {
    id: 'arjuna', title: 'Arjuna NEET Core', subtitle: 'Class 11 • Starts 8 Dec', badge: 'Foundation',
    schedule: 'Mon – Fri • 4:30 PM – 7:00 PM',
    highlights: ['Concept-first Mechanics, GOC & Cell Biology', 'NCERT Exemplar solved workbook included', 'Bi-weekly ranker mentorship sessions'],
    image: require('../../assets/batches/batch_arjuna.png'),
  },
];

const SUBJECTS = [
  {
    key: 'Physics', icon: 'planet', accent: P.physics, accentBg: P.physicsBg,
    chapterTag: 'High Weightage • 12–14 Qs',
    subTag: 'Class 11 & 12',
    subtitle: 'Electrostatics, Current Electricity, Optics & Modern Physics',
    summary: 'Focus on NCERT solved examples, circuit symmetry reductions, and Ray/Wave Optics sign conventions before attempting multi-concept PYQs.',
    bullets: [
      'Electrostatics: Gauss Law & Parallel Plate Capacitance',
      'Ray Optics: Lens Maker Formula & Prism Deviation',
      'Modern Physics: de Broglie Wavelength & Photoelectric Effect',
    ],
  },
  {
    key: 'Chemistry', icon: 'flask', accent: P.chem, accentBg: P.chemBg,
    chapterTag: 'High Weightage • 14–16 Qs',
    subTag: 'Org • Inorg • Phys',
    subtitle: 'Organic Mechanisms, Chemical Bonding & Thermodynamics',
    summary: 'Revise SN1/SN2 stereochemistry, VSEPR geometries, named Class 12 organic conversions, and inorganic NCERT trend exceptions.',
    bullets: [
      'Thermodynamics: Gibbs Free Energy Spontaneity & ΔG° = -RT ln K',
      'Electrochemistry: Nernst Equation & Kohlrausch Ion Law',
      'Organic Chemistry: SN1/SN2 Mechanisms & Aldol Condensation',
    ],
  },
  {
    key: 'Biology', icon: 'leaf', accent: P.bio, accentBg: P.bioBg,
    chapterTag: '90 Questions • NCERT Core',
    subTag: 'Botany & Zoology',
    subtitle: 'Human Physiology, Genetics, Ecology & Cell Cycle',
    summary: 'Master every labelled NCERT diagram, enzyme cofactor, Mendelian cross ratio, and biotechnology restriction site.',
    bullets: [
      'Genetics: Hardy-Weinberg Principle & Mendelian Dihybrid 9:3:3:1',
      'Human Physiology: Cardiac Output = SV × HR (~5 L/min)',
      'Ecology: Logistic Population Growth dN/dt = rN(K-N)/K',
    ],
  },
];

const PDF_MODULES = [
  { id: 'pdf-physics', title: 'NEET Physics Formula Handbook.pdf', size: '2.4 MB', pages: '48 Pages', subject: 'Physics', accent: P.physics, accentBg: P.physicsBg,
    topics: ['Mechanics & Rotational Motion', 'Electrostatics & Capacitance', 'Current Electricity & Magnetism', 'Modern Physics & Semiconductors'] },
  { id: 'pdf-chem', title: 'NCERT Organic Chemistry Reactions.pdf', size: '3.1 MB', pages: '62 Pages', subject: 'Chemistry', accent: P.chem, accentBg: P.chemBg,
    topics: ['GOC & Isomerism', 'Hydrocarbons & Haloalkanes', 'Aldehydes, Ketones & Carboxylic Acids', 'Biomolecules & Named Reactions'] },
  { id: 'pdf-bio', title: 'High-Yield Biology Diagrams.pdf', size: '4.0 MB', pages: '74 Pages', subject: 'Biology', accent: P.bio, accentBg: P.bioBg,
    topics: ['Cell Division & Mitosis Stages', 'Human Heart & Nephron Structure', 'DNA Replication Fork', 'Ecological Pyramids & Biomes'] },
];

const STUDY_RESOURCES = [
  { id: 'pyq', icon: 'analytics', title: '10-Yr PYQ Weightage', meta: 'Chapter-wise breakdown', accent: P.physics, accentBg: P.physicsBg,
    details: ['Physics: Modern Physics (8–10%), Electrostatics & Current (14%), Optics (8%)', 'Chemistry: Coordination Compounds & Bonding (12%), GOC & Carbonyls (15%)', 'Biology: Genetics & Biotech (22%), Human Physiology (18%), Ecology (12%)'] },
  { id: 'ncert', icon: 'checkmark-done-circle', title: 'NCERT Checklist', meta: '98 Chapters tracked', accent: P.bio, accentBg: P.bioBg,
    details: ['Read NCERT Summary & Points to Ponder at the end of every chapter', 'Solve all In-text Examples and Back-exercise numericals twice', 'Revise highlighted NCERT tables and scientist discovery dates weekly'] },
];

/* Daily chapter targets are self-tracked on-device (no backend endpoint for them). */
const INITIAL_TARGETS = [
  { id: 't1', subject: 'Physics', chapter: 'Current Electricity', total: 5, done: 3, accent: P.physics, accentBg: P.physicsBg, icon: 'planet' },
  { id: 't2', subject: 'Chemistry', chapter: 'Aldehydes, Ketones & Carboxylic Acids', total: 6, done: 6, accent: P.chem, accentBg: P.chemBg, icon: 'flask' },
  { id: 't3', subject: 'Biology', chapter: 'Molecular Basis of Inheritance', total: 5, done: 0, accent: P.bio, accentBg: P.bioBg, icon: 'leaf' },
];

/* Standard NCERT-level formulas. Source: NCERT textbooks (ncert.nic.in). */
const FORMULAS = [
  // Physics
  { id: 'p1', subject: 'Physics', topic: 'Electrostatics', name: "Coulomb's Law", equation: 'F = k q₁q₂ / r²',
    note: 'Force between two point charges in vacuum; k ≈ 9 × 10⁹ N m² C⁻².', example: 'Two 1 µC charges 1 m apart: F ≈ 9 × 10⁻³ N.', source: 'NCERT Physics XII, Ch. 1' },
  { id: 'p2', subject: 'Physics', topic: 'Current Electricity', name: "Ohm's Law & Combinations", equation: 'V = IR   |   Rₛ = R₁ + R₂   |   1/Rₚ = 1/R₁ + 1/R₂',
    note: 'Resistors add directly in series; reciprocals add in parallel.', example: '2 Ω and 2 Ω in parallel give 1 Ω.', source: 'NCERT Physics XII, Ch. 3' },
  { id: 'p3', subject: 'Physics', topic: 'Ray Optics', name: 'Lens Formula & Lens Maker', equation: '1/v − 1/u = 1/f   |   1/f = (n − 1)(1/R₁ − 1/R₂)',
    note: 'Use the Cartesian sign convention for u, v, f and the radii.', example: 'Convex lens f = +10 cm, u = −30 cm gives v = +15 cm.', source: 'NCERT Physics XII, Ch. 9' },
  { id: 'p4', subject: 'Physics', topic: 'Dual Nature', name: 'de Broglie Wavelength', equation: 'λ = h / p = h / √(2mK)',
    note: 'Matter wave wavelength for a particle with momentum p and kinetic energy K.', example: 'Higher kinetic energy gives a shorter wavelength.', source: 'NCERT Physics XII, Ch. 11' },
  { id: 'p5', subject: 'Physics', topic: 'Dual Nature', name: 'Photoelectric Equation', equation: 'Kmax = hν − φ',
    note: 'Maximum kinetic energy of photoelectrons; φ is the work function.', example: 'No emission if hν < φ, however intense the light.', source: 'NCERT Physics XII, Ch. 11' },
  { id: 'p6', subject: 'Physics', topic: 'Kinematics', name: 'Projectile Range', equation: 'R = u² sin 2θ / g',
    note: 'Horizontal range on level ground; maximum at θ = 45°.', example: 'u = 20 m/s, θ = 45°, g = 10: R = 40 m.', source: 'NCERT Physics XI, Ch. 3' },
  // Chemistry
  { id: 'c1', subject: 'Chemistry', topic: 'Thermodynamics', name: 'Gibbs Free Energy', equation: 'ΔG = ΔH − TΔS',
    note: 'A process is spontaneous at constant T and P when ΔG < 0.', example: 'ΔH < 0 and ΔS > 0 means spontaneous at all temperatures.', source: 'NCERT Chemistry XI, Ch. 5' },
  { id: 'c2', subject: 'Chemistry', topic: 'Electrochemistry', name: 'Nernst Equation (298 K)', equation: 'E = E° − (0.0591 / n) log Q',
    note: 'Cell potential under non-standard conditions.', example: 'At equilibrium Q = K and E = 0.', source: 'NCERT Chemistry XII, Ch. 3' },
  { id: 'c3', subject: 'Chemistry', topic: 'Ionic Equilibrium', name: 'Henderson–Hasselbalch', equation: 'pH = pKa + log([Salt] / [Acid])',
    note: 'pH of an acidic buffer.', example: 'Equal salt and acid concentrations give pH = pKa.', source: 'NCERT Chemistry XI, Ch. 7' },
  { id: 'c4', subject: 'Chemistry', topic: 'States of Matter', name: 'Ideal Gas Equation', equation: 'PV = nRT',
    note: 'R = 8.314 J K⁻¹ mol⁻¹ (0.0821 L atm K⁻¹ mol⁻¹).', example: '1 mol at STP (273 K, 1 atm) occupies about 22.4 L.', source: 'NCERT Chemistry XI, Ch. 5' },
  { id: 'c5', subject: 'Chemistry', topic: 'Chemical Kinetics', name: 'First-Order Rate Constant', equation: 'k = (2.303 / t) log ([A]₀ / [A])',
    note: 'Half-life t½ = 0.693 / k, independent of initial concentration.', example: 'If k = 0.0693 min⁻¹, t½ = 10 min.', source: 'NCERT Chemistry XII, Ch. 4' },
  { id: 'c6', subject: 'Chemistry', topic: 'Haloalkanes', name: 'Wurtz Reaction', equation: '2R–X + 2Na → R–R + 2NaX  (dry ether)',
    note: 'Couples two alkyl halides to form a higher symmetrical alkane.', example: '2 CH₃Br + 2Na gives C₂H₆.', source: 'NCERT Chemistry XII, Ch. 6' },
  { id: 'c7', subject: 'Chemistry', topic: 'Carboxylic Acids', name: 'Esterification', equation: 'RCOOH + R′OH ⇌ RCOOR′ + H₂O  (conc. H₂SO₄)',
    note: 'Reversible acid-catalysed condensation of an acid and an alcohol.', example: 'CH₃COOH + C₂H₅OH gives ethyl ethanoate.', source: 'NCERT Chemistry XII, Ch. 8' },
  // Biology
  { id: 'b1', subject: 'Biology', topic: 'Evolution', name: 'Hardy–Weinberg Principle', equation: 'p + q = 1   |   p² + 2pq + q² = 1',
    note: 'Allele and genotype frequencies stay constant when the population is not evolving.', example: 'If q = 0.3, the heterozygote frequency 2pq = 0.42.', source: 'NCERT Biology XII, Ch. 6' },
  { id: 'b2', subject: 'Biology', topic: 'Human Physiology', name: 'Cardiac Output', equation: 'CO = Stroke Volume × Heart Rate',
    note: 'Blood pumped by each ventricle per minute.', example: '70 mL × 72 bpm is about 5 L/min.', source: 'NCERT Biology XI, Ch. 18' },
  { id: 'b3', subject: 'Biology', topic: 'Photosynthesis', name: 'Overall Photosynthesis', equation: '6CO₂ + 12H₂O → C₆H₁₂O₆ + 6O₂ + 6H₂O  (light, chlorophyll)',
    note: 'The O₂ released comes from the splitting of water.', example: 'Light reactions occur in the thylakoids; the Calvin cycle in the stroma.', source: 'NCERT Biology XI, Ch. 13' },
  { id: 'b4', subject: 'Biology', topic: 'Genetics', name: 'Mendelian Ratios', equation: 'Monohybrid 3:1   |   Test cross 1:1   |   Dihybrid 9:3:3:1',
    note: 'Phenotypic ratios for a cross of heterozygotes (F₂), a test cross, and a dihybrid cross.', example: 'Tt × Tt gives 3 tall : 1 dwarf.', source: 'NCERT Biology XII, Ch. 5' },
  { id: 'b5', subject: 'Biology', topic: 'Molecular Biology', name: "Chargaff's Rule", equation: 'A = T   |   G = C   (double-stranded DNA)',
    note: 'Purines equal pyrimidines in double-stranded DNA.', example: 'If A = 30%, then T = 30%, and G = C = 20%.', source: 'NCERT Biology XII, Ch. 6' },
  { id: 'b6', subject: 'Biology', topic: 'Respiration', name: 'Glycolysis (net)', equation: 'Glucose → 2 Pyruvate + 2 ATP (net) + 2 NADH',
    note: 'Occurs in the cytoplasm and is anaerobic.', example: '4 ATP are made and 2 are used, so the net gain is 2.', source: 'NCERT Biology XI, Ch. 14' },
];

const FORMULA_FILTERS = ['All', 'Physics', 'Chemistry', 'Biology'];
const subjectColor = (s) => (s === 'Physics' ? [P.physics, P.physicsBg, 'planet'] : s === 'Chemistry' ? [P.chem, P.chemBg, 'flask'] : [P.bio, P.bioBg, 'leaf']);

/* ------------------------------ Press wrapper ------------------------------ */
function Press({ children, style, onPress, disabled, scaleTo = 0.97, hitSlop }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
    >
      {({ pressed }) => (
        <Animated.View style={[style, { transform: [{ scale }], opacity: pressed ? 0.92 : 1 }]}>{children}</Animated.View>
      )}
    </Pressable>
  );
}

function SectionTitle({ icon, color, bg, title, badge, right }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionTitleLeft}>
        <View style={[styles.sectionIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {right || (badge ? (
        <View style={[styles.badge, { backgroundColor: bg }]}>
          <Text style={[styles.badgeText, { color }]}>{badge}</Text>
        </View>
      ) : null)}
    </View>
  );
}

/* --------------------------------- Screen --------------------------------- */
export function HomeScreen({ onOpenPortal, onOpenAuth }) {
  const { token, user, logout } = useAuth();
  const isSecretPartner = user?.role === 'SECRET_PARTNER';
  const isFreedomPartner = user?.role === 'FREEDOM_PARTNER';

  const [neetUpdates, setNeetUpdates] = useState(FALLBACK_UPDATES);
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [notesBanner, setNotesBanner] = useState('');
  const [buttonColorState, setButtonColorState] = useState('BLACK');
  const [secretStatusData, setSecretStatusData] = useState(null);
  const [freedomDashData, setFreedomDashData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [previewModal, setPreviewModal] = useState(null);
  const [targets, setTargets] = useState(INITIAL_TARGETS);
  const [formulaFilter, setFormulaFilter] = useState('All');
  const [expandedFormula, setExpandedFormula] = useState(null);
  const [formulaCardIndex, setFormulaCardIndex] = useState(0);
  const [showAllFormulasModal, setShowAllFormulasModal] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'info' | 'error', text }

  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);

  const showToast = useCallback((type, text) => {
    setToast({ type, text });
    toastAnim.setValue(0);
    Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }).start();
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 3200);
  }, [toastAnim]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const loadNeetUpdates = useCallback(async () => {
    try {
      const res = await apiClient.getNeetUpdates();
      if (Array.isArray(res?.updates) && res.updates.length > 0) setNeetUpdates(res.updates);
    } catch {
      // keep fallback silently
    }
  }, []);

  const syncSecretStatus = useCallback(async () => {
    if (!token) return;
    try {
      if (isSecretPartner) {
        const res = await apiClient.getSecretSignalStatus(token);
        setSecretStatusData(res);
        if (res.total_sent === 0) setButtonColorState('BLACK');
        else if (res.status === 'RED') setButtonColorState('RED');
        else setButtonColorState('GREEN');
      } else if (isFreedomPartner) {
        const res = await apiClient.getFreedomDashboard(token);
        setFreedomDashData(res);
        if (res.unread_count > 0) setButtonColorState('RED');
        else if (res.today_total > 0) setButtonColorState('GREEN');
        else setButtonColorState('BLACK');
      }
    } catch {
      // stay calm if offline
    }
  }, [token, isSecretPartner, isFreedomPartner]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadNeetUpdates(), syncSecretStatus()]);
    setRefreshing(false);
  }, [loadNeetUpdates, syncSecretStatus]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refreshAll(); });
    return () => sub.remove();
  }, [refreshAll]);

  /* Secret Partner keeps its existing behaviour (disguised as "Get Notes").
     Freedom Partner: only calls a send-signal API if one already exists in apiClient.
     Nothing is faked: if the endpoint is missing or forbidden, the user is told. */
  const handlePrimaryAction = async () => {
    if (isFreedomPartner) {
      const sendFn = apiClient.createFreedomSignal || apiClient.sendFreedomSignal;
      if (typeof sendFn !== 'function') {
        showToast('info', 'Sync submission is not enabled on this account yet.');
        return;
      }
      setBusy(true);
      try {
        await sendFn.call(apiClient, token, 'Academic verification note');
        setButtonColorState('GREEN');
        showToast('success', 'Update sent successfully.');
        await syncSecretStatus();
      } catch (e) {
        const forbidden = e?.status === 403 || /forbidden|not allowed|permission/i.test(String(e?.message || ''));
        showToast('error', forbidden
          ? 'Server rejected this: You do not have permission to send sync updates on this account.'
          : 'Could not send update. Please try again.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!isSecretPartner) {
      setNotesBanner(`${selectedSubject.key} revision notes & PDF pack ready for study.`);
      return;
    }

    setBusy(true);
    try {
      await apiClient.createSecretSignal(token, `${selectedSubject.key} NCERT notes accessed`);
      setButtonColorState('RED');
      setNotesBanner(`${selectedSubject.key} revision notes & PDF pack loaded.`);
      await syncSecretStatus();
    } catch {
      setNotesBanner(`Unable to fetch ${selectedSubject.key} notes right now.`);
    } finally {
      setBusy(false);
    }
  };

  /* Activity target calculation in 24-hr cycle:
     Target Tasks: total tasks sent in 24h
     Pending Tasks: pending acknowledgement
     Viewed Tasks: evaluated in 24h */
  let todayTarget = 0;
  let viewedTasks = 0;
  let pendingTasks = 0;

  if (isSecretPartner && secretStatusData) {
    todayTarget = secretStatusData.total_sent ?? 0;
    pendingTasks = secretStatusData.pending_count ?? 0;
    viewedTasks = Math.max(0, todayTarget - pendingTasks);
  } else if (isFreedomPartner && freedomDashData) {
    todayTarget = freedomDashData.today_total ?? 0;
    pendingTasks = freedomDashData.unread_count ?? 0;
    viewedTasks = Math.max(0, todayTarget - pendingTasks);
  }

  const doneChapters = targets.filter((t) => t.done >= t.total).length;
  const overallPct = Math.round((targets.reduce((a, t) => a + Math.min(t.done, t.total) / t.total, 0) / targets.length) * 100);

  const bumpTarget = (id) =>
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, done: t.done >= t.total ? 0 : t.done + 1 } : t)));

  const visibleFormulas = useMemo(
    () => (formulaFilter === 'All' ? FORMULAS : FORMULAS.filter((f) => f.subject === formulaFilter)),
    [formulaFilter]
  );

  const actionBg =
    buttonColorState === 'RED' ? COLORS.statusRed : buttonColorState === 'GREEN' ? COLORS.statusGreen : COLORS.brandDark;
  const actionLabel = isFreedomPartner ? 'Send Signal' : 'Get Notes';
  const actionIcon = isFreedomPartner ? 'paper-plane' : 'cloud-download-outline';

  const toastColors = toast?.type === 'success' ? [P.bio, 'checkmark-circle'] : toast?.type === 'error' ? ['#DC2626', 'alert-circle'] : [P.gold, 'information-circle'];

  return (
    <View style={styles.root}>
      {/* ------------------------------- Header ------------------------------- */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBox}>
            <Ionicons name="school" size={21} color="#FFFFFF" />
            <View style={styles.logoSpark}>
              <Ionicons name="sparkles" size={9} color={P.wallah} />
            </View>
          </View>
          <View>
            <Text style={styles.brandName}>
              <Text style={{ color: P.study }}>Study</Text>
              <Text style={{ color: P.wallah }}>Wallah</Text>
            </Text>
            <Text style={styles.brandTag}>NEET PREPARATION HUB</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.streakPill}>
            <Ionicons name="flame" size={14} color={P.wallah} />
            <Text style={styles.streakText}>{doneChapters}/3</Text>
          </View>
          {isFreedomPartner ? (
            <Press onPress={logout} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="log-out-outline" size={19} color={COLORS.inkSecondary} />
            </Press>
          ) : !user && onOpenAuth ? (
            <Press onPress={onOpenAuth} style={styles.loginHeaderBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="log-in-outline" size={15} color={P.study} />
              <Text style={styles.loginHeaderText}>Sign In</Text>
            </Press>
          ) : null}
        </View>
      </View>

      {/* ------------------------------ Toast -------------------------------- */}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { borderLeftColor: toastColors[0], opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] },
          ]}
        >
          <Ionicons name={toastColors[1]} size={22} color={toastColors[0]} />
          <Text style={styles.toastText}>{toast.text}</Text>
        </Animated.View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refreshAll(); }} tintColor={P.study} />}
      >
        {/* Greeting */}
        <View style={styles.greetingCard}>
          <Text style={styles.greeting}>{getGreeting(user?.name)}</Text>
          <Text style={styles.subGreeting}>Stay consistent with daily NCERT revision and chapter summaries.</Text>
          <View style={styles.chipsRow}>
            <View style={[styles.infoChip, { backgroundColor: P.goldBg }]}>
              <Ionicons name="flame" size={13} color={P.gold} />
              <Text style={[styles.infoChipText, { color: P.gold }]}>Daily Target: 3 Chapters</Text>
            </View>
            <View style={[styles.infoChip, { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderLight }]}>
              <Ionicons name="book" size={13} color={P.study} />
              <Text style={[styles.infoChipText, { color: COLORS.inkSecondary }]}>NCERT 11 & 12</Text>
            </View>
          </View>
        </View>

        {/* ---------------------------- Daily Target ---------------------------- */}
        <View style={styles.targetCard}>
          <View style={styles.targetTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.targetEyebrow}>DAILY TARGET</Text>
              <Text style={styles.targetHeadline}>{doneChapters} of 3 chapters completed</Text>
              <Text style={styles.targetSub}>Tap a chapter to log a topic. Tap again after completing to reset.</Text>
            </View>
            <View style={styles.ringOuter}>
              <Text style={styles.ringPct}>{overallPct}%</Text>
            </View>
          </View>

          {targets.map((t) => {
            const pct = Math.min(100, Math.round((t.done / t.total) * 100));
            const complete = t.done >= t.total;
            return (
              <Press key={t.id} onPress={() => bumpTarget(t.id)} style={styles.targetRow} scaleTo={0.98}>
                <View style={[styles.targetIcon, { backgroundColor: t.accentBg }]}>
                  <Ionicons name={t.icon} size={18} color={t.accent} />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={styles.targetRowTop}>
                    <Text style={[styles.targetSubject, { color: t.accent }]}>{t.subject.toUpperCase()}</Text>
                    <Text style={styles.targetCount}>{t.done}/{t.total} topics</Text>
                  </View>
                  <Text style={styles.targetChapter} numberOfLines={1}>{t.chapter}</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: complete ? P.bio : t.accent }]} />
                  </View>
                </View>
                <Ionicons
                  name={complete ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={complete ? P.bio : COLORS.inkSubtle}
                />
              </Press>
            );
          })}

          {/* Today Activity Target (24-Hour Evaluation Cycle) */}
          <View style={styles.signalBlock}>
            <View style={styles.signalHead}>
              <Ionicons name="flame" size={15} color={P.wallah} />
              <Text style={styles.signalHeadText}>Today Activity Target</Text>
              <Text style={styles.signalNote}>24-hr evaluation cycle</Text>
            </View>
            <View style={styles.signalGrid}>
              <View style={styles.signalCell}>
                <Text style={styles.signalNum}>{todayTarget}</Text>
                <Text style={styles.signalLabel}>Today Target</Text>
              </View>
              <View style={styles.signalCell}>
                <Text style={[styles.signalNum, { color: P.bio }]}>{viewedTasks}</Text>
                <Text style={styles.signalLabel}>Viewed</Text>
              </View>
              <View style={[styles.signalCell, pendingTasks > 0 ? styles.signalCellPending : styles.signalCellTotal]}>
                <Text style={[styles.signalNum, { color: pendingTasks > 0 ? '#DC2626' : '#FFFFFF' }]}>{pendingTasks}</Text>
                <Text style={[styles.signalLabel, { color: pendingTasks > 0 ? '#991B1B' : '#C7D2FE' }]}>Pending Task</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ------------------------ Important Formulas ------------------------ */}
        <View style={styles.sectionBlock}>
          <SectionTitle icon="calculator" color={P.study} bg="#E0E7FF" title="Important Formulas" badge={`${FORMULAS.length} Total`} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FORMULA_FILTERS.map((f) => {
              const active = formulaFilter === f;
              const [c] = f === 'All' ? [P.study] : subjectColor(f);
              return (
                <Press key={f} onPress={() => { setFormulaFilter(f); setFormulaCardIndex(0); setExpandedFormula(null); }} style={[styles.filterChip, active && { backgroundColor: c, borderColor: c }]}>
                  <Text style={[styles.filterChipText, active && { color: '#FFFFFF' }]}>{f}</Text>
                </Press>
              );
            })}
          </ScrollView>

          {/* Exactly 1 formula card on screen */}
          {visibleFormulas.length > 0 ? (() => {
            const f = visibleFormulas[formulaCardIndex % visibleFormulas.length];
            const [c, bg, icon] = subjectColor(f.subject);
            const open = expandedFormula === f.id;
            return (
              <Press onPress={() => setExpandedFormula(open ? null : f.id)} style={styles.formulaCard} scaleTo={0.985}>
                <View style={[styles.formulaStripe, { backgroundColor: c }]} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={styles.formulaTop}>
                    <View style={[styles.formulaSubjectPill, { backgroundColor: bg }]}>
                      <Ionicons name={icon} size={11} color={c} />
                      <Text style={[styles.formulaSubjectText, { color: c }]}>{f.subject} • {f.topic}</Text>
                    </View>
                    <Press
                      onPress={(e) => {
                        e?.stopPropagation && e.stopPropagation();
                        setFormulaCardIndex((prev) => (prev + 1) % visibleFormulas.length);
                      }}
                      style={styles.nextFormulaChip}
                      scaleTo={0.94}
                    >
                      <Ionicons name="shuffle-outline" size={12} color={COLORS.inkMuted} />
                      <Text style={styles.nextFormulaText}>Next ({((formulaCardIndex % visibleFormulas.length) + 1)}/{visibleFormulas.length})</Text>
                    </Press>
                  </View>
                  <Text style={styles.formulaName}>{f.name}</Text>
                  <View style={[styles.equationBox, { backgroundColor: bg }]}>
                    <Text style={[styles.equationText, { color: c }]}>{f.equation}</Text>
                  </View>
                  {open ? (
                    <View style={{ gap: 8 }}>
                      <Text style={styles.formulaNote}>{f.note}</Text>
                      <View style={styles.exampleRow}>
                        <Ionicons name="bulb" size={14} color={P.gold} />
                        <Text style={styles.exampleText}>{f.example}</Text>
                      </View>
                      <TouchableOpacity onPress={() => Linking.openURL(NCERT_URL)} activeOpacity={0.7} style={styles.sourceRow}>
                        <Ionicons name="link" size={13} color={P.study} />
                        <Text style={styles.sourceText}>{f.source} • ncert.nic.in</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.tapToExpandText}>Tap card for example & NCERT source ↓</Text>
                  )}
                </View>
              </Press>
            );
          })() : null}

          {/* View More Formulas Button in same box */}
          <Press
            onPress={() => setShowAllFormulasModal(true)}
            style={styles.viewMoreFormulasBtn}
            scaleTo={0.98}
          >
            <Ionicons name="albums-outline" size={16} color="#FFFFFF" />
            <Text style={styles.viewMoreFormulasText}>View More Formulas ({FORMULAS.length} Total)</Text>
            <Ionicons name="chevron-forward" size={15} color="#FFFFFF" />
          </Press>

          <Text style={styles.disclaimer}>
            Formulas follow standard NCERT-level content. Always cross-check with your NCERT textbook before exams.
          </Text>
        </View>

        {/* ----------------------------- NEET Updates ---------------------------- */}
        <Card style={styles.updatesCard}>
          <SectionTitle
            icon="newspaper" color={P.study} bg="#E0E7FF" title="NEET Updates"
            right={<View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>}
          />
          <View style={{ gap: 9 }}>
            {neetUpdates.slice(0, 3).map((item, idx) => (
              <View key={`${item.title}-${idx}`} style={[styles.updateRow, idx > 0 && styles.updateRowBorder]}>
                <Text style={styles.updateTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.updateMetaRow}>
                  <Text style={styles.updateSource}>{item.source}</Text>
                  <Text style={styles.updateDot}>•</Text>
                  <Text style={styles.updateDate}>{item.published_at}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* ------------------------------ Subject Notes ------------------------------ */}
        <View style={styles.sectionBlock}>
          <SectionTitle icon="book" color={P.chem} bg={P.chemBg} title="NEET Notes" badge="Class 11 & 12" />
          <View style={styles.topicGrid}>
            {SUBJECTS.map((s) => {
              const active = selectedSubject.key === s.key;
              return (
                <Press
                  key={s.key}
                  onPress={() => { setSelectedSubject(s); setNotesBanner(''); }}
                  style={[
                    styles.subjectTile,
                    {
                      backgroundColor: active ? s.accent : COLORS.bgCard,
                      borderColor: active ? s.accent : COLORS.borderLight,
                    },
                  ]}
                  scaleTo={0.96}
                >
                  <View style={[styles.subjectTileIcon, { backgroundColor: active ? 'rgba(255,255,255,0.22)' : s.accentBg }]}>
                    <Ionicons name={s.icon} size={22} color={active ? '#FFFFFF' : s.accent} />
                  </View>
                  <Text style={[styles.subjectTileText, active && { color: '#FFFFFF' }]}>{s.key}</Text>
                  <Text style={[styles.subjectTileSub, active && { color: 'rgba(255,255,255,0.85)' }]}>{s.subTag}</Text>
                </Press>
              );
            })}
          </View>

          <View style={[styles.topicPreview, { borderTopColor: selectedSubject.accent }]}>
            <View style={styles.topicHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Ionicons name={selectedSubject.icon} size={18} color={selectedSubject.accent} />
                <Text style={styles.topicPreviewTitle}>{selectedSubject.key} Notes</Text>
              </View>
              <View style={[styles.weightagePill, { backgroundColor: selectedSubject.accentBg }]}>
                <Text style={[styles.weightageText, { color: selectedSubject.accent }]}>{selectedSubject.chapterTag}</Text>
              </View>
            </View>
            <Text style={styles.topicPreviewSub}>{selectedSubject.subtitle}</Text>
            <Text style={styles.topicPreviewBody}>{selectedSubject.summary}</Text>

            {/* Quick High-Yield Review Points */}
            <View style={styles.notesHighlightBox}>
              <Text style={styles.notesHighlightTitle}>CORE NCERT FOCUS TOPICS</Text>
              {selectedSubject.bullets ? selectedSubject.bullets.map((b) => (
                <View key={b} style={styles.notesBulletRow}>
                  <View style={[styles.notesBulletDot, { backgroundColor: selectedSubject.accent }]} />
                  <Text style={styles.notesBulletText}>{b}</Text>
                </View>
              )) : null}
            </View>
          </View>
        </View>

        {/* --------------------------- Study Resources --------------------------- */}
        <View style={styles.sectionBlock}>
          <SectionTitle icon="library" color={P.bio} bg={P.bioBg} title="Study Resources" badge="Quick Prep" />
          <View style={styles.resourcesGrid}>
            {STUDY_RESOURCES.map((res) => (
              <Press
                key={res.id}
                style={styles.resourceCard}
                onPress={() => setPreviewModal({ title: res.title, subtitle: res.meta, badge: 'NEET Guide', items: res.details })}
              >
                <View style={[styles.resourceIconBox, { backgroundColor: res.accentBg }]}>
                  <Ionicons name={res.icon} size={22} color={res.accent} />
                </View>
                <Text style={styles.resourceTitle}>{res.title}</Text>
                <Text style={styles.resourceMeta}>{res.meta}</Text>
                <Ionicons name="arrow-forward-circle" size={20} color={res.accent} style={styles.resourceArrow} />
              </Press>
            ))}
          </View>
        </View>

        {/* ----------------------------- Upcoming Batches ----------------------------- */}
        <View style={styles.sectionBlock}>
          <SectionTitle icon="school" color={P.wallah} bg="#FFEDD5" title="Upcoming Batches" badge="2026–27" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.batchesRow}>
            {UPCOMING_BATCHES.map((b) => (
              <Press
                key={b.id}
                style={styles.batchCard}
                onPress={() => setPreviewModal({ title: b.title, subtitle: b.schedule, badge: b.badge, items: b.highlights })}
              >
                <Image source={b.image} style={styles.batchImage} resizeMode="cover" />
                <View style={styles.batchBadge}><Text style={styles.batchBadgeText}>{b.badge}</Text></View>
                <View style={styles.batchFooter}>
                  <View style={styles.batchTitleRow}>
                    <Text style={styles.batchTitle}>{b.title}</Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.inkMuted} />
                  </View>
                  <View style={styles.batchMetaRow}>
                    <Ionicons name="calendar" size={12} color={P.wallah} />
                    <Text style={styles.batchSub}>{b.subtitle}</Text>
                  </View>
                </View>
              </Press>
            ))}
          </ScrollView>
        </View>

        {/* -------------------------------- PDF Library -------------------------------- */}
        <Card style={styles.card}>
          <SectionTitle icon="folder-open" color={P.physics} bg={P.physicsBg} title="PDF Library" badge="3 Modules" />
          {PDF_MODULES.map((pdf, idx) => (
            <Press
              key={pdf.id}
              scaleTo={0.985}
              style={[styles.pdfRow, idx === PDF_MODULES.length - 1 && styles.pdfRowLast]}
              onPress={() => setPreviewModal({ title: pdf.title, subtitle: `${pdf.subject} • ${pdf.pages} • ${pdf.size}`, badge: 'PDF Outline', items: pdf.topics })}
            >
              <View style={[styles.pdfIconBadge, { backgroundColor: pdf.accentBg }]}>
                <Ionicons name="document-text" size={18} color={pdf.accent} />
              </View>
              <View style={styles.pdfInfo}>
                <Text style={styles.pdfTitle} numberOfLines={1}>{pdf.title}</Text>
                <Text style={styles.pdfMeta}>{pdf.pages} • {pdf.size}</Text>
              </View>
              <Ionicons name="eye-outline" size={18} color={COLORS.inkMuted} />
            </Press>
          ))}
        </Card>

        {isFreedomPartner && onOpenPortal ? (
          <PrimaryButton title="Open Faculty Desk" icon="school-outline" variant="outline" onPress={onOpenPortal} />
        ) : !user && onOpenAuth ? (
          <PrimaryButton title="Back to Access Code" icon="key-outline" variant="outline" onPress={onOpenAuth} />
        ) : null}
      </ScrollView>

      {/* ----------------------- Fixed bottom action bar ----------------------- */}
      <View style={styles.fixedBottomBar}>
        {notesBanner ? <Text style={styles.fixedBannerText} numberOfLines={1}>{notesBanner}</Text> : null}
        <Press onPress={handlePrimaryAction} disabled={busy} scaleTo={0.96} style={[styles.actionBtn, { backgroundColor: actionBg }, busy && styles.btnDisabled]}>
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.actionInner}>
              <Ionicons name={actionIcon} size={19} color="#FFFFFF" />
              <Text style={styles.actionText}>{actionLabel}</Text>
            </View>
          )}
        </Press>
      </View>

      {/* --------------------------- All Formulas Popup Modal --------------------------- */}
      <Modal
        visible={showAllFormulasModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAllFormulasModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAllFormulasModal(false)}>
          <Pressable style={styles.allFormulasModalCard} onPress={() => {}}>
            <View style={styles.allFormulasHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.headerIconBox, { backgroundColor: '#E0E7FF' }]}>
                  <Ionicons name="calculator" size={20} color={P.study} />
                </View>
                <View>
                  <Text style={styles.allFormulasTitle}>NEET Formula Handbook</Text>
                  <Text style={styles.allFormulasSub}>{FORMULAS.length} NCERT-verified high-yield equations</Text>
                </View>
              </View>
              <Press onPress={() => setShowAllFormulasModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={COLORS.inkMuted} />
              </Press>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {FORMULA_FILTERS.map((f) => {
                const active = formulaFilter === f;
                const [c] = f === 'All' ? [P.study] : subjectColor(f);
                return (
                  <Press key={f} onPress={() => setFormulaFilter(f)} style={[styles.filterChip, active && { backgroundColor: c, borderColor: c }]}>
                    <Text style={[styles.filterChipText, active && { color: '#FFFFFF' }]}>{f}</Text>
                  </Press>
                );
              })}
            </ScrollView>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
              {visibleFormulas.map((f) => {
                const [c, bg, icon] = subjectColor(f.subject);
                const open = expandedFormula === f.id;
                return (
                  <Press key={f.id} onPress={() => setExpandedFormula(open ? null : f.id)} style={styles.popupFormulaCard} scaleTo={0.99}>
                    <View style={[styles.formulaStripe, { backgroundColor: c }]} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={styles.formulaTop}>
                        <View style={[styles.formulaSubjectPill, { backgroundColor: bg }]}>
                          <Ionicons name={icon} size={11} color={c} />
                          <Text style={[styles.formulaSubjectText, { color: c }]}>{f.subject} • {f.topic}</Text>
                        </View>
                        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.inkMuted} />
                      </View>
                      <Text style={styles.formulaName}>{f.name}</Text>
                      <View style={[styles.equationBox, { backgroundColor: bg }]}>
                        <Text style={[styles.equationText, { color: c }]}>{f.equation}</Text>
                      </View>
                      {open ? (
                        <View style={{ gap: 6 }}>
                          <Text style={styles.formulaNote}>{f.note}</Text>
                          <View style={styles.exampleRow}>
                            <Ionicons name="bulb" size={13} color={P.gold} />
                            <Text style={styles.exampleText}>{f.example}</Text>
                          </View>
                          <TouchableOpacity onPress={() => Linking.openURL(NCERT_URL)} activeOpacity={0.7} style={styles.sourceRow}>
                            <Ionicons name="link" size={12} color={P.study} />
                            <Text style={styles.sourceText}>{f.source} • ncert.nic.in</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  </Press>
                );
              })}
            </ScrollView>

            <PrimaryButton
              title="Close Handbook"
              variant="dark"
              onPress={() => setShowAllFormulasModal(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* ------------------------------ Preview Modal ------------------------------ */}
      <Modal visible={Boolean(previewModal)} transparent animationType="fade" onRequestClose={() => setPreviewModal(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPreviewModal(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {previewModal ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalBadge}><Text style={styles.modalBadgeText}>{previewModal.badge}</Text></View>
                  <TouchableOpacity onPress={() => setPreviewModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={22} color={COLORS.inkMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalTitle}>{previewModal.title}</Text>
                <Text style={styles.modalSub}>{previewModal.subtitle}</Text>
                <View style={styles.modalList}>
                  {previewModal.items.map((line) => (
                    <View key={line} style={styles.modalItemRow}>
                      <Ionicons name="checkmark-circle" size={16} color={P.bio} />
                      <Text style={styles.modalItemText}>{line}</Text>
                    </View>
                  ))}
                </View>
                <PrimaryButton title="Close Preview" variant="dark" onPress={() => setPreviewModal(null)} style={styles.modalCloseBtn} />
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* --------------------------------- Styles --------------------------------- */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgCanvas },
  scrollView: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 24, gap: 18, maxWidth: 680, width: '100%', alignSelf: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { width: 42, height: 42, borderRadius: 13, backgroundColor: P.study, alignItems: 'center', justifyContent: 'center' },
  logoSpark: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFEDD5' },
  brandName: { fontSize: 23, fontWeight: '800', letterSpacing: -0.6 },
  brandTag: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, color: COLORS.inkMuted, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loginHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  loginHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: P.study,
  },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEDD5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  streakText: { fontSize: 12, fontWeight: '800', color: P.wallah },
  iconBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: COLORS.bgCanvas, borderWidth: 1, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center' },

  // Toast
  toast: {
    position: 'absolute', top: 70, left: 16, right: 16, zIndex: 50, alignSelf: 'center', maxWidth: 520,
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bgCard,
    borderRadius: 14, borderLeftWidth: 5, paddingVertical: 13, paddingHorizontal: 14, ...SHADOWS.md,
  },
  toastText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.inkPrimary, lineHeight: 18 },

  // Greeting
  greetingCard: { gap: 4, paddingTop: 2 },
  greeting: { fontSize: 24, fontWeight: '800', color: COLORS.inkPrimary, letterSpacing: -0.5 },
  subGreeting: { fontSize: 13, color: COLORS.inkSecondary, lineHeight: 19 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  infoChipText: { fontSize: 11, fontWeight: '700' },

  // Section title
  sectionBlock: { gap: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.inkPrimary, letterSpacing: -0.2 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Daily target
  targetCard: { backgroundColor: COLORS.bgCard, borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderLight, padding: 16, gap: 12, ...SHADOWS.sm },
  targetTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  targetEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: P.wallah },
  targetHeadline: { fontSize: 18, fontWeight: '800', color: COLORS.inkPrimary, marginTop: 2 },
  targetSub: { fontSize: 11.5, color: COLORS.inkMuted, marginTop: 3, lineHeight: 16 },
  ringOuter: { width: 62, height: 62, borderRadius: 31, borderWidth: 6, borderColor: P.study, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF' },
  ringPct: { fontSize: 14, fontWeight: '800', color: P.study },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: COLORS.bgCanvas, borderWidth: 1, borderColor: COLORS.borderLight },
  targetIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  targetRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  targetSubject: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  targetCount: { fontSize: 11, fontWeight: '600', color: COLORS.inkMuted },
  targetChapter: { fontSize: 14, fontWeight: '700', color: COLORS.inkPrimary },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.bgSubtle, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  signalBlock: { marginTop: 4, gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.bgSubtle },
  signalHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signalHeadText: { fontSize: 13, fontWeight: '800', color: COLORS.inkPrimary, flex: 1 },
  signalNote: { fontSize: 10, fontWeight: '600', color: COLORS.inkMuted },
  signalGrid: { flexDirection: 'row', gap: 8 },
  signalCell: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.bgCanvas, borderWidth: 1, borderColor: COLORS.borderLight },
  signalCellTotal: { backgroundColor: P.study, borderColor: P.study },
  signalCellPending: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  signalNum: { fontSize: 22, fontWeight: '800', color: COLORS.inkPrimary },
  signalLabel: { fontSize: 10.5, fontWeight: '700', color: COLORS.inkMuted, marginTop: 2 },

  // Formulas
  filterRow: { gap: 8, paddingRight: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderLight },
  filterChipText: { fontSize: 12.5, fontWeight: '700', color: COLORS.inkPrimary },
  formulaCard: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.bgCard, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderLight, padding: 14, overflow: 'hidden', ...SHADOWS.sm },
  formulaStripe: { width: 4, borderRadius: 2 },
  formulaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextFormulaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.bgCanvas, borderWidth: 1, borderColor: COLORS.borderLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  nextFormulaText: { fontSize: 10.5, fontWeight: '700', color: COLORS.inkMuted },
  formulaSubjectPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  formulaSubjectText: { fontSize: 10.5, fontWeight: '700' },
  formulaName: { fontSize: 15, fontWeight: '800', color: COLORS.inkPrimary },
  equationBox: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  equationText: { fontSize: 14, fontWeight: '700', lineHeight: 21 },
  formulaNote: { fontSize: 12.5, color: COLORS.inkSecondary, lineHeight: 18 },
  exampleRow: { flexDirection: 'row', gap: 7, alignItems: 'flex-start', backgroundColor: P.goldBg, borderRadius: 9, padding: 9 },
  exampleText: { flex: 1, fontSize: 12, color: COLORS.inkPrimary, lineHeight: 17, fontWeight: '500' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  sourceText: { fontSize: 11.5, fontWeight: '700', color: P.study, textDecorationLine: 'underline' },
  tapToExpandText: { fontSize: 11, fontWeight: '600', color: P.study, paddingTop: 2 },
  viewMoreFormulasBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: P.study, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginTop: 4, ...SHADOWS.sm },
  viewMoreFormulasText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  allFormulasModalCard: { width: '100%', maxWidth: 520, maxHeight: '88%', backgroundColor: COLORS.bgCard, borderRadius: 20, padding: 18, gap: 12, ...SHADOWS.md },
  allFormulasHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  allFormulasTitle: { fontSize: 17, fontWeight: '900', color: COLORS.inkPrimary },
  allFormulasSub: { fontSize: 11, color: COLORS.inkMuted, fontWeight: '500' },
  headerIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  popupFormulaCard: { flexDirection: 'row', gap: 10, backgroundColor: COLORS.bgCanvas, borderRadius: 13, borderWidth: 1, borderColor: COLORS.borderLight, padding: 12, overflow: 'hidden' },
  disclaimer: { fontSize: 11, color: COLORS.inkMuted, lineHeight: 16, textAlign: 'center', paddingHorizontal: 8 },

  // Updates
  updatesCard: { padding: 15, gap: 12 },
  updateRow: { paddingTop: 2, gap: 4 },
  updateRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.bgSubtle, paddingTop: 9 },
  updateTitle: { fontSize: 13, fontWeight: '600', color: COLORS.inkPrimary, lineHeight: 18 },
  updateMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  updateSource: { fontSize: 11, fontWeight: '700', color: P.study },
  updateDot: { fontSize: 11, color: COLORS.inkSubtle },
  updateDate: { fontSize: 11, color: COLORS.inkMuted },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.statusRedBg, borderWidth: 1, borderColor: COLORS.statusRedBorder, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.statusRed },
  liveText: { fontSize: 10, fontWeight: '800', color: COLORS.statusRedDark, letterSpacing: 0.4 },

  // Notes
  card: { gap: 12 },
  topicGrid: { flexDirection: 'row', gap: 10, marginVertical: 3 },
  subjectTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    minHeight: 102,
    ...SHADOWS.sm,
  },
  subjectTileIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  subjectTileText: { fontSize: 13, fontWeight: '800', color: COLORS.inkPrimary, textAlign: 'center' },
  subjectTileSub: { fontSize: 10, fontWeight: '600', color: COLORS.inkMuted, textAlign: 'center' },
  topicPreview: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderTopWidth: 3.5,
    gap: 8,
    ...SHADOWS.sm,
  },
  topicHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  topicPreviewTitle: { fontSize: 17, fontWeight: '800', color: COLORS.inkPrimary },
  weightagePill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  weightageText: { fontSize: 11, fontWeight: '700' },
  topicPreviewSub: { fontSize: 12.5, fontWeight: '600', color: COLORS.inkSecondary, lineHeight: 18 },
  topicPreviewBody: { fontSize: 13, color: COLORS.inkSecondary, lineHeight: 19, marginTop: 2 },
  notesHighlightBox: {
    marginTop: 6,
    backgroundColor: COLORS.bgCanvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 12,
    gap: 7,
  },
  notesHighlightTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.inkMuted,
    letterSpacing: 0.6,
  },
  notesBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  notesBulletText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.inkPrimary,
    flex: 1,
  },

  // Resources
  resourcesGrid: { flexDirection: 'row', gap: 10 },
  resourceCard: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderLight, padding: 14, gap: 6, ...SHADOWS.sm },
  resourceIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  resourceTitle: { fontSize: 13.5, fontWeight: '800', color: COLORS.inkPrimary },
  resourceMeta: { fontSize: 11, color: COLORS.inkMuted, fontWeight: '500' },
  resourceArrow: { position: 'absolute', top: 12, right: 12 },

  // Batches
  batchesRow: { gap: 12, paddingRight: 4 },
  batchCard: { width: 250, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.bgCard, overflow: 'hidden', ...SHADOWS.sm },
  batchImage: { width: '100%', height: 118 },
  batchBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(15,23,42,0.78)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  batchBadgeText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },
  batchFooter: { padding: 12, gap: 5 },
  batchTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  batchTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.inkPrimary },
  batchMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  batchSub: { fontSize: 12, color: COLORS.inkMuted, fontWeight: '500' },

  // PDFs
  pdfRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.bgSubtle },
  pdfRowLast: { borderBottomWidth: 0, paddingBottom: 2 },
  pdfIconBadge: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pdfInfo: { flex: 1, gap: 2 },
  pdfTitle: { fontSize: 13, fontWeight: '700', color: COLORS.inkPrimary },
  pdfMeta: { fontSize: 11, color: COLORS.inkMuted },

  // Bottom bar
  fixedBottomBar: { backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 6, ...SHADOWS.md },
  fixedBannerText: { fontSize: 12, color: COLORS.inkSecondary, textAlign: 'center', fontWeight: '600' },
  actionBtn: { paddingVertical: 15, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  btnDisabled: { opacity: 0.65 },
  actionInner: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  actionText: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '800', letterSpacing: 0.2 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 440, backgroundColor: COLORS.bgCard, borderRadius: 20, padding: 20, ...SHADOWS.md },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalBadge: { backgroundColor: '#E0E7FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  modalBadgeText: { fontSize: 11, fontWeight: '800', color: P.study },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.inkPrimary },
  modalSub: { fontSize: 13, color: COLORS.inkMuted, marginTop: 3, marginBottom: 14 },
  modalList: { gap: 10, marginBottom: 18 },
  modalItemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  modalItemText: { flex: 1, fontSize: 13, color: COLORS.inkPrimary, lineHeight: 19 },
  modalCloseBtn: { marginTop: 2 },
});