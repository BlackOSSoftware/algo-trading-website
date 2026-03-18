"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, API_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Strategy = {
  _id: string;
  name: string;
  webhookUrl: string;
  webhookKey?: string;
  webhookPath?: string;
  marketMayaUrl?: string;
  marketMaya?: {
    token?: string;
    exchange?: string;
    segment?: string;
    symbolMode?: string;
    symbolKey?: string;
    maxSymbols?: number | string;
    callTypeFallback?: string;
    contract?: string;
    expiry?: string;
    expiryDate?: string;
    optionType?: string;
    atm?: string;
    strikePrice?: string;
    orderType?: string;
    limitPriceSource?: "fixed" | "trigger" | string;
    limitPrice?: string;
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

type LimitPriceSource = "fixed" | "trigger";
type WebhookProvider = "chartink" | "tradingview";

type InfoButtonVariant = "inline" | "chip";

const TELEGRAM_BOT_URL = "https://t.me/Alert_vibhav_bot";
const DEFAULT_WEBHOOK_TEST_PAYLOAD = JSON.stringify(
  {
    alert_name: "Breakout Alert",
    scan_name: "Chartink Scanner",
    stocks: "RELIANCE",
    trigger_price: 300,
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
    call_type: "BUY",
    triggered_at: "09:20:00",
  },
  null,
  2
);
const DEFAULT_TRADE_WINDOW_START = "09:15";
const DEFAULT_TRADE_WINDOW_END = "15:30";
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
const MARKET_SEGMENT_OPTIONS = ["EQ", "FUT", "OPT"];
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
    description: "This toggle controls whether a webhook signal should send an auto-trade request to Market Maya.",
    points: [
      "When off, the strategy can still store alerts, but auto trading will not run.",
      "When on, a trade request is generated using the strategy configuration.",
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
  symbolSource: {
    title: "Symbol Source",
    description: "This setting decides where the symbol should be read from in the webhook payload.",
    points: [
      "`Stocks: first only` uses only the first symbol from the `stocks` list.",
      "`Stocks: all` uses all comma-separated symbols.",
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
    description: "This decides whether the auto trade should be sent as a MARKET or LIMIT order.",
    points: [
      "MARKET creates an immediate market execution request.",
      "LIMIT uses a price and an optional buffer.",
      "This field does not apply in exit mode.",
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
    description: "Choose whether LIMIT order price should come from a fixed value or the Chartink webhook trigger price.",
    points: [
      "Fixed limit price sends the exact price you enter.",
      "Chartink trigger price uses payload trigger_price, and buffer can adjust it.",
    ],
  },
  tradeBuffer: {
    title: "Trade Buffer",
    description: "For LIMIT orders, a buffer can be added above or below the trigger price to derive the final price.",
    points: [
      "For BUY, the final price is trigger plus buffer.",
      "For SELL, the final price is trigger minus buffer.",
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

function pickExchangeForSegment(exchange: string, segment: string) {
  const options = getExchangeOptions(segment);
  if (options.includes(exchange)) return exchange;
  return segment === "EQ" ? DEFAULT_EQ_EXCHANGE : DEFAULT_DERIVATIVE_EXCHANGE;
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
  if (raw === "fixed" || raw === "manual" || raw === "limit") return "fixed";
  return String(limitPriceValue || "").trim() ? "fixed" : "trigger";
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

export default function StrategyPage() {
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [marketMayaToken, setMarketMayaToken] = useState("");
  const [showMarketMayaToken, setShowMarketMayaToken] = useState(false);
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
  const [callTypeFallback, setCallTypeFallback] = useState("");
  const [orderType, setOrderType] = useState("MARKET");
  const [limitPriceSource, setLimitPriceSource] =
    useState<LimitPriceSource>(DEFAULT_LIMIT_PRICE_SOURCE);
  const [limitPrice, setLimitPrice] = useState("");
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
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [telegramToken, setTelegramToken] = useState<TelegramToken | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Strategy | null>(null);
  const [editName, setEditName] = useState("");
  const [editEnabled, setEditEnabled] = useState(false);
  const [editMarketMayaToken, setEditMarketMayaToken] = useState("");
  const [showEditMarketMayaToken, setShowEditMarketMayaToken] = useState(false);
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
  const [editCallTypeFallback, setEditCallTypeFallback] = useState("");
  const [editOrderType, setEditOrderType] = useState("MARKET");
  const [editLimitPriceSource, setEditLimitPriceSource] =
    useState<LimitPriceSource>(DEFAULT_LIMIT_PRICE_SOURCE);
  const [editLimitPrice, setEditLimitPrice] = useState("");
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
  const [showAddInfoButtons, setShowAddInfoButtons] = useState(true);
  const [showEditInfoButtons, setShowEditInfoButtons] = useState(true);
  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);

  const webhookBaseUrl = useMemo(() => {
    const base =
      process.env.NEXT_PUBLIC_WEBHOOK_URL || API_BASE_URL;
    return `${base}/api/v1/webhooks`;
  }, []);

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
  const usingFixedLimitPrice = orderType === "LIMIT" && limitPriceSource === "fixed";
  const usingTriggerLimitPrice = orderType === "LIMIT" && limitPriceSource === "trigger";
  const derivativeSegmentSelected = isDerivativeSegment(segment);
  const optionSegmentSelected = segment === "OPT";
  const exchangeOptions = getExchangeOptions(segment);
  const expiryOptions = getExpiryOptions(segment);
  const editDerivativeSegmentSelected = isDerivativeSegment(editSegment);
  const editOptionSegmentSelected = editSegment === "OPT";
  const editUsingFixedLimitPrice = editOrderType === "LIMIT" && editLimitPriceSource === "fixed";
  const editUsingTriggerLimitPrice =
    editOrderType === "LIMIT" && editLimitPriceSource === "trigger";
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
    showInfo = true
  ) => (
    <div className="label-row">
      <label className="label" htmlFor={htmlFor}>
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
      <div className="page-title">{title}</div>
      {renderInfoButton(infoKey, "chip", showInfo)}
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

  const renderAddLabelWithInfo = (htmlFor: string, label: string, infoKey: string) =>
    renderLabelWithInfo(htmlFor, label, infoKey, showAddInfoButtons);

  const renderEditLabelWithInfo = (htmlFor: string, label: string, infoKey: string) =>
    renderLabelWithInfo(htmlFor, label, infoKey, showEditInfoButtons);

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
    setShowAddInfoButtons(true);
    setShowMarketMayaToken(false);
    setActiveInfoKey(null);
    setShowModal(true);
  };

  const closeAdd = () => {
    setActiveInfoKey(null);
    setShowAddInfoButtons(true);
    setShowMarketMayaToken(false);
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

  const openWebhookTester = (
    url: string,
    payloadText = DEFAULT_WEBHOOK_TEST_PAYLOAD
  ) => {
    setTestWebhookUrl(url);
    setTestPayload(payloadText);
    setTestError(null);
    setTestResult(null);
    setShowWebhookTestModal(true);
  };

  const closeWebhookTester = () => {
    setShowWebhookTestModal(false);
    setTestLoading(false);
  };

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
        if (usingTriggerLimitPrice && trimmedBufferBy && !trimmedBufferPoints) {
          setError("Trade buffer value is required when buffer type is selected.");
          return;
        }
        if (usingTriggerLimitPrice && trimmedBufferPoints && !trimmedBufferBy) {
          setError("Select trade buffer type (Point/Percentage).");
          return;
        }
      }
      if (useDailyTradeLimit && !trimmedDailyTradeLimit) {
        setError("Daily trade limit is required when enabled.");
        return;
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

      const dailyTradeLimitNumber = trimmedDailyTradeLimit ? Number(trimmedDailyTradeLimit) : NaN;
      if (
        useDailyTradeLimit &&
        (!Number.isFinite(dailyTradeLimitNumber) || dailyTradeLimitNumber <= 0)
      ) {
        setError("Daily trade limit must be a positive number.");
        return;
      }

      const token = getToken();
      const marketMaya: Record<string, unknown> = {
        exchange,
        segment,
        symbolMode,
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
        ...(symbolMode !== "stocksFirst" && maxSymbols.trim()
          ? { maxSymbols: maxSymbols.trim() }
          : {}),
        ...(callTypeFallback ? { callTypeFallback } : {}),
        ...(!exitFallbackSelected ? { orderType } : {}),
        ...(!exitFallbackSelected && orderType === "LIMIT" ? { limitPriceSource } : {}),
        ...(!exitFallbackSelected && usingFixedLimitPrice && trimmedLimitPrice
          ? { limitPrice: trimmedLimitPrice }
          : {}),
        ...(!exitFallbackSelected && usingTriggerLimitPrice && trimmedBufferBy
          ? { bufferBy: trimmedBufferBy }
          : {}),
        ...(!exitFallbackSelected && usingTriggerLimitPrice && trimmedBufferPoints
          ? { bufferValue: bufferPointsNumber }
          : {}),
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
      };
      const payload: Record<string, unknown> = {
        name,
        webhookUrl: resolveWebhookBase("chartink"),
        enabled,
        emailEnabled,
        telegramEnabled,
        marketMaya,
      };
      if (enabled && marketMayaToken.trim()) {
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
      setMarketMayaToken("");
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
      setCallTypeFallback("");
      setOrderType("MARKET");
      setLimitPriceSource(DEFAULT_LIMIT_PRICE_SOURCE);
      setLimitPrice("");
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
      setEnabled(false);
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
    setShowEditInfoButtons(true);
    setActiveInfoKey(null);
    setEditing({ ...item, _id: normalizeId(item._id) });
    setEditName(item.name || "");
    setEditEnabled(Boolean(item.enabled));
    const mm = item.marketMaya || {};
    setShowEditMarketMayaToken(Boolean(mm.token));
    setEditMarketMayaToken(mm.token || "");
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
    setEditSymbolMode(mm.symbolMode || "stocksFirst");
    setEditSymbolKey(mm.symbolKey || "symbol");
    setEditMaxSymbols(mm.maxSymbols ? String(mm.maxSymbols) : "");
    setEditCallTypeFallback(mm.callTypeFallback || "");
    setEditOrderType(mm.orderType || "MARKET");
    setEditLimitPriceSource(resolveLimitPriceSource(mm.limitPriceSource, mm.limitPrice));
    setEditLimitPrice(mm.limitPrice || "");
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
    setShowEditInfoButtons(true);
    setShowEditMarketMayaToken(false);
    setEditing(null);
    setEditName("");
    setEditEnabled(false);
    setEditMarketMayaToken("");
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
    setEditCallTypeFallback("");
    setEditOrderType("MARKET");
    setEditLimitPriceSource(DEFAULT_LIMIT_PRICE_SOURCE);
    setEditLimitPrice("");
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
        if (editUsingTriggerLimitPrice && trimmedBufferBy && !trimmedBufferPoints) {
          setError("Trade buffer value is required when buffer type is selected.");
          return;
        }
        if (editUsingTriggerLimitPrice && trimmedBufferPoints && !trimmedBufferBy) {
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

      const dailyTradeLimitNumber = trimmedDailyTradeLimit ? Number(trimmedDailyTradeLimit) : NaN;
      if (
        editUseDailyTradeLimit &&
        (!Number.isFinite(dailyTradeLimitNumber) || dailyTradeLimitNumber <= 0)
      ) {
        setError("Daily trade limit must be a positive number.");
        return;
      }

      const marketMayaClear = new Set<string>();
      if (editExitFallbackSelected || editOrderType !== "LIMIT") {
        marketMayaClear.add("limitPriceSource");
        marketMayaClear.add("limitPrice");
      } else if (editLimitPriceSource === "trigger") {
        marketMayaClear.add("limitPrice");
      }
      if (
        editExitFallbackSelected ||
        editOrderType !== "LIMIT" ||
        editLimitPriceSource !== "trigger" ||
        !trimmedBufferBy ||
        !trimmedBufferPoints
      ) {
        marketMayaClear.add("bufferBy");
        marketMayaClear.add("bufferValue");
        marketMayaClear.add("bufferPoints");
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
        exchange: editExchange,
        segment: editSegment,
        symbolMode: editSymbolMode,
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
        ...(editSymbolMode !== "stocksFirst" && editMaxSymbols.trim()
          ? { maxSymbols: editMaxSymbols.trim() }
          : {}),
        ...(editCallTypeFallback ? { callTypeFallback: editCallTypeFallback } : {}),
        ...(!editExitFallbackSelected ? { orderType: editOrderType } : {}),
        ...(!editExitFallbackSelected && editOrderType === "LIMIT"
          ? { limitPriceSource: editLimitPriceSource }
          : {}),
        ...(!editExitFallbackSelected && editUsingFixedLimitPrice && trimmedEditLimitPrice
          ? { limitPrice: trimmedEditLimitPrice }
          : {}),
        ...(!editExitFallbackSelected && editUsingTriggerLimitPrice && trimmedBufferBy
          ? { bufferBy: trimmedBufferBy }
          : {}),
        ...(!editExitFallbackSelected && editUsingTriggerLimitPrice && trimmedBufferPoints
          ? { bufferValue: bufferPointsNumber }
          : {}),
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
      if (editEnabled && editMarketMayaToken.trim()) {
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
          <div className="helper">
            Add your strategy name, copy the webhook, and enable Market Maya
            when required.
          </div>
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

      <div className="card">
        {renderTitleWithInfo("Saved strategies", "savedStrategies")}
        {strategies.length === 0 ? (
          <div className="helper">No strategies saved yet.</div>
        ) : (
          <div className="list">
            {strategies.map((item) => (
              <div className="list-item strategy-item" key={item._id}>
                <div className="strategy-meta">
                  <div className="strategy-title-row">
                    <strong>{item.name}</strong>
                  </div>
                  <div className="helper">
                    {item.enabled ? "Market Maya enabled" : "Market Maya off"}
                  </div>
                  <div className="helper">
                    {isEmailAlertEnabled(item) ? "Email alerts on" : "Email alerts off"}
                  </div>
                  <div className="helper">
                    {item.telegramEnabled ? "Telegram alerts on" : "Telegram alerts off"}
                  </div>
                </div>
                <div className="strategy-actions">
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => {
                      copyToClipboard(resolveWebhookUrl(item, "chartink"));
                    }}
                  >
                    Copy Chartink
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => {
                      copyToClipboard(resolveWebhookUrl(item, "tradingview"));
                    }}
                  >
                    Copy TV
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() =>
                      openWebhookTester(resolveWebhookUrl(item, "chartink"), DEFAULT_WEBHOOK_TEST_PAYLOAD)
                    }
                  >
                    Test Chartink
                  </button>
                  <button
                    className="btn btn-secondary"
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
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => openEdit(item)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={toggleLoadingId === item._id}
                    onClick={() => handleToggleEnabled(item)}
                  >
                    {toggleLoadingId === item._id
                      ? item.enabled
                        ? "Disabling..."
                        : "Enabling..."
                      : item.enabled
                        ? "Disable"
                        : "Enable"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={deleteLoadingId === item._id}
                    onClick={() => handleDelete(item)}
                  >
                    {deleteLoadingId === item._id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal ? (
        <div className="modal-overlay" onClick={closeAdd}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header-row">
              <div className="page-title">Add strategy</div>
              {renderInfoToggle(showAddInfoButtons, setShowAddInfoButtons)}
            </div>
            <form className="form" onSubmit={handleSubmit} style={{ marginTop: "16px" }}>
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
                {renderAddLabelWithInfo("market-enable", "Enable Market Maya", "marketMayaEnable")}
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Send alerts to Market Maya</span>
                  <input
                    id="market-enable"
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                  />
                </div>
              </div>

              {enabled ? (
                <div className="input-group">
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
                  <div className="helper">
                    Required for live trades. Leave blank to use server default.
                  </div>
                </div>
              ) : null}

              {renderAddTitleWithInfo("Symbol handling", "symbolSource", { marginTop: "10px" })}
              <div className="helper">
                Control how symbols are picked from webhook payloads.
              </div>

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
                    disabled={symbolMode === "stocksFirst"}
                  />
                  <div className="helper">Up to 25. Leave blank for default 5.</div>
                </div>
              </div>

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
                  <div className="helper">Webhook field name to read symbols from.</div>
                </div>
              ) : null}

              {renderAddTitleWithInfo("Instrument setup", "instrumentSetup", { marginTop: "10px" })}
              <div className="helper">
                Select the segment first. EQ keeps the form simple, while FUT and OPT reveal only the derivative fields that matter.
              </div>

              <div className="grid-2">
                <div className="input-group">
                  {renderAddLabelWithInfo("market-exchange", "Exchange", "exchange")}
                  <select
                    className="select"
                    id="market-exchange"
                    value={exchange}
                    onChange={(event) => setExchange(event.target.value)}
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
                      <option key={option} value={option}>
                        {option}
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

              {renderAddTitleWithInfo("Trade defaults", "tradeSideFallback", { marginTop: "10px" })}
              <div className="helper">
                Payload `call_type` is used first. Fallback is used only when payload side is missing.
              </div>

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
                <div className="helper">
                  Default window is 09:15 to 15:30. `triggered_at` is used when Chartink sends it.
                </div>

              <div className="grid-2">
                <div className="input-group">
                  {renderAddLabelWithInfo("market-calltype", "Trade side fallback", "tradeSideFallback")}
                  <select
                    className="select"
                    id="market-calltype"
                    value={callTypeFallback}
                    onChange={(event) => setCallTypeFallback(event.target.value)}
                  >
                    <option value="">Use payload `call_type`</option>
                    {STRATEGY_CALL_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                {!exitFallbackSelected ? (
                  <div className="input-group">
                    {renderAddLabelWithInfo("market-ordertype", "Order type", "orderType")}
                    <select
                      className="select"
                      id="market-ordertype"
                      value={orderType}
                      onChange={(event) => {
                        const next = event.target.value;
                        setOrderType(next);
                        if (next !== "LIMIT") {
                          setLimitPriceSource(DEFAULT_LIMIT_PRICE_SOURCE);
                          setLimitPrice("");
                          setBufferBy("");
                          setBufferPoints("");
                        }
                      }}
                    >
                      <option value="MARKET">MARKET</option>
                      <option value="LIMIT">LIMIT</option>
                    </select>
                  </div>
                ) : null}
              </div>

              {exitFallbackSelected ? (
                <div className="helper">
                  Exit mode only sends the exit signal. Order type, qty, target, stop loss, and trail SL are ignored.
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
                          value={limitPriceSource}
                          onChange={(event) =>
                            setLimitPriceSource(event.target.value as LimitPriceSource)
                          }
                        >
                          <option value="fixed">Fixed limit price</option>
                          <option value="trigger">Chartink trigger price</option>
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
                          Chartink payload `trigger_price` will be used for the LIMIT order.
                        </div>
                      )}
                    </>
                  ) : null}

                  {usingTriggerLimitPrice ? (
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
                            disabled={!usingTriggerLimitPrice}
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
                            disabled={!usingTriggerLimitPrice || !bufferBy}
                          />
                        </div>
                      </div>
                      <div className="helper">
                        Buffer is only used with Chartink trigger price. BUY = trigger + buffer, SELL = trigger - buffer.
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
                    Capital(%) qty: (Capital Amount * Qty% / 100) / stock price.
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
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Enable daily trade limit</span>
                  <input
                    id="market-daily-trade-limit"
                    type="checkbox"
                    checked={useDailyTradeLimit}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setUseDailyTradeLimit(checked);
                      if (!checked) {
                        setDailyTradeLimit("");
                      }
                    }}
                  />
                </div>
              </div>

              {useDailyTradeLimit ? (
                <div className="input-group">
                  {renderAddLabelWithInfo(
                    "market-daily-trade-limit-value",
                    "Daily trade limit value",
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
                    Max trades per day for this strategy. Leave blank for no limit.
                  </div>
                </div>
              ) : null}

              {!exitFallbackSelected ? (
                <>
                  <div className="input-group">
                    {renderAddLabelWithInfo("market-use-target", "Target", "targetToggle")}
                    <div className="list-item" style={{ justifyContent: "space-between" }}>
                      <span>Enable target</span>
                      <input
                        id="market-use-target"
                        type="checkbox"
                        checked={useTarget}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setUseTarget(checked);
                          if (!checked) {
                            setTargetBy("");
                            setTarget("");
                          }
                        }}
                      />
                    </div>
                  </div>

                  {useTarget ? (
                    <div className="grid-2">
                      <div className="input-group">
                        {renderAddLabelWithInfo("market-target-by", "Target by", "targetBy")}
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
                        {renderAddLabelWithInfo("market-target", "Target", "targetValue")}
                        <input
                          className="input"
                          id="market-target"
                          value={target}
                          onChange={(event) => setTarget(event.target.value)}
                          placeholder={targetPlaceholder}
                        />
                        {isRatioTarget ? (
                          <div className="helper">
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
                    {renderAddLabelWithInfo("market-use-sl", "Stop loss", "stopLossToggle")}
                    <div className="list-item" style={{ justifyContent: "space-between" }}>
                      <span>Enable stop loss</span>
                      <input
                        id="market-use-sl"
                        type="checkbox"
                        checked={useStopLoss}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setUseStopLoss(checked);
                          if (!checked) {
                            setSlBy("");
                            setSl("");
                          }
                        }}
                      />
                    </div>
                  </div>

                  {useStopLoss ? (
                    <div className="grid-2">
                      <div className="input-group">
                        {renderAddLabelWithInfo("market-sl-by", "Stop loss by", "stopLossBy")}
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
                        {renderAddLabelWithInfo("market-sl", "Stop loss", "stopLossValue")}
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
                    {renderAddLabelWithInfo("market-trail-sl", "Trail SL", "trailSl")}
                    <div className="list-item" style={{ justifyContent: "space-between" }}>
                      <span>Enable trailing stop loss</span>
                      <input
                        id="market-trail-sl"
                        type="checkbox"
                        checked={trailSl}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setTrailSl(checked);
                          if (!checked) {
                            setSlMove("");
                            setProfitMove("");
                          }
                        }}
                      />
                    </div>
                  </div>

                  {trailSl ? (
                    <div className="grid-2">
                      <div className="input-group">
                        {renderAddLabelWithInfo("market-sl-move", "SL move", "slMove")}
                        <input
                          className="input"
                          id="market-sl-move"
                          value={slMove}
                          onChange={(event) => setSlMove(event.target.value)}
                          placeholder="e.g. 10"
                        />
                      </div>
                      <div className="input-group">
                        {renderAddLabelWithInfo("market-profit-move", "Profit move", "profitMove")}
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
                </>
              ) : null}

              <div className="input-group">
                {renderAddLabelWithInfo("email-enable", "Email alerts", "emailAlerts")}
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Send alerts to {emailAlertTarget}</span>
                  <input
                    id="email-enable"
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(event) => setEmailEnabled(event.target.checked)}
                  />
                </div>
                <div className="helper">
                  {profileEmail
                    ? `Registered email: ${profileEmail}`
                    : "Alerts use your account email when available."}
                </div>
              </div>

              <div className="input-group">
                {renderAddLabelWithInfo("telegram-enable", "Telegram alerts", "telegramAlerts")}
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Send alerts to Telegram</span>
                  <input
                    id="telegram-enable"
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(event) => setTelegramEnabled(event.target.checked)}
                  />
                </div>
                <div className="helper">
                  Telegram is linked via bot token subscription (no chat ID needed).
                </div>
              </div>

              <div className="cta-row" style={{ marginTop: "8px" }}>
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
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header-row">
              <div className="page-title">Edit strategy</div>
              {renderInfoToggle(showEditInfoButtons, setShowEditInfoButtons)}
            </div>
            <form className="form" onSubmit={handleUpdate} style={{ marginTop: "16px" }}>
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
                <div className="helper">Webhook key stays the same for both providers.</div>
              </div>

              <div className="input-group">
                {renderEditLabelWithInfo("edit-market-enable", "Enable Market Maya", "marketMayaEnable")}
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Send alerts to Market Maya</span>
                  <input
                    id="edit-market-enable"
                    type="checkbox"
                    checked={editEnabled}
                    onChange={(event) => setEditEnabled(event.target.checked)}
                  />
                </div>
              </div>

              {editEnabled ? (
                <div className="input-group">
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
                  <div className="helper">Saved token is shown here. Update it if you want to replace it.</div>
                </div>
              ) : null}

              {renderEditTitleWithInfo("Symbol handling", "symbolSource", { marginTop: "10px" })}
              <div className="helper">
                Control how symbols are picked from webhook payloads.
              </div>

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
                    disabled={editSymbolMode === "stocksFirst"}
                  />
                  <div className="helper">Up to 25. Leave blank for default 5.</div>
                </div>
              </div>

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
                  <div className="helper">Webhook field name to read symbols from.</div>
                </div>
              ) : null}

              {renderEditTitleWithInfo("Instrument setup", "instrumentSetup", { marginTop: "10px" })}
              <div className="helper">
                Select the segment first. EQ hides derivative fields, while FUT and OPT reveal only the contract fields needed for that segment.
              </div>

              <div className="grid-2">
                <div className="input-group">
                  {renderEditLabelWithInfo("edit-market-exchange", "Exchange", "exchange")}
                  <select
                    className="select"
                    id="edit-market-exchange"
                    value={editExchange}
                    onChange={(event) => setEditExchange(event.target.value)}
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
                      <option key={option} value={option}>
                        {option}
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

              {renderEditTitleWithInfo("Trade defaults", "tradeSideFallback", { marginTop: "10px" })}
              <div className="helper">
                Payload `call_type` is used first. Fallback is used only when payload side is missing.
              </div>

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
              <div className="helper">
                Default window is 09:15 to 15:30. `triggered_at` is used when Chartink sends it.
              </div>

              <div className="grid-2">
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
                {!editExitFallbackSelected ? (
                  <div className="input-group">
                    {renderEditLabelWithInfo("edit-market-ordertype", "Order type", "orderType")}
                    <select
                      className="select"
                      id="edit-market-ordertype"
                      value={editOrderType}
                      onChange={(event) => {
                        const next = event.target.value;
                        setEditOrderType(next);
                        if (next !== "LIMIT") {
                          setEditLimitPriceSource(DEFAULT_LIMIT_PRICE_SOURCE);
                          setEditLimitPrice("");
                          setEditBufferBy("");
                          setEditBufferPoints("");
                        }
                      }}
                    >
                      <option value="MARKET">MARKET</option>
                      <option value="LIMIT">LIMIT</option>
                    </select>
                  </div>
                ) : null}
              </div>

              {editExitFallbackSelected ? (
                <div className="helper">
                  Exit mode only sends the exit signal. Order type, qty, target, stop loss, and trail SL are ignored.
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
                          value={editLimitPriceSource}
                          onChange={(event) =>
                            setEditLimitPriceSource(event.target.value as LimitPriceSource)
                          }
                        >
                          <option value="fixed">Fixed limit price</option>
                          <option value="trigger">Chartink trigger price</option>
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
                          Chartink payload `trigger_price` will be used for the LIMIT order.
                        </div>
                      )}
                    </>
                  ) : null}

                  {editUsingTriggerLimitPrice ? (
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
                            disabled={!editUsingTriggerLimitPrice}
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
                            disabled={!editUsingTriggerLimitPrice || !editBufferBy}
                          />
                        </div>
                      </div>
                      <div className="helper">
                        Buffer is only used with Chartink trigger price. BUY = trigger + buffer, SELL = trigger - buffer.
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
                    Capital(%) qty: (Capital Amount * Qty% / 100) / stock price.
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
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Enable daily trade limit</span>
                  <input
                    id="edit-market-daily-trade-limit"
                    type="checkbox"
                    checked={editUseDailyTradeLimit}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setEditUseDailyTradeLimit(checked);
                      if (!checked) {
                        setEditDailyTradeLimit("");
                      }
                    }}
                  />
                </div>
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
                    Max trades per day for this strategy. Leave blank for no limit.
                  </div>
                </div>
              ) : null}

              {!editExitFallbackSelected ? (
                <>
                  <div className="input-group">
                    {renderEditLabelWithInfo("edit-market-use-target", "Target", "targetToggle")}
                    <div className="list-item" style={{ justifyContent: "space-between" }}>
                      <span>Enable target</span>
                      <input
                        id="edit-market-use-target"
                        type="checkbox"
                        checked={editUseTarget}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setEditUseTarget(checked);
                          if (!checked) {
                            setEditTargetBy("");
                            setEditTarget("");
                          }
                        }}
                      />
                    </div>
                  </div>

                  {editUseTarget ? (
                    <div className="grid-2">
                      <div className="input-group">
                        {renderEditLabelWithInfo("edit-market-target-by", "Target by", "targetBy")}
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
                        {renderEditLabelWithInfo("edit-market-target", "Target", "targetValue")}
                        <input
                          className="input"
                          id="edit-market-target"
                          value={editTarget}
                          onChange={(event) => setEditTarget(event.target.value)}
                          placeholder={editTargetPlaceholder}
                        />
                        {isEditRatioTarget ? (
                          <div className="helper">
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
                    {renderEditLabelWithInfo("edit-market-use-sl", "Stop loss", "stopLossToggle")}
                    <div className="list-item" style={{ justifyContent: "space-between" }}>
                      <span>Enable stop loss</span>
                      <input
                        id="edit-market-use-sl"
                        type="checkbox"
                        checked={editUseStopLoss}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setEditUseStopLoss(checked);
                          if (!checked) {
                            setEditSlBy("");
                            setEditSl("");
                          }
                        }}
                      />
                    </div>
                  </div>

                  {editUseStopLoss ? (
                    <div className="grid-2">
                      <div className="input-group">
                        {renderEditLabelWithInfo("edit-market-sl-by", "Stop loss by", "stopLossBy")}
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
                        {renderEditLabelWithInfo("edit-market-sl", "Stop loss", "stopLossValue")}
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
                    {renderEditLabelWithInfo("edit-market-trail-sl", "Trail SL", "trailSl")}
                    <div className="list-item" style={{ justifyContent: "space-between" }}>
                      <span>Enable trailing stop loss</span>
                      <input
                        id="edit-market-trail-sl"
                        type="checkbox"
                        checked={editTrailSl}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setEditTrailSl(checked);
                          if (!checked) {
                            setEditSlMove("");
                            setEditProfitMove("");
                          }
                        }}
                      />
                    </div>
                  </div>

                  {editTrailSl ? (
                    <div className="grid-2">
                      <div className="input-group">
                        {renderEditLabelWithInfo("edit-market-sl-move", "SL move", "slMove")}
                        <input
                          className="input"
                          id="edit-market-sl-move"
                          value={editSlMove}
                          onChange={(event) => setEditSlMove(event.target.value)}
                          placeholder="e.g. 10"
                        />
                      </div>
                      <div className="input-group">
                        {renderEditLabelWithInfo("edit-market-profit-move", "Profit move", "profitMove")}
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
                </>
              ) : null}

              <div className="input-group">
                {renderEditLabelWithInfo("edit-email-enable", "Email alerts", "emailAlerts")}
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Send alerts to {emailAlertTarget}</span>
                  <input
                    id="edit-email-enable"
                    type="checkbox"
                    checked={editEmailEnabled}
                    onChange={(event) => setEditEmailEnabled(event.target.checked)}
                  />
                </div>
                <div className="helper">
                  {profileEmail
                    ? `Registered email: ${profileEmail}`
                    : "Alerts use your account email when available."}
                </div>
              </div>

              <div className="input-group">
                {renderEditLabelWithInfo("edit-telegram-enable", "Telegram alerts", "telegramAlerts")}
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Send alerts to Telegram</span>
                  <input
                    id="edit-telegram-enable"
                    type="checkbox"
                    checked={editTelegramEnabled}
                    onChange={(event) => setEditTelegramEnabled(event.target.checked)}
                  />
                </div>
              </div>

              <div className="cta-row" style={{ marginTop: "8px" }}>
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
        <div className="modal-overlay" onClick={closeWebhookTester}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            {renderTitleWithInfo("Test webhook", "testWebhook")}
            <div className="helper" style={{ marginTop: "8px" }}>
              Paste Chartink-like or TradingView JSON payload and click test to verify strategy webhook.
            </div>

            {testError ? (
              <div className="alert alert-error" style={{ marginTop: "12px" }}>
                {testError}
              </div>
            ) : null}

            <div className="input-group" style={{ marginTop: "12px" }}>
              <label className="label" htmlFor="test-webhook-url">
                Webhook URL
              </label>
              <input
                className="input"
                id="test-webhook-url"
                value={testWebhookUrl}
                onChange={(event) => setTestWebhookUrl(event.target.value)}
                placeholder="https://.../api/v1/webhooks/chartink?key=... or /tradingview?key=..."
              />
            </div>

            <div className="input-group">
              <div className="cta-row" style={{ gap: "8px", marginBottom: "8px" }}>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => {
                    setTestPayload(DEFAULT_WEBHOOK_TEST_PAYLOAD);
                    setTestWebhookUrl((current) =>
                      current.trim()
                        ? swapWebhookProviderInUrl(current, "chartink")
                        : resolveWebhookBase("chartink")
                    );
                  }}
                >
                  Load Chartink sample
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => {
                    setTestPayload(DEFAULT_TRADINGVIEW_TEST_PAYLOAD);
                    setTestWebhookUrl((current) =>
                      current.trim()
                        ? swapWebhookProviderInUrl(current, "tradingview")
                        : resolveWebhookBase("tradingview")
                    );
                  }}
                >
                  Load TradingView sample
                </button>
              </div>
              <label className="label" htmlFor="test-webhook-payload">
                Test payload (JSON)
              </label>
              <textarea
                className="textarea"
                id="test-webhook-payload"
                rows={10}
                value={testPayload}
                onChange={(event) => setTestPayload(event.target.value)}
              />
              <div className="helper">
                Example keys: `alert_name`, `scan_name`, `stocks` or `symbol`, `trigger_price`, optional `call_type`.
              </div>
            </div>

            {testResult ? (
              <div className="input-group">
                <label className="label">Response</label>
                <pre className="mono" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                  {testResult}
                </pre>
              </div>
            ) : null}

            <div className="cta-row" style={{ marginTop: "14px" }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleWebhookTest}
                disabled={testLoading}
              >
                {testLoading ? "Testing..." : "Run test"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={closeWebhookTester}>
                Cancel
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
