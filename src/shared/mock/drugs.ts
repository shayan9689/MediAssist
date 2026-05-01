export type DrugCard = {
  id: string
  genericName: string
  commonUses: string[]
  keyPoints: string[]
  cautions: string[]
  nclexAngle: string
}

export const mockDrugs: DrugCard[] = [
  {
    id: 'metoprolol',
    genericName: 'Metoprolol',
    commonUses: ['Hypertension', 'Angina', 'Some arrhythmias', 'Heart failure (specific formulations)'],
    keyPoints: ['Beta-1 selective at lower doses', 'Monitor HR and BP', 'Take as prescribed; avoid abrupt stop'],
    cautions: ['Bradycardia', 'Heart blocks', 'Bronchospasm risk especially non-selective agents'],
    nclexAngle: 'Prioritize assessments after administration and patient teaching on adherence.',
  },
  {
    id: 'furosemide',
    genericName: 'Furosemide',
    commonUses: ['Edema', 'Heart failure', 'Some renal/hepatic fluid overload situations'],
    keyPoints: ['Loop diuretic', 'Monitor electrolytes', 'I&O and daily weights'],
    cautions: ['Hypokalemia', 'Dehydration', 'Ototoxicity with rapid IV use'],
    nclexAngle: 'Fluid/electrolyte imbalance symptoms vs therapeutic effect.',
  },
  {
    id: 'insulin-regular',
    genericName: 'Insulin (rapid/short acting examples)',
    commonUses: ['Hyperglycemia', 'DKA protocols per order', 'Mealtime coverage'],
    keyPoints: ['Injection technique', 'Hypoglycemia signs', 'Rotation sites'],
    cautions: ['Hypoglycemia', 'Illness sick-day rules', 'Storage'],
    nclexAngle: 'Hypoglycemia recognition and immediate interventions.',
  },
  {
    id: 'warfarin',
    genericName: 'Warfarin',
    commonUses: ['Anticoagulation for certain AF/clots per provider'],
    keyPoints: ['INR monitoring', 'Bleeding precautions', 'Food/vitamin K consistency'],
    cautions: ['Bleeding', 'Drug interactions', 'Fall risk'],
    nclexAngle: 'Safety teaching and signs of bleeding.',
  },
  {
    id: 'albuterol',
    genericName: 'Albuterol',
    commonUses: ['Bronchospasm', 'Asthma/COPD exacerbations per protocol'],
    keyPoints: ['Inhaler/spacer teaching', 'Tremor and tachycardia possible', 'When to seek urgent care'],
    cautions: ['Tachycardia', 'Hypokalemia with overuse'],
    nclexAngle: 'Respiratory assessment before/after and patient education.',
  },
]
