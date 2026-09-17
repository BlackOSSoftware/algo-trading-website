"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost, API_BASE_URL } from "@/lib/api";
import { getToken, setToken } from "@/lib/auth";

type InstrumentHit = {
  token?: string;
  symbol: string;
  name?: string;
  exchange?: string;
  instrumentType?: string;
};

type Strategy = {
  _id: string;
  name: string;
  webhookUrl: string;
  webhookKey?: string;
  webhookPath?: string;
  marketMayaUrl?: string;
  marketMaya?: {
    token?: string;
    tokenConfigured?: boolean;
    exchange?: string;
    segment?: string;
    symbolMode?: string;
    symbol_mode?: string;
    symbolSource?: string;
    symbol_source?: string;
    symbolKey?: string;
    symbols?: string[];
    stockList?: string[] | string;
    stock_list?: string[] | string;
    fixedStocks?: string[] | string;
    fixed_stocks?: string[] | string;
    maxSymbols?: number | string;
    callTypeFallback?: string;
    sharekhanDirect?: boolean;
    marketMayaEnabled?: boolean;
    sharekhanProductType?: string;
    sharekhanApiKey?: string;
    sharekhanAccessToken?: string;
    sharekhanSecureKey?: string;
    sharekhanCustomerId?: string;
    sharekhanChannelUser?: string;
    sharekhanConfigured?: boolean;
    contract?: string;
    expiry?: string;
    expiryDate?: string;
    optionType?: string;
    atm?: string;
    strikePrice?: string;
    orderType?: string;
    limitPriceSource?: "fixed" | "trigger" | string;
    limitPrice?: string;
    mStockApiType?: string;
    mStockApiKey?: string;
    mStockAuthToken?: string;
    mStockExchange?: string;
    mStockInstrumentToken?: string;
    mStockInterval?: string;
    mStockCandleOffset?: number | string;
    bufferBy?: string;
    bufferValue?: number | string;
    bufferPoints?: number | string;
    capitalAmount?: number | string;
    qtyDistribution?: string;
    qtyValue?: string;
    targetBy?: string;
    target?: string;
    slBy?: string;
    sl?: string;
    trailSl?: boolean;
    slMove?: string;
    profitMove?: string;
    dailyTradeLimit?: number | string;
    tradeWindowStart?: string;
    tradeWindowEnd?: string;
  };
  enabled: boolean;
  emailEnabled?: boolean;
  telegramEnabled?: boolean;
  telegramChatId?: string;
  createdAt: string;
};

type UserProfile = {
  email?: string;
};

type TelegramToken = {
  token: string;
  expiresAt?: string;
  usedAt?: string | null;
  usedChatId?: string | null;
  createdAt?: string;
};

type InfoContent = {
  title: string;
  description: string;
  points?: string[];
};

type LimitPriceSource =
  | "fixed"
  | "trigger"
  | "mstockHigh"
  | "mstockLow"
  | "mstockOpen"
  | "mstockClose";
type LimitPriceSourceOption = LimitPriceSource | "mstockCandle";
type WebhookProvider = "chartink" | "tradingview";

type InfoButtonVariant = "inline" | "chip";

const TELEGRAM_BOT_URL = "https://t.me/Alert_vibhav_bot";
const DEFAULT_WEBHOOK_TEST_PAYLOAD = JSON.stringify(
  {
    alert_name: "Breakout Alert",
    scan_name: "Chartink Scanner",
    stocks: "RELIANCE",
    trigger_price: 300,
    high: 302.5,
    low: 298.25,
    candle_time: "2026-05-26T09:20:00+05:30",
  },
  null,
  2
);
const DEFAULT_TRADINGVIEW_TEST_PAYLOAD = JSON.stringify(
  {
    alert_name: "TradingView Alert",
    scan_name: "TradingView Strategy",
    symbol: "RELIANCE",
    stocks: "RELIANCE",
    trigger_price: 300,
    high: 302.5,
    low: 298.25,
    candle_time: "2026-05-26T09:20:00+05:30",
    call_type: "BUY",
    triggered_at: "09:20:00",
  },
  null,
  2
);
const DEFAULT_TRADE_WINDOW_START = "09:15";
const DEFAULT_TRADE_WINDOW_END = "15:30";
const DEFAULT_MCX_TRADE_WINDOW_END = "23:30";
const STRATEGY_CALL_TYPE_OPTIONS = [
  "BUY",
  "SELL",
  "BUY EXIT",
  "SELL EXIT",
  "BUY ADD",
  "SELL ADD",
];
const EXIT_CALL_TYPES = new Set([
  "BUY EXIT",
  "SELL EXIT",
  "PARTIAL BUY EXIT",
  "PARTIAL SELL EXIT",
]);
const MARKET_SEGMENT_OPTIONS = [
  { value: "EQ", label: "Equity (EQ)" },
  { value: "FUT", label: "Futures (FUT)" },
  { value: "OPT", label: "Options (OPT)" },
];
const INSTRUMENT_KIND_OPTIONS = [
  { value: "equity", label: "Equity", segment: "EQ", exchange: "NSE" },
  { value: "futures", label: "Index / Stock Futures", segment: "FUT", exchange: "NFO" },
  { value: "options", label: "Options", segment: "OPT", exchange: "NFO" },
  { value: "commodity", label: "Commodity (MCX)", segment: "FUT", exchange: "MCX" },
];
const MARKET_EXCHANGE_OPTIONS: Record<string, string[]> = {
  EQ: ["NSE", "BSE"],
  FUT: ["NFO", "BFO", "CDS", "MCX"],
  OPT: ["NFO", "BFO", "CDS", "MCX"],
};
const DERIVATIVE_SEGMENTS = new Set(["FUT", "OPT"]);
const DEFAULT_SEGMENT = "EQ";
const DEFAULT_EQ_EXCHANGE = "NSE";
const DEFAULT_DERIVATIVE_EXCHANGE = "NFO";
const DEFAULT_CONTRACT = "NEAR";
const DEFAULT_EXPIRY = "MONTHLY";
const DEFAULT_OPTION_TYPE = "CE";
const DEFAULT_ATM = "0";
const DEFAULT_LIMIT_PRICE_SOURCE: LimitPriceSource = "fixed";
const DEFAULT_MSTOCK_API_TYPE = "typeB";
const DEFAULT_MSTOCK_INTERVAL = "5minute";
const DEFAULT_MSTOCK_CANDLE_OFFSET = "1";
const M_STOCK_API_TYPE_OPTIONS = [
  { value: "typeA", label: "Type A" },
  { value: "typeB", label: "Type B" },
];
const M_STOCK_INTERVAL_OPTIONS = [
  { value: "minute", label: "1 minute" },
  { value: "3minute", label: "3 minute" },
  { value: "5minute", label: "5 minute" },
  { value: "10minute", label: "10 minute" },
  { value: "15minute", label: "15 minute" },
  { value: "30minute", label: "30 minute" },
  { value: "60minute", label: "60 minute" },
  { value: "day", label: "1 day" },
];
const CONTRACT_OPTIONS = ["NEAR", "NEXT", "FAR"];
const FUT_EXPIRY_OPTIONS = ["MONTHLY"];
const OPT_EXPIRY_OPTIONS = ["WEEKLY", "MONTHLY"];
const OPTION_TYPE_OPTIONS = ["CE", "PE"];
const INFO_CONTENT: Record<string, InfoContent> = {
  telegramAccess: {
    title: "Telegram Access",
    description: "This section generates a bot token that you send to the Telegram bot to start alerts.",
    points: [
      "Generate a token, then send `/startAlert <token>` to the bot.",
      "You do not need to enter the user chat ID manually.",
      "Use `/stopAlert` to stop alerts.",
    ],
  },
  savedStrategies: {
    title: "Saved Strategies",
    description: "This section lists all saved webhook strategies and shows their current status.",
    points: [
      "Copy either the Chartink URL or the TradingView URL.",
      "Enable or Disable turns auto trading on or off.",
      "Edit updates the strategy configuration.",
    ],
  },
  strategyName: {
    title: "Strategy Name",
    description: "This is an internal name used to identify the strategy in the dashboard.",
    points: [
      "This name may appear in webhook execution logs and alerts.",
      "It is not automatically read from any Chartink payload field.",
    ],
  },
  marketMayaEnable: {
    title: "Enable Market Maya",
    description:
      "Controls Market Maya orders only. Strategy Enable/Disable is separate and controls whether webhook auto-trading runs at all.",
    points: [
      "When Market Maya is off, Sharekhan (if enabled) can still place orders.",
      "Use Strategy Enable/Disable on the list (or Enable strategy in the form) to pause the whole strategy.",
    ],
  },
  marketMayaToken: {
    title: "Market Maya Token",
    description: "This token authorizes requests to the Market Maya API.",
    points: [
      "If left blank, the server default token will be used.",
      "A valid token is required for live trading.",
    ],
  },
  sharekhanDirect: {
    title: "Sharekhan direct",
    description:
      "Place the same signal as a live order on YOUR Sharekhan account via ShareConnect API.",
    points: [
      "Uses credentials you paste on this strategy (not Admin mStock).",
      "Required: API Key, Access Token, Customer ID, and Login ID (channelUser).",
      "Can run together with Market Maya.",
    ],
  },
  sharekhanApiKey: {
    title: "Sharekhan API Key",
    description: "API Key from your Sharekhan Trading API app (Self App).",
    points: ["Create it on Sharekhan API developer portal.", "This is your key, not the admin mStock key."],
  },
  sharekhanAccessToken: {
    title: "Sharekhan Access Token",
    description: "Session access token generated after Sharekhan API login.",
    points: ["Required for placing live orders.", "Regenerate when the session expires."],
  },
  sharekhanSecureKey: {
    title: "Sharekhan Secure Key",
    description: "Secure/secret key from your Sharekhan API app (optional to store).",
    points: ["Used when generating access token from request token.", "Keep it private."],
  },
  sharekhanCustomerId: {
    title: "Sharekhan Customer ID",
    description: "Numeric client ID (e.g. 1464067). Sent as customerId in the order API.",
    points: ["Must match the account that owns the API session."],
  },
  sharekhanChannelUser: {
    title: "Sharekhan Login ID",
    description: "Sharekhan login / channelUser (e.g. pandurangs22).",
    points: [
      "Different from Customer ID.",
      "Must match the login used to generate the access token.",
    ],
  },
  sharekhanRedirectUrl: {
    title: "Sharekhan Redirect URL",
    description: "Copy this URL into Sharekhan Create App → Redirect URL field.",
    points: [
      "Local testing: use the 127.0.0.1 URL.",
      "Live: use your HTTPS app URL.",
      "After login Sharekhan redirects here with request token.",
    ],
  },
  sharekhanProductType: {
    title: "Sharekhan product",
    description: "Product type sent to Sharekhan for direct orders.",
    points: [
      "INVESTMENT = delivery / carry.",
      "BIGTRADE = intraday style.",
      "Auto uses INVESTMENT when blank.",
    ],
  },
  symbolSource: {
    title: "Symbol Source",
    description: "This setting decides where the symbol should be read from in the webhook payload.",
    points: [
      "`Stocks: first only` uses only the first symbol from the `stocks` list.",
      "`Stocks: all` uses all comma-separated symbols.",
      "`Fixed stocks list` uses symbols saved from this strategy form.",
      "`Symbol field` reads symbols from a custom payload key.",
    ],
  },
  maxSymbols: {
    title: "Max Symbols",
    description: "This sets the maximum number of symbols to process in multi-symbol mode.",
    points: [
      "This has no effect in `Stocks: first only` mode.",
      "If left blank, the default limit is 5 symbols.",
      "The maximum allowed value is 25.",
    ],
  },
  symbolKey: {
    title: "Symbol Key",
    description: "This is the custom payload field name used to read a symbol or comma-separated symbols.",
    points: [
      "Example: `symbol`, `ticker`, `stock_name`.",
      "This is used only in `Symbol field` mode.",
    ],
  },
  fixedStocks: {
    title: "Fixed Stocks List",
    description: "Use this list when you want to define stock names directly from the strategy settings.",
    points: [
      "Type one stock name and click Add.",
      "The saved list is used when Symbol source is `Fixed stocks list`.",
      "This works well when you want symbols from your side instead of webhook payload.",
    ],
  },
  instrumentSetup: {
    title: "Instrument Setup",
    description: "Choose whether the strategy should trade cash, futures, or options instruments.",
    points: [
      "Only the fields relevant to the selected segment are shown.",
      "EQ hides derivative-specific fields like expiry and option type.",
      "FUT and OPT can use either exact expiry date or contract plus expiry cycle.",
    ],
  },
  exchange: {
    title: "Exchange",
    description: "This sets the exchange that will be sent to Market Maya.",
    points: [
      "EQ uses cash exchanges such as NSE and BSE.",
      "Derivative segments use exchanges such as NFO, BFO, CDS, and MCX.",
    ],
  },
  segment: {
    title: "Segment",
    description: "This decides whether the trade is sent as EQ, FUT, or OPT.",
    points: [
      "EQ is for cash stocks and ETFs.",
      "FUT is for futures contracts.",
      "OPT is for options contracts.",
    ],
  },
  expirySelection: {
    title: "Expiry Selection",
    description: "This controls how derivative expiry is sent to Market Maya.",
    points: [
      "FUT contract mode uses NEAR/NEXT/FAR with MONTHLY expiry.",
      "OPT contract mode supports WEEKLY and MONTHLY.",
      "Exact date mode sends a fixed expiry date.",
    ],
  },
  contract: {
    title: "Contract",
    description: "This selects the relative contract when exact expiry date is not used.",
    points: [
      "Supported values are NEAR, NEXT, and FAR.",
    ],
  },
  expiryCycle: {
    title: "Expiry Cycle",
    description: "This chooses the derivative expiry bucket for contract mode.",
    points: [
      "FUT supports MONTHLY only.",
      "OPT supports WEEKLY and MONTHLY.",
    ],
  },
  expiryDate: {
    title: "Expiry Date",
    description: "This sends a fixed expiry date instead of contract plus expiry cycle.",
    points: [
      "Use this when you want a specific contract date.",
      "The app converts the selected date to Market Maya format automatically.",
    ],
  },
  optionType: {
    title: "Option Type",
    description: "This selects whether the option is CE or PE.",
    points: [
      "This field appears only for OPT segment.",
    ],
  },
  strikeSelection: {
    title: "Strike Selection",
    description: "Choose whether the option should use ATM offset or exact strike price.",
    points: [
      "ATM mode supports values like 0, 100, or -100.",
      "Exact strike mode sends a fixed strike price.",
    ],
  },
  atm: {
    title: "ATM Offset",
    description: "This sets the ATM offset used for option strike selection.",
    points: [
      "Examples: 0, 100, -100.",
    ],
  },
  strikePrice: {
    title: "Strike Price",
    description: "This sets an exact strike price for option contracts.",
    points: [
      "Use this when you do not want ATM-based strike selection.",
    ],
  },
  tradeWindow: {
    title: "Trade Time Window",
    description: "The strategy will execute auto trades only within this time range.",
    points: [
      "The default window is 09:15 to 15:30.",
      "If the webhook payload includes `triggered_at`, that signal time is used first.",
      "Otherwise the webhook receive time is checked in the trading timezone (IST by default).",
      "Signals received outside this window are skipped.",
    ],
  },
  tradeSideFallback: {
    title: "Trade Side Fallback",
    description: "If the payload does not include `call_type`, the selected action here will be used.",
    points: [
      "BUY and SELL are used for normal entry trades.",
      "BUY EXIT and SELL EXIT send exit actions.",
      "In exit mode, order type, quantity, target, and stop loss are ignored.",
    ],
  },
  orderType: {
    title: "Order Type",
    description:
      "Market Maya REST API no longer accepts MARKET/LIMIT order_type. Live broker orders are placed from call type + symbol only.",
    points: [
      "Do not send order_type or price in the custom-trade URL.",
      "Sending MARKET previously caused pseudo/paper fills instead of live orders.",
      "Qty, target, and stop loss still work as documented additional variables.",
    ],
  },
  limitPrice: {
    title: "Limit Price",
    description: "Use this field to set a direct price for a LIMIT order.",
    points: [
      "This is used when fixed limit price is selected.",
      "Switch to Chartink trigger price if you want webhook trigger_price to control the LIMIT order.",
      "This is used only for LIMIT orders.",
    ],
  },
  limitPriceSource: {
    title: "Limit Price Source",
    description:
      "Choose whether LIMIT order price should come from a fixed value, the webhook trigger price, or the latest mStock candle open/high/low/close.",
    points: [
      "Fixed limit price sends the exact price you enter.",
      "Chartink trigger price uses payload trigger_price, and buffer can adjust it.",
      "mStock candle OHLC fetches candle data from your configured mStock API instrument.",
    ],
  },
  mStockApiType: {
    title: "mStock API Type",
    description: "Select the same API type that you generated in your mStock developer panel.",
    points: [
      "Type A uses API key + access token headers.",
      "Type B uses API key + JWT token headers.",
    ],
  },
  mStockApiKey: {
    title: "mStock API Key",
    description: "Paste the active mStock API key used for candle data requests.",
    points: [
      "Use the key from your mStock Trading API dashboard.",
      "If you shared a key publicly, revoke and regenerate it first.",
    ],
  },
  mStockAuthToken: {
    title: "mStock Access / JWT Token",
    description: "Paste the current session token required by mStock for API calls.",
    points: [
      "Type A expects an access token.",
      "Type B expects a JWT token.",
      "mStock docs say this token is valid till midnight on the same day, so renew it daily.",
    ],
  },
  mStockExchange: {
    title: "mStock Exchange",
    description: "This exchange is used only for mStock candle data lookup.",
    points: [
      "Examples: NSE, BSE, NFO, BFO.",
      "Keep this aligned with the instrument token you are using.",
    ],
  },
  mStockInstrumentToken: {
    title: "mStock Instrument Token",
    description: "Enter the instrument token used by Type A historical API, or the symbol token used by Type B historical API.",
    points: [
      "You can get this from mStock script master / symbol master data.",
      "This lets the app fetch the exact candle that should drive your limit price.",
    ],
  },
  mStockInterval: {
    title: "mStock Candle Interval",
    description: "This decides which candle timeframe is used for the fetched candle price.",
    points: [
      "Examples: 1 minute, 5 minute, 15 minute, or day.",
      "The selected candle open/high/low/close becomes the dynamic limit price.",
    ],
  },
  mStockPriceField: {
    title: "Candle Level",
    description:
      "Choose whether the order price should use the selected candle open, high, low, or close.",
    points: [
      "If timeframe is `day` and level is `Open`, order price uses the daily candle open.",
      "If timeframe is `day` and level is `High` or `Low`, order price uses the daily candle high or low.",
      "If timeframe is `day` and level is `Close`, order price uses the daily candle close.",
    ],
  },
  mStockCandleOffset: {
    title: "mStock Candle Offset",
    description: "Choose which candle from the latest series should be used.",
    points: [
      "1 means latest candle returned by mStock.",
      "2 means previous candle, 3 means one candle further back, and so on.",
    ],
  },
  tradeBuffer: {
    title: "Trade Buffer",
    description: "For LIMIT orders, a buffer can be added above or below the dynamic source price to derive the final price.",
    points: [
      "For BUY, the final price is source price plus buffer.",
      "For SELL, the final price is source price minus buffer.",
      "This is active only for LIMIT orders.",
    ],
  },
  qtyDistribution: {
    title: "Qty Distribution",
    description: "This decides whether quantity is fixed or calculated from a capital percentage.",
    points: [
      "`Fix` sends the quantity value directly.",
      "`Capital(%)` calculates quantity using capital amount and stock price.",
      "Quantity settings are ignored in exit mode.",
    ],
  },
  qtyValue: {
    title: "Qty Value",
    description: "Enter the actual quantity number or percentage here.",
    points: [
      "In `Fix` mode, this is the direct quantity.",
      "In `Capital(%)` mode, this is the capital percentage.",
    ],
  },
  capitalAmount: {
    title: "Capital Amount",
    description: "Enter the total capital used for calculation in capital-based quantity mode.",
    points: [
      "This is used only in `Capital(%)` mode.",
      "Formula: (Capital Amount * Qty% / 100) / price.",
    ],
  },
  dailyTradeLimit: {
    title: "Daily Trade Limit",
    description: "This controls the maximum number of trades allowed for this strategy in one day.",
    points: [
      "Once the limit is reached, remaining signals are skipped.",
      "If this is off, there is no daily cap.",
    ],
  },
  dailyTradeLimitValue: {
    title: "Daily Trade Limit Value",
    description: "This sets the exact trade count limit per day.",
    points: [
      "Example: 5 means the strategy will not place more than 5 live trades in one day.",
    ],
  },
  targetToggle: {
    title: "Target",
    description: "This toggle controls whether a target should be sent with the trade.",
    points: [
      "When enabled, target type and target value fields become available.",
      "Target settings do not apply in exit mode.",
    ],
  },
  targetBy: {
    title: "Target By",
    description: "This decides which unit should be used to define the target.",
    points: [
      "Supported units include Money, Point, Percentage, and Price.",
      "In Ratio mode, the target is computed from the stop loss value.",
    ],
  },
  targetValue: {
    title: "Target Value",
    description: "Enter the actual target value based on the selected target type.",
    points: [
      "In Ratio mode, you can use values like `1:2` or `2`.",
      "A valid stop loss is also required when using Ratio mode.",
    ],
  },
  stopLossToggle: {
    title: "Stop Loss",
    description: "This toggle controls whether a stop loss should be sent with the trade.",
    points: [
      "When enabled, stop loss type and stop loss value fields become available.",
      "Stop loss settings do not apply in exit mode.",
    ],
  },
  stopLossBy: {
    title: "Stop Loss By",
    description: "This decides which unit should be used to define the stop loss.",
    points: [
      "Supported units include Money, Point, Percentage, and Price.",
    ],
  },
  stopLossValue: {
    title: "Stop Loss Value",
    description: "Enter the actual stop loss value based on the selected stop loss type.",
    points: [
      "This value can be important when using a Ratio target.",
    ],
  },
  trailSl: {
    title: "Trail SL",
    description: "Enabling trailing stop loss allows the stop loss to move dynamically.",
    points: [
      "When enabled, the SL Move and Profit Move fields are used.",
      "Trailing stop loss does not apply in exit mode.",
    ],
  },
  slMove: {
    title: "SL Move",
    description: "This value defines how much the stop loss should shift when trailing stop loss is active.",
  },
  profitMove: {
    title: "Profit Move",
    description: "This sets how much profit movement is required before trailing stop loss is triggered.",
  },
  emailAlerts: {
    title: "Email Alerts",
    description: "This toggle decides whether an alert should be sent to the registered email when a webhook signal arrives.",
    points: [
      "Alerts are sent to the email address used for account registration.",
      "This is controlled separately for each strategy.",
    ],
  },
  telegramAlerts: {
    title: "Telegram Alerts",
    description: "If the Telegram bot subscription is active, the signal can also be sent to Telegram.",
    points: [
      "Alerts are available only after the bot token is linked.",
      "This is controlled separately for each strategy.",
    ],
  },
  webhookUrl: {
    title: "Webhook URL",
    description: "Use the same strategy key with either the Chartink or the TradingView webhook URL.",
    points: [
      "Each strategy can have its own unique webhook key.",
      "The existing webhook key can stay the same when you edit the strategy.",
      "TradingView can send the same JSON fields used by Chartink-compatible payloads.",
    ],
  },
  testWebhook: {
    title: "Test Webhook",
    description: "Use this modal to test either the Chartink or the TradingView webhook with sample JSON.",
    points: [
      "Choose the sample payload closest to your sender.",
      "The response status and body are shown here.",
    ],
  },
};

function normalizeTradeAction(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function isExitTradeAction(value: string) {
  return EXIT_CALL_TYPES.has(normalizeTradeAction(value));
}

function parseRatioMultiplier(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  if (raw.includes(":") || raw.includes("/")) {
    const divider = raw.includes(":") ? ":" : "/";
    const [left, right] = raw.split(divider).map((item) => item.trim());
    const a = Number(left);
    const b = Number(right);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
    return b / a;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

function computeRatioTarget(slValue: string, ratioValue: string) {
  const sl = Number(slValue.trim());
  if (!Number.isFinite(sl) || sl <= 0) return null;
  const multiplier = parseRatioMultiplier(ratioValue);
  if (!multiplier) return null;
  const target = sl * multiplier;
  if (!Number.isFinite(target)) return null;
  return String(Number(target.toFixed(6)));
}

function isDerivativeSegment(segment: string) {
  return DERIVATIVE_SEGMENTS.has(segment);
}

function getExchangeOptions(segment: string) {
  return MARKET_EXCHANGE_OPTIONS[segment] || MARKET_EXCHANGE_OPTIONS[DEFAULT_SEGMENT];
}

function getExpiryOptions(segment: string) {
  return segment === "FUT" ? FUT_EXPIRY_OPTIONS : OPT_EXPIRY_OPTIONS;
}

const SHAREKHAN_LOGIN_DRAFT_KEY = "wt_sharekhan_login_draft";
const SHAREKHAN_ACCESS_RESULT_KEY = "wt_sharekhan_access_result";
const SHAREKHAN_CREDENTIALS_KEY = "wt_sharekhan_credentials";

type SharekhanFormDraft = Record<string, unknown>;
type SharekhanSavedCredentials = {
  apiKey: string;
  secureKey: string;
  customerId: string;
  channelUser: string;
  accessToken: string;
  productType: string;
  connectedAt?: number;
};

function readSharekhanSavedCredentials(): SharekhanSavedCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SHAREKHAN_CREDENTIALS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SharekhanSavedCredentials> | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      apiKey: String(parsed.apiKey || ""),
      secureKey: String(parsed.secureKey || ""),
      customerId: String(parsed.customerId || ""),
      channelUser: String(parsed.channelUser || ""),
      accessToken: String(parsed.accessToken || ""),
      productType: String(parsed.productType || ""),
      connectedAt: Number(parsed.connectedAt || 0) || undefined,
    };
  } catch {
    return null;
  }
}

function saveSharekhanSavedCredentials(patch: Partial<SharekhanSavedCredentials>) {
  if (typeof window === "undefined") return;
  const current = readSharekhanSavedCredentials() || {
    apiKey: "",
    secureKey: "",
    customerId: "",
    channelUser: "",
    accessToken: "",
    productType: "",
  };
  const next = {
    ...current,
    ...patch,
  };
  try {
    window.localStorage.setItem(SHAREKHAN_CREDENTIALS_KEY, JSON.stringify(next));
  } catch {
    // ignore local storage failures
  }
}

function getSharekhanRedirectUrls() {
  const configured = String(process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin.replace(/\/$/, "")
      : configured || "http://127.0.0.1:3000";
  const path = "/sharekhan/callback";

  const toLoopback = (value: string) => {
    try {
      const parsed = new URL(value);
      if (parsed.hostname === "localhost") {
        parsed.hostname = "127.0.0.1";
        return parsed.origin;
      }
      return parsed.origin;
    } catch {
      return value.replace("://localhost", "://127.0.0.1");
    }
  };

  const primaryBase = toLoopback(configured || origin);
  const primary = `${primaryBase}${path}`;
  let local = `http://127.0.0.1:3000${path}`;
  try {
    const parsed = new URL(primaryBase);
    if (parsed.hostname === "127.0.0.1") {
      local = `http://127.0.0.1:${parsed.port || "3000"}${path}`;
    }
  } catch {
    // keep default local
  }
  return { primary, local };
}

function pickExchangeForSegment(exchange: string, segment: string) {
  const options = getExchangeOptions(segment);
  if (options.includes(exchange)) return exchange;
  return segment === "EQ" ? DEFAULT_EQ_EXCHANGE : DEFAULT_DERIVATIVE_EXCHANGE;
}

function buildInstrumentSearchParams(query: string, exchange: string, segment: string) {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: "15",
  });

  if (segment === "EQ") {
    params.set("instrumentType", "EQ");
    if (exchange) params.set("exchange", exchange);
  } else if (exchange === "MCX") {
    params.set("exchange", "MCX");
  } else {
    // Fixed-stock underlyings are usually cash symbols (NSE/BSE).
    params.set("instrumentType", "EQ");
    params.set("exchange", "NSE");
  }

  return params;
}

function formatInstrumentSuggestion(hit: InstrumentHit) {
  const parts = [hit.symbol];
  if (hit.exchange) parts.push(hit.exchange);
  if (hit.instrumentType) parts.push(hit.instrumentType);
  return parts.join(" · ");
}

function toExpiryDateInputValue(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  const exactMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (exactMatch) return raw;
  const marketMayaMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
  if (!marketMayaMatch) return "";
  return `${marketMayaMatch[3]}-${marketMayaMatch[2]}-${marketMayaMatch[1]}`;
}

function isPrivateWebhookHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return false;
  if (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".local")
  ) {
    return true;
  }
  if (normalized.startsWith("10.") || normalized.startsWith("192.168.")) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) {
    return true;
  }
  return false;
}

function getWebhookReachabilityWarning(url: string) {
  try {
    const parsed = new URL(url);
    if (!isPrivateWebhookHost(parsed.hostname)) return "";
    return `Webhook base is ${parsed.origin}. Chartink and TradingView cannot reach localhost/private network URLs. Use a public domain or tunnel before expecting Telegram alerts.`;
  } catch {
    return "";
  }
}

function toMarketMayaExpiryDate(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  const marketMayaMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
  if (marketMayaMatch) return raw;
  const inputMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!inputMatch) return "";
  return `${inputMatch[3]}-${inputMatch[2]}-${inputMatch[1]}`;
}

function resolveLimitPriceSource(value: unknown, limitPriceValue?: unknown): LimitPriceSource {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "trigger" || raw === "chartink" || raw === "payload") return "trigger";
  if (raw === "mstock" || raw === "mstockhigh" || raw === "mstockcandlehigh") {
    return "mstockHigh";
  }
  if (raw === "mstocklow" || raw === "mstockcandlelow") {
    return "mstockLow";
  }
  if (raw === "mstockopen" || raw === "mstockcandleopen") {
    return "mstockOpen";
  }
  if (raw === "mstockclose" || raw === "mstockcandleclose") {
    return "mstockClose";
  }
  if (raw === "fixed" || raw === "manual" || raw === "limit") return "fixed";
  return String(limitPriceValue || "").trim() ? "fixed" : "trigger";
}

function getLimitPriceSourceOptionValue(source: LimitPriceSource): LimitPriceSourceOption {
  if (
    source === "mstockHigh" ||
    source === "mstockLow" ||
    source === "mstockOpen" ||
    source === "mstockClose"
  ) {
    return "mstockCandle";
  }
  return source;
}

function getMStockPriceField(source: LimitPriceSource) {
  if (source === "mstockLow") return "low";
  if (source === "mstockOpen") return "open";
  if (source === "mstockClose") return "close";
  return "high";
}

function getLimitPriceSourceFromMStockField(field: string): LimitPriceSource {
  if (field === "low") return "mstockLow";
  if (field === "open") return "mstockOpen";
  if (field === "close") return "mstockClose";
  return "mstockHigh";
}

function parseTestPayloadObject(payloadText: string) {
  try {
    const parsed = JSON.parse(payloadText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightJsonPayload(source: string) {
  const escaped = escapeHtml(source);
  return (
    escaped.replace(
      /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}\[\],]/g,
      (match, stringLiteral?: string, keyColon?: string, boolLiteral?: string) => {
        if (stringLiteral) {
          if (keyColon) {
            return `<span class="json-key">${stringLiteral}</span>${keyColon}`;
          }
          return `<span class="json-string">${stringLiteral}</span>`;
        }
        if (boolLiteral) {
          return `<span class="json-bool">${boolLiteral}</span>`;
        }
        if (/^-?\d/.test(match)) {
          return `<span class="json-number">${match}</span>`;
        }
        return `<span class="json-punct">${match}</span>`;
      }
    ) + "\n"
  );
}

function normalizeWebhookStocks(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => String(item || "").trim().toUpperCase())
          .filter(Boolean)
      )
    );
  }

  return Array.from(
    new Set(
      String(value || "")
        .split(",")
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
    )
  );
}

function normalizeStoredSymbolMode(value: unknown, fallback = "stocksFirst") {
  const compact = String(value || "").trim().replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!compact) return fallback;
  if (compact === "stocksfirst" || compact === "firststock" || compact === "firststocks") {
    return "stocksFirst";
  }
  if (compact === "stocksall" || compact === "allstocks") {
    return "stocksAll";
  }
  if (
    compact === "payloadsymbol" ||
    compact === "payloadsymbols" ||
    compact === "symbolfield" ||
    compact === "customsymbol"
  ) {
    return "payloadSymbol";
  }
  if (
    compact === "manuallist" ||
    compact === "manualstocks" ||
    compact === "manualstocklist" ||
    compact === "fixedstocks" ||
    compact === "fixedstockslist" ||
    compact === "stocklist" ||
    compact === "whitelist"
  ) {
    return "manualList";
  }
  return fallback;
}

function getStoredManualSymbols(config: Strategy["marketMaya"]) {
  return normalizeWebhookStocks(
    config?.symbols ??
      config?.stockList ??
      config?.stock_list ??
      config?.fixedStocks ??
      config?.fixed_stocks ??
      ""
  );
}

function applyStocksToTestPayload(
  payload: Record<string, unknown>,
  stocks: string[]
) {
  const next = { ...payload };
  const normalizedStocks = normalizeWebhookStocks(stocks);
  const stocksValue = normalizedStocks.join(",");
  next.stocks = stocksValue;
  if ("Stocks" in next) {
    delete next.Stocks;
  }

  if ("symbol" in next || "Symbol" in next) {
    const firstStock = normalizedStocks[0] || "";
    if ("symbol" in next) next.symbol = firstStock;
    if ("Symbol" in next) next.Symbol = firstStock;
  }

  return JSON.stringify(next, null, 2);
}

function renderVisibilityIcon(visible: boolean) {
  if (visible) {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M2.2 2.2 17.8 17.8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M8.1 8.1a2.7 2.7 0 0 0 3.8 3.8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M3.5 10s2.4-4.5 6.5-4.5S16.5 10 16.5 10a11.8 11.8 0 0 1-2.6 3.2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M1.9 10s2.6-5 8.1-5 8.1 5 8.1 5-2.6 5-8.1 5-8.1-5-8.1-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

type StrategyUiIcon =
  | "spark"
  | "key"
  | "tag"
  | "layers"
  | "clock"
  | "shield"
  | "bell"
  | "broadcast"
  | "broker"
  | "target"
  | "stop"
  | "trail"
  | "mail"
  | "telegram"
  | "info"
  | "close"
  | "limit"
  | "copy"
  | "play"
  | "edit"
  | "power"
  | "trash";

type StrategySectionTone = "teal" | "orange" | "slate" | "amber" | "risk" | "alert" | "broker";
type StrategySwitchTone = "maya" | "broker" | "risk" | "target" | "alert" | "limit";

function renderStrategyUiIcon(name: StrategyUiIcon) {
  switch (name) {
    case "spark":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2.5 11.4 7.4 16.5 8.8 11.4 10.2 10 15.5 8.6 10.2 3.5 8.8 8.6 7.4 10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "key":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="7.2" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.2 10h6.3v2.2h-2.1V14H12v-1.8h-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "tag":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3.5 10.8V4.8A1.3 1.3 0 0 1 4.8 3.5h6l5.7 5.7a1.3 1.3 0 0 1 0 1.8l-4.5 4.5a1.3 1.3 0 0 1-1.8 0L3.5 10.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="7.2" cy="7.2" r="1.1" fill="currentColor" />
        </svg>
      );
    case "layers":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 3.2 16.5 7 10 10.8 3.5 7 10 3.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M3.5 10.2 10 14l6.5-3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.5 13.2 10 17l6.5-3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 6.5V10l2.8 1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2.8 15.5 5v4.2c0 3.5-2.3 5.9-5.5 7-3.2-1.1-5.5-3.5-5.5-7V5L10 2.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M7.8 10.1 9.3 11.6 12.4 8.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5.2 13.5h9.6l-1.1-1.4V8.8a3.7 3.7 0 1 0-7.4 0v3.3L5.2 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8.4 15.2a1.7 1.7 0 0 0 3.2 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "broadcast":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="1.6" fill="currentColor" />
          <path d="M6.6 6.6a4.8 4.8 0 0 0 0 6.8M13.4 6.6a4.8 4.8 0 0 1 0 6.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4.4 4.4a7.9 7.9 0 0 0 0 11.2M15.6 4.4a7.9 7.9 0 0 1 0 11.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "broker":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3.5 15.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M5 15.5V8.2L10 4.8l5 3.4v7.3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 15.5V11h4v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "target":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="1" fill="currentColor" />
        </svg>
      );
    case "stop":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 3.2 16.8 16.5H3.2L10 3.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M10 8.2v3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="13.6" r="0.8" fill="currentColor" />
        </svg>
      );
    case "trail":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3.5 13.5c2.2-4 4.3-6 6.5-6s4.3 2 6.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M13.2 8.8 16.5 7.5 15.2 10.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "mail":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3.2" y="5" width="13.6" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.8 6.2 10 10.4l6.2-4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "telegram":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3.4 9.6 16.4 4.4l-2.2 11.2-4.1-2.4-2.1 2.1-.1-3.6 7-5.1-8.7 4.4-2.8-1.4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
    case "info":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 9v4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="6.8" r="0.9" fill="currentColor" />
        </svg>
      );
    case "close":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5.5 5.5 14.5 14.5M14.5 5.5 5.5 14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "limit":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 15.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6.2 15.5V8.5M10 15.5V5.2M13.8 15.5v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "copy":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="7" y="7" width="9" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 13V4.8A1.8 1.8 0 0 1 6.8 3H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "play":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M7.2 5.2 14.5 10 7.2 14.8V5.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "edit":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 13.8V16h2.2L14.8 7.4 12.6 5.2 4 13.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M11.4 6.4 13.6 8.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "power":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 3.5v6.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6.2 5.8a5.8 5.8 0 1 0 7.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "trash":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4.5 6h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 3.8h4M7 6l.6 9.2h4.8L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

export default function StrategyPage() {
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [marketMayaEnabled, setMarketMayaEnabled] = useState(false);
  const [marketMayaToken, setMarketMayaToken] = useState("");
  const [showMarketMayaToken, setShowMarketMayaToken] = useState(false);
  const [sharekhanDirect, setSharekhanDirect] = useState(false);
  const [sharekhanProductType, setSharekhanProductType] = useState("");
  const [sharekhanApiKey, setSharekhanApiKey] = useState("");
  const [sharekhanAccessToken, setSharekhanAccessToken] = useState("");
  const [sharekhanSecureKey, setSharekhanSecureKey] = useState("");
  const [sharekhanCustomerId, setSharekhanCustomerId] = useState("");
  const [sharekhanChannelUser, setSharekhanChannelUser] = useState("");
  const [showSharekhanApiKey, setShowSharekhanApiKey] = useState(false);
  const [showSharekhanAccessToken, setShowSharekhanAccessToken] = useState(false);
  const [showSharekhanSecureKey, setShowSharekhanSecureKey] = useState(false);
  const [sharekhanRedirectUrls, setSharekhanRedirectUrls] = useState(() => ({
    primary: "http://127.0.0.1:3000/sharekhan/callback",
    local: "http://127.0.0.1:3000/sharekhan/callback",
  }));
  const [exchange, setExchange] = useState(DEFAULT_EQ_EXCHANGE);
  const [segment, setSegment] = useState(DEFAULT_SEGMENT);
  const [expiryMode, setExpiryMode] = useState<"contract" | "date">("contract");
  const [contract, setContract] = useState(DEFAULT_CONTRACT);
  const [expiry, setExpiry] = useState(DEFAULT_EXPIRY);
  const [expiryDate, setExpiryDate] = useState("");
  const [optionType, setOptionType] = useState(DEFAULT_OPTION_TYPE);
  const [strikeMode, setStrikeMode] = useState<"atm" | "strike">("atm");
  const [atm, setAtm] = useState(DEFAULT_ATM);
  const [strikePrice, setStrikePrice] = useState("");
  const [symbolMode, setSymbolMode] = useState("stocksFirst");
  const [symbolKey, setSymbolKey] = useState("symbol");
  const [maxSymbols, setMaxSymbols] = useState("");
  const [manualSymbols, setManualSymbols] = useState<string[]>([]);
  const [manualSymbolInput, setManualSymbolInput] = useState("");
  const [manualSymbolSuggestions, setManualSymbolSuggestions] = useState<InstrumentHit[]>([]);
  const [manualSymbolSearching, setManualSymbolSearching] = useState(false);
  const [showManualSymbolSuggestions, setShowManualSymbolSuggestions] = useState(false);
  const [callTypeFallback, setCallTypeFallback] = useState("");
  const [orderType, setOrderType] = useState("MARKET");
  const [limitPriceSource, setLimitPriceSource] =
    useState<LimitPriceSource>(DEFAULT_LIMIT_PRICE_SOURCE);
  const [limitPrice, setLimitPrice] = useState("");
  const [mStockApiType, setMStockApiType] = useState(DEFAULT_MSTOCK_API_TYPE);
  const [mStockApiKey, setMStockApiKey] = useState("");
  const [showMStockApiKey, setShowMStockApiKey] = useState(false);
  const [mStockAuthToken, setMStockAuthToken] = useState("");
  const [showMStockAuthToken, setShowMStockAuthToken] = useState(false);
  const [mStockExchange, setMStockExchange] = useState(DEFAULT_EQ_EXCHANGE);
  const [mStockInstrumentToken, setMStockInstrumentToken] = useState("");
  const [mStockInterval, setMStockInterval] = useState(DEFAULT_MSTOCK_INTERVAL);
  const [mStockCandleOffset, setMStockCandleOffset] = useState(DEFAULT_MSTOCK_CANDLE_OFFSET);
  const [bufferBy, setBufferBy] = useState("");
  const [bufferPoints, setBufferPoints] = useState("");
  const [capitalAmount, setCapitalAmount] = useState("");
  const [qtyDistribution, setQtyDistribution] = useState("");
  const [qtyValue, setQtyValue] = useState("");
  const [useTarget, setUseTarget] = useState(false);
  const [targetBy, setTargetBy] = useState("");
  const [target, setTarget] = useState("");
  const [useStopLoss, setUseStopLoss] = useState(false);
  const [slBy, setSlBy] = useState("");
  const [sl, setSl] = useState("");
  const [trailSl, setTrailSl] = useState(false);
  const [slMove, setSlMove] = useState("");
  const [profitMove, setProfitMove] = useState("");
  const [dailyTradeLimit, setDailyTradeLimit] = useState("");
  const [useDailyTradeLimit, setUseDailyTradeLimit] = useState(false);
  const [tradeWindowStart, setTradeWindowStart] = useState(DEFAULT_TRADE_WINDOW_START);
  const [tradeWindowEnd, setTradeWindowEnd] = useState(DEFAULT_TRADE_WINDOW_END);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentWebhookUrl, setRecentWebhookUrl] = useState<string | null>(null);
  const [recentStrategyName, setRecentStrategyName] = useState<string | null>(null);
  const [showWebhookTestModal, setShowWebhookTestModal] = useState(false);
  const [testWebhookUrl, setTestWebhookUrl] = useState("");
  const [testPayload, setTestPayload] = useState(DEFAULT_WEBHOOK_TEST_PAYLOAD);
  const [testStockInput, setTestStockInput] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [telegramToken, setTelegramToken] = useState<TelegramToken | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Strategy | null>(null);
  const [editName, setEditName] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);
  const [editMarketMayaEnabled, setEditMarketMayaEnabled] = useState(false);
  const [editMarketMayaToken, setEditMarketMayaToken] = useState("");
  const [showEditMarketMayaToken, setShowEditMarketMayaToken] = useState(false);
  const [editSharekhanDirect, setEditSharekhanDirect] = useState(false);
  const [editSharekhanProductType, setEditSharekhanProductType] = useState("");
  const [editSharekhanApiKey, setEditSharekhanApiKey] = useState("");
  const [editSharekhanAccessToken, setEditSharekhanAccessToken] = useState("");
  const [editSharekhanSecureKey, setEditSharekhanSecureKey] = useState("");
  const [editSharekhanCustomerId, setEditSharekhanCustomerId] = useState("");
  const [editSharekhanChannelUser, setEditSharekhanChannelUser] = useState("");
  const [showEditSharekhanApiKey, setShowEditSharekhanApiKey] = useState(false);
  const [showEditSharekhanAccessToken, setShowEditSharekhanAccessToken] = useState(false);
  const [showEditSharekhanSecureKey, setShowEditSharekhanSecureKey] = useState(false);
  const [editExchange, setEditExchange] = useState(DEFAULT_EQ_EXCHANGE);
  const [editSegment, setEditSegment] = useState(DEFAULT_SEGMENT);
  const [editExpiryMode, setEditExpiryMode] = useState<"contract" | "date">("contract");
  const [editContract, setEditContract] = useState(DEFAULT_CONTRACT);
  const [editExpiry, setEditExpiry] = useState(DEFAULT_EXPIRY);
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editOptionType, setEditOptionType] = useState(DEFAULT_OPTION_TYPE);
  const [editStrikeMode, setEditStrikeMode] = useState<"atm" | "strike">("atm");
  const [editAtm, setEditAtm] = useState(DEFAULT_ATM);
  const [editStrikePrice, setEditStrikePrice] = useState("");
  const [editSymbolMode, setEditSymbolMode] = useState("stocksFirst");
  const [editSymbolKey, setEditSymbolKey] = useState("symbol");
  const [editMaxSymbols, setEditMaxSymbols] = useState("");
  const [editManualSymbols, setEditManualSymbols] = useState<string[]>([]);
  const [editManualSymbolInput, setEditManualSymbolInput] = useState("");
  const [editManualSymbolSuggestions, setEditManualSymbolSuggestions] = useState<InstrumentHit[]>([]);
  const [editManualSymbolSearching, setEditManualSymbolSearching] = useState(false);
  const [showEditManualSymbolSuggestions, setShowEditManualSymbolSuggestions] = useState(false);
  const [editCallTypeFallback, setEditCallTypeFallback] = useState("");
  const [editOrderType, setEditOrderType] = useState("MARKET");
  const [editLimitPriceSource, setEditLimitPriceSource] =
    useState<LimitPriceSource>(DEFAULT_LIMIT_PRICE_SOURCE);
  const [editLimitPrice, setEditLimitPrice] = useState("");
  const [editMStockApiType, setEditMStockApiType] = useState(DEFAULT_MSTOCK_API_TYPE);
  const [editMStockApiKey, setEditMStockApiKey] = useState("");
  const [showEditMStockApiKey, setShowEditMStockApiKey] = useState(false);
  const [editMStockAuthToken, setEditMStockAuthToken] = useState("");
  const [showEditMStockAuthToken, setShowEditMStockAuthToken] = useState(false);
  const [editMStockExchange, setEditMStockExchange] = useState(DEFAULT_EQ_EXCHANGE);
  const [editMStockInstrumentToken, setEditMStockInstrumentToken] = useState("");
  const [editMStockInterval, setEditMStockInterval] = useState(DEFAULT_MSTOCK_INTERVAL);
  const [editMStockCandleOffset, setEditMStockCandleOffset] =
    useState(DEFAULT_MSTOCK_CANDLE_OFFSET);
  const [editBufferBy, setEditBufferBy] = useState("");
  const [editBufferPoints, setEditBufferPoints] = useState("");
  const [editCapitalAmount, setEditCapitalAmount] = useState("");
  const [editQtyDistribution, setEditQtyDistribution] = useState("");
  const [editQtyValue, setEditQtyValue] = useState("");
  const [editUseTarget, setEditUseTarget] = useState(false);
  const [editTargetBy, setEditTargetBy] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editUseStopLoss, setEditUseStopLoss] = useState(false);
  const [editSlBy, setEditSlBy] = useState("");
  const [editSl, setEditSl] = useState("");
  const [editTrailSl, setEditTrailSl] = useState(false);
  const [editSlMove, setEditSlMove] = useState("");
  const [editProfitMove, setEditProfitMove] = useState("");
  const [editDailyTradeLimit, setEditDailyTradeLimit] = useState("");
  const [editUseDailyTradeLimit, setEditUseDailyTradeLimit] = useState(false);
  const [editTradeWindowStart, setEditTradeWindowStart] = useState(DEFAULT_TRADE_WINDOW_START);
  const [editTradeWindowEnd, setEditTradeWindowEnd] = useState(DEFAULT_TRADE_WINDOW_END);
  const [editEmailEnabled, setEditEmailEnabled] = useState(true);
  const [editTelegramEnabled, setEditTelegramEnabled] = useState(false);
  const [showAddInfoButtons, setShowAddInfoButtons] = useState(false);
  const [showEditInfoButtons, setShowEditInfoButtons] = useState(false);
  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);

  const webhookBaseUrl = useMemo(() => {
    const base =
      process.env.NEXT_PUBLIC_WEBHOOK_URL || API_BASE_URL;
    return `${base}/api/v1/webhooks`;
  }, []);
  const webhookReachabilityWarning = useMemo(
    () => getWebhookReachabilityWarning(webhookBaseUrl),
    [webhookBaseUrl]
  );

  const testPayloadObject = useMemo(() => parseTestPayloadObject(testPayload), [testPayload]);

  const testPayloadStocks = useMemo(
    () => normalizeWebhookStocks(testPayloadObject?.stocks ?? testPayloadObject?.Stocks),
    [testPayloadObject]
  );

  const resolveWebhookBase = useCallback(
    (provider: WebhookProvider = "chartink") => `${webhookBaseUrl}/${provider}`,
    [webhookBaseUrl]
  );

  const normalizeId = useCallback((value: unknown) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "object") {
      const anyValue = value as { $oid?: string; toString?: () => string };
      if (typeof anyValue.$oid === "string") return anyValue.$oid;
      if (typeof anyValue.toString === "function") return anyValue.toString();
    }
    return String(value);
  }, []);

  const isEmailAlertEnabled = useCallback(
    (item?: Pick<Strategy, "emailEnabled"> | null) => item?.emailEnabled !== false,
    []
  );

  const emailAlertTarget = profileEmail || "your registered email";
  const exitFallbackSelected = isExitTradeAction(callTypeFallback);
  const editExitFallbackSelected = isExitTradeAction(editCallTypeFallback);
  const usingFixedLimitPrice = false;
  const usingTriggerLimitPrice = false;
  const usingMStockLimitPrice = false;
  const usingDynamicLimitPrice = false;
  const derivativeSegmentSelected = isDerivativeSegment(segment);
  const optionSegmentSelected = segment === "OPT";
  const exchangeOptions = getExchangeOptions(segment);
  const expiryOptions = getExpiryOptions(segment);
  const editDerivativeSegmentSelected = isDerivativeSegment(editSegment);
  const editOptionSegmentSelected = editSegment === "OPT";
  const editUsingFixedLimitPrice = false;
  const editUsingTriggerLimitPrice = false;
  const editUsingMStockLimitPrice = false;
  const editUsingDynamicLimitPrice = false;
  const editExchangeOptions = getExchangeOptions(editSegment);
  const editExpiryOptions = getExpiryOptions(editSegment);
  const activeInfo = activeInfoKey ? INFO_CONTENT[activeInfoKey] || null : null;

  const flashMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 2000);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flashMessage("Copied.");
    } catch {
      flashMessage("Copy failed. Please copy manually.");
    }
  };

  const startSharekhanLogin = async (mode: "add" | "edit") => {
    const apiKey = (mode === "add" ? sharekhanApiKey : editSharekhanApiKey).trim();
    const secureKey = (mode === "add" ? sharekhanSecureKey : editSharekhanSecureKey).trim();
    const customerId = (mode === "add" ? sharekhanCustomerId : editSharekhanCustomerId).trim();
    const channelUser = (mode === "add" ? sharekhanChannelUser : editSharekhanChannelUser).trim();
    const productType = (mode === "add" ? sharekhanProductType : editSharekhanProductType).trim();
    if (!apiKey) {
      setError("Sharekhan API Key is required before login.");
      return;
    }
    if (!secureKey) {
      setError("Sharekhan Secure Key is required before login.");
      return;
    }
    saveSharekhanSavedCredentials({
      apiKey,
      secureKey,
      customerId,
      channelUser,
      productType,
      accessToken: mode === "add" ? sharekhanAccessToken.trim() : editSharekhanAccessToken.trim(),
    });

    const formDraft: SharekhanFormDraft =
      mode === "add"
        ? {
            name,
            enabled,
            marketMayaEnabled,
            marketMayaToken,
            sharekhanDirect: true,
            sharekhanProductType,
            sharekhanApiKey: apiKey,
            sharekhanSecureKey: secureKey,
            sharekhanCustomerId: customerId,
            sharekhanChannelUser: channelUser,
            sharekhanAccessToken,
            exchange,
            segment,
            expiryMode,
            contract,
            expiry,
            expiryDate,
            optionType,
            strikeMode,
            atm,
            strikePrice,
            symbolMode,
            symbolKey,
            maxSymbols,
            manualSymbols,
            callTypeFallback,
            orderType,
            limitPriceSource,
            limitPrice,
            mStockApiType,
            mStockApiKey,
            mStockAuthToken,
            mStockExchange,
            mStockInstrumentToken,
            mStockInterval,
            mStockCandleOffset,
            bufferBy,
            bufferPoints,
            capitalAmount,
            qtyDistribution,
            qtyValue,
            useTarget,
            targetBy,
            target,
            useStopLoss,
            slBy,
            sl,
            trailSl,
            slMove,
            profitMove,
            dailyTradeLimit,
            useDailyTradeLimit,
            tradeWindowStart,
            tradeWindowEnd,
            emailEnabled,
            telegramEnabled,
          }
        : {
            name: editName,
            enabled: editEnabled,
            marketMayaEnabled: editMarketMayaEnabled,
            marketMayaToken: editMarketMayaToken,
            sharekhanDirect: true,
            sharekhanProductType: editSharekhanProductType,
            sharekhanApiKey: apiKey,
            sharekhanSecureKey: secureKey,
            sharekhanCustomerId: customerId,
            sharekhanChannelUser: channelUser,
            sharekhanAccessToken: editSharekhanAccessToken,
            exchange: editExchange,
            segment: editSegment,
            expiryMode: editExpiryMode,
            contract: editContract,
            expiry: editExpiry,
            expiryDate: editExpiryDate,
            optionType: editOptionType,
            strikeMode: editStrikeMode,
            atm: editAtm,
            strikePrice: editStrikePrice,
            symbolMode: editSymbolMode,
            symbolKey: editSymbolKey,
            maxSymbols: editMaxSymbols,
            manualSymbols: editManualSymbols,
            callTypeFallback: editCallTypeFallback,
            orderType: editOrderType,
            limitPriceSource: editLimitPriceSource,
            limitPrice: editLimitPrice,
            mStockApiType: editMStockApiType,
            mStockApiKey: editMStockApiKey,
            mStockAuthToken: editMStockAuthToken,
            mStockExchange: editMStockExchange,
            mStockInstrumentToken: editMStockInstrumentToken,
            mStockInterval: editMStockInterval,
            mStockCandleOffset: editMStockCandleOffset,
            bufferBy: editBufferBy,
            bufferPoints: editBufferPoints,
            capitalAmount: editCapitalAmount,
            qtyDistribution: editQtyDistribution,
            qtyValue: editQtyValue,
            useTarget: editUseTarget,
            targetBy: editTargetBy,
            target: editTarget,
            useStopLoss: editUseStopLoss,
            slBy: editSlBy,
            sl: editSl,
            trailSl: editTrailSl,
            slMove: editSlMove,
            profitMove: editProfitMove,
            dailyTradeLimit: editDailyTradeLimit,
            useDailyTradeLimit: editUseDailyTradeLimit,
            tradeWindowStart: editTradeWindowStart,
            tradeWindowEnd: editTradeWindowEnd,
            emailEnabled: editEmailEnabled,
            telegramEnabled: editTelegramEnabled,
          };

    try {
      const token = getToken();
      await apiPost(
        "/api/v1/sharekhan/login-prep",
        {
          apiKey,
          secureKey,
          customerId,
          channelUser,
          productType,
          accessToken: mode === "add" ? sharekhanAccessToken.trim() : editSharekhanAccessToken.trim(),
          mode,
          strategyId: mode === "edit" ? editing?._id || "" : "",
          returnTo: "/strategy",
          formDraft,
        },
        token
      );

      // Keep a local backup too (same-origin cases).
      try {
        sessionStorage.setItem(
          SHAREKHAN_LOGIN_DRAFT_KEY,
          JSON.stringify({
            apiKey,
            secureKey,
            customerId,
            channelUser,
            mode,
            formDraft,
            returnTo: "/strategy",
          })
        );
      } catch {
        // ignore storage failures
      }

      const data = (await apiPost(
        "/api/v1/sharekhan/login-url",
        { apiKey, state: "12345" },
        token
      )) as { loginUrl?: string };
      const loginUrl = String(data.loginUrl || "").trim();
      if (!loginUrl) {
        throw new Error("Sharekhan login URL missing");
      }

      // Sharekhan redirect uses 127.0.0.1. Keep auth+flow on the same origin.
      if (typeof window !== "undefined" && window.location.hostname === "localhost") {
        const port = window.location.port || "3000";
        const bounce = new URL(`http://127.0.0.1:${port}/strategy`);
        bounce.searchParams.set("sk_continue", "1");
        bounce.searchParams.set("sk_mode", mode);
        if (token) bounce.searchParams.set("sk_auth", token);
        window.location.href = bounce.toString();
        return;
      }

      window.location.href = loginUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open Sharekhan login");
    }
  };

  const applySharekhanFormDraft = (mode: "add" | "edit", draft: SharekhanFormDraft, accessToken: string) => {
    const text = (key: string, fallback = "") => String(draft[key] ?? fallback);
    const bool = (key: string, fallback = false) => Boolean(draft[key] ?? fallback);
    const list = (key: string) =>
      Array.isArray(draft[key]) ? (draft[key] as string[]).map((item) => String(item)) : [];
    const resolvedAccessToken = accessToken || text("sharekhanAccessToken");
    saveSharekhanSavedCredentials({
      apiKey: text("sharekhanApiKey"),
      secureKey: text("sharekhanSecureKey"),
      customerId: text("sharekhanCustomerId"),
      channelUser: text("sharekhanChannelUser"),
      accessToken: resolvedAccessToken,
      productType: text("sharekhanProductType"),
      ...(resolvedAccessToken ? { connectedAt: Date.now() } : {}),
    });

    if (mode === "add") {
      setName(text("name"));
      setEnabled(bool("enabled", true));
      setMarketMayaEnabled(bool("marketMayaEnabled"));
      setMarketMayaToken(text("marketMayaToken"));
      setSharekhanDirect(true);
      setSharekhanProductType(text("sharekhanProductType"));
      setSharekhanApiKey(text("sharekhanApiKey"));
      setSharekhanSecureKey(text("sharekhanSecureKey"));
      setSharekhanCustomerId(text("sharekhanCustomerId"));
      setSharekhanChannelUser(text("sharekhanChannelUser"));
      setSharekhanAccessToken(resolvedAccessToken);
      setExchange(text("exchange", DEFAULT_EQ_EXCHANGE));
      setSegment(text("segment", DEFAULT_SEGMENT));
      setExpiryMode(text("expiryMode", "contract") === "date" ? "date" : "contract");
      setContract(text("contract", DEFAULT_CONTRACT));
      setExpiry(text("expiry", DEFAULT_EXPIRY));
      setExpiryDate(text("expiryDate"));
      setOptionType(text("optionType", DEFAULT_OPTION_TYPE));
      setStrikeMode(text("strikeMode", "atm") === "strike" ? "strike" : "atm");
      setAtm(text("atm", DEFAULT_ATM));
      setStrikePrice(text("strikePrice"));
      setSymbolMode(text("symbolMode", "stocksFirst"));
      setSymbolKey(text("symbolKey", "symbol"));
      setMaxSymbols(text("maxSymbols"));
      setManualSymbols(list("manualSymbols"));
      setCallTypeFallback(text("callTypeFallback"));
      setOrderType(text("orderType", "MARKET"));
      setLimitPriceSource((text("limitPriceSource", DEFAULT_LIMIT_PRICE_SOURCE) as LimitPriceSource) || DEFAULT_LIMIT_PRICE_SOURCE);
      setLimitPrice(text("limitPrice"));
      setMStockApiType(text("mStockApiType", DEFAULT_MSTOCK_API_TYPE));
      setMStockApiKey(text("mStockApiKey"));
      setMStockAuthToken(text("mStockAuthToken"));
      setMStockExchange(text("mStockExchange", DEFAULT_EQ_EXCHANGE));
      setMStockInstrumentToken(text("mStockInstrumentToken"));
      setMStockInterval(text("mStockInterval", DEFAULT_MSTOCK_INTERVAL));
      setMStockCandleOffset(text("mStockCandleOffset", DEFAULT_MSTOCK_CANDLE_OFFSET));
      setBufferBy(text("bufferBy"));
      setBufferPoints(text("bufferPoints"));
      setCapitalAmount(text("capitalAmount"));
      setQtyDistribution(text("qtyDistribution"));
      setQtyValue(text("qtyValue"));
      setUseTarget(bool("useTarget"));
      setTargetBy(text("targetBy"));
      setTarget(text("target"));
      setUseStopLoss(bool("useStopLoss"));
      setSlBy(text("slBy"));
      setSl(text("sl"));
      setTrailSl(bool("trailSl"));
      setSlMove(text("slMove"));
      setProfitMove(text("profitMove"));
      setDailyTradeLimit(text("dailyTradeLimit"));
      setUseDailyTradeLimit(bool("useDailyTradeLimit"));
      setTradeWindowStart(text("tradeWindowStart", DEFAULT_TRADE_WINDOW_START));
      setTradeWindowEnd(text("tradeWindowEnd", DEFAULT_TRADE_WINDOW_END));
      setEmailEnabled(bool("emailEnabled", true));
      setTelegramEnabled(bool("telegramEnabled"));
      setShowAddInfoButtons(false);
      setShowModal(true);
      return;
    }

    setEditSharekhanDirect(true);
    setEditSharekhanProductType(text("sharekhanProductType"));
    setEditSharekhanApiKey(text("sharekhanApiKey"));
    setEditSharekhanSecureKey(text("sharekhanSecureKey"));
    setEditSharekhanCustomerId(text("sharekhanCustomerId"));
    setEditSharekhanChannelUser(text("sharekhanChannelUser"));
    setEditSharekhanAccessToken(resolvedAccessToken);
    setEditName(text("name"));
    setEditEnabled(bool("enabled", true));
    setEditMarketMayaEnabled(bool("marketMayaEnabled"));
    setEditMarketMayaToken(text("marketMayaToken"));
    setEditExchange(text("exchange", DEFAULT_EQ_EXCHANGE));
    setEditSegment(text("segment", DEFAULT_SEGMENT));
    setEditExpiryMode(text("expiryMode", "contract") === "date" ? "date" : "contract");
    setEditContract(text("contract", DEFAULT_CONTRACT));
    setEditExpiry(text("expiry", DEFAULT_EXPIRY));
    setEditExpiryDate(text("expiryDate"));
    setEditOptionType(text("optionType", DEFAULT_OPTION_TYPE));
    setEditStrikeMode(text("strikeMode", "atm") === "strike" ? "strike" : "atm");
    setEditAtm(text("atm", DEFAULT_ATM));
    setEditStrikePrice(text("strikePrice"));
    setEditSymbolMode(text("symbolMode", "stocksFirst"));
    setEditSymbolKey(text("symbolKey", "symbol"));
    setEditMaxSymbols(text("maxSymbols"));
    setEditManualSymbols(list("manualSymbols"));
    setEditCallTypeFallback(text("callTypeFallback"));
    setEditOrderType(text("orderType", "MARKET"));
    setEditLimitPriceSource((text("limitPriceSource", DEFAULT_LIMIT_PRICE_SOURCE) as LimitPriceSource) || DEFAULT_LIMIT_PRICE_SOURCE);
    setEditLimitPrice(text("limitPrice"));
    setEditMStockApiType(text("mStockApiType", DEFAULT_MSTOCK_API_TYPE));
    setEditMStockApiKey(text("mStockApiKey"));
    setEditMStockAuthToken(text("mStockAuthToken"));
    setEditMStockExchange(text("mStockExchange", DEFAULT_EQ_EXCHANGE));
    setEditMStockInstrumentToken(text("mStockInstrumentToken"));
    setEditMStockInterval(text("mStockInterval", DEFAULT_MSTOCK_INTERVAL));
    setEditMStockCandleOffset(text("mStockCandleOffset", DEFAULT_MSTOCK_CANDLE_OFFSET));
    setEditBufferBy(text("bufferBy"));
    setEditBufferPoints(text("bufferPoints"));
    setEditCapitalAmount(text("capitalAmount"));
    setEditQtyDistribution(text("qtyDistribution"));
    setEditQtyValue(text("qtyValue"));
    setEditUseTarget(bool("useTarget"));
    setEditTargetBy(text("targetBy"));
    setEditTarget(text("target"));
    setEditUseStopLoss(bool("useStopLoss"));
    setEditSlBy(text("slBy"));
    setEditSl(text("sl"));
    setEditTrailSl(bool("trailSl"));
    setEditSlMove(text("slMove"));
    setEditProfitMove(text("profitMove"));
    setEditDailyTradeLimit(text("dailyTradeLimit"));
    setEditUseDailyTradeLimit(bool("useDailyTradeLimit"));
    setEditTradeWindowStart(text("tradeWindowStart", DEFAULT_TRADE_WINDOW_START));
    setEditTradeWindowEnd(text("tradeWindowEnd", DEFAULT_TRADE_WINDOW_END));
    setEditEmailEnabled(bool("emailEnabled", true));
    setEditTelegramEnabled(bool("telegramEnabled"));
    setShowEditInfoButtons(false);
  };

  const handleSegmentChange = (nextSegment: string) => {
    setSegment(nextSegment);
    setExchange(pickExchangeForSegment(exchange, nextSegment));
    if (!isDerivativeSegment(nextSegment)) {
      setExpiryMode("contract");
      setContract(DEFAULT_CONTRACT);
      setExpiry(DEFAULT_EXPIRY);
      setExpiryDate("");
      setOptionType(DEFAULT_OPTION_TYPE);
      setStrikeMode("atm");
      setAtm(DEFAULT_ATM);
      setStrikePrice("");
      return;
    }
    if (nextSegment === "FUT") {
      setExpiry(DEFAULT_EXPIRY);
      setOptionType(DEFAULT_OPTION_TYPE);
      setStrikeMode("atm");
      setAtm(DEFAULT_ATM);
      setStrikePrice("");
    }
  };

  const applyInstrumentKind = (kind: string, isEdit = false) => {
    const preset = INSTRUMENT_KIND_OPTIONS.find((item) => item.value === kind);
    if (!preset) return;
    if (isEdit) {
      handleEditSegmentChange(preset.segment);
      setEditExchange(preset.exchange);
      if (preset.exchange === "MCX") {
        setEditTradeWindowEnd(DEFAULT_MCX_TRADE_WINDOW_END);
        setEditContract(DEFAULT_CONTRACT);
        setEditExpiry(DEFAULT_EXPIRY);
      }
      if (preset.segment === "OPT") {
        setEditOptionType(DEFAULT_OPTION_TYPE);
        setEditStrikeMode("atm");
        setEditAtm(DEFAULT_ATM);
      }
      return;
    }
    handleSegmentChange(preset.segment);
    setExchange(preset.exchange);
    if (preset.exchange === "MCX") {
      setTradeWindowEnd(DEFAULT_MCX_TRADE_WINDOW_END);
      setContract(DEFAULT_CONTRACT);
      setExpiry(DEFAULT_EXPIRY);
    }
    if (preset.segment === "OPT") {
      setOptionType(DEFAULT_OPTION_TYPE);
      setStrikeMode("atm");
      setAtm(DEFAULT_ATM);
    }
  };

  const currentInstrumentKind =
    exchange === "MCX"
      ? "commodity"
      : segment === "OPT"
        ? "options"
        : segment === "FUT"
          ? "futures"
          : "equity";
  const editInstrumentKind =
    editExchange === "MCX"
      ? "commodity"
      : editSegment === "OPT"
        ? "options"
        : editSegment === "FUT"
          ? "futures"
          : "equity";

  const handleEditSegmentChange = (nextSegment: string) => {
    setEditSegment(nextSegment);
    setEditExchange(pickExchangeForSegment(editExchange, nextSegment));
    if (!isDerivativeSegment(nextSegment)) {
      setEditExpiryMode("contract");
      setEditContract(DEFAULT_CONTRACT);
      setEditExpiry(DEFAULT_EXPIRY);
      setEditExpiryDate("");
      setEditOptionType(DEFAULT_OPTION_TYPE);
      setEditStrikeMode("atm");
      setEditAtm(DEFAULT_ATM);
      setEditStrikePrice("");
      return;
    }
    if (nextSegment === "FUT") {
      setEditExpiry(DEFAULT_EXPIRY);
      setEditOptionType(DEFAULT_OPTION_TYPE);
      setEditStrikeMode("atm");
      setEditAtm(DEFAULT_ATM);
      setEditStrikePrice("");
    }
  };

  const renderInfoButton = (
    infoKey: string,
    variant: InfoButtonVariant = "inline",
    visible = true
  ) => {
    if (!visible) return null;
    return (
      <button
        className={`info-button${variant === "chip" ? " info-button-chip" : ""}`}
        type="button"
        aria-label={`Explain ${INFO_CONTENT[infoKey]?.title || "setting"}`}
        onClick={() => setActiveInfoKey(infoKey)}
      >
        <span className="info-button-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M10 8.1V13.1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="10" cy="5.8" r="0.9" fill="currentColor" />
          </svg>
        </span>
        {variant === "chip" ? <span className="info-button-text">Info</span> : null}
      </button>
    );
  };

  const renderLabelWithInfo = (
    htmlFor: string,
    label: string,
    infoKey: string,
    showInfo = true,
    labelClassName?: string
  ) => (
    <div className="label-row">
      <label className={labelClassName ? `label ${labelClassName}` : "label"} htmlFor={htmlFor}>
        {label}
      </label>
      {renderInfoButton(infoKey, "inline", showInfo)}
    </div>
  );

  const renderTitleWithInfo = (
    title: string,
    infoKey: string,
    style?: React.CSSProperties,
    showInfo = true
  ) => (
    <div className="section-title-row" style={style}>
      <div className="section-title">{title}</div>
      {renderInfoButton(infoKey, "chip", showInfo)}
    </div>
  );

  const renderFormSectionHeader = ({
    title,
    icon,
    infoKey,
    showInfo = true,
  }: {
    title: string;
    description?: string;
    icon: StrategyUiIcon;
    tone: StrategySectionTone;
    infoKey?: string;
    showInfo?: boolean;
  }) => (
    <div className="form-section-header">
      <span className="section-icon" aria-hidden="true">
        {renderStrategyUiIcon(icon)}
      </span>
      <div className="form-section-heading-copy">
        {infoKey ? (
          renderTitleWithInfo(title, infoKey, undefined, showInfo)
        ) : (
          <div className="section-title">{title}</div>
        )}
      </div>
    </div>
  );

  const renderInfoToggle = (
    checked: boolean,
    onChange: (checked: boolean) => void
  ) => (
    <label className="info-toggle">
      <span className="info-toggle-text">Info buttons</span>
      <span className={`info-switch${checked ? " on" : ""}`}>
        <span className="info-switch-thumb" />
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-label="Show info buttons"
        checked={checked}
        onChange={(event) => {
          const next = event.target.checked;
          if (!next) setActiveInfoKey(null);
          onChange(next);
        }}
      />
    </label>
  );

  const renderFeatureSwitch = (
    id: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
    title: string,
    description?: string,
    titleClassName?: string,
    options?: {
      tone?: StrategySwitchTone;
      icon?: StrategyUiIcon;
    }
  ) => {
    const tone = options?.tone || "maya";
    const icon = options?.icon;
    return (
      <div className={`switch-row tone-${tone}${checked ? " is-on" : ""}`}>
        <div className="switch-row-main">
          {icon ? (
            <span className="switch-mini-icon" aria-hidden="true">
              {renderStrategyUiIcon(icon)}
            </span>
          ) : null}
          <div className="switch-row-copy">
            <span className={titleClassName ? `switch-row-title ${titleClassName}` : "switch-row-title"}>
              {title}
            </span>
          </div>
        </div>
        <label className="info-toggle" htmlFor={id}>
          <span className={`info-switch${checked ? " on" : ""}`}>
            <span className="info-switch-thumb" />
          </span>
          <input
            id={id}
            type="checkbox"
            role="switch"
            aria-label={title}
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
          />
        </label>
      </div>
    );
  };

  const renderAddLabelWithInfo = (
    htmlFor: string,
    label: string,
    infoKey: string,
    labelClassName?: string
  ) => renderLabelWithInfo(htmlFor, label, infoKey, showAddInfoButtons, labelClassName);

  const renderEditLabelWithInfo = (
    htmlFor: string,
    label: string,
    infoKey: string,
    labelClassName?: string
  ) => renderLabelWithInfo(htmlFor, label, infoKey, showEditInfoButtons, labelClassName);

  const renderAddTitleWithInfo = (title: string, infoKey: string, style?: React.CSSProperties) =>
    renderTitleWithInfo(title, infoKey, style, showAddInfoButtons);

  const renderEditTitleWithInfo = (title: string, infoKey: string, style?: React.CSSProperties) =>
    renderTitleWithInfo(title, infoKey, style, showEditInfoButtons);

  const swapWebhookProviderInUrl = useCallback(
    (url: string, provider: WebhookProvider) => {
      const trimmed = url.trim();
      if (!trimmed) return resolveWebhookBase(provider);
      return trimmed.replace(/\/api\/v1\/webhooks\/(chartink|tradingview)/i, `/api/v1/webhooks/${provider}`);
    },
    [resolveWebhookBase]
  );

  const resolveWebhookUrl = useCallback(
    (item?: Strategy | null, provider: WebhookProvider = "chartink") => {
      const base = resolveWebhookBase(provider);
      if (!item) return base;
      if (item.webhookPath) {
        const normalizedPath = String(item.webhookPath).replace(
          "/api/v1/webhooks/chartink",
          `/api/v1/webhooks/${provider}`
        );
        return `${base}${normalizedPath.replace(`/api/v1/webhooks/${provider}`, "")}`;
      }
      if (item.webhookKey) {
        return `${base}?key=${item.webhookKey}`;
      }
      return base;
    },
    [resolveWebhookBase]
  );

  const openAdd = () => {
    setShowAddInfoButtons(false);
    setShowMarketMayaToken(false);
    setShowMStockApiKey(false);
    setShowMStockAuthToken(false);
    setActiveInfoKey(null);
    setShowModal(true);
  };

  const closeAdd = () => {
    setActiveInfoKey(null);
    setShowAddInfoButtons(false);
    setShowMarketMayaToken(false);
    setShowMStockApiKey(false);
    setShowMStockAuthToken(false);
    setShowModal(false);
  };

  const loadStrategies = useCallback(async () => {
    try {
      const token = getToken();
      const data = await apiGet("/api/v1/strategies", token);
      const list = (data as { strategies?: Strategy[] }).strategies || [];
      const normalized = list.map((item) => ({
        ...item,
        _id: normalizeId(item._id),
      }));
      setStrategies(normalized);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      setError(msg);
    }
  }, [normalizeId]);

  const loadTokens = useCallback(async () => {
    try {
      const token = getToken();
      const data = await apiGet("/api/v1/telegram/token", token);
      const list = (data as { tokens?: TelegramToken[] }).tokens || [];
      if (list[0]) {
        setTelegramToken(list[0]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load tokens";
      setError(msg);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const token = getToken();
      const data = await apiGet("/api/v1/auth/me", token);
      const email = ((data as { user?: UserProfile }).user?.email || "").trim();
      setProfileEmail(email);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load profile";
      setError(msg);
    }
  }, []);

  useEffect(() => {
    loadStrategies();
    loadTokens();
    loadProfile();
  }, [loadProfile, loadStrategies, loadTokens]);

  useEffect(() => {
    setSharekhanRedirectUrls(getSharekhanRedirectUrls());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedSharekhanCredentials() {
      try {
        const token = getToken();
        if (!token) return;
        const data = (await apiGet("/api/v1/sharekhan/login-prep", token)) as {
          prep?: {
            apiKey?: string;
            secureKey?: string;
            customerId?: string;
            accessToken?: string;
            productType?: string;
            connected?: boolean;
          } | null;
        };
        if (cancelled || !data.prep) return;
        const saved = {
          apiKey: String(data.prep.apiKey || ""),
          secureKey: String(data.prep.secureKey || ""),
          customerId: String(data.prep.customerId || ""),
          channelUser: String((data.prep as { channelUser?: string }).channelUser || ""),
          accessToken: String(data.prep.accessToken || ""),
          productType: String(data.prep.productType || ""),
        };
        if (!saved.apiKey && !saved.secureKey && !saved.customerId && !saved.accessToken) return;
        saveSharekhanSavedCredentials({
          ...saved,
          ...(saved.accessToken ? { connectedAt: Date.now() } : {}),
        });
        if (!sharekhanDirect) setSharekhanDirect(true);
        if (!sharekhanApiKey.trim() && saved.apiKey) setSharekhanApiKey(saved.apiKey);
        if (!sharekhanSecureKey.trim() && saved.secureKey) setSharekhanSecureKey(saved.secureKey);
        if (!sharekhanCustomerId.trim() && saved.customerId) setSharekhanCustomerId(saved.customerId);
        if (!sharekhanChannelUser.trim() && saved.channelUser) setSharekhanChannelUser(saved.channelUser);
        if (!sharekhanAccessToken.trim() && saved.accessToken) setSharekhanAccessToken(saved.accessToken);
        if (!sharekhanProductType.trim() && saved.productType) setSharekhanProductType(saved.productType);
      } catch {
        // Saved Sharekhan credentials are optional.
      }
    }

    loadSavedSharekhanCredentials();
    return () => {
      cancelled = true;
    };
    // Run once; this only hydrates empty fields from the DB.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sharekhanDirect) return;
    const saved = readSharekhanSavedCredentials();
    if (!saved) return;
    if (!sharekhanApiKey.trim() && saved.apiKey) setSharekhanApiKey(saved.apiKey);
    if (!sharekhanSecureKey.trim() && saved.secureKey) setSharekhanSecureKey(saved.secureKey);
    if (!sharekhanCustomerId.trim() && saved.customerId) setSharekhanCustomerId(saved.customerId);
    if (!sharekhanChannelUser.trim() && saved.channelUser) setSharekhanChannelUser(saved.channelUser);
    if (!sharekhanAccessToken.trim() && saved.accessToken) setSharekhanAccessToken(saved.accessToken);
    if (!sharekhanProductType.trim() && saved.productType) setSharekhanProductType(saved.productType);
  }, [
    sharekhanDirect,
    sharekhanApiKey,
    sharekhanSecureKey,
    sharekhanCustomerId,
    sharekhanChannelUser,
    sharekhanAccessToken,
    sharekhanProductType,
  ]);

  useEffect(() => {
    if (!editSharekhanDirect) return;
    const saved = readSharekhanSavedCredentials();
    if (!saved) return;
    if (!editSharekhanApiKey.trim() && saved.apiKey) setEditSharekhanApiKey(saved.apiKey);
    if (!editSharekhanSecureKey.trim() && saved.secureKey) setEditSharekhanSecureKey(saved.secureKey);
    if (!editSharekhanCustomerId.trim() && saved.customerId) setEditSharekhanCustomerId(saved.customerId);
    if (!editSharekhanChannelUser.trim() && saved.channelUser) {
      setEditSharekhanChannelUser(saved.channelUser);
    }
    if (!editSharekhanAccessToken.trim() && saved.accessToken) setEditSharekhanAccessToken(saved.accessToken);
    if (!editSharekhanProductType.trim() && saved.productType) setEditSharekhanProductType(saved.productType);
  }, [
    editSharekhanDirect,
    editSharekhanApiKey,
    editSharekhanSecureKey,
    editSharekhanCustomerId,
    editSharekhanChannelUser,
    editSharekhanAccessToken,
    editSharekhanProductType,
  ]);

  useEffect(() => {
    if (!sharekhanDirect) return;
    if (
      !sharekhanApiKey.trim() &&
      !sharekhanSecureKey.trim() &&
      !sharekhanCustomerId.trim() &&
      !sharekhanChannelUser.trim() &&
      !sharekhanAccessToken.trim()
    ) {
      return;
    }
    saveSharekhanSavedCredentials({
      apiKey: sharekhanApiKey.trim(),
      secureKey: sharekhanSecureKey.trim(),
      customerId: sharekhanCustomerId.trim(),
      channelUser: sharekhanChannelUser.trim(),
      accessToken: sharekhanAccessToken.trim(),
      productType: sharekhanProductType.trim(),
      ...(sharekhanAccessToken.trim() ? { connectedAt: Date.now() } : {}),
    });
  }, [
    sharekhanDirect,
    sharekhanApiKey,
    sharekhanSecureKey,
    sharekhanCustomerId,
    sharekhanChannelUser,
    sharekhanAccessToken,
    sharekhanProductType,
  ]);

  useEffect(() => {
    if (!editSharekhanDirect) return;
    if (
      !editSharekhanApiKey.trim() &&
      !editSharekhanSecureKey.trim() &&
      !editSharekhanCustomerId.trim() &&
      !editSharekhanChannelUser.trim() &&
      !editSharekhanAccessToken.trim()
    ) {
      return;
    }
    saveSharekhanSavedCredentials({
      apiKey: editSharekhanApiKey.trim(),
      secureKey: editSharekhanSecureKey.trim(),
      customerId: editSharekhanCustomerId.trim(),
      channelUser: editSharekhanChannelUser.trim(),
      accessToken: editSharekhanAccessToken.trim(),
      productType: editSharekhanProductType.trim(),
      ...(editSharekhanAccessToken.trim() ? { connectedAt: Date.now() } : {}),
    });
  }, [
    editSharekhanDirect,
    editSharekhanApiKey,
    editSharekhanSecureKey,
    editSharekhanCustomerId,
    editSharekhanChannelUser,
    editSharekhanAccessToken,
    editSharekhanProductType,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const continueLogin = url.searchParams.get("sk_continue") === "1";
    if (!continueLogin) return;

    const handoffAuth = String(url.searchParams.get("sk_auth") || "").trim();
    if (handoffAuth) setToken(handoffAuth);

    url.searchParams.delete("sk_continue");
    url.searchParams.delete("sk_auth");
    url.searchParams.delete("sk_mode");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);

    let cancelled = false;
    (async () => {
      try {
        const token = handoffAuth || getToken();
        if (!token) {
          setError("Please sign in again, then connect Sharekhan.");
          return;
        }

        const prepData = (await apiGet("/api/v1/sharekhan/login-prep", token)) as {
          prep?: {
            apiKey?: string;
            secureKey?: string;
            customerId?: string;
            mode?: string;
            strategyId?: string;
            returnTo?: string;
            formDraft?: SharekhanFormDraft | null;
            hasSecureKey?: boolean;
            hasFormDraft?: boolean;
          } | null;
        };
        const apiKey = String(prepData.prep?.apiKey || "").trim();
        if (!apiKey) {
          setError("Sharekhan login session missing. Enter API Key and try again.");
          return;
        }

        // Mirror draft onto this origin (127.0.0.1) so callback can resend keys if needed.
        try {
          sessionStorage.setItem(
            SHAREKHAN_LOGIN_DRAFT_KEY,
            JSON.stringify({
              apiKey,
              secureKey: prepData.prep?.secureKey || "",
              customerId: prepData.prep?.customerId || "",
              mode: prepData.prep?.mode || "add",
              strategyId: prepData.prep?.strategyId || "",
              returnTo: prepData.prep?.returnTo || "/strategy",
              formDraft: prepData.prep?.formDraft || null,
            })
          );
        } catch {
          // ignore
        }

        const data = (await apiPost(
          "/api/v1/sharekhan/login-url",
          { apiKey, state: "12345" },
          token
        )) as { loginUrl?: string };
        const loginUrl = String(data.loginUrl || "").trim();
        if (!loginUrl || cancelled) return;
        window.location.href = loginUrl;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to continue Sharekhan login");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSharekhanLogin() {
      try {
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          if (url.searchParams.get("sk_continue") === "1") return;
        }
        const token = getToken();
        if (!token) return;
        const data = (await apiGet("/api/v1/sharekhan/login-result", token)) as {
          result?: {
            ok?: boolean;
            accessToken?: string;
            apiKey?: string;
            secureKey?: string;
            customerId?: string;
            channelUser?: string;
            mode?: string;
            strategyId?: string;
            formDraft?: SharekhanFormDraft | null;
            error?: string;
            connected?: boolean;
          } | null;
        };

        const result = data.result;
        if (cancelled || !result) return;

        const accessToken = String(result.accessToken || "").trim();
        const hasDraft = Boolean(result.formDraft && typeof result.formDraft === "object");
        if (!accessToken && !hasDraft && !result.apiKey) return;

        const mode = result.mode === "edit" ? "edit" : "add";
        const draft: SharekhanFormDraft = {
          ...(result.formDraft && typeof result.formDraft === "object" ? result.formDraft : {}),
          sharekhanApiKey: result.apiKey || "",
          sharekhanSecureKey: result.secureKey || "",
          sharekhanCustomerId: result.customerId || "",
          sharekhanChannelUser: result.channelUser || "",
          sharekhanDirect: true,
        };

        applySharekhanFormDraft(mode, draft, accessToken);

        if (mode === "edit") {
          const strategyId = String(result.strategyId || "").trim();
          if (strategyId) {
            const found = strategies.find((item) => item._id === strategyId);
            setEditing(
              found ||
                ({
                  _id: strategyId,
                  name: String(draft.name || "Strategy"),
                } as Strategy)
            );
          }
        }

        if (accessToken) {
          flashMessage("Sharekhan connected. Your form was restored.");
        } else {
          const errMsg =
            String(result.error || "").trim() ||
            (typeof window !== "undefined"
              ? new URL(window.location.href).searchParams.get("sk_msg") || ""
              : "") ||
            "Sharekhan login failed. Form restored — recheck Secure Key and try again.";
          setError(errMsg);
        }

        try {
          sessionStorage.removeItem(SHAREKHAN_LOGIN_DRAFT_KEY);
          sessionStorage.removeItem(SHAREKHAN_ACCESS_RESULT_KEY);
        } catch {
          // ignore
        }
        if (typeof window !== "undefined") {
          const nextUrl = new URL(window.location.href);
          let dirty = false;
          for (const key of ["sharekhan", "sk_msg"]) {
            if (nextUrl.searchParams.has(key)) {
              nextUrl.searchParams.delete(key);
              dirty = true;
            }
          }
          if (dirty) {
            window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}`);
          }
        }
      } catch {
        // ignore restore failures
      }
    }

    restoreSharekhanLogin();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    const query = manualSymbolInput.trim();
    if (symbolMode !== "manualList" || query.length < 2) {
      setManualSymbolSuggestions([]);
      setManualSymbolSearching(false);
      return;
    }

    const token = getToken();
    if (!token) return;

    let cancelled = false;
    setManualSymbolSearching(true);
    const timer = setTimeout(async () => {
      try {
        const params = buildInstrumentSearchParams(query, exchange, segment);
        const data = (await apiGet(
          `/api/v1/mstock/instruments/search?${params.toString()}`,
          token
        )) as { instruments?: InstrumentHit[] };
        if (cancelled) return;
        setManualSymbolSuggestions(Array.isArray(data?.instruments) ? data.instruments : []);
        setShowManualSymbolSuggestions(true);
      } catch {
        if (!cancelled) setManualSymbolSuggestions([]);
      } finally {
        if (!cancelled) setManualSymbolSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [manualSymbolInput, symbolMode, exchange, segment]);

  useEffect(() => {
    const query = editManualSymbolInput.trim();
    if (editSymbolMode !== "manualList" || query.length < 2) {
      setEditManualSymbolSuggestions([]);
      setEditManualSymbolSearching(false);
      return;
    }

    const token = getToken();
    if (!token) return;

    let cancelled = false;
    setEditManualSymbolSearching(true);
    const timer = setTimeout(async () => {
      try {
        const params = buildInstrumentSearchParams(query, editExchange, editSegment);
        const data = (await apiGet(
          `/api/v1/mstock/instruments/search?${params.toString()}`,
          token
        )) as { instruments?: InstrumentHit[] };
        if (cancelled) return;
        setEditManualSymbolSuggestions(Array.isArray(data?.instruments) ? data.instruments : []);
        setShowEditManualSymbolSuggestions(true);
      } catch {
        if (!cancelled) setEditManualSymbolSuggestions([]);
      } finally {
        if (!cancelled) setEditManualSymbolSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [editManualSymbolInput, editSymbolMode, editExchange, editSegment]);

  const openWebhookTester = (
    url: string,
    payloadText = DEFAULT_WEBHOOK_TEST_PAYLOAD
  ) => {
    setTestWebhookUrl(url);
    setTestPayload(payloadText);
    setTestStockInput("");
    setTestError(null);
    setTestResult(null);
    setShowWebhookTestModal(true);
  };

  const closeWebhookTester = () => {
    setShowWebhookTestModal(false);
    setTestLoading(false);
    setTestStockInput("");
  };

  const syncTestPayloadStocks = useCallback(
    (nextStocks: string[]) => {
      const parsed = parseTestPayloadObject(testPayload);
      if (!parsed) {
        setTestError("Fix JSON payload first, then manage multiple stocks.");
        return false;
      }

      setTestPayload(applyStocksToTestPayload(parsed, nextStocks));
      setTestError((current) =>
        current === "Fix JSON payload first, then manage multiple stocks." ? null : current
      );
      return true;
    },
    [testPayload]
  );

  const handleAddTestStock = useCallback(() => {
    const nextStock = testStockInput.trim().toUpperCase();
    if (!nextStock) return;
    const nextStocks = Array.from(new Set([...testPayloadStocks, nextStock]));
    if (syncTestPayloadStocks(nextStocks)) {
      setTestStockInput("");
    }
  }, [syncTestPayloadStocks, testPayloadStocks, testStockInput]);

  const handleRemoveTestStock = useCallback(
    (stock: string) => {
      syncTestPayloadStocks(testPayloadStocks.filter((item) => item !== stock));
    },
    [syncTestPayloadStocks, testPayloadStocks]
  );

  const handleAddManualSymbol = useCallback(() => {
    const nextSymbol = manualSymbolInput.trim().toUpperCase();
    if (!nextSymbol) return;
    setManualSymbols((current) => Array.from(new Set([...current, nextSymbol])));
    setManualSymbolInput("");
    setManualSymbolSuggestions([]);
    setShowManualSymbolSuggestions(false);
  }, [manualSymbolInput]);

  const handleSelectManualSymbol = useCallback((hit: InstrumentHit) => {
    const nextSymbol = String(hit.symbol || "").trim().toUpperCase();
    if (!nextSymbol) return;
    setManualSymbols((current) => Array.from(new Set([...current, nextSymbol])));
    setManualSymbolInput("");
    setManualSymbolSuggestions([]);
    setShowManualSymbolSuggestions(false);
  }, []);

  const handleRemoveManualSymbol = useCallback((stock: string) => {
    setManualSymbols((current) => current.filter((item) => item !== stock));
  }, []);

  const handleAddEditManualSymbol = useCallback(() => {
    const nextSymbol = editManualSymbolInput.trim().toUpperCase();
    if (!nextSymbol) return;
    setEditManualSymbols((current) => Array.from(new Set([...current, nextSymbol])));
    setEditManualSymbolInput("");
    setEditManualSymbolSuggestions([]);
    setShowEditManualSymbolSuggestions(false);
  }, [editManualSymbolInput]);

  const handleSelectEditManualSymbol = useCallback((hit: InstrumentHit) => {
    const nextSymbol = String(hit.symbol || "").trim().toUpperCase();
    if (!nextSymbol) return;
    setEditManualSymbols((current) => Array.from(new Set([...current, nextSymbol])));
    setEditManualSymbolInput("");
    setEditManualSymbolSuggestions([]);
    setShowEditManualSymbolSuggestions(false);
  }, []);

  const handleRemoveEditManualSymbol = useCallback((stock: string) => {
    setEditManualSymbols((current) => current.filter((item) => item !== stock));
  }, []);

  const handleWebhookTest = async () => {
    setTestError(null);
    setTestResult(null);

    if (!testWebhookUrl.trim()) {
      setTestError("Webhook URL is required.");
      return;
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(testPayload);
      if (!parsedPayload || typeof parsedPayload !== "object" || Array.isArray(parsedPayload)) {
        setTestError("Payload must be a JSON object.");
        return;
      }
    } catch {
      setTestError("Invalid JSON payload.");
      return;
    }

    setTestLoading(true);
    try {
      const response = await fetch(testWebhookUrl.trim(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedPayload),
      });

      const contentType = response.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await response.json().catch(() => ({}))
        : await response.text().catch(() => "");

      const payloadText =
        typeof body === "string" ? body : JSON.stringify(body, null, 2);
      setTestResult(
        `Status: ${response.status}\n\n${payloadText || "(empty response)"}`
      );

      if (!response.ok) {
        const fallback =
          typeof body === "object" && body && "error" in body
            ? String((body as { error?: unknown }).error || "")
            : "";
        setTestError(fallback || `Webhook test failed with status ${response.status}.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Webhook test failed";
      setTestError(msg);
    } finally {
      setTestLoading(false);
    }
  };

  const showModalError = Boolean(error) && (showModal || editing);
  const showPageError = Boolean(error) && !showModalError;
  const recentTradingViewWebhookUrl = recentWebhookUrl
    ? swapWebhookProviderInUrl(recentWebhookUrl, "tradingview")
    : null;

  const isRatioTarget = useTarget && targetBy === "Ratio";
  const activeSl = useStopLoss ? sl : "";
  const ratioComputed = isRatioTarget ? computeRatioTarget(activeSl, target) : null;
  const targetPlaceholder = isRatioTarget ? "e.g. 1:2" : "e.g. 50";

  const isEditRatioTarget = editUseTarget && editTargetBy === "Ratio";
  const activeEditSl = editUseStopLoss ? editSl : "";
  const editRatioComputed = isEditRatioTarget
    ? computeRatioTarget(activeEditSl, editTarget)
    : null;
  const editTargetPlaceholder = isEditRatioTarget ? "e.g. 1:2" : "e.g. 50";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (!exitFallbackSelected && useTarget && targetBy === "Ratio" && useStopLoss && !sl.trim()) {
        setError("Stop loss is required when Target by is Ratio.");
        return;
      }

      const trimmedQtyDistribution = qtyDistribution.trim();
      const trimmedQtyValue = qtyValue.trim();
      const trimmedCapitalAmount = capitalAmount.trim();
      const trimmedLimitPrice = limitPrice.trim();
      const trimmedBufferBy = bufferBy.trim();
      const trimmedBufferPoints = bufferPoints.trim();
      const trimmedMStockCandleOffset = mStockCandleOffset.trim();
      const trimmedDailyTradeLimit = dailyTradeLimit.trim();
      const normalizedExpiryDate = toMarketMayaExpiryDate(expiryDate);
      const trimmedAtm = atm.trim();
      const trimmedStrikePrice = strikePrice.trim();

      if (derivativeSegmentSelected && expiryMode === "date" && !normalizedExpiryDate) {
        setError("Select a valid expiry date for derivative segment.");
        return;
      }
      if (optionSegmentSelected && strikeMode === "atm" && !trimmedAtm) {
        setError("ATM offset is required for options when ATM mode is selected.");
        return;
      }
      if (optionSegmentSelected && strikeMode === "strike" && !trimmedStrikePrice) {
        setError("Strike price is required for options when exact strike mode is selected.");
        return;
      }
      if (optionSegmentSelected && trimmedAtm && !/^[-]?\d+(\.\d+)?$/.test(trimmedAtm)) {
        setError("ATM offset must be a valid number like 0, 100, or -100.");
        return;
      }
      if (optionSegmentSelected && trimmedStrikePrice) {
        const strikeNumeric = Number(trimmedStrikePrice);
        if (!Number.isFinite(strikeNumeric) || strikeNumeric <= 0) {
          setError("Strike price must be a positive number.");
          return;
        }
      }

      if (!exitFallbackSelected) {
        if (trimmedQtyDistribution && !trimmedQtyValue) {
          setError("Qty value is required when Qty distribution is selected.");
          return;
        }
        if (trimmedQtyValue && !trimmedQtyDistribution) {
          setError("Select Qty distribution when Qty value is provided.");
          return;
        }
        if (trimmedQtyDistribution === "Capital(%)" && !trimmedCapitalAmount) {
          setError("Capital amount is required for Capital(%) qty.");
          return;
        }
        if (usingFixedLimitPrice && !trimmedLimitPrice) {
          setError("Limit price is required when fixed limit price is selected.");
          return;
        }
        if (usingDynamicLimitPrice && trimmedBufferBy && !trimmedBufferPoints) {
          setError("Trade buffer value is required when buffer type is selected.");
          return;
        }
        if (usingDynamicLimitPrice && trimmedBufferPoints && !trimmedBufferBy) {
          setError("Select trade buffer type (Point/Percentage).");
          return;
        }
      }
      if (useDailyTradeLimit && !trimmedDailyTradeLimit) {
        setError("Daily trade limit is required when enabled.");
        return;
      }
      if (sharekhanDirect) {
        if (!sharekhanApiKey.trim() || !sharekhanAccessToken.trim() || !sharekhanCustomerId.trim() || !sharekhanChannelUser.trim()) {
          setError(
            "Sharekhan API Key, Access Token, Customer ID, and Login ID are required when Sharekhan direct is ON."
          );
          return;
        }
      }

      const qtyNumber = trimmedQtyValue ? Number(trimmedQtyValue) : NaN;
      if (
        !exitFallbackSelected &&
        trimmedQtyValue &&
        (!Number.isFinite(qtyNumber) || qtyNumber <= 0)
      ) {
        setError("Qty value must be a positive number.");
        return;
      }

      const capitalAmountNumber = trimmedCapitalAmount ? Number(trimmedCapitalAmount) : NaN;
      if (
        !exitFallbackSelected &&
        trimmedCapitalAmount &&
        (!Number.isFinite(capitalAmountNumber) || capitalAmountNumber <= 0)
      ) {
        setError("Capital amount must be a positive number.");
        return;
      }

      const bufferPointsNumber = trimmedBufferPoints ? Number(trimmedBufferPoints) : NaN;
      if (
        !exitFallbackSelected &&
        trimmedBufferPoints &&
        (!Number.isFinite(bufferPointsNumber) || bufferPointsNumber < 0)
      ) {
        setError("Buffer points must be zero or a positive number.");
        return;
      }

      const mStockCandleOffsetNumber = trimmedMStockCandleOffset
        ? Number(trimmedMStockCandleOffset)
        : NaN;
      if (
        usingMStockLimitPrice &&
        trimmedMStockCandleOffset &&
        (!Number.isFinite(mStockCandleOffsetNumber) || mStockCandleOffsetNumber <= 0)
      ) {
        setError("mStock candle offset must be a positive whole number.");
        return;
      }

      const dailyTradeLimitNumber = trimmedDailyTradeLimit ? Number(trimmedDailyTradeLimit) : NaN;
      if (
        useDailyTradeLimit &&
        (!Number.isFinite(dailyTradeLimitNumber) || dailyTradeLimitNumber <= 0)
      ) {
        setError("Daily trade limit must be a positive number.");
        return;
      }

      const normalizedManualSymbols =
        symbolMode === "manualList"
          ? normalizeWebhookStocks([...manualSymbols, manualSymbolInput])
          : [];
      if (symbolMode === "manualList" && normalizedManualSymbols.length === 0) {
        setError("Add at least one stock in Fixed stocks list.");
        return;
      }

      const token = getToken();
      const marketMaya: Record<string, unknown> = {
        marketMayaEnabled: Boolean(marketMayaEnabled),
        exchange,
        segment,
        symbolMode,
        ...(symbolMode === "manualList" && normalizedManualSymbols.length
          ? { symbols: normalizedManualSymbols }
          : {}),
        ...(derivativeSegmentSelected && expiryMode === "contract"
          ? { contract, expiry }
          : {}),
        ...(derivativeSegmentSelected && expiryMode === "date" && normalizedExpiryDate
          ? { expiryDate: normalizedExpiryDate }
          : {}),
        ...(optionSegmentSelected ? { optionType } : {}),
        ...(optionSegmentSelected && strikeMode === "atm" && trimmedAtm ? { atm: trimmedAtm } : {}),
        ...(optionSegmentSelected && strikeMode === "strike" && trimmedStrikePrice
          ? { strikePrice: trimmedStrikePrice }
          : {}),
        ...(symbolMode === "payloadSymbol" && symbolKey.trim()
          ? { symbolKey: symbolKey.trim() }
          : {}),
        ...(symbolMode !== "stocksFirst" && symbolMode !== "manualList" && maxSymbols.trim()
          ? { maxSymbols: maxSymbols.trim() }
          : {}),
        ...(callTypeFallback ? { callTypeFallback } : {}),
        ...(!exitFallbackSelected && trimmedCapitalAmount
          ? { capitalAmount: capitalAmountNumber }
          : {}),
        ...(!exitFallbackSelected && trimmedQtyDistribution
          ? { qtyDistribution: trimmedQtyDistribution }
          : {}),
        ...(!exitFallbackSelected && trimmedQtyValue ? { qtyValue: trimmedQtyValue } : {}),
        ...(!exitFallbackSelected && useTarget && targetBy.trim()
          ? { targetBy: targetBy.trim() }
          : {}),
        ...(!exitFallbackSelected && useTarget && target.trim() ? { target: target.trim() } : {}),
        ...(!exitFallbackSelected && useStopLoss && slBy.trim() ? { slBy: slBy.trim() } : {}),
        ...(!exitFallbackSelected && useStopLoss && sl.trim() ? { sl: sl.trim() } : {}),
        ...(!exitFallbackSelected && trailSl ? { trailSl: true } : {}),
        ...(!exitFallbackSelected && slMove.trim() ? { slMove: slMove.trim() } : {}),
        ...(!exitFallbackSelected && profitMove.trim()
          ? { profitMove: profitMove.trim() }
          : {}),
        ...(useDailyTradeLimit && trimmedDailyTradeLimit
          ? { dailyTradeLimit: Math.floor(dailyTradeLimitNumber) }
          : {}),
        ...(tradeWindowStart.trim()
          ? { tradeWindowStart: tradeWindowStart.trim() }
          : {}),
        ...(tradeWindowEnd.trim() ? { tradeWindowEnd: tradeWindowEnd.trim() } : {}),
        sharekhanDirect: Boolean(sharekhanDirect),
        ...(sharekhanDirect && sharekhanApiKey.trim()
          ? { sharekhanApiKey: sharekhanApiKey.trim() }
          : {}),
        ...(sharekhanDirect && sharekhanAccessToken.trim()
          ? { sharekhanAccessToken: sharekhanAccessToken.trim() }
          : {}),
        ...(sharekhanDirect && sharekhanSecureKey.trim()
          ? { sharekhanSecureKey: sharekhanSecureKey.trim() }
          : {}),
        ...(sharekhanDirect && sharekhanCustomerId.trim()
          ? { sharekhanCustomerId: sharekhanCustomerId.trim() }
          : {}),
        ...(sharekhanDirect && sharekhanChannelUser.trim()
          ? { sharekhanChannelUser: sharekhanChannelUser.trim() }
          : {}),
        ...(sharekhanDirect && sharekhanProductType.trim()
          ? { sharekhanProductType: sharekhanProductType.trim().toUpperCase() }
          : {}),
      };
      const payload: Record<string, unknown> = {
        name,
        webhookUrl: resolveWebhookBase("chartink"),
        enabled,
        emailEnabled,
        telegramEnabled,
        marketMaya,
      };
      if (marketMayaEnabled && marketMayaToken.trim()) {
        payload.marketMayaToken = marketMayaToken;
      }
      const data = await apiPost(
        "/api/v1/strategies",
        payload,
        token
      );
      const created = (data as { strategy?: Strategy }).strategy;
      if (created) {
        setRecentWebhookUrl(resolveWebhookUrl(created));
        setRecentStrategyName(created.name || name);
      } else {
        setRecentWebhookUrl(null);
        setRecentStrategyName(null);
      }
      setName("");
      setMarketMayaEnabled(false);
      setMarketMayaToken("");
      setSharekhanDirect(false);
      setSharekhanProductType("");
      setSharekhanApiKey("");
      setSharekhanAccessToken("");
      setSharekhanSecureKey("");
      setSharekhanCustomerId("");
      setSharekhanChannelUser("");
      setExchange(DEFAULT_EQ_EXCHANGE);
      setSegment(DEFAULT_SEGMENT);
      setExpiryMode("contract");
      setContract(DEFAULT_CONTRACT);
      setExpiry(DEFAULT_EXPIRY);
      setExpiryDate("");
      setOptionType(DEFAULT_OPTION_TYPE);
      setStrikeMode("atm");
      setAtm(DEFAULT_ATM);
      setStrikePrice("");
      setSymbolMode("stocksFirst");
      setSymbolKey("symbol");
      setMaxSymbols("");
      setManualSymbols([]);
      setManualSymbolInput("");
      setCallTypeFallback("");
      setOrderType("MARKET");
      setLimitPriceSource(DEFAULT_LIMIT_PRICE_SOURCE);
      setLimitPrice("");
      setMStockApiType(DEFAULT_MSTOCK_API_TYPE);
      setMStockApiKey("");
      setShowMStockApiKey(false);
      setMStockAuthToken("");
      setShowMStockAuthToken(false);
      setMStockExchange(DEFAULT_EQ_EXCHANGE);
      setMStockInstrumentToken("");
      setMStockInterval(DEFAULT_MSTOCK_INTERVAL);
      setMStockCandleOffset(DEFAULT_MSTOCK_CANDLE_OFFSET);
      setBufferBy("");
      setBufferPoints("");
      setCapitalAmount("");
      setQtyDistribution("");
      setQtyValue("");
      setUseTarget(false);
      setTargetBy("");
      setTarget("");
      setUseStopLoss(false);
      setSlBy("");
      setSl("");
      setTrailSl(false);
      setSlMove("");
      setProfitMove("");
      setDailyTradeLimit("");
      setUseDailyTradeLimit(false);
      setTradeWindowStart(DEFAULT_TRADE_WINDOW_START);
      setTradeWindowEnd(DEFAULT_TRADE_WINDOW_END);
      setEnabled(true);
      setMarketMayaEnabled(false);
      setEmailEnabled(true);
      setTelegramEnabled(false);
      setMessage("Strategy saved. Webhook URL is ready to copy.");
      closeAdd();
      await loadStrategies();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (item: Strategy) => {
    setError(null);
    setMessage(null);
    setShowEditInfoButtons(false);
    setActiveInfoKey(null);
    setEditing({ ...item, _id: normalizeId(item._id) });
    setEditName(item.name || "");
    setEditEnabled(Boolean(item.enabled));
    const mm = item.marketMaya || {};
    const hasMarketMayaToken = Boolean(mm.tokenConfigured || mm.token);
    setEditMarketMayaEnabled(
      mm.marketMayaEnabled !== undefined && mm.marketMayaEnabled !== null
        ? Boolean(mm.marketMayaEnabled)
        : hasMarketMayaToken
    );
    setShowEditMarketMayaToken(Boolean(mm.token));
    setEditMarketMayaToken(mm.token || "");
    setEditSharekhanDirect(Boolean(mm.sharekhanDirect));
    setEditSharekhanProductType(mm.sharekhanProductType || "");
    setEditSharekhanApiKey(mm.sharekhanApiKey || "");
    setEditSharekhanAccessToken(mm.sharekhanAccessToken || "");
    setEditSharekhanSecureKey(mm.sharekhanSecureKey || "");
    setEditSharekhanCustomerId(mm.sharekhanCustomerId || "");
    setEditSharekhanChannelUser(mm.sharekhanChannelUser || "");
    const nextEditSegment = mm.segment || DEFAULT_SEGMENT;
    setEditSegment(nextEditSegment);
    setEditExchange(pickExchangeForSegment(mm.exchange || "", nextEditSegment));
    setEditExpiryMode(mm.expiryDate ? "date" : "contract");
    setEditContract(mm.contract || DEFAULT_CONTRACT);
    setEditExpiry(nextEditSegment === "FUT" ? DEFAULT_EXPIRY : mm.expiry || DEFAULT_EXPIRY);
    setEditExpiryDate(toExpiryDateInputValue(mm.expiryDate || ""));
    setEditOptionType(mm.optionType || DEFAULT_OPTION_TYPE);
    setEditStrikeMode(mm.strikePrice ? "strike" : "atm");
    setEditAtm(mm.atm || DEFAULT_ATM);
    setEditStrikePrice(mm.strikePrice || "");
    const storedManualSymbols = getStoredManualSymbols(mm);
    setEditSymbolMode(
      normalizeStoredSymbolMode(
        mm.symbolMode ?? mm.symbol_mode ?? mm.symbolSource ?? mm.symbol_source,
        storedManualSymbols.length > 0 ? "manualList" : "stocksFirst"
      )
    );
    setEditSymbolKey(mm.symbolKey || "symbol");
    setEditMaxSymbols(mm.maxSymbols ? String(mm.maxSymbols) : "");
    setEditManualSymbols(storedManualSymbols);
    setEditManualSymbolInput("");
    setEditCallTypeFallback(mm.callTypeFallback || "");
    setEditOrderType(mm.orderType || "MARKET");
    setEditLimitPriceSource(resolveLimitPriceSource(mm.limitPriceSource, mm.limitPrice));
    setEditLimitPrice(mm.limitPrice || "");
    setShowEditMStockApiKey(false);
    setEditMStockApiType(mm.mStockApiType || DEFAULT_MSTOCK_API_TYPE);
    setEditMStockApiKey(mm.mStockApiKey || "");
    setShowEditMStockAuthToken(false);
    setEditMStockAuthToken(mm.mStockAuthToken || "");
    setEditMStockExchange(mm.mStockExchange || mm.exchange || DEFAULT_EQ_EXCHANGE);
    setEditMStockInstrumentToken(mm.mStockInstrumentToken || "");
    setEditMStockInterval(mm.mStockInterval || DEFAULT_MSTOCK_INTERVAL);
    setEditMStockCandleOffset(
      mm.mStockCandleOffset !== undefined && mm.mStockCandleOffset !== null
        ? String(mm.mStockCandleOffset)
        : DEFAULT_MSTOCK_CANDLE_OFFSET
    );
    setEditBufferBy(
      mm.bufferBy ||
        (mm.bufferValue !== undefined && mm.bufferValue !== null
          ? "Point"
          : mm.bufferPoints !== undefined && mm.bufferPoints !== null
            ? "Point"
            : "")
    );
    setEditBufferPoints(
      mm.bufferValue !== undefined && mm.bufferValue !== null
        ? String(mm.bufferValue)
        : mm.bufferPoints !== undefined && mm.bufferPoints !== null
          ? String(mm.bufferPoints)
          : ""
    );
    setEditCapitalAmount(
      mm.capitalAmount !== undefined && mm.capitalAmount !== null ? String(mm.capitalAmount) : ""
    );
    setEditQtyDistribution(mm.qtyDistribution || "");
    setEditQtyValue(mm.qtyValue || "");
    const editTargetByValue = mm.targetBy || "";
    const editTargetValue = mm.target || "";
    setEditUseTarget(Boolean(editTargetByValue || editTargetValue));
    setEditTargetBy(editTargetByValue);
    setEditTarget(editTargetValue);
    setEditUseStopLoss(Boolean(mm.slBy || mm.sl));
    setEditSlBy(mm.slBy || "");
    setEditSl(mm.sl || "");
    setEditTrailSl(Boolean(mm.trailSl));
    setEditSlMove(mm.slMove || "");
    setEditProfitMove(mm.profitMove || "");
    setEditDailyTradeLimit(
      mm.dailyTradeLimit !== undefined && mm.dailyTradeLimit !== null
        ? String(mm.dailyTradeLimit)
        : ""
    );
    setEditUseDailyTradeLimit(
      mm.dailyTradeLimit !== undefined &&
        mm.dailyTradeLimit !== null &&
        Number(mm.dailyTradeLimit) > 0
    );
    setEditTradeWindowStart(mm.tradeWindowStart || DEFAULT_TRADE_WINDOW_START);
    setEditTradeWindowEnd(mm.tradeWindowEnd || DEFAULT_TRADE_WINDOW_END);
    setEditEmailEnabled(isEmailAlertEnabled(item));
    setEditTelegramEnabled(Boolean(item.telegramEnabled));
  };

  const closeEdit = () => {
    setActiveInfoKey(null);
    setShowEditInfoButtons(false);
    setShowEditMarketMayaToken(false);
    setEditing(null);
    setEditName("");
    setEditEnabled(true);
    setEditMarketMayaEnabled(false);
    setEditMarketMayaToken("");
    setEditSharekhanDirect(false);
    setEditSharekhanProductType("");
    setEditSharekhanApiKey("");
    setEditSharekhanAccessToken("");
    setEditSharekhanSecureKey("");
    setEditSharekhanCustomerId("");
    setShowEditMStockApiKey(false);
    setShowEditMStockAuthToken(false);
    setEditExchange(DEFAULT_EQ_EXCHANGE);
    setEditSegment(DEFAULT_SEGMENT);
    setEditExpiryMode("contract");
    setEditContract(DEFAULT_CONTRACT);
    setEditExpiry(DEFAULT_EXPIRY);
    setEditExpiryDate("");
    setEditOptionType(DEFAULT_OPTION_TYPE);
    setEditStrikeMode("atm");
    setEditAtm(DEFAULT_ATM);
    setEditStrikePrice("");
    setEditSymbolMode("stocksFirst");
    setEditSymbolKey("symbol");
    setEditMaxSymbols("");
    setEditManualSymbols([]);
    setEditManualSymbolInput("");
    setEditCallTypeFallback("");
    setEditOrderType("MARKET");
    setEditLimitPriceSource(DEFAULT_LIMIT_PRICE_SOURCE);
    setEditLimitPrice("");
    setEditMStockApiType(DEFAULT_MSTOCK_API_TYPE);
    setEditMStockApiKey("");
    setEditMStockAuthToken("");
    setEditMStockExchange(DEFAULT_EQ_EXCHANGE);
    setEditMStockInstrumentToken("");
    setEditMStockInterval(DEFAULT_MSTOCK_INTERVAL);
    setEditMStockCandleOffset(DEFAULT_MSTOCK_CANDLE_OFFSET);
    setEditBufferBy("");
    setEditBufferPoints("");
    setEditCapitalAmount("");
    setEditQtyDistribution("");
    setEditQtyValue("");
    setEditUseTarget(false);
    setEditTargetBy("");
    setEditTarget("");
    setEditUseStopLoss(false);
    setEditSlBy("");
    setEditSl("");
    setEditTrailSl(false);
    setEditSlMove("");
    setEditProfitMove("");
    setEditDailyTradeLimit("");
    setEditUseDailyTradeLimit(false);
    setEditTradeWindowStart(DEFAULT_TRADE_WINDOW_START);
    setEditTradeWindowEnd(DEFAULT_TRADE_WINDOW_END);
    setEditEmailEnabled(true);
    setEditTelegramEnabled(false);
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const editingSnapshot = editing;
    if (!editingSnapshot) {
      setError("Strategy context missing. Please reopen edit dialog.");
      return;
    }

    setError(null);
    setMessage(null);
    setEditLoading(true);

    try {
      const strategyId = normalizeId(editingSnapshot._id);
      if (!strategyId) {
        setError("Strategy id missing");
        return;
      }
      if (
        !editExitFallbackSelected &&
        editUseTarget &&
        editTargetBy === "Ratio" &&
        editUseStopLoss &&
        !editSl.trim()
      ) {
        setError("Stop loss is required when Target by is Ratio.");
        return;
      }

      const trimmedQtyDistribution = editQtyDistribution.trim();
      const trimmedQtyValue = editQtyValue.trim();
      const trimmedCapitalAmount = editCapitalAmount.trim();
      const trimmedEditLimitPrice = editLimitPrice.trim();
      const trimmedBufferBy = editBufferBy.trim();
      const trimmedBufferPoints = editBufferPoints.trim();
      const trimmedEditMStockCandleOffset = editMStockCandleOffset.trim();
      const trimmedDailyTradeLimit = editDailyTradeLimit.trim();
      const normalizedEditExpiryDate = toMarketMayaExpiryDate(editExpiryDate);
      const trimmedEditAtm = editAtm.trim();
      const trimmedEditStrikePrice = editStrikePrice.trim();

      if (editDerivativeSegmentSelected && editExpiryMode === "date" && !normalizedEditExpiryDate) {
        setError("Select a valid expiry date for derivative segment.");
        return;
      }
      if (editOptionSegmentSelected && editStrikeMode === "atm" && !trimmedEditAtm) {
        setError("ATM offset is required for options when ATM mode is selected.");
        return;
      }
      if (editOptionSegmentSelected && editStrikeMode === "strike" && !trimmedEditStrikePrice) {
        setError("Strike price is required for options when exact strike mode is selected.");
        return;
      }
      if (editOptionSegmentSelected && trimmedEditAtm && !/^[-]?\d+(\.\d+)?$/.test(trimmedEditAtm)) {
        setError("ATM offset must be a valid number like 0, 100, or -100.");
        return;
      }
      if (editOptionSegmentSelected && trimmedEditStrikePrice) {
        const strikeNumeric = Number(trimmedEditStrikePrice);
        if (!Number.isFinite(strikeNumeric) || strikeNumeric <= 0) {
          setError("Strike price must be a positive number.");
          return;
        }
      }

      if (!editExitFallbackSelected) {
        if (trimmedQtyDistribution && !trimmedQtyValue) {
          setError("Qty value is required when Qty distribution is selected.");
          return;
        }
        if (trimmedQtyValue && !trimmedQtyDistribution) {
          setError("Select Qty distribution when Qty value is provided.");
          return;
        }
        if (trimmedQtyDistribution === "Capital(%)" && !trimmedCapitalAmount) {
          setError("Capital amount is required for Capital(%) qty.");
          return;
        }
        if (editUsingFixedLimitPrice && !trimmedEditLimitPrice) {
          setError("Limit price is required when fixed limit price is selected.");
          return;
        }
        if (editUsingDynamicLimitPrice && trimmedBufferBy && !trimmedBufferPoints) {
          setError("Trade buffer value is required when buffer type is selected.");
          return;
        }
        if (editUsingDynamicLimitPrice && trimmedBufferPoints && !trimmedBufferBy) {
          setError("Select trade buffer type (Point/Percentage).");
          return;
        }
      }

      const qtyNumber = trimmedQtyValue ? Number(trimmedQtyValue) : NaN;
      if (
        !editExitFallbackSelected &&
        trimmedQtyValue &&
        (!Number.isFinite(qtyNumber) || qtyNumber <= 0)
      ) {
        setError("Qty value must be a positive number.");
        return;
      }

      const capitalAmountNumber = trimmedCapitalAmount ? Number(trimmedCapitalAmount) : NaN;
      if (
        !editExitFallbackSelected &&
        trimmedCapitalAmount &&
        (!Number.isFinite(capitalAmountNumber) || capitalAmountNumber <= 0)
      ) {
        setError("Capital amount must be a positive number.");
        return;
      }

      const bufferPointsNumber = trimmedBufferPoints ? Number(trimmedBufferPoints) : NaN;
      if (
        !editExitFallbackSelected &&
        trimmedBufferPoints &&
        (!Number.isFinite(bufferPointsNumber) || bufferPointsNumber < 0)
      ) {
        setError("Buffer points must be zero or a positive number.");
        return;
      }

      const editMStockCandleOffsetNumber = trimmedEditMStockCandleOffset
        ? Number(trimmedEditMStockCandleOffset)
        : NaN;
      if (
        editUsingMStockLimitPrice &&
        trimmedEditMStockCandleOffset &&
        (!Number.isFinite(editMStockCandleOffsetNumber) || editMStockCandleOffsetNumber <= 0)
      ) {
        setError("mStock candle offset must be a positive whole number.");
        return;
      }

      const dailyTradeLimitNumber = trimmedDailyTradeLimit ? Number(trimmedDailyTradeLimit) : NaN;
      if (
        editUseDailyTradeLimit &&
        (!Number.isFinite(dailyTradeLimitNumber) || dailyTradeLimitNumber <= 0)
      ) {
        setError("Daily trade limit must be a positive number.");
        return;
      }
      if (editSharekhanDirect) {
        const hasApiKey = Boolean(editSharekhanApiKey.trim() || editing?.marketMaya?.sharekhanApiKey);
        const hasAccess = Boolean(
          editSharekhanAccessToken.trim() || editing?.marketMaya?.sharekhanAccessToken
        );
        const hasCustomer = Boolean(
          editSharekhanCustomerId.trim() || editing?.marketMaya?.sharekhanCustomerId
        );
        const hasChannelUser = Boolean(
          editSharekhanChannelUser.trim() || editing?.marketMaya?.sharekhanChannelUser
        );
        if (!hasApiKey || !hasAccess || !hasCustomer || !hasChannelUser) {
          setError(
            "Sharekhan API Key, Access Token, Customer ID, and Login ID are required when Sharekhan direct is ON."
          );
          return;
        }
      }

      const normalizedEditManualSymbols =
        editSymbolMode === "manualList"
          ? normalizeWebhookStocks([...editManualSymbols, editManualSymbolInput])
          : [];
      if (editSymbolMode === "manualList" && normalizedEditManualSymbols.length === 0) {
        setError("Add at least one stock in Fixed stocks list.");
        return;
      }

      const marketMayaClear = new Set<string>();
      if (editSymbolMode !== "payloadSymbol" || !editSymbolKey.trim()) {
        marketMayaClear.add("symbolKey");
      }
      if (editSymbolMode !== "manualList" || normalizedEditManualSymbols.length === 0) {
        marketMayaClear.add("symbols");
      }
      if (
        editSymbolMode === "stocksFirst" ||
        editSymbolMode === "manualList" ||
        !editMaxSymbols.trim()
      ) {
        marketMayaClear.add("maxSymbols");
      }
      if (true) {
        marketMayaClear.add("orderType");
        marketMayaClear.add("limitPriceSource");
        marketMayaClear.add("limitPrice");
        marketMayaClear.add("bufferBy");
        marketMayaClear.add("bufferValue");
        marketMayaClear.add("bufferPoints");
        marketMayaClear.add("mStockApiType");
        marketMayaClear.add("mStockApiKey");
        marketMayaClear.add("mStockAuthToken");
        marketMayaClear.add("mStockExchange");
        marketMayaClear.add("mStockInstrumentToken");
        marketMayaClear.add("mStockInterval");
        marketMayaClear.add("mStockCandleOffset");
      }
      if (editExitFallbackSelected || !trimmedQtyDistribution) {
        marketMayaClear.add("qtyDistribution");
        marketMayaClear.add("qtyValue");
      }
      if (editExitFallbackSelected || trimmedQtyDistribution !== "Capital(%)" || !trimmedCapitalAmount) {
        marketMayaClear.add("capitalAmount");
      }
      if (editExitFallbackSelected || !editUseTarget) {
        marketMayaClear.add("targetBy");
        marketMayaClear.add("target");
      }
      if (editExitFallbackSelected || !editUseStopLoss) {
        marketMayaClear.add("slBy");
        marketMayaClear.add("sl");
      }
      if (editExitFallbackSelected || !editTrailSl) {
        marketMayaClear.add("trailSl");
        marketMayaClear.add("slMove");
        marketMayaClear.add("profitMove");
      }
      if (!editUseDailyTradeLimit) {
        marketMayaClear.add("dailyTradeLimit");
      }
      if (!editSharekhanDirect) {
        marketMayaClear.add("sharekhanProductType");
        marketMayaClear.add("sharekhanApiKey");
        marketMayaClear.add("sharekhanAccessToken");
        marketMayaClear.add("sharekhanSecureKey");
        marketMayaClear.add("sharekhanCustomerId");
        marketMayaClear.add("sharekhanChannelUser");
      }
      if (!editMarketMayaEnabled) {
        marketMayaClear.add("token");
      }
      if (!editDerivativeSegmentSelected) {
        marketMayaClear.add("contract");
        marketMayaClear.add("expiry");
        marketMayaClear.add("expiryDate");
        marketMayaClear.add("optionType");
        marketMayaClear.add("atm");
        marketMayaClear.add("strikePrice");
      } else {
        if (editExpiryMode === "date") {
          marketMayaClear.add("contract");
          marketMayaClear.add("expiry");
        } else {
          marketMayaClear.add("expiryDate");
        }

        if (!editOptionSegmentSelected) {
          marketMayaClear.add("optionType");
          marketMayaClear.add("atm");
          marketMayaClear.add("strikePrice");
        } else if (editStrikeMode === "atm") {
          marketMayaClear.add("strikePrice");
        } else {
          marketMayaClear.add("atm");
        }
      }

      const token = getToken();
      const marketMaya: Record<string, unknown> = {
        marketMayaEnabled: Boolean(editMarketMayaEnabled),
        exchange: editExchange,
        segment: editSegment,
        symbolMode: editSymbolMode,
        ...(editSymbolMode === "manualList" && normalizedEditManualSymbols.length
          ? { symbols: normalizedEditManualSymbols }
          : {}),
        ...(editDerivativeSegmentSelected && editExpiryMode === "contract"
          ? { contract: editContract, expiry: editExpiry }
          : {}),
        ...(editDerivativeSegmentSelected && editExpiryMode === "date" && normalizedEditExpiryDate
          ? { expiryDate: normalizedEditExpiryDate }
          : {}),
        ...(editOptionSegmentSelected ? { optionType: editOptionType } : {}),
        ...(editOptionSegmentSelected && editStrikeMode === "atm" && trimmedEditAtm
          ? { atm: trimmedEditAtm }
          : {}),
        ...(editOptionSegmentSelected && editStrikeMode === "strike" && trimmedEditStrikePrice
          ? { strikePrice: trimmedEditStrikePrice }
          : {}),
        ...(editSymbolMode === "payloadSymbol" && editSymbolKey.trim()
          ? { symbolKey: editSymbolKey.trim() }
          : {}),
        ...(editSymbolMode !== "stocksFirst" &&
        editSymbolMode !== "manualList" &&
        editMaxSymbols.trim()
          ? { maxSymbols: editMaxSymbols.trim() }
          : {}),
        ...(editCallTypeFallback ? { callTypeFallback: editCallTypeFallback } : {}),
        ...(!editExitFallbackSelected && trimmedCapitalAmount
          ? { capitalAmount: capitalAmountNumber }
          : {}),
        ...(!editExitFallbackSelected && trimmedQtyDistribution
          ? { qtyDistribution: trimmedQtyDistribution }
          : {}),
        ...(!editExitFallbackSelected && trimmedQtyValue ? { qtyValue: trimmedQtyValue } : {}),
        ...(!editExitFallbackSelected && editUseTarget && editTargetBy.trim()
          ? { targetBy: editTargetBy.trim() }
          : {}),
        ...(!editExitFallbackSelected && editUseTarget && editTarget.trim()
          ? { target: editTarget.trim() }
          : {}),
        ...(!editExitFallbackSelected && editUseStopLoss && editSlBy.trim()
          ? { slBy: editSlBy.trim() }
          : {}),
        ...(!editExitFallbackSelected && editUseStopLoss && editSl.trim()
          ? { sl: editSl.trim() }
          : {}),
        ...(!editExitFallbackSelected && editTrailSl ? { trailSl: true } : {}),
        ...(!editExitFallbackSelected && editSlMove.trim()
          ? { slMove: editSlMove.trim() }
          : {}),
        ...(!editExitFallbackSelected && editProfitMove.trim()
          ? { profitMove: editProfitMove.trim() }
          : {}),
        ...(editUseDailyTradeLimit && trimmedDailyTradeLimit
          ? { dailyTradeLimit: Math.floor(dailyTradeLimitNumber) }
          : {}),
        ...(editTradeWindowStart.trim()
          ? { tradeWindowStart: editTradeWindowStart.trim() }
          : {}),
        ...(editTradeWindowEnd.trim()
          ? { tradeWindowEnd: editTradeWindowEnd.trim() }
          : {}),
        sharekhanDirect: Boolean(editSharekhanDirect),
        ...(editSharekhanDirect && editSharekhanApiKey.trim()
          ? { sharekhanApiKey: editSharekhanApiKey.trim() }
          : {}),
        ...(editSharekhanDirect && editSharekhanAccessToken.trim()
          ? { sharekhanAccessToken: editSharekhanAccessToken.trim() }
          : {}),
        ...(editSharekhanDirect && editSharekhanSecureKey.trim()
          ? { sharekhanSecureKey: editSharekhanSecureKey.trim() }
          : {}),
        ...(editSharekhanDirect && editSharekhanCustomerId.trim()
          ? { sharekhanCustomerId: editSharekhanCustomerId.trim() }
          : {}),
        ...(editSharekhanDirect && editSharekhanChannelUser.trim()
          ? { sharekhanChannelUser: editSharekhanChannelUser.trim() }
          : {}),
        ...(editSharekhanDirect && editSharekhanProductType.trim()
          ? { sharekhanProductType: editSharekhanProductType.trim().toUpperCase() }
          : {}),
      };
      const payload: Record<string, unknown> = {
        strategyId,
        name: editName,
        enabled: editEnabled,
        emailEnabled: editEmailEnabled,
        telegramEnabled: editTelegramEnabled,
        marketMaya,
      };
      if (marketMayaClear.size) {
        payload.marketMayaClear = Array.from(marketMayaClear);
      }
      const webhookKey = String(editingSnapshot.webhookKey || "").trim();
      if (webhookKey) {
        payload.webhookKey = webhookKey;
      }
      if (editMarketMayaEnabled && editMarketMayaToken.trim()) {
        payload.marketMayaToken = editMarketMayaToken;
      }
      const data = await apiPost(
        "/api/v1/strategies/update",
        payload,
        token
      );

      const updated = (data as { strategy?: Strategy }).strategy;
      const normalizedUpdated = updated
        ? { ...updated, _id: normalizeId(updated._id) }
        : null;
      if (normalizedUpdated?._id) {
        setStrategies((prev) =>
          prev.map((item) =>
            item._id === normalizedUpdated._id ? { ...item, ...normalizedUpdated } : item
          )
        );
      }

      setMessage("Strategy updated.");
      closeEdit();
      if (!normalizedUpdated?._id) {
        await loadStrategies();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (item: Strategy) => {
    setError(null);
    setMessage(null);

    const confirmed = window.confirm(
      `Delete "${item.name}"? This will also remove its saved alerts.`
    );
    if (!confirmed) return;

    const strategyId = normalizeId(item._id);
    if (!strategyId) {
      setError("Strategy id missing");
      return;
    }

    setDeleteLoadingId(strategyId);
    try {
      const token = getToken();
      await apiPost(
        "/api/v1/strategies/delete",
        { strategyId },
        token
      );
      setStrategies((prev) => prev.filter((s) => s._id !== strategyId));
      setMessage("Strategy deleted.");

      try {
        await loadStrategies();
      } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleToggleEnabled = async (item: Strategy) => {
    setError(null);
    setMessage(null);

    const strategyId = normalizeId(item._id);
    if (!strategyId) {
      setError("Strategy id missing");
      return;
    }

    setToggleLoadingId(strategyId);
    try {
      const token = getToken();
      const payload: Record<string, unknown> = {
        strategyId,
        name: item.name || "Strategy",
        enabled: !item.enabled,
        emailEnabled: isEmailAlertEnabled(item),
        telegramEnabled: Boolean(item.telegramEnabled),
        marketMayaUrl: item.marketMayaUrl || "",
      };
      if (item.marketMaya && typeof item.marketMaya === "object") {
        payload.marketMaya = item.marketMaya;
      }
      if (item.webhookKey) {
        payload.webhookKey = item.webhookKey;
      }

      const data = await apiPost("/api/v1/strategies/update", payload, token);
      const updated = (data as { strategy?: Strategy }).strategy;
      const normalizedUpdated = updated
        ? { ...updated, _id: normalizeId(updated._id) }
        : null;
      if (normalizedUpdated?._id) {
        setStrategies((prev) =>
          prev.map((s) =>
            s._id === normalizedUpdated._id ? { ...s, ...normalizedUpdated } : s
          )
        );
      } else {
        await loadStrategies();
      }
      setMessage(`Strategy ${item.enabled ? "disabled" : "enabled"}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setError(msg);
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleGenerateToken = async () => {
    setError(null);
    setMessage(null);
    try {
      const token = getToken();
      const data = await apiPost("/api/v1/telegram/token", {}, token);
      const created = data as { token?: string; expiresAt?: string };
      if (created.token) {
        setTelegramToken({
          token: created.token,
          expiresAt: created.expiresAt,
        });
        await loadTokens();
        setMessage("Telegram token generated.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Token generation failed";
      setError(msg);
    }
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Strategy</div>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={openAdd}
        >
          Add strategy
        </button>
      </div>

      {showPageError ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}
      {recentWebhookUrl ? (
        <div className="card">
          <div className="page-title">Webhook URLs ready</div>
          <div className="helper">
            Use these URLs in Chartink or TradingView for{" "}
            {recentStrategyName ? `"${recentStrategyName}"` : "your strategy"}.
          </div>
          {webhookReachabilityWarning ? (
            <div className="alert alert-error" style={{ marginTop: "12px" }}>
              {webhookReachabilityWarning}
            </div>
          ) : null}
          <div className="list" style={{ marginTop: "12px" }}>
            <div className="list-item" style={{ justifyContent: "space-between" }}>
              <div>
                <div><strong>Chartink</strong></div>
                <code className="mono">{recentWebhookUrl}</code>
              </div>
              <div className="cta-row" style={{ gap: "8px" }}>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => copyToClipboard(recentWebhookUrl)}
                >
                  Copy
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => openWebhookTester(recentWebhookUrl, DEFAULT_WEBHOOK_TEST_PAYLOAD)}
                >
                  Test
                </button>
              </div>
            </div>
            {recentTradingViewWebhookUrl ? (
              <div className="list-item" style={{ justifyContent: "space-between" }}>
                <div>
                  <div><strong>TradingView</strong></div>
                  <code className="mono">{recentTradingViewWebhookUrl}</code>
                </div>
                <div className="cta-row" style={{ gap: "8px" }}>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => copyToClipboard(recentTradingViewWebhookUrl)}
                  >
                    Copy
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() =>
                      openWebhookTester(
                        recentTradingViewWebhookUrl,
                        DEFAULT_TRADINGVIEW_TEST_PAYLOAD
                      )
                    }
                  >
                    Test
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <div className="cta-row" style={{ gap: "8px", marginTop: "12px" }}>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setRecentWebhookUrl(null);
                setRecentStrategyName(null);
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <div className="card">
        {renderTitleWithInfo("Telegram access", "telegramAccess")}
        <div className="helper">
          Generate a one-time token and send it to the bot to start alerts.
        </div>
        <div className="list" style={{ marginTop: "14px" }}>
          <div className="list-item">
            <span>Latest token</span>
            <code className="mono">{telegramToken?.token || "Not generated"}</code>
          </div>
          <div className="list-item">
            <span>Expires</span>
            <span>
              {telegramToken?.expiresAt
                ? new Date(telegramToken.expiresAt).toLocaleString()
                : "-"}
            </span>
          </div>
          <div className="list-item">
            <span>Command</span>
            <code className="mono">
              {telegramToken?.token ? `/startAlert ${telegramToken.token}` : "-"}
            </code>
          </div>
        </div>
        <div className="cta-row" style={{ marginTop: "16px" }}>
          <button className="btn btn-secondary" type="button" onClick={handleGenerateToken}>
            Generate new token
          </button>
          <a
            className="btn btn-ghost"
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noreferrer"
          >
            Open Telegram Bot
          </a>
        </div>
        <div className="helper" style={{ marginTop: "10px" }}>
          Send `/startAlert &lt;token&gt;` to the bot. Use `/stopAlert` to stop.
        </div>
      </div>

      <div className="card strategy-list-card">
        {renderTitleWithInfo("Saved strategies", "savedStrategies")}
        {webhookReachabilityWarning ? (
          <div className="alert alert-error" style={{ marginTop: "12px", marginBottom: "12px" }}>
            {webhookReachabilityWarning}
          </div>
        ) : null}
        {strategies.length === 0 ? (
          <div className="helper">No strategies saved yet.</div>
        ) : (
          <div className="strategy-card-list">
            {strategies.map((item) => {
              return (
                <article
                  className={`strategy-card${item.enabled ? " is-enabled" : " is-disabled"}`}
                  key={item._id}
                >
                  <div className="strategy-card-main">
                    <div className="strategy-card-identity">
                      <span
                        className={`strategy-card-avatar${item.enabled ? " on" : " off"}`}
                        aria-hidden="true"
                      >
                        {renderStrategyUiIcon("spark")}
                      </span>
                      <div className="strategy-card-copy">
                        <div className="strategy-card-heading">
                          <strong className="strategy-card-name">{item.name}</strong>
                          <span className={`strategy-live-pill${item.enabled ? " on" : " off"}`}>
                            {item.enabled ? "Live" : "Paused"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="strategy-card-manage">
                      <button
                        className="btn btn-secondary strategy-action-btn"
                        type="button"
                        onClick={() => openEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className={`btn strategy-action-btn${item.enabled ? " btn-ghost" : " btn-primary"}`}
                        type="button"
                        disabled={toggleLoadingId === item._id}
                        onClick={() => handleToggleEnabled(item)}
                      >
                        {toggleLoadingId === item._id
                          ? item.enabled
                            ? "..."
                            : "..."
                          : item.enabled
                            ? "Disable"
                            : "Enable"}
                      </button>
                      <button
                        className="btn btn-ghost strategy-action-btn strategy-action-btn--danger"
                        type="button"
                        disabled={deleteLoadingId === item._id}
                        onClick={() => handleDelete(item)}
                      >
                        {deleteLoadingId === item._id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  <div className="strategy-card-toolbar" aria-label="Webhook actions">
                    <button
                      className="strategy-toolbar-btn"
                      type="button"
                      onClick={() => copyToClipboard(resolveWebhookUrl(item, "chartink"))}
                    >
                      Copy Chartink
                    </button>
                    <button
                      className="strategy-toolbar-btn"
                      type="button"
                      onClick={() => copyToClipboard(resolveWebhookUrl(item, "tradingview"))}
                    >
                      Copy TV
                    </button>
                    <button
                      className="strategy-toolbar-btn is-accent"
                      type="button"
                      onClick={() =>
                        openWebhookTester(
                          resolveWebhookUrl(item, "chartink"),
                          DEFAULT_WEBHOOK_TEST_PAYLOAD
                        )
                      }
                    >
                      Test Chartink
                    </button>
                    <button
                      className="strategy-toolbar-btn is-accent"
                      type="button"
                      onClick={() =>
                        openWebhookTester(
                          resolveWebhookUrl(item, "tradingview"),
                          DEFAULT_TRADINGVIEW_TEST_PAYLOAD
                        )
                      }
                    >
                      Test TV
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {showModal ? (
        <div className="modal-overlay strategy-modal-overlay" onClick={closeAdd}>
          <div className="modal modal-form card" onClick={(event) => event.stopPropagation()}>
            <div className="strategy-modal-header">
              <div className="strategy-modal-heading">
                <span className="section-icon form-section--teal" aria-hidden="true">
                  {renderStrategyUiIcon("spark")}
                </span>
                <div className="strategy-modal-heading-copy">
                  <div className="page-title">Add strategy</div>
                </div>
              </div>
              <div className="cta-row" style={{ gap: 10, alignItems: "center" }}>
                {renderInfoToggle(showAddInfoButtons, setShowAddInfoButtons)}
                <button
                  className="btn btn-ghost strategy-modal-close"
                  type="button"
                  aria-label="Close add strategy"
                  onClick={closeAdd}
                >
                  {renderStrategyUiIcon("close")}
                </button>
              </div>
            </div>
            <form className="form strategy-form" onSubmit={handleSubmit}>
              <div className="strategy-modal-body">
              <div className="form-section form-section--teal">
                {renderFormSectionHeader({
                  title: "Basics",
                  description: "Name the strategy and choose where trades should go.",
                  icon: "spark",
                  tone: "teal",
                })}

                <div className="input-group">
                  {renderAddLabelWithInfo("strategy-name", "Strategy name", "strategyName")}
                  <input
                    className="input"
                    id="strategy-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Banknifty Breakout"
                    required
                  />
                </div>

                <div className="input-group">
                  {renderAddLabelWithInfo("strategy-enable", "Enable strategy", "marketMayaEnable")}
                  {renderFeatureSwitch(
                    "strategy-enable",
                    enabled,
                    setEnabled,
                    "Run this strategy on webhook alerts",
                    "Turn off to pause auto trading without deleting the strategy.",
                    undefined,
                    { tone: "maya", icon: "broadcast" }
                  )}
                </div>

                <div className="input-group">
                  {renderAddLabelWithInfo("market-enable", "Enable Market Maya", "marketMayaEnable")}
                  {renderFeatureSwitch(
                    "market-enable",
                    marketMayaEnabled,
                    setMarketMayaEnabled,
                    "Send trades to Market Maya",
                    "Turn on to place live orders via Market Maya.",
                    undefined,
                    { tone: "maya", icon: "broadcast" }
                  )}
                </div>

                {marketMayaEnabled ? (
                  <div className="form-reveal input-group">
                    {renderAddLabelWithInfo("market-token", "Market Maya Token", "marketMayaToken")}
                    <div className="token-field">
                      <input
                        className="input"
                        id="market-token"
                        type={showMarketMayaToken ? "text" : "password"}
                        value={marketMayaToken}
                        onChange={(event) => setMarketMayaToken(event.target.value)}
                        placeholder="Paste token here"
                      />
                      <button
                        className="token-visibility-btn"
                        type="button"
                        aria-label={showMarketMayaToken ? "Hide Market Maya token" : "Show Market Maya token"}
                        aria-pressed={showMarketMayaToken}
                        onClick={() => setShowMarketMayaToken((current) => !current)}
                      >
                        {renderVisibilityIcon(showMarketMayaToken)}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="input-group">
                  {renderAddLabelWithInfo("sharekhan-direct", "Sharekhan", "sharekhanDirect")}
                  {renderFeatureSwitch(
                    "sharekhan-direct",
                    sharekhanDirect,
                    setSharekhanDirect,
                    "Also place orders on Sharekhan",
                    "Uses your own Sharekhan API keys for this strategy.",
                    undefined,
                    { tone: "broker", icon: "broker" }
                  )}
                </div>
              </div>

              {sharekhanDirect ? (
                <div className="form-section form-section--broker form-reveal">
                  {renderFormSectionHeader({
                    title: "Sharekhan login",
                    description: sharekhanAccessToken.trim()
                      ? "" : "",
                    icon: "key",
                    tone: "broker",
                  })}

                  {sharekhanAccessToken.trim() ? (
                    <div className="alert alert-success">
                      Connected to Sharekhan. You can continue filling the form and save the strategy.
                    </div>
                  ) : null}

                  <div className="input-group">
                    {renderAddLabelWithInfo(
                      "sharekhan-redirect-url",
                      "Redirect URL",
                      "sharekhanRedirectUrl"
                    )}
                    <div className="token-field">
                      <input className="input" readOnly value={sharekhanRedirectUrls.primary} />
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => copyToClipboard(sharekhanRedirectUrls.primary)}
                      >
                        Copy
                      </button>
                    </div>
                    <div className="token-field">
                      <input className="input" readOnly value={sharekhanRedirectUrls.local} />
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => copyToClipboard(sharekhanRedirectUrls.local)}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    {renderAddLabelWithInfo("sharekhan-api-key", "Sharekhan API Key", "sharekhanApiKey")}
                    <div className="token-field">
                      <input
                        className="input"
                        id="sharekhan-api-key"
                        type={showSharekhanApiKey ? "text" : "password"}
                        value={sharekhanApiKey}
                        onChange={(event) => setSharekhanApiKey(event.target.value)}
                        placeholder="Your Sharekhan API Key"
                        autoComplete="off"
                      />
                      <button
                        className="token-visibility-btn"
                        type="button"
                        aria-label={showSharekhanApiKey ? "Hide API key" : "Show API key"}
                        onClick={() => setShowSharekhanApiKey((c) => !c)}
                      >
                        {renderVisibilityIcon(showSharekhanApiKey)}
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    {renderAddLabelWithInfo(
                      "sharekhan-secure-key",
                      "Sharekhan Secure Key",
                      "sharekhanSecureKey"
                    )}
                    <div className="token-field">
                      <input
                        className="input"
                        id="sharekhan-secure-key"
                        type={showSharekhanSecureKey ? "text" : "password"}
                        value={sharekhanSecureKey}
                        onChange={(event) => setSharekhanSecureKey(event.target.value)}
                        placeholder="Secure/secret key from Sharekhan app"
                        autoComplete="off"
                      />
                      <button
                        className="token-visibility-btn"
                        type="button"
                        aria-label={showSharekhanSecureKey ? "Hide secure key" : "Show secure key"}
                        onClick={() => setShowSharekhanSecureKey((c) => !c)}
                      >
                        {renderVisibilityIcon(showSharekhanSecureKey)}
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    {renderAddLabelWithInfo(
                      "sharekhan-customer-id",
                      "Sharekhan Customer ID",
                      "sharekhanCustomerId"
                    )}
                    <input
                      className="input"
                      id="sharekhan-customer-id"
                      value={sharekhanCustomerId}
                      onChange={(event) => setSharekhanCustomerId(event.target.value)}
                      placeholder="Numeric client ID e.g. 1464067"
                      autoComplete="off"
                    />
                  </div>

                  <div className="input-group">
                    {renderAddLabelWithInfo(
                      "sharekhan-channel-user",
                      "Sharekhan Login ID",
                      "sharekhanChannelUser"
                    )}
                    <input
                      className="input"
                      id="sharekhan-channel-user"
                      value={sharekhanChannelUser}
                      onChange={(event) => setSharekhanChannelUser(event.target.value)}
                      placeholder="Login / channelUser e.g. pandurangs22"
                      autoComplete="off"
                    />
                  </div>

                  <div className="cta-row" style={{ gap: 8 }}>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => startSharekhanLogin("add")}
                    >
                      {sharekhanAccessToken.trim() ? "Reconnect Sharekhan" : "Login with Sharekhan"}
                    </button>
                  </div>

                  <div className="input-group">
                    {renderAddLabelWithInfo(
                      "sharekhan-access-token",
                      "Sharekhan Access Token",
                      "sharekhanAccessToken"
                    )}
                    <div className="token-field">
                      <input
                        className="input"
                        id="sharekhan-access-token"
                        type={showSharekhanAccessToken ? "text" : "password"}
                        value={sharekhanAccessToken}
                        onChange={(event) => setSharekhanAccessToken(event.target.value)}
                        placeholder="Generated after Sharekhan login"
                        autoComplete="off"
                      />
                      <button
                        className="token-visibility-btn"
                        type="button"
                        aria-label={
                          showSharekhanAccessToken ? "Hide access token" : "Show access token"
                        }
                        onClick={() => setShowSharekhanAccessToken((c) => !c)}
                      >
                        {renderVisibilityIcon(showSharekhanAccessToken)}
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    {renderAddLabelWithInfo(
                      "sharekhan-product",
                      "Sharekhan product",
                      "sharekhanProductType"
                    )}
                    <select
                      className="select"
                      id="sharekhan-product"
                      value={sharekhanProductType}
                      onChange={(event) => setSharekhanProductType(event.target.value)}
                    >
                      <option value="">Auto (INVESTMENT)</option>
                      <option value="INVESTMENT">INVESTMENT</option>
                      <option value="BIGTRADE">BIGTRADE</option>
                      <option value="BIGTRADEPLUS">BIGTRADEPLUS</option>
                    </select>
                  </div>
                </div>
              ) : null}

              <div className="form-section form-section--slate">
                {renderFormSectionHeader({
                  title: "Symbols",
                  description: "Choose how stock symbols are read from the webhook.",
                  icon: "tag",
                  tone: "slate",
                  infoKey: "symbolSource",
                  showInfo: showAddInfoButtons,
                })}

              <div className="grid-2">
                <div className="input-group">
                  {renderAddLabelWithInfo("symbol-mode", "Symbol source", "symbolSource")}
                  <select
                    className="select"
                    id="symbol-mode"
                    value={symbolMode}
                    onChange={(event) => setSymbolMode(event.target.value)}
                  >
                    <option value="stocksFirst">Stocks: first only</option>
                    <option value="stocksAll">Stocks: all (comma-separated)</option>
                    <option value="manualList">Fixed stocks list</option>
                    <option value="payloadSymbol">Symbol field (comma-separated)</option>
                  </select>
                </div>
                <div className="input-group">
                  {renderAddLabelWithInfo("max-symbols", "Max symbols", "maxSymbols")}
                  <input
                    className="input"
                    id="max-symbols"
                    type="number"
                    min="1"
                    max="25"
                    value={maxSymbols}
                    onChange={(event) => setMaxSymbols(event.target.value)}
                    placeholder="5"
                    disabled={symbolMode === "stocksFirst" || symbolMode === "manualList"}
                  />
                </div>
              </div>

              {symbolMode === "manualList" ? (
                <div className="input-group stock-builder-group">
                  {renderAddLabelWithInfo("fixed-stock-input", "Fixed stocks list", "fixedStocks")}
                  <div className="token-field">
                    <div className="stock-suggest-wrap">
                      <input
                        className="input"
                        id="fixed-stock-input"
                        value={manualSymbolInput}
                        onChange={(event) => {
                          setManualSymbolInput(event.target.value);
                          setShowManualSymbolSuggestions(true);
                        }}
                        onFocus={() => {
                          if (manualSymbolSuggestions.length > 0) {
                            setShowManualSymbolSuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          window.setTimeout(() => setShowManualSymbolSuggestions(false), 150);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            if (manualSymbolSuggestions[0]) {
                              handleSelectManualSymbol(manualSymbolSuggestions[0]);
                            } else {
                              handleAddManualSymbol();
                            }
                          }
                        }}
                        placeholder="Search stock like RELIANCE"
                        autoComplete="off"
                      />
                      {showManualSymbolSuggestions &&
                      (manualSymbolSearching || manualSymbolSuggestions.length > 0) ? (
                        <div className="stock-suggest-menu" role="listbox">
                          {manualSymbolSearching && manualSymbolSuggestions.length === 0 ? (
                            <div className="stock-suggest-empty">Searching...</div>
                          ) : null}
                          {manualSymbolSuggestions.map((hit) => (
                            <button
                              key={`${hit.exchange || "X"}:${hit.token || hit.symbol}`}
                              type="button"
                              className="stock-suggest-item"
                              role="option"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleSelectManualSymbol(hit)}
                            >
                              <span>
                                <span className="stock-suggest-symbol">
                                  {formatInstrumentSuggestion(hit)}
                                </span>
                                {hit.name ? (
                                  <span className="stock-suggest-meta">{hit.name}</span>
                                ) : null}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={handleAddManualSymbol}
                      disabled={!manualSymbolInput.trim()}
                    >
                      + Add
                    </button>
                  </div>
                  <div className="helper">
                    Search and add stocks for the fixed list.
                  </div>
                  {manualSymbols.length > 0 ? (
                    <div className="stock-chip-list">
                      {manualSymbols.map((stock) => (
                        <span className="stock-chip" key={stock}>
                          <span>{stock}</span>
                          <button
                            className="stock-chip-remove"
                            type="button"
                            onClick={() => handleRemoveManualSymbol(stock)}
                            aria-label={`Remove ${stock}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="helper">No fixed stocks added yet.</div>
                  )}
                </div>
              ) : null}

              {symbolMode === "payloadSymbol" ? (
                <div className="input-group">
                  {renderAddLabelWithInfo("symbol-key", "Symbol key", "symbolKey")}
                  <input
                    className="input"
                    id="symbol-key"
                    value={symbolKey}
                    onChange={(event) => setSymbolKey(event.target.value)}
                    placeholder="symbol"
                  />
                  <div className="helper">Webhook field used for symbols.</div>
                </div>
              ) : null}
              </div>

              <div className="form-section form-section--teal">
                {renderFormSectionHeader({
                  title: "Instrument",
                  description: "Pick Equity, Futures, Options, or Commodity.",
                  icon: "layers",
                  tone: "teal",
                  infoKey: "instrumentSetup",
                  showInfo: showAddInfoButtons,
                })}

              <div className="input-group">
                <label className="label" htmlFor="market-instrument-kind">
                  Instrument type
                </label>
                <select
                  className="select"
                  id="market-instrument-kind"
                  value={currentInstrumentKind}
                  onChange={(event) => applyInstrumentKind(event.target.value)}
                >
                  {INSTRUMENT_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {currentInstrumentKind === "commodity" ? (
                  <div className="helper">
                    Examples: GOLD, SILVER, CRUDEOIL. MCX trade window ends at 23:30.
                  </div>
                ) : null}
                {currentInstrumentKind === "options" ? (
                  <div className="helper">
                    Set CE/PE and strike. Use NFO/BFO for index or stock options.
                  </div>
                ) : null}
              </div>

              <div className="grid-2">
                <div className="input-group">
                  {renderAddLabelWithInfo("market-exchange", "Exchange", "exchange")}
                  <select
                    className="select"
                    id="market-exchange"
                    value={exchange}
                    onChange={(event) => {
                      const next = event.target.value;
                      setExchange(next);
                      if (next === "MCX") setTradeWindowEnd(DEFAULT_MCX_TRADE_WINDOW_END);
                    }}
                  >
                    {exchangeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  {renderAddLabelWithInfo("market-segment", "Segment", "segment")}
                  <select
                    className="select"
                    id="market-segment"
                    value={segment}
                    onChange={(event) => handleSegmentChange(event.target.value)}
                  >
                    {MARKET_SEGMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {derivativeSegmentSelected ? (
                <>
                  <div className="input-group">
                    {renderAddLabelWithInfo("market-expiry-mode", "Expiry selection", "expirySelection")}
                    <select
                      className="select"
                      id="market-expiry-mode"
                      value={expiryMode}
                      onChange={(event) => {
                        const next = event.target.value as "contract" | "date";
                        setExpiryMode(next);
                        if (next === "date") {
                          setContract(DEFAULT_CONTRACT);
                          setExpiry(DEFAULT_EXPIRY);
                        } else {
                          setExpiryDate("");
                        }
                      }}
                    >
                      <option value="contract">Contract + expiry</option>
                      <option value="date">Exact expiry date</option>
                    </select>
                  </div>

                  {expiryMode === "date" ? (
                    <div className="input-group">
                      {renderAddLabelWithInfo("market-expiry-date", "Expiry date", "expiryDate")}
                      <input
                        className="input"
                        id="market-expiry-date"
                        type="date"
                        value={expiryDate}
                        onChange={(event) => setExpiryDate(event.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="grid-2">
                      <div className="input-group">
                        {renderAddLabelWithInfo("market-contract", "Contract", "contract")}
                        <select
                          className="select"
                          id="market-contract"
                          value={contract}
                          onChange={(event) => setContract(event.target.value)}
                        >
                          {CONTRACT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="input-group">
                        {renderAddLabelWithInfo("market-expiry", "Expiry cycle", "expiryCycle")}
                        <select
                          className="select"
                          id="market-expiry"
                          value={expiry}
                          onChange={(event) => setExpiry(event.target.value)}
                        >
                          {expiryOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {optionSegmentSelected ? (
                    <>
                      <div className="grid-2">
                        <div className="input-group">
                          {renderAddLabelWithInfo("market-option-type", "Option type", "optionType")}
                          <select
                            className="select"
                            id="market-option-type"
                            value={optionType}
                            onChange={(event) => setOptionType(event.target.value)}
                          >
                            {OPTION_TYPE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="input-group">
                          {renderAddLabelWithInfo("market-strike-mode", "Strike selection", "strikeSelection")}
                          <select
                            className="select"
                            id="market-strike-mode"
                            value={strikeMode}
                            onChange={(event) => {
                              const next = event.target.value as "atm" | "strike";
                              setStrikeMode(next);
                              if (next === "atm") {
                                setStrikePrice("");
                                setAtm(DEFAULT_ATM);
                              } else {
                                setAtm("");
                              }
                            }}
                          >
                            <option value="atm">ATM offset</option>
                            <option value="strike">Exact strike</option>
                          </select>
                        </div>
                      </div>

                      {strikeMode === "atm" ? (
                        <div className="input-group">
                          {renderAddLabelWithInfo("market-atm", "ATM offset", "atm")}
                          <input
                            className="input"
                            id="market-atm"
                            value={atm}
                            onChange={(event) => setAtm(event.target.value)}
                            placeholder="e.g. 0, 100, -100"
                          />
                        </div>
                      ) : (
                        <div className="input-group">
                          {renderAddLabelWithInfo("market-strike-price", "Strike price", "strikePrice")}
                          <input
                            className="input"
                            id="market-strike-price"
                            value={strikePrice}
                            onChange={(event) => setStrikePrice(event.target.value)}
                            placeholder="e.g. 53500"
                          />
                        </div>
                      )}
                    </>
                  ) : null}
                </>
              ) : null}
              </div>

              <div className="form-section form-section--amber">
                {renderFormSectionHeader({
                  title: "Trade settings",
                  description: "Set trade time, side, quantity, and daily limit.",
                  icon: "clock",
                  tone: "amber",
                  infoKey: "tradeSideFallback",
                  showInfo: showAddInfoButtons,
                })}

              <div className="grid-2">
                <div className="input-group">
                  {renderAddLabelWithInfo("market-trade-start", "Trade start time", "tradeWindow")}
                  <input
                    className="input"
                    id="market-trade-start"
                    type="time"
                    value={tradeWindowStart}
                    onChange={(event) => setTradeWindowStart(event.target.value)}
                  />
                </div>
                <div className="input-group">
                  {renderAddLabelWithInfo("market-trade-end", "Trade end time", "tradeWindow")}
                  <input
                    className="input"
                    id="market-trade-end"
                    type="time"
                    value={tradeWindowEnd}
                    onChange={(event) => setTradeWindowEnd(event.target.value)}
                  />
                </div>
                </div>

              <div className="input-group">
                  {renderAddLabelWithInfo("market-calltype", "Trade side", "tradeSideFallback")}
                  <select
                    className="select"
                    id="market-calltype"
                    value={callTypeFallback}
                    onChange={(event) => setCallTypeFallback(event.target.value)}
                  >
                    <option value="">Use webhook side</option>
                    {STRATEGY_CALL_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              {exitFallbackSelected ? (
                <div className="helper">
                  Exit mode only sends the exit signal. Quantity and risk fields are ignored.
                </div>
              ) : (
                <>
                  {orderType === "LIMIT" ? (
                    <>
                      <div className="input-group">
                        {renderAddLabelWithInfo(
                          "market-limit-price-source",
                          "Limit price source",
                          "limitPriceSource"
                        )}
                        <select
                          className="select"
                          id="market-limit-price-source"
                          value={getLimitPriceSourceOptionValue(limitPriceSource)}
                          onChange={(event) => {
                            const next = event.target.value as LimitPriceSourceOption;
                            if (next === "mstockCandle") {
                              setLimitPriceSource((current) =>
                                current === "mstockLow" ||
                                current === "mstockOpen" ||
                                current === "mstockClose"
                                  ? current
                                  : "mstockHigh"
                              );
                              return;
                            }
                            setLimitPriceSource(next);
                          }}
                        >
                          <option value="fixed">Fixed limit price</option>
                          <option value="trigger">Chartink trigger price</option>
                          <option value="mstockCandle">mStock candle price</option>
                        </select>
                      </div>
                      {usingFixedLimitPrice ? (
                        <div className="input-group">
                          {renderAddLabelWithInfo("market-limit-price", "Limit price", "limitPrice")}
                          <input
                            className="input"
                            id="market-limit-price"
                            value={limitPrice}
                            onChange={(event) => setLimitPrice(event.target.value)}
                            placeholder="e.g. 123.45"
                          />
                          <div className="helper">This exact price will be sent for the LIMIT order.</div>
                        </div>
                      ) : (
                        <div className="helper">
                          {usingTriggerLimitPrice
                            ? "Chartink payload `trigger_price` will be used for the LIMIT order."
                            : "mStock candle price will be used for the LIMIT order."}
                        </div>
                      )}
                    </>
                  ) : null}

                  {usingMStockLimitPrice ? (
                    <>
                      <div className="grid-2">
                        <div className="input-group">
                          {renderAddLabelWithInfo(
                            "market-mstock-price-field",
                            "Candle level",
                            "mStockPriceField"
                          )}
                          <select
                            className="select"
                            id="market-mstock-price-field"
                            value={getMStockPriceField(limitPriceSource)}
                            onChange={(event) =>
                              setLimitPriceSource(
                                getLimitPriceSourceFromMStockField(event.target.value)
                              )
                            }
                          >
                            <option value="open">Open</option>
                            <option value="high">High</option>
                            <option value="low">Low</option>
                            <option value="close">Close</option>
                          </select>
                        </div>
                        <div className="input-group">
                          {renderAddLabelWithInfo(
                            "market-mstock-api-type",
                            "mStock API type",
                            "mStockApiType"
                          )}
                          <select
                            className="select"
                            id="market-mstock-api-type"
                            value={mStockApiType}
                            onChange={(event) => setMStockApiType(event.target.value)}
                          >
                            {M_STOCK_API_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="input-group">
                          {renderAddLabelWithInfo(
                            "market-mstock-exchange",
                            "mStock exchange",
                            "mStockExchange"
                          )}
                          <input
                            className="input"
                            id="market-mstock-exchange"
                            value={mStockExchange}
                            onChange={(event) => setMStockExchange(event.target.value.toUpperCase())}
                            placeholder="e.g. NSE"
                          />
                        </div>
                      </div>

                      <div className="grid-2">
                        <div className="input-group">
                          {renderAddLabelWithInfo(
                            "market-mstock-interval",
                            "Candle timeframe",
                            "mStockInterval"
                          )}
                          <select
                            className="select"
                            id="market-mstock-interval"
                            value={mStockInterval}
                            onChange={(event) => setMStockInterval(event.target.value)}
                          >
                            {M_STOCK_INTERVAL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="input-group">
                          <label className="label">mStock defaults</label>
                          <div className="helper">
                          Auth is taken from the admin mStock settings automatically.
                          </div>
                        </div>
                      </div>

                      <div className="input-group">
                        {renderAddLabelWithInfo(
                          "market-mstock-candle-offset",
                          "mStock candle offset",
                          "mStockCandleOffset"
                        )}
                        <input
                          className="input"
                          id="market-mstock-candle-offset"
                          type="number"
                          min="1"
                          step="1"
                          value={mStockCandleOffset}
                          onChange={(event) => setMStockCandleOffset(event.target.value)}
                          placeholder="1"
                        />
                        <div className="helper">
                          Admin-saved mStock auth and defaults will be used automatically. `1` =
                          latest returned candle, `2` = previous candle.
                        </div>
                      </div>
                      <div className="helper">
                        Example: `Candle level = High` and `Candle timeframe = day` means order
                        price will use the daily candle high. `Open + day`, `Low + day`, and
                        `Close + day` work the same way.
                      </div>
                    </>
                  ) : null}

                  {usingDynamicLimitPrice ? (
                    <>
                      <div className="grid-2">
                        <div className="input-group">
                          {renderAddLabelWithInfo("market-buffer-by", "Trade buffer by", "tradeBuffer")}
                          <select
                            className="select"
                            id="market-buffer-by"
                            value={bufferBy}
                            onChange={(event) => {
                              const next = event.target.value;
                              setBufferBy(next);
                              if (!next) setBufferPoints("");
                            }}
                            disabled={!usingDynamicLimitPrice}
                          >
                            <option value="">No buffer</option>
                            <option value="Point">Point</option>
                            <option value="Percentage">Percentage</option>
                          </select>
                        </div>
                        <div className="input-group">
                          {renderAddLabelWithInfo("market-buffer-points", "Trade buffer value", "tradeBuffer")}
                          <input
                            className="input"
                            id="market-buffer-points"
                            type="number"
                            min="0"
                            step="0.01"
                            value={bufferPoints}
                            onChange={(event) => setBufferPoints(event.target.value)}
                            placeholder={bufferBy === "Percentage" ? "e.g. 1" : "e.g. 1"}
                            disabled={!usingDynamicLimitPrice || !bufferBy}
                          />
                        </div>
                      </div>
                      <div className="helper">
                        Buffer works on the selected dynamic source price. BUY = source + buffer, SELL = source - buffer.
                      </div>
                    </>
                  ) : null}

                  <div className="grid-2">
                    <div className="input-group">
                      {renderAddLabelWithInfo("market-qty-distribution", "Qty distribution", "qtyDistribution")}
                      <select
                        className="select"
                        id="market-qty-distribution"
                        value={qtyDistribution}
                        onChange={(event) => setQtyDistribution(event.target.value)}
                      >
                        <option value="">Select qty mode</option>
                        <option value="Fix">Fix</option>
                        <option value="Capital(%)">Capital(%)</option>
                      </select>
                    </div>
                    <div className="input-group">
                      {renderAddLabelWithInfo("market-qty-value", "Qty value", "qtyValue")}
                      <input
                        className="input"
                        id="market-qty-value"
                        type="number"
                        min="0"
                        step="0.01"
                        value={qtyValue}
                        onChange={(event) => setQtyValue(event.target.value)}
                        placeholder={qtyDistribution === "Capital(%)" ? "e.g. 2" : "e.g. 5"}
                      />
                    </div>
                  </div>
                  <div className="helper">
                    Capital(%) uses: (Capital × Qty%) ÷ stock price.
                  </div>

                  {qtyDistribution === "Capital(%)" ? (
                    <div className="input-group">
                      {renderAddLabelWithInfo("market-capital-amount", "Capital amount", "capitalAmount")}
                      <input
                        className="input"
                        id="market-capital-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={capitalAmount}
                        onChange={(event) => setCapitalAmount(event.target.value)}
                        placeholder="e.g. 500000"
                      />
                    </div>
                  ) : null}
                </>
              )}

              <div className="input-group">
                {renderAddLabelWithInfo("market-daily-trade-limit", "Daily trade limit", "dailyTradeLimit")}
                {renderFeatureSwitch(
                  "market-daily-trade-limit",
                  useDailyTradeLimit,
                  (checked) => {
                    setUseDailyTradeLimit(checked);
                    if (!checked) setDailyTradeLimit("");
                  },
                  "Enable daily trade limit",
                  "Limit how many trades this strategy can take each day.",
                  undefined,
                  { tone: "limit", icon: "limit" }
                )}
              </div>

              {useDailyTradeLimit ? (
                <div className="input-group">
                  {renderAddLabelWithInfo(
                    "market-daily-trade-limit-value",
                    "Max trades per day",
                    "dailyTradeLimitValue"
                  )}
                  <input
                    className="input"
                    id="market-daily-trade-limit-value"
                    type="number"
                    min="1"
                    step="1"
                    value={dailyTradeLimit}
                    onChange={(event) => setDailyTradeLimit(event.target.value)}
                    placeholder="e.g. 5"
                  />
                  <div className="helper">
                    Maximum trades allowed for this strategy in one day.
                  </div>
                </div>
              ) : null}
              </div>

              {!exitFallbackSelected ? (
                <div className="form-section form-section--risk">
                  {renderFormSectionHeader({
                    title: "Risk",
                    description: "Optional target, stop loss, and trailing stop.",
                    icon: "shield",
                    tone: "risk",
                  })}

                  <div className="input-group">
                    {renderAddLabelWithInfo(
                      "market-use-target",
                      "Target",
                      "targetToggle",
                      "risk-label-target"
                    )}
                    {renderFeatureSwitch(
                      "market-use-target",
                      useTarget,
                      (checked) => {
                        setUseTarget(checked);
                        if (!checked) {
                          setTargetBy("");
                          setTarget("");
                        }
                      },
                      "Enable target",
                      "Exit with profit when target is hit.",
                      "risk-note risk-note-target",
                      { tone: "target", icon: "target" }
                    )}
                  </div>

                  {useTarget ? (
                    <div className="grid-2">
                      <div className="input-group">
                        {renderAddLabelWithInfo(
                          "market-target-by",
                          "Target by",
                          "targetBy",
                          "risk-label-target"
                        )}
                        <select
                          className="select"
                          id="market-target-by"
                          value={targetBy}
                          onChange={(event) => setTargetBy(event.target.value)}
                        >
                          <option value="">Select target type</option>
                          <option value="Money">Money</option>
                          <option value="Point">Point</option>
                          <option value="Percentage">Percentage</option>
                          <option value="Price">Price</option>
                          <option value="Ratio">Ratio</option>
                        </select>
                      </div>
                      <div className="input-group">
                        {renderAddLabelWithInfo(
                          "market-target",
                          "Target",
                          "targetValue",
                          "risk-label-target"
                        )}
                        <input
                          className="input"
                          id="market-target"
                          value={target}
                          onChange={(event) => setTarget(event.target.value)}
                          placeholder={targetPlaceholder}
                        />
                        {isRatioTarget ? (
                          <div className="helper risk-helper-target">
                            {!activeSl.trim()
                              ? "Enable stop loss (or provide SL via webhook) to use ratio."
                              : ratioComputed
                                ? `Computed target: ${ratioComputed}`
                                : "Enter ratio like 1:2 or 2"}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="input-group">
                    {renderAddLabelWithInfo(
                      "market-use-sl",
                      "Stop loss",
                      "stopLossToggle",
                      "risk-label-stop"
                    )}
                    {renderFeatureSwitch(
                      "market-use-sl",
                      useStopLoss,
                      (checked) => {
                        setUseStopLoss(checked);
                        if (!checked) {
                          setSlBy("");
                          setSl("");
                        }
                      },
                      "Enable stop loss",
                      "Exit if price moves against the trade.",
                      "risk-note risk-note-stop",
                      { tone: "risk", icon: "stop" }
                    )}
                  </div>

                  {useStopLoss ? (
                    <div className="grid-2">
                      <div className="input-group">
                        {renderAddLabelWithInfo(
                          "market-sl-by",
                          "Stop loss by",
                          "stopLossBy",
                          "risk-label-stop"
                        )}
                        <select
                          className="select"
                          id="market-sl-by"
                          value={slBy}
                          onChange={(event) => setSlBy(event.target.value)}
                        >
                          <option value="">Select SL type</option>
                          <option value="Money">Money</option>
                          <option value="Point">Point</option>
                          <option value="Percentage">Percentage</option>
                          <option value="Price">Price</option>
                        </select>
                      </div>
                      <div className="input-group">
                        {renderAddLabelWithInfo(
                          "market-sl",
                          "Stop loss",
                          "stopLossValue",
                          "risk-label-stop"
                        )}
                        <input
                          className="input"
                          id="market-sl"
                          value={sl}
                          onChange={(event) => setSl(event.target.value)}
                          placeholder="e.g. 25"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="input-group">
                    {renderAddLabelWithInfo(
                      "market-trail-sl",
                      "Trail SL",
                      "trailSl",
                      "risk-label-stop"
                    )}
                    {renderFeatureSwitch(
                      "market-trail-sl",
                      trailSl,
                      (checked) => {
                        setTrailSl(checked);
                        if (!checked) {
                          setSlMove("");
                          setProfitMove("");
                        }
                      },
                      "Enable trailing stop loss",
                      "Move stop loss up as profit increases.",
                      "risk-note risk-note-stop",
                      { tone: "risk", icon: "trail" }
                    )}
                  </div>

                  {trailSl ? (
                    <div className="grid-2">
                      <div className="input-group">
                        {renderAddLabelWithInfo(
                          "market-sl-move",
                          "SL move",
                          "slMove",
                          "risk-label-stop"
                        )}
                        <input
                          className="input"
                          id="market-sl-move"
                          value={slMove}
                          onChange={(event) => setSlMove(event.target.value)}
                          placeholder="e.g. 10"
                        />
                      </div>
                      <div className="input-group">
                        {renderAddLabelWithInfo(
                          "market-profit-move",
                          "Profit move",
                          "profitMove",
                          "risk-label-stop"
                        )}
                        <input
                          className="input"
                          id="market-profit-move"
                          value={profitMove}
                          onChange={(event) => setProfitMove(event.target.value)}
                          placeholder="e.g. 20"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="form-section form-section--alert">
                {renderFormSectionHeader({
                  title: "Alerts",
                  description: "Send email or Telegram alerts for this strategy.",
                  icon: "bell",
                  tone: "alert",
                })}

                <div className="input-group">
                  {renderAddLabelWithInfo("email-enable", "Email alerts", "emailAlerts")}
                  {renderFeatureSwitch(
                    "email-enable",
                    emailEnabled,
                    setEmailEnabled,
                    `Send alerts to ${emailAlertTarget}`,
                    profileEmail
                      ? `Using ${profileEmail}`
                      : "Uses your account email when available.",
                    undefined,
                    { tone: "alert", icon: "mail" }
                  )}
                </div>

                <div className="input-group">
                  {renderAddLabelWithInfo("telegram-enable", "Telegram alerts", "telegramAlerts")}
                  {renderFeatureSwitch(
                    "telegram-enable",
                    telegramEnabled,
                    setTelegramEnabled,
                    "Send alerts to Telegram",
                    "Works with your linked Telegram bot subscription.",
                    undefined,
                    { tone: "alert", icon: "telegram" }
                  )}
                </div>
              </div>
              </div>

              <div className="cta-row form-actions">
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save strategy"}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={closeAdd}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="modal-overlay strategy-modal-overlay" onClick={closeEdit}>
          <div className="modal modal-form card" onClick={(event) => event.stopPropagation()}>
            <div className="strategy-modal-header">
              <div className="strategy-modal-heading">
                <span className="section-icon form-section--teal" aria-hidden="true">
                  {renderStrategyUiIcon("spark")}
                </span>
                <div className="strategy-modal-heading-copy">
                  <div className="page-title">Edit strategy</div>
                </div>
              </div>
              <div className="cta-row" style={{ gap: 10, alignItems: "center" }}>
                {renderInfoToggle(showEditInfoButtons, setShowEditInfoButtons)}
                <button
                  className="btn btn-ghost strategy-modal-close"
                  type="button"
                  aria-label="Close edit strategy"
                  onClick={closeEdit}
                >
                  {renderStrategyUiIcon("close")}
                </button>
              </div>
            </div>
            <form className="form strategy-form" onSubmit={handleUpdate}>
              <div className="strategy-modal-body">
              <div className="form-section form-section--teal">
                {renderFormSectionHeader({
                  title: "Basics",
                  description: "Update the strategy name and where trades should go.",
                  icon: "spark",
                  tone: "teal",
                })}

                <div className="input-group">
                  {renderEditLabelWithInfo("edit-strategy-name", "Strategy name", "strategyName")}
                  <input
                    className="input"
                    id="edit-strategy-name"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    placeholder="e.g. Banknifty Breakout"
                    required
                  />
                </div>

                <div className="input-group">
                  <div className="label-row">
                    <label className="label">Webhook URL</label>
                    {renderInfoButton("webhookUrl", "inline", showEditInfoButtons)}
                  </div>
                  <div className="list" style={{ gap: "10px" }}>
                    <div className="list-item" style={{ justifyContent: "space-between" }}>
                      <div>
                        <div><strong>Chartink</strong></div>
                        <code className="mono">{resolveWebhookUrl(editing, "chartink")}</code>
                      </div>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => copyToClipboard(resolveWebhookUrl(editing, "chartink"))}
                      >
                        Copy
                      </button>
                    </div>
                    <div className="list-item" style={{ justifyContent: "space-between" }}>
                      <div>
                        <div><strong>TradingView</strong></div>
                        <code className="mono">{resolveWebhookUrl(editing, "tradingview")}</code>
                      </div>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => copyToClipboard(resolveWebhookUrl(editing, "tradingview"))}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                <div className="input-group">
                  {renderEditLabelWithInfo("edit-strategy-enable", "Enable strategy", "marketMayaEnable")}
                  {renderFeatureSwitch(
                    "edit-strategy-enable",
                    editEnabled,
                    setEditEnabled,
                    "Run this strategy on webhook alerts",
                    "Turn off to pause auto trading without deleting the strategy.",
                    undefined,
                    { tone: "maya", icon: "broadcast" }
                  )}
                </div>

                <div className="input-group">
                  {renderEditLabelWithInfo("edit-market-enable", "Enable Market Maya", "marketMayaEnable")}
                  {renderFeatureSwitch(
                    "edit-market-enable",
                    editMarketMayaEnabled,
                    setEditMarketMayaEnabled,
                    "Send trades to Market Maya",
                    "Turn on to place live orders via Market Maya.",
                    undefined,
                    { tone: "maya", icon: "broadcast" }
                  )}
                </div>

                {editMarketMayaEnabled ? (
                  <div className="form-reveal input-group">
                    {renderEditLabelWithInfo("edit-market-token", "Market Maya Token", "marketMayaToken")}
                    <div className="token-field">
                      <input
                        className="input"
                        id="edit-market-token"
                        type={showEditMarketMayaToken ? "text" : "password"}
                        value={editMarketMayaToken}
                        onChange={(event) => setEditMarketMayaToken(event.target.value)}
                        placeholder="Market Maya token"
                      />
                      <button
                        className="token-visibility-btn"
                        type="button"
                        aria-label={
                          showEditMarketMayaToken ? "Hide saved Market Maya token" : "Show saved Market Maya token"
                        }
                        aria-pressed={showEditMarketMayaToken}
                        onClick={() => setShowEditMarketMayaToken((current) => !current)}
                      >
                        {renderVisibilityIcon(showEditMarketMayaToken)}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="input-group">
                  {renderEditLabelWithInfo("edit-sharekhan-direct", "Sharekhan", "sharekhanDirect")}
                  {renderFeatureSwitch(
                    "edit-sharekhan-direct",
                    editSharekhanDirect,
                    setEditSharekhanDirect,
                    "Also place orders on Sharekhan",
                    "Uses your own Sharekhan API keys for this strategy.",
                    undefined,
                    { tone: "broker", icon: "broker" }
                  )}
                </div>
              </div>

              {editSharekhanDirect ? (
                <div className="form-section form-section--broker form-reveal">
                  {renderFormSectionHeader({
                    title: "Sharekhan login",
                    description: editSharekhanAccessToken.trim()
                      ? "" : "",
                    icon: "key",
                    tone: "broker",
                  })}
                  {editSharekhanAccessToken.trim() ? (
                    <div className="alert alert-success">
                      Connected to Sharekhan. You can continue and save changes.
                    </div>
                  ) : null}
                  <div className="input-group">
                    {renderEditLabelWithInfo(
                      "edit-sharekhan-redirect-url",
                      "Redirect URL",
                      "sharekhanRedirectUrl"
                    )}
                    <div className="token-field">
                      <input className="input" readOnly value={sharekhanRedirectUrls.primary} />
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => copyToClipboard(sharekhanRedirectUrls.primary)}
                      >
                        Copy
                      </button>
                    </div>
                    <div className="token-field">
                      <input className="input" readOnly value={sharekhanRedirectUrls.local} />
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => copyToClipboard(sharekhanRedirectUrls.local)}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    {renderEditLabelWithInfo(
                      "edit-sharekhan-api-key",
                      "Sharekhan API Key",
                      "sharekhanApiKey"
                    )}
                    <div className="token-field">
                      <input
                        className="input"
                        id="edit-sharekhan-api-key"
                        type={showEditSharekhanApiKey ? "text" : "password"}
                        value={editSharekhanApiKey}
                        onChange={(event) => setEditSharekhanApiKey(event.target.value)}
                        placeholder="Your Sharekhan API Key"
                        autoComplete="off"
                      />
                      <button
                        className="token-visibility-btn"
                        type="button"
                        aria-label={showEditSharekhanApiKey ? "Hide API key" : "Show API key"}
                        onClick={() => setShowEditSharekhanApiKey((c) => !c)}
                      >
                        {renderVisibilityIcon(showEditSharekhanApiKey)}
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    {renderEditLabelWithInfo(
                      "edit-sharekhan-secure-key",
                      "Sharekhan Secure Key",
                      "sharekhanSecureKey"
                    )}
                    <div className="token-field">
                      <input
                        className="input"
                        id="edit-sharekhan-secure-key"
                        type={showEditSharekhanSecureKey ? "text" : "password"}
                        value={editSharekhanSecureKey}
                        onChange={(event) => setEditSharekhanSecureKey(event.target.value)}
                        placeholder="Secure/secret key from Sharekhan app"
                        autoComplete="off"
                      />
                      <button
                        className="token-visibility-btn"
                        type="button"
                        aria-label={
                          showEditSharekhanSecureKey ? "Hide secure key" : "Show secure key"
                        }
                        onClick={() => setShowEditSharekhanSecureKey((c) => !c)}
                      >
                        {renderVisibilityIcon(showEditSharekhanSecureKey)}
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    {renderEditLabelWithInfo(
                      "edit-sharekhan-customer-id",
                      "Sharekhan Customer ID",
                      "sharekhanCustomerId"
                    )}
                    <input
                      className="input"
                      id="edit-sharekhan-customer-id"
                      value={editSharekhanCustomerId}
                      onChange={(event) => setEditSharekhanCustomerId(event.target.value)}
                      placeholder="Numeric client ID e.g. 1464067"
                      autoComplete="off"
                    />
                  </div>

                  <div className="input-group">
                    {renderEditLabelWithInfo(
                      "edit-sharekhan-channel-user",
                      "Sharekhan Login ID",
                      "sharekhanChannelUser"
                    )}
                    <input
                      className="input"
                      id="edit-sharekhan-channel-user"
                      value={editSharekhanChannelUser}
                      onChange={(event) => setEditSharekhanChannelUser(event.target.value)}
                      placeholder="Login / channelUser e.g. pandurangs22"
                      autoComplete="off"
                    />
                  </div>

                  <div className="cta-row" style={{ gap: 8, marginBottom: 12 }}>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => startSharekhanLogin("edit")}
                    >
                      {editSharekhanAccessToken.trim() ? "Reconnect Sharekhan" : "Login with Sharekhan"}
                    </button>
                  </div>

                  <div className="input-group">
                    {renderEditLabelWithInfo(
                      "edit-sharekhan-access-token",
                      "Sharekhan Access Token",
                      "sharekhanAccessToken"
                    )}
                    <div className="token-field">
                      <input
                        className="input"
                        id="edit-sharekhan-access-token"
                        type={showEditSharekhanAccessToken ? "text" : "password"}
                        value={editSharekhanAccessToken}
                        onChange={(event) => setEditSharekhanAccessToken(event.target.value)}
                        placeholder="Generated after Sharekhan login"
                        autoComplete="off"
                      />
                      <button
                        className="token-visibility-btn"
                        type="button"
                        aria-label={
                          showEditSharekhanAccessToken ? "Hide access token" : "Show access token"
                        }
                        onClick={() => setShowEditSharekhanAccessToken((c) => !c)}
                      >
                        {renderVisibilityIcon(showEditSharekhanAccessToken)}
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    {renderEditLabelWithInfo(
                      "edit-sharekhan-product",
                      "Sharekhan product",
                      "sharekhanProductType"
                    )}
                    <select
                      className="select"
                      id="edit-sharekhan-product"
                      value={editSharekhanProductType}
                      onChange={(event) => setEditSharekhanProductType(event.target.value)}
                    >
                      <option value="">Auto (INVESTMENT)</option>
                      <option value="INVESTMENT">INVESTMENT</option>
                      <option value="BIGTRADE">BIGTRADE</option>
                      <option value="BIGTRADEPLUS">BIGTRADEPLUS</option>
                    </select>
                  </div>
                </div>
              ) : null}

              <div className="form-section form-section--slate">
                {renderFormSectionHeader({
                  title: "Symbol handling",
                  description: "Control how symbols are picked from webhook payloads.",
                  icon: "tag",
                  tone: "slate",
                  infoKey: "symbolSource",
                  showInfo: showEditInfoButtons,
                })}

              <div className="grid-2">
                <div className="input-group">
                  {renderEditLabelWithInfo("edit-symbol-mode", "Symbol source", "symbolSource")}
                  <select
                    className="select"
                    id="edit-symbol-mode"
                    value={editSymbolMode}
                    onChange={(event) => setEditSymbolMode(event.target.value)}
                  >
                    <option value="stocksFirst">Stocks: first only</option>
                    <option value="stocksAll">Stocks: all (comma-separated)</option>
                    <option value="manualList">Fixed stocks list</option>
                    <option value="payloadSymbol">Symbol field (comma-separated)</option>
                  </select>
                </div>
                <div className="input-group">
                  {renderEditLabelWithInfo("edit-max-symbols", "Max symbols", "maxSymbols")}
                  <input
                    className="input"
                    id="edit-max-symbols"
                    type="number"
                    min="1"
                    max="25"
                    value={editMaxSymbols}
                    onChange={(event) => setEditMaxSymbols(event.target.value)}
                    placeholder="5"
                    disabled={editSymbolMode === "stocksFirst" || editSymbolMode === "manualList"}
                  />
                </div>
              </div>

              {editSymbolMode === "manualList" ? (
                <div className="input-group stock-builder-group">
                  {renderEditLabelWithInfo("edit-fixed-stock-input", "Fixed stocks list", "fixedStocks")}
                  <div className="token-field">
                    <div className="stock-suggest-wrap">
                      <input
                        className="input"
                        id="edit-fixed-stock-input"
                        value={editManualSymbolInput}
                        onChange={(event) => {
                          setEditManualSymbolInput(event.target.value);
                          setShowEditManualSymbolSuggestions(true);
                        }}
                        onFocus={() => {
                          if (editManualSymbolSuggestions.length > 0) {
                            setShowEditManualSymbolSuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          window.setTimeout(() => setShowEditManualSymbolSuggestions(false), 150);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            if (editManualSymbolSuggestions[0]) {
                              handleSelectEditManualSymbol(editManualSymbolSuggestions[0]);
                            } else {
                              handleAddEditManualSymbol();
                            }
                          }
                        }}
                        placeholder="Search stock like RELIANCE"
                        autoComplete="off"
                      />
                      {showEditManualSymbolSuggestions &&
                      (editManualSymbolSearching || editManualSymbolSuggestions.length > 0) ? (
                        <div className="stock-suggest-menu" role="listbox">
                          {editManualSymbolSearching && editManualSymbolSuggestions.length === 0 ? (
                            <div className="stock-suggest-empty">Searching...</div>
                          ) : null}
                          {editManualSymbolSuggestions.map((hit) => (
                            <button
                              key={`${hit.exchange || "X"}:${hit.token || hit.symbol}`}
                              type="button"
                              className="stock-suggest-item"
                              role="option"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleSelectEditManualSymbol(hit)}
                            >
                              <span>
                                <span className="stock-suggest-symbol">
                                  {formatInstrumentSuggestion(hit)}
                                </span>
                                {hit.name ? (
                                  <span className="stock-suggest-meta">{hit.name}</span>
                                ) : null}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={handleAddEditManualSymbol}
                      disabled={!editManualSymbolInput.trim()}
                    >
                      + Add
                    </button>
                  </div>
                  {editManualSymbols.length > 0 ? (
                    <div className="stock-chip-list">
                      {editManualSymbols.map((stock) => (
                        <span className="stock-chip" key={stock}>
                          <span>{stock}</span>
                          <button
                            className="stock-chip-remove"
                            type="button"
                            onClick={() => handleRemoveEditManualSymbol(stock)}
                            aria-label={`Remove ${stock}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="helper">No fixed stocks added yet.</div>
                  )}
                </div>
              ) : null}

              {editSymbolMode === "payloadSymbol" ? (
                <div className="input-group">
                  {renderEditLabelWithInfo("edit-symbol-key", "Symbol key", "symbolKey")}
                  <input
                    className="input"
                    id="edit-symbol-key"
                    value={editSymbolKey}
                    onChange={(event) => setEditSymbolKey(event.target.value)}
                    placeholder="symbol"
                  />
                  <div className="helper">Webhook field used for symbols.</div>
                </div>
              ) : null}
              </div>

              <div className="form-section form-section--teal">
                {renderFormSectionHeader({
                  title: "Instrument setup",
                  description:
                    "Choose Equity, Futures, Options, or Commodity. Commodity uses MCX futures by default (GOLD, SILVER, CRUDEOIL...). Options unlock CE/PE + ATM/strike fields.",
                  icon: "layers",
                  tone: "teal",
                  infoKey: "instrumentSetup",
                  showInfo: showEditInfoButtons,
                })}

              <div className="input-group">
                <label className="label" htmlFor="edit-market-instrument-kind">
                  Instrument type
                </label>
                <select
                  className="select"
                  id="edit-market-instrument-kind"
                  value={editInstrumentKind}
                  onChange={(event) => applyInstrumentKind(event.target.value, true)}
                >
                  {INSTRUMENT_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {editInstrumentKind === "commodity" ? (
                  <div className="helper">
                    Examples: GOLD, SILVER, CRUDEOIL. MCX trade window ends at 23:30.
                  </div>
                ) : null}
                {editInstrumentKind === "options" ? (
                  <div className="helper">
                    Set CE/PE and strike. Use NFO/BFO for index or stock options.
                  </div>
                ) : null}
              </div>

              <div className="grid-2">
                <div className="input-group">
                  {renderEditLabelWithInfo("edit-market-exchange", "Exchange", "exchange")}
                  <select
                    className="select"
                    id="edit-market-exchange"
                    value={editExchange}
                    onChange={(event) => {
                      const next = event.target.value;
                      setEditExchange(next);
                      if (next === "MCX") setEditTradeWindowEnd(DEFAULT_MCX_TRADE_WINDOW_END);
                    }}
                  >
                    {editExchangeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  {renderEditLabelWithInfo("edit-market-segment", "Segment", "segment")}
                  <select
                    className="select"
                    id="edit-market-segment"
                    value={editSegment}
                    onChange={(event) => handleEditSegmentChange(event.target.value)}
                  >
                    {MARKET_SEGMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editDerivativeSegmentSelected ? (
                <>
                  <div className="input-group">
                    {renderEditLabelWithInfo("edit-market-expiry-mode", "Expiry selection", "expirySelection")}
                    <select
                      className="select"
                      id="edit-market-expiry-mode"
                      value={editExpiryMode}
                      onChange={(event) => {
                        const next = event.target.value as "contract" | "date";
                        setEditExpiryMode(next);
                        if (next === "date") {
                          setEditContract(DEFAULT_CONTRACT);
                          setEditExpiry(DEFAULT_EXPIRY);
                        } else {
                          setEditExpiryDate("");
                        }
                      }}
                    >
                      <option value="contract">Contract + expiry</option>
                      <option value="date">Exact expiry date</option>
                    </select>
                  </div>

                  {editExpiryMode === "date" ? (
                    <div className="input-group">
                      {renderEditLabelWithInfo("edit-market-expiry-date", "Expiry date", "expiryDate")}
                      <input
                        className="input"
                        id="edit-market-expiry-date"
                        type="date"
                        value={editExpiryDate}
                        onChange={(event) => setEditExpiryDate(event.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="grid-2">
                      <div className="input-group">
                        {renderEditLabelWithInfo("edit-market-contract", "Contract", "contract")}
                        <select
                          className="select"
                          id="edit-market-contract"
                          value={editContract}
                          onChange={(event) => setEditContract(event.target.value)}
                        >
                          {CONTRACT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="input-group">
                        {renderEditLabelWithInfo("edit-market-expiry", "Expiry cycle", "expiryCycle")}
                        <select
                          className="select"
                          id="edit-market-expiry"
                          value={editExpiry}
                          onChange={(event) => setEditExpiry(event.target.value)}
                        >
                          {editExpiryOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {editOptionSegmentSelected ? (
                    <>
                      <div className="grid-2">
                        <div className="input-group">
                          {renderEditLabelWithInfo("edit-market-option-type", "Option type", "optionType")}
                          <select
                            className="select"
                            id="edit-market-option-type"
                            value={editOptionType}
                            onChange={(event) => setEditOptionType(event.target.value)}
                          >
                            {OPTION_TYPE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="input-group">
                          {renderEditLabelWithInfo("edit-market-strike-mode", "Strike selection", "strikeSelection")}
                          <select
                            className="select"
                            id="edit-market-strike-mode"
                            value={editStrikeMode}
                            onChange={(event) => {
                              const next = event.target.value as "atm" | "strike";
                              setEditStrikeMode(next);
                              if (next === "atm") {
                                setEditStrikePrice("");
                                setEditAtm(DEFAULT_ATM);
                              } else {
                                setEditAtm("");
                              }
                            }}
                          >
                            <option value="atm">ATM offset</option>
                            <option value="strike">Exact strike</option>
                          </select>
                        </div>
                      </div>

                      {editStrikeMode === "atm" ? (
                        <div className="input-group">
                          {renderEditLabelWithInfo("edit-market-atm", "ATM offset", "atm")}
                          <input
                            className="input"
                            id="edit-market-atm"
                            value={editAtm}
                            onChange={(event) => setEditAtm(event.target.value)}
                            placeholder="e.g. 0, 100, -100"
                          />
                        </div>
                      ) : (
                        <div className="input-group">
                          {renderEditLabelWithInfo("edit-market-strike-price", "Strike price", "strikePrice")}
                          <input
                            className="input"
                            id="edit-market-strike-price"
                            value={editStrikePrice}
                            onChange={(event) => setEditStrikePrice(event.target.value)}
                            placeholder="e.g. 53500"
                          />
                        </div>
                      )}
                    </>
                  ) : null}
                </>
              ) : null}
              </div>

              <div className="form-section form-section--amber">
                {renderFormSectionHeader({
                  title: "Trade defaults",
                  description:
                    "Payload `call_type` is used first. Fallback is used only when payload side is missing.",
                  icon: "clock",
                  tone: "amber",
                  infoKey: "tradeSideFallback",
                  showInfo: showEditInfoButtons,
                })}

              <div className="grid-2">
                <div className="input-group">
                  {renderEditLabelWithInfo("edit-market-trade-start", "Trade start time", "tradeWindow")}
                  <input
                    className="input"
                    id="edit-market-trade-start"
                    type="time"
                    value={editTradeWindowStart}
                    onChange={(event) => setEditTradeWindowStart(event.target.value)}
                  />
                </div>
                <div className="input-group">
                  {renderEditLabelWithInfo("edit-market-trade-end", "Trade end time", "tradeWindow")}
                  <input
                    className="input"
                    id="edit-market-trade-end"
                    type="time"
                    value={editTradeWindowEnd}
                    onChange={(event) => setEditTradeWindowEnd(event.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                  {renderEditLabelWithInfo("edit-market-calltype", "Trade side fallback", "tradeSideFallback")}
                  <select
                    className="select"
                    id="edit-market-calltype"
                    value={editCallTypeFallback}
                    onChange={(event) => setEditCallTypeFallback(event.target.value)}
                  >
                    <option value="">Use payload `call_type`</option>
                    {STRATEGY_CALL_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              {editExitFallbackSelected ? (
                <div className="helper">
                  Exit mode only sends the exit signal. Quantity and risk fields are ignored.
                </div>
              ) : (
                <>
                  {editOrderType === "LIMIT" ? (
                    <>
                      <div className="input-group">
                        {renderEditLabelWithInfo(
                          "edit-market-limit-price-source",
                          "Limit price source",
                          "limitPriceSource"
                        )}
                        <select
                          className="select"
                          id="edit-market-limit-price-source"
                          value={getLimitPriceSourceOptionValue(editLimitPriceSource)}
                          onChange={(event) => {
                            const next = event.target.value as LimitPriceSourceOption;
                            if (next === "mstockCandle") {
                              setEditLimitPriceSource((current) =>
                                current === "mstockLow" ||
                                current === "mstockOpen" ||
                                current === "mstockClose"
                                  ? current
                                  : "mstockHigh"
                              );
                              return;
                            }
                            setEditLimitPriceSource(next);
                          }}
                        >
                          <option value="fixed">Fixed limit price</option>
                          <option value="trigger">Chartink trigger price</option>
                          <option value="mstockCandle">mStock candle price</option>
                        </select>
                      </div>
                      {editUsingFixedLimitPrice ? (
                        <div className="input-group">
                          {renderEditLabelWithInfo("edit-market-limit-price", "Limit price", "limitPrice")}
                          <input
                            className="input"
                            id="edit-market-limit-price"
                            value={editLimitPrice}
                            onChange={(event) => setEditLimitPrice(event.target.value)}
                            placeholder="e.g. 123.45"
                          />
                          <div className="helper">This exact price will be sent for the LIMIT order.</div>
                        </div>
                      ) : (
                        <div className="helper">
                          {editUsingTriggerLimitPrice
                            ? "Chartink payload `trigger_price` will be used for the LIMIT order."
                            : "mStock candle price will be used for the LIMIT order."}
                        </div>
                      )}
                    </>
                  ) : null}

                  {editUsingMStockLimitPrice ? (
                    <>
                      <div className="grid-2">
                        <div className="input-group">
                          {renderEditLabelWithInfo(
                            "edit-market-mstock-price-field",
                            "Candle level",
                            "mStockPriceField"
                          )}
                          <select
                            className="select"
                            id="edit-market-mstock-price-field"
                            value={getMStockPriceField(editLimitPriceSource)}
                            onChange={(event) =>
                              setEditLimitPriceSource(
                                getLimitPriceSourceFromMStockField(event.target.value)
                              )
                            }
                          >
                            <option value="open">Open</option>
                            <option value="high">High</option>
                            <option value="low">Low</option>
                            <option value="close">Close</option>
                          </select>
                        </div>
                        <div className="input-group">
                          {renderEditLabelWithInfo(
                            "edit-market-mstock-api-type",
                            "mStock API type",
                            "mStockApiType"
                          )}
                          <select
                            className="select"
                            id="edit-market-mstock-api-type"
                            value={editMStockApiType}
                            onChange={(event) => setEditMStockApiType(event.target.value)}
                          >
                            {M_STOCK_API_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="input-group">
                          {renderEditLabelWithInfo(
                            "edit-market-mstock-exchange",
                            "mStock exchange",
                            "mStockExchange"
                          )}
                          <input
                            className="input"
                            id="edit-market-mstock-exchange"
                            value={editMStockExchange}
                            onChange={(event) => setEditMStockExchange(event.target.value.toUpperCase())}
                            placeholder="e.g. NSE"
                          />
                        </div>
                      </div>

                      <div className="grid-2">
                        <div className="input-group">
                          {renderEditLabelWithInfo(
                            "edit-market-mstock-interval",
                            "Candle timeframe",
                            "mStockInterval"
                          )}
                          <select
                            className="select"
                            id="edit-market-mstock-interval"
                            value={editMStockInterval}
                            onChange={(event) => setEditMStockInterval(event.target.value)}
                          >
                            {M_STOCK_INTERVAL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="input-group">
                          <label className="label">mStock defaults</label>
                          <div className="helper">
                          Auth is taken from the admin mStock settings automatically.
                          </div>
                        </div>
                      </div>

                      <div className="input-group">
                        {renderEditLabelWithInfo(
                          "edit-market-mstock-candle-offset",
                          "mStock candle offset",
                          "mStockCandleOffset"
                        )}
                        <input
                          className="input"
                          id="edit-market-mstock-candle-offset"
                          type="number"
                          min="1"
                          step="1"
                          value={editMStockCandleOffset}
                          onChange={(event) => setEditMStockCandleOffset(event.target.value)}
                          placeholder="1"
                        />
                        <div className="helper">
                          Admin-saved mStock auth and defaults will be used automatically. `1` =
                          latest returned candle, `2` = previous candle.
                        </div>
                      </div>
                      <div className="helper">
                        Example: `Candle level = High` and `Candle timeframe = day` means order
                        price will use the daily candle high. `Open + day`, `Low + day`, and
                        `Close + day` work the same way.
                      </div>
                    </>
                  ) : null}

                  {editUsingDynamicLimitPrice ? (
                    <>
                      <div className="grid-2">
                        <div className="input-group">
                          {renderEditLabelWithInfo("edit-market-buffer-by", "Trade buffer by", "tradeBuffer")}
                          <select
                            className="select"
                            id="edit-market-buffer-by"
                            value={editBufferBy}
                            onChange={(event) => {
                              const next = event.target.value;
                              setEditBufferBy(next);
                              if (!next) setEditBufferPoints("");
                            }}
                            disabled={!editUsingDynamicLimitPrice}
                          >
                            <option value="">No buffer</option>
                            <option value="Point">Point</option>
                            <option value="Percentage">Percentage</option>
                          </select>
                        </div>
                        <div className="input-group">
                          {renderEditLabelWithInfo("edit-market-buffer-points", "Trade buffer value", "tradeBuffer")}
                          <input
                            className="input"
                            id="edit-market-buffer-points"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editBufferPoints}
                            onChange={(event) => setEditBufferPoints(event.target.value)}
                            placeholder={editBufferBy === "Percentage" ? "e.g. 1" : "e.g. 1"}
                            disabled={!editUsingDynamicLimitPrice || !editBufferBy}
                          />
                        </div>
                      </div>
                      <div className="helper">
                        Buffer works on the selected dynamic source price. BUY = source + buffer, SELL = source - buffer.
                      </div>
                    </>
                  ) : null}

                  <div className="grid-2">
                    <div className="input-group">
                      {renderEditLabelWithInfo(
                        "edit-market-qty-distribution",
                        "Qty distribution",
                        "qtyDistribution"
                      )}
                      <select
                        className="select"
                        id="edit-market-qty-distribution"
                        value={editQtyDistribution}
                        onChange={(event) => setEditQtyDistribution(event.target.value)}
                      >
                        <option value="">Select qty mode</option>
                        <option value="Fix">Fix</option>
                        <option value="Capital(%)">Capital(%)</option>
                      </select>
                    </div>
                    <div className="input-group">
                      {renderEditLabelWithInfo("edit-market-qty-value", "Qty value", "qtyValue")}
                      <input
                        className="input"
                        id="edit-market-qty-value"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editQtyValue}
                        onChange={(event) => setEditQtyValue(event.target.value)}
                        placeholder={editQtyDistribution === "Capital(%)" ? "e.g. 2" : "e.g. 5"}
                      />
                    </div>
                  </div>
                  <div className="helper">
                    Capital(%) uses: (Capital × Qty%) ÷ stock price.
                  </div>

                  {editQtyDistribution === "Capital(%)" ? (
                    <div className="input-group">
                      {renderEditLabelWithInfo(
                        "edit-market-capital-amount",
                        "Capital amount",
                        "capitalAmount"
                      )}
                      <input
                        className="input"
                        id="edit-market-capital-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editCapitalAmount}
                        onChange={(event) => setEditCapitalAmount(event.target.value)}
                        placeholder="e.g. 500000"
                      />
                    </div>
                  ) : null}
                </>
              )}

              <div className="input-group">
                {renderEditLabelWithInfo(
                  "edit-market-daily-trade-limit",
                  "Daily trade limit",
                  "dailyTradeLimit"
                )}
                {renderFeatureSwitch(
                  "edit-market-daily-trade-limit",
                  editUseDailyTradeLimit,
                  (checked) => {
                    setEditUseDailyTradeLimit(checked);
                    if (!checked) setEditDailyTradeLimit("");
                  },
                  "Enable daily trade limit",
                  "Cap how many trades this strategy can fire per day.",
                  undefined,
                  { tone: "limit", icon: "limit" }
                )}
              </div>

              {editUseDailyTradeLimit ? (
                <div className="input-group">
                  {renderEditLabelWithInfo(
                    "edit-market-daily-trade-limit-value",
                    "Daily trade limit value",
                    "dailyTradeLimitValue"
                  )}
                  <input
                    className="input"
                    id="edit-market-daily-trade-limit-value"
                    type="number"
                    min="1"
                    step="1"
                    value={editDailyTradeLimit}
                    onChange={(event) => setEditDailyTradeLimit(event.target.value)}
                    placeholder="e.g. 5"
                  />
                  <div className="helper">
                    Maximum trades allowed for this strategy in one day.
                  </div>
                </div>
              ) : null}
              </div>

              {!editExitFallbackSelected ? (
                <div className="form-section form-section--risk">
                  {renderFormSectionHeader({
                    title: "Risk controls",
                    description: "Optional target, stop loss, and trailing stop settings for live trades.",
                    icon: "shield",
                    tone: "risk",
                  })}

                  <div className="input-group">
                    {renderEditLabelWithInfo(
                      "edit-market-use-target",
                      "Target",
                      "targetToggle",
                      "risk-label-target"
                    )}
                    {renderFeatureSwitch(
                      "edit-market-use-target",
                      editUseTarget,
                      (checked) => {
                        setEditUseTarget(checked);
                        if (!checked) {
                          setEditTargetBy("");
                          setEditTarget("");
                        }
                      },
                      "Enable target",
                      "Book profit when price hits your target level.",
                      "risk-note risk-note-target",
                      { tone: "target", icon: "target" }
                    )}
                  </div>

                  {editUseTarget ? (
                    <div className="grid-2">
                      <div className="input-group">
                        {renderEditLabelWithInfo(
                          "edit-market-target-by",
                          "Target by",
                          "targetBy",
                          "risk-label-target"
                        )}
                        <select
                          className="select"
                          id="edit-market-target-by"
                          value={editTargetBy}
                          onChange={(event) => setEditTargetBy(event.target.value)}
                        >
                          <option value="">Select target type</option>
                          <option value="Money">Money</option>
                          <option value="Point">Point</option>
                          <option value="Percentage">Percentage</option>
                          <option value="Price">Price</option>
                          <option value="Ratio">Ratio</option>
                        </select>
                      </div>
                      <div className="input-group">
                        {renderEditLabelWithInfo(
                          "edit-market-target",
                          "Target",
                          "targetValue",
                          "risk-label-target"
                        )}
                        <input
                          className="input"
                          id="edit-market-target"
                          value={editTarget}
                          onChange={(event) => setEditTarget(event.target.value)}
                          placeholder={editTargetPlaceholder}
                        />
                        {isEditRatioTarget ? (
                          <div className="helper risk-helper-target">
                            {!activeEditSl.trim()
                              ? "Enable stop loss (or provide SL via webhook) to use ratio."
                              : editRatioComputed
                                ? `Computed target: ${editRatioComputed}`
                                : "Enter ratio like 1:2 or 2"}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="input-group">
                    {renderEditLabelWithInfo(
                      "edit-market-use-sl",
                      "Stop loss",
                      "stopLossToggle",
                      "risk-label-stop"
                    )}
                    {renderFeatureSwitch(
                      "edit-market-use-sl",
                      editUseStopLoss,
                      (checked) => {
                        setEditUseStopLoss(checked);
                        if (!checked) {
                          setEditSlBy("");
                          setEditSl("");
                        }
                      },
                      "Enable stop loss",
                      "Exit early if price moves against you.",
                      "risk-note risk-note-stop",
                      { tone: "risk", icon: "stop" }
                    )}
                  </div>

                  {editUseStopLoss ? (
                    <div className="grid-2">
                      <div className="input-group">
                        {renderEditLabelWithInfo(
                          "edit-market-sl-by",
                          "Stop loss by",
                          "stopLossBy",
                          "risk-label-stop"
                        )}
                        <select
                          className="select"
                          id="edit-market-sl-by"
                          value={editSlBy}
                          onChange={(event) => setEditSlBy(event.target.value)}
                        >
                          <option value="">Select SL type</option>
                          <option value="Money">Money</option>
                          <option value="Point">Point</option>
                          <option value="Percentage">Percentage</option>
                          <option value="Price">Price</option>
                        </select>
                      </div>
                      <div className="input-group">
                        {renderEditLabelWithInfo(
                          "edit-market-sl",
                          "Stop loss",
                          "stopLossValue",
                          "risk-label-stop"
                        )}
                        <input
                          className="input"
                          id="edit-market-sl"
                          value={editSl}
                          onChange={(event) => setEditSl(event.target.value)}
                          placeholder="e.g. 25"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="input-group">
                    {renderEditLabelWithInfo(
                      "edit-market-trail-sl",
                      "Trail SL",
                      "trailSl",
                      "risk-label-stop"
                    )}
                    {renderFeatureSwitch(
                      "edit-market-trail-sl",
                      editTrailSl,
                      (checked) => {
                        setEditTrailSl(checked);
                        if (!checked) {
                          setEditSlMove("");
                          setEditProfitMove("");
                        }
                      },
                      "Enable trailing stop loss",
                      "Move SL up as profit grows to lock gains.",
                      "risk-note risk-note-stop",
                      { tone: "risk", icon: "trail" }
                    )}
                  </div>

                  {editTrailSl ? (
                    <div className="grid-2">
                      <div className="input-group">
                        {renderEditLabelWithInfo(
                          "edit-market-sl-move",
                          "SL move",
                          "slMove",
                          "risk-label-stop"
                        )}
                        <input
                          className="input"
                          id="edit-market-sl-move"
                          value={editSlMove}
                          onChange={(event) => setEditSlMove(event.target.value)}
                          placeholder="e.g. 10"
                        />
                      </div>
                      <div className="input-group">
                        {renderEditLabelWithInfo(
                          "edit-market-profit-move",
                          "Profit move",
                          "profitMove",
                          "risk-label-stop"
                        )}
                        <input
                          className="input"
                          id="edit-market-profit-move"
                          value={editProfitMove}
                          onChange={(event) => setEditProfitMove(event.target.value)}
                          placeholder="e.g. 20"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="form-section form-section--alert">
                {renderFormSectionHeader({
                  title: "Alerts",
                  description: "Optional email and Telegram notifications for this strategy.",
                  icon: "bell",
                  tone: "alert",
                })}

                <div className="input-group">
                  {renderEditLabelWithInfo("edit-email-enable", "Email alerts", "emailAlerts")}
                  {renderFeatureSwitch(
                    "edit-email-enable",
                    editEmailEnabled,
                    setEditEmailEnabled,
                    `Send alerts to ${emailAlertTarget}`,
                    profileEmail
                      ? `Registered email: ${profileEmail}`
                      : "Alerts use your account email when available.",
                    undefined,
                    { tone: "alert", icon: "mail" }
                  )}
                </div>

                <div className="input-group">
                  {renderEditLabelWithInfo("edit-telegram-enable", "Telegram alerts", "telegramAlerts")}
                  {renderFeatureSwitch(
                    "edit-telegram-enable",
                    editTelegramEnabled,
                    setEditTelegramEnabled,
                    "Send alerts to Telegram",
                    "Telegram is linked via bot token subscription (no chat ID needed).",
                    undefined,
                    { tone: "alert", icon: "telegram" }
                  )}
                </div>
              </div>
              </div>

              <div className="cta-row form-actions">
                <button className="btn btn-primary" type="submit" disabled={editLoading}>
                  {editLoading ? "Saving..." : "Save changes"}
                </button>
                <button className="btn btn-ghost" type="button" onClick={closeEdit}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeInfo ? (
        <div className="modal-overlay modal-overlay-top" onClick={() => setActiveInfoKey(null)}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-title-row">
              <div className="page-title">{activeInfo.title}</div>
              <button className="btn btn-ghost" type="button" onClick={() => setActiveInfoKey(null)}>
                Close
              </button>
            </div>
            <div className="helper" style={{ marginTop: "12px", fontSize: "0.9rem", lineHeight: 1.6 }}>
              {activeInfo.description}
            </div>
            {activeInfo.points && activeInfo.points.length > 0 ? (
              <div className="list" style={{ marginTop: "16px" }}>
                {activeInfo.points.map((point) => (
                  <div className="list-item" key={point} style={{ alignItems: "flex-start" }}>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showWebhookTestModal ? (
        <div className="modal-overlay strategy-modal-overlay" onClick={closeWebhookTester}>
          <div
            className="modal modal-form card webhook-test-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="strategy-modal-header webhook-test-header">
              <div className="page-title">Test webhook</div>
              <button
                className="btn btn-ghost strategy-modal-close"
                type="button"
                aria-label="Close webhook tester"
                onClick={closeWebhookTester}
              >
                {renderStrategyUiIcon("close")}
              </button>
            </div>

            <div className="strategy-modal-body webhook-test-body">
              {testError ? <div className="alert alert-error">{testError}</div> : null}

              <div className="input-group webhook-test-url-group">
                <label className="label" htmlFor="test-webhook-url">
                  Webhook URL
                </label>
                <div className="token-field webhook-test-url-field">
                  <input
                    className="input"
                    id="test-webhook-url"
                    value={testWebhookUrl}
                    onChange={(event) => setTestWebhookUrl(event.target.value)}
                    placeholder="https://.../api/v1/webhooks/..."
                  />
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => copyToClipboard(testWebhookUrl.trim())}
                    disabled={!testWebhookUrl.trim()}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="webhook-test-provider-row" role="group" aria-label="Sample payload">
                <button
                  className={`webhook-test-provider-btn${
                    /tradingview/i.test(testWebhookUrl) ? "" : " is-active"
                  }`}
                  type="button"
                  onClick={() => {
                    setTestPayload(DEFAULT_WEBHOOK_TEST_PAYLOAD);
                    setTestStockInput("");
                    setTestWebhookUrl((current) =>
                      current.trim()
                        ? swapWebhookProviderInUrl(current, "chartink")
                        : resolveWebhookBase("chartink")
                    );
                  }}
                >
                  Chartink
                </button>
                <button
                  className={`webhook-test-provider-btn${
                    /tradingview/i.test(testWebhookUrl) ? " is-active" : ""
                  }`}
                  type="button"
                  onClick={() => {
                    setTestPayload(DEFAULT_TRADINGVIEW_TEST_PAYLOAD);
                    setTestStockInput("");
                    setTestWebhookUrl((current) =>
                      current.trim()
                        ? swapWebhookProviderInUrl(current, "tradingview")
                        : resolveWebhookBase("tradingview")
                    );
                  }}
                >
                  TradingView
                </button>
              </div>

              <div className="input-group stock-builder-group">
                <label className="label" htmlFor="test-stock-input">
                  Stocks
                </label>
                <div className="token-field">
                  <input
                    className="input"
                    id="test-stock-input"
                    value={testStockInput}
                    onChange={(event) => setTestStockInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddTestStock();
                      }
                    }}
                    placeholder="RELIANCE"
                    disabled={!testPayloadObject}
                  />
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={handleAddTestStock}
                    disabled={!testPayloadObject || !testStockInput.trim()}
                  >
                    Add
                  </button>
                </div>
                {!testPayloadObject ? (
                  <div className="helper">Fix JSON first to edit stocks.</div>
                ) : testPayloadStocks.length > 0 ? (
                  <div className="stock-chip-list">
                    {testPayloadStocks.map((stock) => (
                      <span className="stock-chip" key={stock}>
                        <span>{stock}</span>
                        <button
                          className="stock-chip-remove"
                          type="button"
                          onClick={() => handleRemoveTestStock(stock)}
                          aria-label={`Remove ${stock}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="input-group webhook-test-payload-group">
                <div className="webhook-test-payload-label-row">
                  <label className="label" htmlFor="test-webhook-payload">
                    Payload (JSON)
                  </label>
                  <button
                    className="btn btn-ghost btn-compact"
                    type="button"
                    onClick={() => copyToClipboard(testPayload)}
                    disabled={!testPayload.trim()}
                  >
                    Copy JSON
                  </button>
                </div>
                <textarea
                  className="textarea webhook-test-payload"
                  id="test-webhook-payload"
                  rows={11}
                  value={testPayload}
                  onChange={(event) => setTestPayload(event.target.value)}
                  spellCheck={false}
                />
              </div>

              {testResult ? (
                <div className="input-group">
                  <label className="label">Response</label>
                  <pre className="webhook-test-response">{testResult}</pre>
                </div>
              ) : null}
            </div>

            <div className="form-actions webhook-test-actions">
              <button className="btn btn-ghost" type="button" onClick={closeWebhookTester}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleWebhookTest}
                disabled={testLoading}
              >
                {testLoading ? "Testing..." : "Run test"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showModalError ? (
        <div className="modal-overlay" onClick={() => setError(null)}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            <div className="page-title">Error</div>
            <div className="alert alert-error" style={{ marginTop: "12px" }}>
              {error}
            </div>
            <div className="cta-row" style={{ marginTop: "16px" }}>
              <button className="btn btn-primary" type="button" onClick={() => setError(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
