import React, { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/tokens';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';
import { SectionHeader } from './SectionHeader';

export const NEET_FORMULAS = [
  // --- PHYSICS ---
  {
    id: 'phy-1',
    subject: 'Physics',
    topic: 'Mechanics',
    icon: 'planet-outline',
    accent: COLORS.accentBlue,
    accentBg: COLORS.accentBlueBg,
    title: 'Projectile Motion & Max Range',
    equation: 'R = (u² sin 2θ) / g\nH_max = (u² sin²θ) / (2g)',
    explanation:
      'Where u is launch speed, θ is projection angle, and g is gravitational acceleration (9.8 m/s²). Time of flight T = (2u sin θ) / g.',
    example:
      'For θ = 45°, sin(2θ) = sin(90°) = 1, achieving absolute maximum range R_max = u² / g.',
    source: 'NCERT Class 11 Physics • Chapter 4 (Motion in a Plane)',
    sourceUrl: 'https://ncert.nic.in/textbook.php',
  },
  {
    id: 'phy-2',
    subject: 'Physics',
    topic: 'Electrostatics',
    icon: 'flash-outline',
    accent: COLORS.accentBlue,
    accentBg: COLORS.accentBlueBg,
    title: "Gauss's Law of Electrostatics",
    equation: 'Φ = ∮ E · dA = q_enclosed / ε₀',
    explanation:
      'Total electric flux Φ through any closed Gaussian surface equals total enclosed charge divided by permittivity of free space ε₀ (8.854 × 10⁻¹² C²/N·m²).',
    example:
      'Electric field outside thin charged spherical shell (r ≥ R) is E = q / (4πε₀r²); inside conductor E = 0.',
    source: 'NCERT Class 12 Physics • Chapter 1 (Electric Charges and Fields)',
    sourceUrl: 'https://ncert.nic.in/textbook.php',
  },
  {
    id: 'phy-3',
    subject: 'Physics',
    topic: 'Ray Optics',
    icon: 'eye-outline',
    accent: COLORS.accentBlue,
    accentBg: COLORS.accentBlueBg,
    title: "Lens Maker's Formula",
    equation: '1/f = (μ - 1) [ (1 / R₁) - (1 / R₂) ]',
    explanation:
      'Relates focal length f with lens refractive index μ and radii of curvature R₁ and R₂ of the two spherical refractive surfaces.',
    example:
      'For an equiconvex glass lens (μ = 1.5, R₁ = +R, R₂ = -R) in air: 1/f = (1.5 - 1)(2/R) = 1/R ⇒ f = R.',
    source: 'NCERT Class 12 Physics • Chapter 9 (Ray Optics & Optical Instruments)',
    sourceUrl: 'https://ncert.nic.in/textbook.php',
  },
  {
    id: 'phy-4',
    subject: 'Physics',
    topic: 'Modern Physics',
    icon: 'nuclear-outline',
    accent: COLORS.accentBlue,
    accentBg: COLORS.accentBlueBg,
    title: "Einstein's Photoelectric Equation",
    equation: 'K_max = hν - Φ₀ = e · V_s',
    explanation:
      'Maximum kinetic energy of photoelectrons K_max equals incident photon energy hν minus metal work function Φ₀ = hν₀. V_s is stopping potential.',
    example:
      'If incident photon energy hν < Φ₀, no photoelectron emission occurs regardless of incident light intensity.',
    source: 'NCERT Class 12 Physics • Chapter 11 (Dual Nature of Radiation & Matter)',
    sourceUrl: 'https://ncert.nic.in/textbook.php',
  },
  {
    id: 'phy-5',
    subject: 'Physics',
    topic: 'Modern Physics',
    icon: 'hardware-chip-outline',
    accent: COLORS.accentBlue,
    accentBg: COLORS.accentBlueBg,
    title: 'De Broglie Matter Wavelength',
    equation: 'λ = h / p = h / √(2mK) = h / √(2mqV)',
    explanation:
      'Wavelength λ of matter wave associated with a moving particle of momentum p, mass m, kinetic energy K, and accelerating potential V.',
    example:
      'For an electron accelerated through potential V: λ ≈ 1.227 / √V nm (or 12.27 / √V Å).',
    source: 'NCERT Class 12 Physics • Chapter 11 (Dual Nature of Matter)',
    sourceUrl: 'https://ncert.nic.in/textbook.php',
  },

  // --- CHEMISTRY ---
  {
    id: 'chem-1',
    subject: 'Chemistry',
    topic: 'Thermodynamics',
    icon: 'flame-outline',
    accent: COLORS.accentTeal,
    accentBg: COLORS.accentTealBg,
    title: 'Gibbs Free Energy & Spontaneity',
    equation: 'ΔG = ΔH - TΔS\nΔG° = -RT ln K_c = -2.303 RT log K_c',
    explanation:
      'Criteria for spontaneity at constant T and P: ΔG < 0 (spontaneous process), ΔG = 0 (dynamic equilibrium), ΔG > 0 (non-spontaneous).',
    example:
      'When ΔH is exothermic (< 0) and ΔS is disordered (> 0), ΔG is negative at all temperatures (always spontaneous).',
    source: 'NCERT Class 11 Chemistry • Chapter 6 (Chemical Thermodynamics)',
    sourceUrl: 'https://ncert.nic.in/textbook.php',
  },
  {
    id: 'chem-2',
    subject: 'Chemistry',
    topic: 'Ionic Equilibrium',
    icon: 'flask-outline',
    accent: COLORS.accentTeal,
    accentBg: COLORS.accentTealBg,
    title: 'Henderson–Hasselbalch Equation',
    equation: 'pH = pKa + log([Salt] / [Acid])\npOH = pKb + log([Salt] / [Base])',
    explanation:
      'Calculates pH of acidic buffer (weak acid + conjugate base salt) or basic buffer. Maximum buffer action occurs when [Salt] = [Acid].',
    example:
      'For 0.1 M CH₃COOH + 0.1 M CH₃COONa, log(1) = 0, so buffer pH equals exactly pKa (4.76).',
    source: 'NCERT Class 11 Chemistry • Chapter 7 (Equilibrium)',
    sourceUrl: 'https://ncert.nic.in/textbook.php',
  },
  {
    id: 'chem-3',
    subject: 'Chemistry',
    topic: 'Electrochemistry',
    icon: 'battery-charging-outline',
    accent: COLORS.accentTeal,
    accentBg: COLORS.accentTealBg,
    title: 'Nernst Equation (Cell Potential)',
    equation: 'E_cell = E°_cell - (0.0591 / n) log Q   [at 298 K]',
    explanation:
      'E°_cell = standard cell potential (E°_cathode - E°_anode), n = number of moles of electrons transferred, Q = reaction quotient.',
    example:
      'For Daniell Cell (Zn + Cu²⁺ ⇌ Zn²⁺ + Cu), n = 2 and Q = [Zn²⁺]/[Cu²⁺]. At equilibrium E_cell = 0, giving log K_c = nE° / 0.0591.',
    source: 'NCERT Class 12 Chemistry • Chapter 3 (Electrochemistry)',
    sourceUrl: 'https://ncert.nic.in/textbook.php',
  },
  {
    id: 'chem-4',
    subject: 'Chemistry',
    topic: 'Chemical Equilibrium',
    icon: 'sync-outline',
    accent: COLORS.accentTeal,
    accentBg: COLORS.accentTealBg,
    title: 'Equilibrium Constant Relation (Kp vs Kc)',
    equation: 'K_p = K_c (R T)^(Δn_g)',
    explanation:
      'Δn_g = moles of gaseous products minus moles of gaseous reactants. R = 0.0821 L·atm/(mol·K) or 0.08314 L·bar/(mol·K).',
    example:
      'For H₂(g) + I₂(g) ⇌ 2HI(g), Δn_g = 2 - 2 = 0, so K_p = K_c. For PCl₅ ⇌ PCl₃ + Cl₂, Δn_g = +1, so K_p = K_c(RT).',
    source: 'NCERT Class 11 Chemistry • Chapter 7 (Equilibrium)',
    sourceUrl: 'https://ncert.nic.in/textbook.php',
  },

  // --- BIOLOGY ---
  {
    id: 'bio-1',
    subject: 'Biology',
    topic: 'Genetics & Evolution',
    icon: 'git-network-outline',
    accent: COLORS.accentGreen,
    accentBg: COLORS.accentGreenBg,
    title: 'Hardy–Weinberg Equilibrium',
    equation: 'p + q = 1\np² + 2pq + q² = 1',
    explanation:
      'p = dominant allele frequency (A), q = recessive allele frequency (a). p² = homozygous dominant (AA), 2pq = heterozygote carriers (Aa), q² = homozygous recessive (aa).',
    example:
      'If recessive phenotype frequency q² = 0.16 (16%), then q = 0.4, p = 0.6, and carrier frequency 2pq = 2(0.6)(0.4) = 0.48 (48%).',
    source: 'NCERT Class 12 Biology • Chapter 7 (Evolution)',
    sourceUrl: 'https://ncert.nic.in/textbook.php',
  },
  {
    id: 'bio-2',
    subject: 'Biology',
    topic: 'Human Physiology',
    icon: 'heart-outline',
    accent: COLORS.accentGreen,
    accentBg: COLORS.accentGreenBg,
    title: 'Cardiac Output & Stroke Volume',
    equation: 'Cardiac Output (CO) = Stroke Volume (SV) × Heart Rate (HR)',
    explanation:
      'Volume of blood pumped by each ventricle per minute. Normal resting SV is ~70 mL, normal HR is ~72 beats/min.',
    example:
      'CO = 70 mL × 72/min ≈ 5,040 mL/min ≈ 5 Liters/min (increases up to 4–5× during rigorous exercise in trained athletes).',
    source: 'NCERT Class 11 Biology • Chapter 18 (Body Fluids & Circulation)',
    sourceUrl: 'https://ncert.nic.in/textbook.php',
  },
  {
    id: 'bio-3',
    subject: 'Biology',
    topic: 'Ecology & Population',
    icon: 'leaf-outline',
    accent: COLORS.accentGreen,
    accentBg: COLORS.accentGreenBg,
    title: 'Logistic Population Growth (Sigmoid)',
    equation: 'dN / dt = rN [ (K - N) / K ]',
    explanation:
      'Verhulst-Pearl Logistic Growth: N is population density at time t, r is intrinsic rate of natural increase, K is carrying capacity of habitat.',
    example:
      'When N approaches K, (K - N) / K becomes 0, population growth ceases and reaches the asymptote of the sigmoid curve.',
    source: 'NCERT Class 12 Biology • Chapter 13 (Organisms & Populations)',
    sourceUrl: 'https://ncert.nic.in/textbook.php',
  },
  {
    id: 'bio-4',
    subject: 'Biology',
    topic: 'Plant Physiology',
    icon: 'water-outline',
    accent: COLORS.accentGreen,
    accentBg: COLORS.accentGreenBg,
    title: 'Water Potential Equation',
    equation: 'Ψ_w = Ψ_s + Ψ_p',
    explanation:
      'Water potential Ψ_w is sum of solute potential Ψ_s (always negative) and pressure potential Ψ_p (positive in turgid cells). Pure water Ψ_w = 0 at STP.',
    example:
      'Water always flows from a region of higher (less negative) water potential to lower (more negative) water potential.',
    source: 'NCERT Class 11 Biology • Chapter 11 (Transport in Plants)',
    sourceUrl: 'https://ncert.nic.in/textbook.php',
  },
];

const SUBJECT_FILTERS = ['All', 'Physics', 'Chemistry', 'Biology'];

export function ImportantFormulasSection() {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [showAllModal, setShowAllModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedFormula, setSelectedFormula] = useState(null);

  const featuredFormula = NEET_FORMULAS[featuredIndex % NEET_FORMULAS.length];

  const filteredFormulas =
    selectedFilter === 'All'
      ? NEET_FORMULAS
      : NEET_FORMULAS.filter((f) => f.subject === selectedFilter);

  const handleOpenSource = (url) => {
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const handleNextFeatured = () => {
    setFeaturedIndex((prev) => (prev + 1) % NEET_FORMULAS.length);
  };

  return (
    <Card style={styles.container}>
      <SectionHeader
        icon="calculator-outline"
        title="Important Formulas"
        badgeText="NCERT Verified"
      />

      <Text style={styles.sectionSubtitle}>
        High-yield equations, constants, and problem-solving shortcuts verified from official NCERT
        Class 11 & 12 curricula.
      </Text>

      {/* Exactly 1 Formula Card on Screen */}
      <View style={styles.featuredCard}>
        <View style={styles.formulaHeaderRow}>
          <View style={styles.tagGroup}>
            <View style={[styles.subjectBadge, { backgroundColor: featuredFormula.accentBg }]}>
              <Ionicons name={featuredFormula.icon} size={12} color={featuredFormula.accent} />
              <Text style={[styles.subjectBadgeText, { color: featuredFormula.accent }]}>
                {featuredFormula.subject}
              </Text>
            </View>
            <View style={styles.topicBadge}>
              <Text style={styles.topicBadgeText}>{featuredFormula.topic}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleNextFeatured}
            activeOpacity={0.75}
            style={styles.cycleBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="shuffle-outline" size={13} color={COLORS.inkMuted} />
            <Text style={styles.cycleBtnText}>Next</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.formulaTitle}>{featuredFormula.title}</Text>

        <View style={styles.equationBox}>
          <Text style={styles.equationText}>{featuredFormula.equation}</Text>
        </View>

        <Text style={styles.explanationText} numberOfLines={2}>
          {featuredFormula.explanation}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.sourceRow}>
            <Ionicons name="shield-checkmark" size={12} color={COLORS.accentGreen} />
            <Text style={styles.sourceText} numberOfLines={1}>
              {featuredFormula.source}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedFormula(featuredFormula)}
            activeOpacity={0.75}
          >
            <Text style={styles.viewDetailsText}>Example →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Prominent View More Formulas Button inside the same box */}
      <TouchableOpacity
        onPress={() => setShowAllModal(true)}
        activeOpacity={0.85}
        style={styles.viewMoreBtn}
      >
        <Ionicons name="albums-outline" size={16} color="#FFFFFF" />
        <Text style={styles.viewMoreBtnText}>
          View More Formulas ({NEET_FORMULAS.length} Total)
        </Text>
        <Ionicons name="chevron-forward" size={15} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modal Popup displaying all formulas */}
      <Modal
        visible={showAllModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAllModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAllModal(false)}>
          <Pressable style={styles.modalCardWide} onPress={() => {}}>
            <View style={styles.allModalHeader}>
              <View style={styles.allModalHeaderLeft}>
                <View style={styles.headerIconBadge}>
                  <Ionicons name="book-outline" size={18} color={COLORS.accentBlue} />
                </View>
                <View>
                  <Text style={styles.allModalTitle}>NEET Formula Handbook</Text>
                  <Text style={styles.allModalSub}>
                    {NEET_FORMULAS.length} NCERT-verified high-yield equations
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowAllModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={COLORS.inkMuted} />
              </TouchableOpacity>
            </View>

            {/* Subject Filter Pills */}
            <View style={styles.filterRow}>
              {SUBJECT_FILTERS.map((f) => {
                const active = selectedFilter === f;
                const count =
                  f === 'All'
                    ? NEET_FORMULAS.length
                    : NEET_FORMULAS.filter((i) => i.subject === f).length;
                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setSelectedFilter(f)}
                    activeOpacity={0.75}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {f} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredFormulas.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  style={styles.popupFormulaCard}
                  onPress={() => setSelectedFormula(item)}
                >
                  <View style={styles.formulaHeaderRow}>
                    <View style={styles.tagGroup}>
                      <View style={[styles.subjectBadge, { backgroundColor: item.accentBg }]}>
                        <Ionicons name={item.icon} size={12} color={item.accent} />
                        <Text style={[styles.subjectBadgeText, { color: item.accent }]}>
                          {item.subject}
                        </Text>
                      </View>
                      <View style={styles.topicBadge}>
                        <Text style={styles.topicBadgeText}>{item.topic}</Text>
                      </View>
                    </View>
                    <Ionicons name="expand-outline" size={14} color={COLORS.inkMuted} />
                  </View>

                  <Text style={styles.formulaTitle}>{item.title}</Text>

                  <View style={styles.equationBox}>
                    <Text style={styles.equationText}>{item.equation}</Text>
                  </View>

                  <Text style={styles.explanationText} numberOfLines={2}>
                    {item.explanation}
                  </Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.sourceRow}>
                      <Ionicons name="shield-checkmark" size={12} color={COLORS.accentGreen} />
                      <Text style={styles.sourceText} numberOfLines={1}>
                        {item.source}
                      </Text>
                    </View>
                    <Text style={styles.viewDetailsText}>Tap for full example →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <PrimaryButton
              title="Close Handbook"
              variant="dark"
              onPress={() => setShowAllModal(false)}
              style={styles.closeAllBtn}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Individual Formula Detail Modal */}
      <Modal
        visible={Boolean(selectedFormula)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedFormula(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedFormula(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selectedFormula ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={styles.tagGroup}>
                    <View
                      style={[
                        styles.subjectBadge,
                        { backgroundColor: selectedFormula.accentBg },
                      ]}
                    >
                      <Ionicons
                        name={selectedFormula.icon}
                        size={13}
                        color={selectedFormula.accent}
                      />
                      <Text
                        style={[styles.subjectBadgeText, { color: selectedFormula.accent }]}
                      >
                        {selectedFormula.subject}
                      </Text>
                    </View>
                    <View style={styles.topicBadge}>
                      <Text style={styles.topicBadgeText}>{selectedFormula.topic}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedFormula(null)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={22} color={COLORS.inkMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalFormulaTitle}>{selectedFormula.title}</Text>

                <View style={styles.modalEquationBox}>
                  <Text style={styles.modalEquationLabel}>NEET HIGH-YIELD EQUATION</Text>
                  <Text style={styles.modalEquationText}>{selectedFormula.equation}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionHeading}>Explanation & Parameters</Text>
                  <Text style={styles.modalBodyText}>{selectedFormula.explanation}</Text>
                </View>

                <View style={styles.modalSectionHighlight}>
                  <View style={styles.highlightHeader}>
                    <Ionicons name="bulb-outline" size={16} color={COLORS.accentAmber} />
                    <Text style={styles.highlightHeading}>NEET Application & Example</Text>
                  </View>
                  <Text style={styles.highlightText}>{selectedFormula.example}</Text>
                </View>

                <View style={styles.sourceLinkCard}>
                  <View style={styles.sourceLinkInfo}>
                    <Ionicons name="shield-checkmark" size={16} color={COLORS.accentGreen} />
                    <View style={styles.sourceLinkMeta}>
                      <Text style={styles.sourceLinkTitle}>Scientifically Verified</Text>
                      <Text style={styles.sourceLinkSub}>{selectedFormula.source}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleOpenSource(selectedFormula.sourceUrl)}
                    style={styles.openSourceBtn}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.openSourceBtnText}>NCERT Portal</Text>
                    <Ionicons name="open-outline" size={13} color={COLORS.accentBlue} />
                  </TouchableOpacity>
                </View>

                <PrimaryButton
                  title="Close"
                  variant="dark"
                  onPress={() => setSelectedFormula(null)}
                  style={styles.modalCloseBtn}
                />
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    gap: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.inkSecondary,
    lineHeight: 18,
    marginTop: -4,
  },
  featuredCard: {
    backgroundColor: COLORS.bgCanvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 13,
    gap: 8,
    ...SHADOWS.sm,
  },
  formulaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  topicBadge: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topicBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.inkMuted,
  },
  cycleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cycleBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.inkMuted,
  },
  formulaTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.inkPrimary,
    letterSpacing: -0.2,
  },
  equationBox: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.accentBlue,
  },
  equationText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.inkPrimary,
    fontFamily: 'monospace',
    lineHeight: 19,
  },
  explanationText: {
    fontSize: 12,
    color: COLORS.inkSecondary,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.bgSubtle,
    gap: 8,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  sourceText: {
    fontSize: 11,
    color: COLORS.inkMuted,
    fontWeight: '500',
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentBlue,
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.brandDark,
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...SHADOWS.sm,
  },
  viewMoreBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCardWide: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    padding: 18,
    gap: 12,
    ...SHADOWS.md,
  },
  allModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.accentBlueBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allModalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.inkPrimary,
  },
  allModalSub: {
    fontSize: 11,
    color: COLORS.inkMuted,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.bgCanvas,
  },
  filterChipActive: {
    backgroundColor: COLORS.brandDark,
    borderColor: COLORS.brandDark,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.inkSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  modalScroll: {
    flexGrow: 0,
    maxHeight: 400,
  },
  modalScrollContent: {
    gap: 10,
    paddingVertical: 4,
  },
  popupFormulaCard: {
    backgroundColor: COLORS.bgCanvas,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 12,
    gap: 7,
  },
  closeAllBtn: {
    marginTop: 2,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    padding: 20,
    ...SHADOWS.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalFormulaTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.inkPrimary,
    marginBottom: 12,
  },
  modalEquationBox: {
    backgroundColor: COLORS.bgSubtle,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    gap: 6,
  },
  modalEquationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.inkMuted,
    letterSpacing: 0.5,
  },
  modalEquationText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.inkPrimary,
    fontFamily: 'monospace',
    lineHeight: 21,
  },
  modalSection: {
    gap: 4,
    marginBottom: 12,
  },
  modalSectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.inkPrimary,
    letterSpacing: 0.2,
  },
  modalBodyText: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    lineHeight: 20,
  },
  modalSectionHighlight: {
    backgroundColor: COLORS.accentAmberBg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 11,
    padding: 12,
    gap: 6,
    marginBottom: 14,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlightHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accentAmber,
  },
  highlightText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
    fontWeight: '500',
  },
  sourceLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  sourceLinkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sourceLinkMeta: {
    flex: 1,
    gap: 1,
  },
  sourceLinkTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.inkPrimary,
  },
  sourceLinkSub: {
    fontSize: 10,
    color: COLORS.inkMuted,
  },
  openSourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentBlueBg,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  openSourceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentBlue,
  },
  modalCloseBtn: {
    marginTop: 4,
    marginBottom: 6,
  },
});
