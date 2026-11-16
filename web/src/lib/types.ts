export type Plan = {
  plan: string;
  benefit: number;
  year: number;
  month: number;
  week: number;
  working_day: number;
  year_gst: number;
  week_gst: number;
  year_after_credit: number;
  year_after_credit_gst: number;
};

export type Pricing = {
  expected_insured_h: number;
  expected_insured_h_basis: string;
  plans: Plan[];
  site_match_rider: { year: number; week: number; cap_hours_year: number; basis: string };
  gst: number;
  firm_20: Record<string, number>;
  loss_ratios: { expected: number; one_in_ten: number; worst_backtest: number; worst_plus_haze_stress: number; hard_cap: number; by_year: number[]; years: number[] };
  expense: {
    breakeven_policies: number;
    expense_ratio_at_breakeven: number;
    policies_for_20pct_expense_ratio: number;
    curve: { policies: number; expense_ratio: number }[];
  };
  reinsurance: {
    load: number;
    budget_pct: number;
    chosen_attach: number;
    rule_suggests_attach: number;
    note: string;
    hard_cap_lr: number;
    table: {
      attach: number;
      expected_recovery_pct: number;
      cost_pct: number;
      years_hit: number;
      years: number;
      inside_budget: boolean;
      retained_worst_lr: number;
    }[];
  };
  pilot: Record<string, number>;
  market: {
    total_premium: { low: number; mid: number; high: number };
    income_wic_slice: number;
    year3_obtainable_premium: number;
    firms_mid: number;
    basis: string;
  };
  assumptions: Record<string, { value: number; basis: string }>;
};

export type Backtest = {
  base: {
    expected_insured_h: number;
    expected_payout: number;
    loss_ratio_1in10: number;
    payout_1in10: number;
    worst_year: number;
    worst_payout: number;
    zero_payout_years_book: number;
    zero_payout_years_avg_firm: number;
    pct_months_paying: number;
    years: number[];
    annual_insured_h: number[];
  };
  rain_window_share: number;
  rain_window_share_basis: string;
  stations: {
    station_id: string;
    name: string;
    expected_insured_h: number;
    zero_payout_years: number;
    pct_months_paying: number;
    heat_counted_h: number;
    rain_counted_h: number;
    cap_hit_years: number;
  }[];
  tornado: { case: string; expected_payout: number; loss_ratio_1in10: number; d_payout: number; d_lr10: number }[];
  basis_risk: {
    overall_pct: number;
    by_station: { station_id: string; name: string; basis_risk_pct: number; station_triggered_pct: number; neighbours: string[]; hours: number }[];
    period: string[];
  };
  changi_long_view: Record<string, unknown>;
  haze_months_covered: number;
};

export type HourState = "TRIGGERED" | "NOT_TRIGGERED" | "PENDING";

export type HourLine = {
  ts: string;
  peril: string;
  reading: number | null;
  unit: string;
  source: string;
  state: HourState;
  counted_h: number;
  detail: string;
};

export type Receipt = {
  firm: { uen: string; name: string; outdoor_workers: number; wage_band: string; plan: string; benefit_sgd: number };
  month: string;
  stations: {
    primary: { station_id: string; name: string };
    backup: { station_id: string; name: string };
    rain_gauge: { station_id: string; name: string };
    psi_region: string;
  };
  perils: {
    heat: {
      counted_h: number;
      normal_h: number;
      allowance_h: number;
      insured_h: number;
      normal_is_assumption: boolean;
      normal_basis: string;
      pending_hours: number;
      forfeited?: boolean;
    };
    rain: {
      counted_h: number;
      normal_h: number;
      allowance_h: number;
      insured_h: number;
      normal_is_assumption: boolean;
      normal_basis: string;
      pending_hours: number;
    };
    haze: { counted_h: number; insured_h: number; pending_days: number; note: string };
  };
  insured_before_caps_h: number;
  insured_after_caps_h: number;
  monthly_cap_h: number;
  yearly_cap_h: number;
  ytd_insured_before_h: number;
  payout_sgd: number;
  settlement_date: string;
  receipt_lines: string[];
  not_counted: { what: string; why: string }[];
  hours: HourLine[];
  explain: Record<string, { text: string; source: string; note: string }>;
  why_not_paid: Record<string, string>;
};

export type Numbers = {
  generated_at: string;
  backtest?: Record<string, number | string>;
  pricing?: Record<string, string>;
  liquidity?: Record<string, string>;
  sitematch?: Record<string, string>;
};
