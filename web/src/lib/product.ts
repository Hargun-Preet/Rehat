export type ProductPlan = {
  id: string;
  name: string;
  allowance_multiple: number;
  deductible_label: string;
  per_worker_week: number;
  per_worker_year: number;
  example_20_workers: {
    premium_year: number;
    premium_year_with_gst?: number;
    average_payout_year: number;
    worst_year_payout: number;
  };
  months_that_pay: string;
  source: "back-test" | "simulation";
  default: boolean;
};

export type ProductSpec = {
  version: string;
  product: {
    name: string;
    descriptor: string;
    underwriter_line: string;
    host_policy: string;
    benefit_per_worker_hour: number;
    gst_rate: number;
    term_months: number;
    mid_term_wait_days: number;
    payment: string;
    window: { days: string[]; start: string; end: string; meal_hour_default: string[] };
  };
  pdpa_fields_collected: string[];
  glossary: { term: string; plain: string }[];
  triggers: {
    heat: { meter: string; min_valid_readings: number; tiers: { from: number; to: number | null; rest_minutes: number; label: string }[] };
    rain: { meter: string; tiers: { from_mm: number; to_mm: number | null; hours: number }[] };
    haze: { meter: string; annual_limit_hours: number };
  };
  limits: { insured_hours_per_month: number; insured_hours_per_year: number; max_payout_per_worker_year: number; haze_hours_per_year: number };
  fallback_ladder: string[];
  plans: ProductPlan[];
  retired: string[];
  levers: { term: string; plain: string }[];
  included: { heat_alert: boolean; compliance_log: boolean; break_log: { optional: boolean; condition_of_payout: boolean } };
  misuse_conditions: { warranty: boolean; mom_action_first: string; mom_action_second: string; worker_notice: boolean };
  demo_firm: {
    name: string;
    uen: string;
    owner_display: string;
    trade: string;
    work_class: string;
    outdoor_workers: number;
    site_area: string;
    plan: string;
    wic_policy_no: string;
    fictional: boolean;
  };
  demo_clock: {
    today: string;
    month: string;
    replay_day: string;
    replay_receipt_month: string;
    may_receipt: { month: string; rain_hours: number; deductible_hours: number; payment: number; payment_date: string; source: "simulation" };
    note: string;
  };
  copy: {
    tagline: string;
    hook: string;
    human_line: string;
    one_line: string;
    may_not_pay: string;
    employer_sms: string;
    warranty: string;
    worker_notice_en: string;
    worker_notice_languages: string[];
    translation_badge: string;
    heat_alert: string;
    forecast_alert: string;
    rule_statement: string;
    teach_back_question: string;
    teach_back_options: { text: string; correct: boolean }[];
    teach_back_explain: string;
    footer: string;
    ask: string;
  };
  worked_month: {
    firm: string;
    month: string;
    station: string;
    plan: string;
    heat: { counted_hours: number; allowance_hours: number; insured_hours: number };
    rain: { counted_hours: number; allowance_hours: number; insured_hours: number };
    insured_hours: number;
    payout: number;
    note: string;
  };
  unit_economics_standard_per_worker: {
    firm_loss_normal_year_20_workers: { value: number; source: string };
    expected_insured_hours_year: { value: number; low: number; high: number; source: string };
    expected_payout_year: { value: number; source: string };
    one_in_ten_year_payout: { value: number; loss_ratio: number; source: string };
    worst_backtest_year_payout: { value: number; loss_ratio: number; source: string };
  };
  facts: { id: string; text: string; source: string }[];
  market: {
    all_crews: { workers: number; premium: number; source: string; note: string };
    small_firms: { employers: number; workers: number; workers_low: number; workers_high: number; premium: number; premium_low: number; premium_high: number; source: string };
    reachable_first: { employers: number; workers: number; premium: number; source: string; note: string };
    year_3_target: { employers: number; workers: number; premium: number; source: string };
    wic_line: { premium: number; one_percent: number; source: string; note: string };
  };
  premium_split: { id: string; label: string; share: number; note?: string }[];
  three_year_path: {
    source: string;
    years: { year: number; label: string; firms: number; workers: number; premium: number; claims: number; expenses: number; reinsurance: number; profit: number }[];
    total_premium: number;
    total_profit: number;
    note: string;
  };
  pilot: {
    firms: number;
    workers: number;
    start: string;
    premium: number;
    expected_profit: number;
    capped_worst_case: number;
    one_in_100_year_claims: { value: number; source: string };
    risk_retained_by: string;
  };
  reinsurance: {
    attachment_loss_ratio: number;
    expected_recovery_share: { simulation: number; back_test: number };
    budget_share: number;
    starts_year: number;
    haze_stress_scenario: { label: string; loss_ratio: number; source: string; basis: string };
  };
  site_match_pilot_rider: { status: string; top_up_cap_hours_year: number; price_per_worker_week: { value: number; source: string } };
};

export type ProductQuote = {
  workers: number;
  beforeGst: number;
  gst: number;
  total: number;
  weeklyPerWorker: number;
};

export function productPlan(product: ProductSpec, id = product.demo_firm.plan): ProductPlan {
  const plan = product.plans.find((item) => item.id === id);
  if (!plan) throw new Error(`Unknown Rehat plan: ${id}`);
  return plan;
}

/**
 * Premium arithmetic uses only the published plan price and headcount.
 * The display may round the final amount to whole dollars, but calculations retain cents.
 */
export function productQuote(product: ProductSpec, plan: ProductPlan, workers = product.demo_firm.outdoor_workers): ProductQuote {
  const beforeGst = plan.per_worker_year * workers;
  const gst = beforeGst * product.product.gst_rate;
  return { workers, beforeGst, gst, total: beforeGst + gst, weeklyPerWorker: plan.per_worker_week };
}
