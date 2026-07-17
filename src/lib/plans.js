// ApiColony SaaS plan tanımları — tek kaynak, her yerden buraya referans verilir.
// Fiyatı/limiti değiştirmek istersen sadece burayı güncellemen yeterli.

export const PLAN_TIERS = {
  baslangic: {
    id: 'baslangic',
    nameKey: 'plans.tier_starter',
    hiveLimit: 25,
    priceTRY: 150,
  },
  standart: {
    id: 'standart',
    nameKey: 'plans.tier_standard',
    hiveLimit: 75,
    priceTRY: 350,
  },
  profesyonel: {
    id: 'profesyonel',
    nameKey: 'plans.tier_professional',
    hiveLimit: 200,
    priceTRY: 650,
  },
  kurumsal: {
    id: 'kurumsal',
    nameKey: 'plans.tier_enterprise',
    hiveLimit: null, // sınırsız
    priceTRY: null,  // "bizimle iletişime geç"
  },
}

export const PLAN_ORDER = ['baslangic', 'standart', 'profesyonel', 'kurumsal']

// Banka bilgileri — ödeme bildirimi ekranında gösterilir.
// Kendi IBAN/hesap bilgilerinle değiştir.
export const PAYMENT_INSTRUCTIONS = {
  TR: {
    bankName: 'Banka adını buraya yaz',
    iban: 'TR00 0000 0000 0000 0000 0000 00',
    accountHolder: 'Hesap sahibi adı',
  },
  GE: {
    bankName: 'Bank of Georgia / TBC (banka adını yaz)',
    iban: 'GE00 XX000 0000 0000 0000 00',
    accountHolder: 'Hesap sahibi adı',
  },
}

/**
 * Bir kullanıcının abonelik satırından (subscriptions tablosu) etkin
 * durumu hesaplar. Sunucu tarafında bir "durum" alanı tutmuyoruz —
 * tarihlerden anlık türetiyoruz.
 */
export function getSubscriptionState(sub) {
  if (!sub) {
    return { inTrial: false, hasActivePaid: false, isReadOnly: true, trialDaysLeft: 0, hiveLimit: 0, plan: null }
  }
  const now = new Date()
  const trialEnds = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null
  const periodEnds = sub.current_period_ends_at ? new Date(sub.current_period_ends_at) : null

  const inTrial = !!trialEnds && now < trialEnds
  const hasActivePaid = !!periodEnds && now < periodEnds
  const isReadOnly = !inTrial && !hasActivePaid

  const trialDaysLeft = inTrial ? Math.max(0, Math.ceil((trialEnds - now) / 86400000)) : 0

  let hiveLimit = 0
  if (inTrial) hiveLimit = null // deneme sırasında sınırsız, ürünü tam gösteriyoruz
  else if (hasActivePaid) hiveLimit = PLAN_TIERS[sub.plan]?.hiveLimit ?? null

  return { inTrial, hasActivePaid, isReadOnly, trialDaysLeft, hiveLimit, plan: sub.plan }
}
