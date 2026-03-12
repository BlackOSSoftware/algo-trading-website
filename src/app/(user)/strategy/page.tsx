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
    symbolMode?: string;
    symbolKey?: string;
    maxSymbols?: number | string;
    callTypeFallback?: string;
    orderType?: string;
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
const INFO_CONTENT: Record<string, InfoContent> = {
  telegramAccess: {
    title: "Telegram Access",
    description: "Is section se bot token generate hota hai jise Telegram bot ko bhejkar alerts start kiye jaate hain.",
    points: [
      "Generate token karo, phir bot me `/startAlert <token>` bhejo.",
      "User chat manually enter nahi karna hota.",
      "Alerts stop karne ke liye `/stopAlert` use hota hai.",
    ],
  },
  savedStrategies: {
    title: "Saved Strategies",
    description: "Yahan sab saved webhook strategies list hoti hain aur inka current status dikhta hai.",
    points: [
      "Copy Webhook se Chartink URL copy hota hai.",
      "Enable/Disable se auto trading on/off hota hai.",
      "Edit se configuration update hoti hai.",
    ],
  },
  strategyName: {
    title: "Strategy Name",
    description: "Sirf internal naam hai jisse aap dashboard me strategy ko pehchanoge.",
    points: [
      "Webhook execution aur alerts me ye naam dikh sakta hai.",
      "Chartink payload ke kisi field se ye auto nahi aata.",
    ],
  },
  marketMayaEnable: {
    title: "Enable Market Maya",
    description: "Is toggle se webhook signal aane par Market Maya auto trade request bhejna on/off hota hai.",
    points: [
      "Off hone par strategy alerts store ho sakte hain, lekin auto trade nahi chalega.",
      "On karne par strategy config ke hisaab se trade request banegi.",
    ],
  },
  marketMayaToken: {
    title: "Market Maya Token",
    description: "Ye token Market Maya API ko authorize karta hai.",
    points: [
      "Agar blank chhoda to server default token use hoga.",
      "Live trade ke liye valid token zaroori hai.",
    ],
  },
  symbolSource: {
    title: "Symbol Source",
    description: "Webhook payload me symbol kaha se read karna hai, ye option decide karta hai.",
    points: [
      "`Stocks: first only` me `stocks` list ka sirf pehla symbol use hota hai.",
      "`Stocks: all` me comma-separated sab symbols use hote hain.",
      "`Symbol field` mode me custom key se symbols read hote hain.",
    ],
  },
  maxSymbols: {
    title: "Max Symbols",
    description: "Multi-symbol mode me maximum kitne symbols process karne hain, ye limit hai.",
    points: [
      "`Stocks: first only` mode me iska effect nahi hota.",
      "Blank chhodne par default 5 symbols liye jaate hain.",
      "Upper cap 25 hai.",
    ],
  },
  symbolKey: {
    title: "Symbol Key",
    description: "Custom payload field ka naam jahan se symbol ya comma-separated symbols read kiye jayenge.",
    points: [
      "Example: `symbol`, `ticker`, `stock_name`.",
      "Ye sirf `Symbol field` mode me use hota hai.",
    ],
  },
  tradeWindow: {
    title: "Trade Time Window",
    description: "Strategy sirf is time range ke andar auto trade execute karegi.",
    points: [
      "Default 09:15 se 15:30 hai.",
      "Server time ke hisaab se window check hoti hai.",
      "Window ke bahar signal aane par trade skip ho jayega.",
    ],
  },
  tradeSideFallback: {
    title: "Trade Side Fallback",
    description: "Agar payload me `call_type` nahi aaya to yahan selected action use hota hai.",
    points: [
      "BUY/SELL normal entry trades ke liye hain.",
      "BUY EXIT/SELL EXIT exit action bhejte hain.",
      "Exit mode me order type, qty, target, SL ignore kiye jaate hain.",
    ],
  },
  orderType: {
    title: "Order Type",
    description: "Auto trade MARKET bhejna hai ya LIMIT, ye yahan decide hota hai.",
    points: [
      "MARKET me immediate market execution request banti hai.",
      "LIMIT me price aur optional buffer use hota hai.",
      "Exit mode me ye field apply nahi hoti.",
    ],
  },
  limitPrice: {
    title: "Limit Price",
    description: "LIMIT order ke liye direct price yahan set kar sakte ho.",
    points: [
      "Blank rahe to trigger price aur buffer se effective price nikal sakta hai.",
      "Sirf LIMIT order me use hoti hai.",
    ],
  },
  tradeBuffer: {
    title: "Trade Buffer",
    description: "LIMIT order me trigger price ke upar/neeche buffer add karke final price banaya ja sakta hai.",
    points: [
      "BUY me trigger + buffer hota hai.",
      "SELL me trigger - buffer hota hai.",
      "Sirf LIMIT orders me active hota hai.",
    ],
  },
  qtyDistribution: {
    title: "Qty Distribution",
    description: "Quantity fixed rakhni hai ya capital percent ke basis par calculate karni hai, ye decide karta hai.",
    points: [
      "`Fix` me qty value direct bheji jaati hai.",
      "`Capital(%)` me capital amount aur stock price se qty nikalti hai.",
      "Exit mode me qty config ignore hoti hai.",
    ],
  },
  qtyValue: {
    title: "Qty Value",
    description: "Quantity ka actual number ya percentage yahan diya jata hai.",
    points: [
      "`Fix` me ye direct qty hai.",
      "`Capital(%)` me ye capital ka percent hai.",
    ],
  },
  capitalAmount: {
    title: "Capital Amount",
    description: "Capital-based quantity mode me calculation ke liye total capital yahan diya jata hai.",
    points: [
      "Sirf `Capital(%)` mode me use hota hai.",
      "Formula: (Capital Amount * Qty% / 100) / price.",
    ],
  },
  dailyTradeLimit: {
    title: "Daily Trade Limit",
    description: "Ek din me is strategy se maximum kitne trades allowed honge, ye control karta hai.",
    points: [
      "Limit hit hone par remaining signals skip ho jayenge.",
      "Agar off hai to koi daily cap nahi lagegi.",
    ],
  },
  dailyTradeLimitValue: {
    title: "Daily Trade Limit Value",
    description: "Per day trade count ki exact limit yahan set hoti hai.",
    points: [
      "Example: 5 matlab strategy ek din me 5 se zyada live trades nahi karegi.",
    ],
  },
  targetToggle: {
    title: "Target",
    description: "Trade ke sath target send karna hai ya nahi, is toggle se control hota hai.",
    points: [
      "On karne par target type aur target value fields aati hain.",
      "Exit mode me target config apply nahi hoti.",
    ],
  },
  targetBy: {
    title: "Target By",
    description: "Target kis unit me define karna hai, ye option batata hai.",
    points: [
      "Money, Point, Percentage, Price supported hain.",
      "Ratio mode me target SL ke basis par compute hota hai.",
    ],
  },
  targetValue: {
    title: "Target Value",
    description: "Selected target type ke hisaab se actual target number yahan diya jata hai.",
    points: [
      "Ratio mode me `1:2` ya `2` jaisi value de sakte ho.",
      "Ratio use karne par valid stop loss bhi hona chahiye.",
    ],
  },
  stopLossToggle: {
    title: "Stop Loss",
    description: "Trade ke sath stop loss bhejna hai ya nahi, is toggle se control hota hai.",
    points: [
      "On karne par SL type aur SL value fields aati hain.",
      "Exit mode me SL config apply nahi hoti.",
    ],
  },
  stopLossBy: {
    title: "Stop Loss By",
    description: "Stop loss kis unit me define karna hai, ye option batata hai.",
    points: [
      "Money, Point, Percentage, Price supported hain.",
    ],
  },
  stopLossValue: {
    title: "Stop Loss Value",
    description: "Selected SL type ke hisaab se actual stop loss number yahan diya jata hai.",
    points: [
      "Ratio target use karte waqt ye field important ho sakti hai.",
    ],
  },
  trailSl: {
    title: "Trail SL",
    description: "Trailing stop loss enable karne se SL dynamic move hota hai.",
    points: [
      "On karne par SL move aur Profit move fields use hoti hain.",
      "Exit mode me trail SL apply nahi hota.",
    ],
  },
  slMove: {
    title: "SL Move",
    description: "Trailing SL ke active hone par stop loss kitna shift karna hai, ye value batati hai.",
  },
  profitMove: {
    title: "Profit Move",
    description: "Trailing SL trigger hone ke liye profit movement kitna hona chahiye, ye yahan set hota hai.",
  },
  emailAlerts: {
    title: "Email Alerts",
    description: "Webhook signal aane par registered email par alert bhejna hai ya nahi, ye toggle decide karta hai.",
    points: [
      "Email account registration wale email par jaata hai.",
      "Strategy-level on/off control hai.",
    ],
  },
  telegramAlerts: {
    title: "Telegram Alerts",
    description: "Telegram bot subscription active ho to signal Telegram par bhi bheja ja sakta hai.",
    points: [
      "Bot token link hone ke baad hi alerts milenge.",
      "Strategy-level on/off control hai.",
    ],
  },
  webhookUrl: {
    title: "Webhook URL",
    description: "Ye wahi URL hai jo Chartink ya kisi webhook sender me paste karna hota hai.",
    points: [
      "Each strategy ka unique webhook key ho sakta hai.",
      "Edit karne par existing webhook key same reh sakti hai.",
    ],
  },
  testWebhook: {
    title: "Test Webhook",
    description: "Is modal me sample payload bhejkar strategy webhook ko test kar sakte ho.",
    points: [
      "Chartink-like JSON paste karo.",
      "Response status aur body yahin dikhegi.",
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

export default function StrategyPage() {
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [marketMayaToken, setMarketMayaToken] = useState("");
  const [symbolMode, setSymbolMode] = useState("stocksFirst");
  const [symbolKey, setSymbolKey] = useState("symbol");
  const [maxSymbols, setMaxSymbols] = useState("");
  const [callTypeFallback, setCallTypeFallback] = useState("");
  const [orderType, setOrderType] = useState("MARKET");
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
  const [editSymbolMode, setEditSymbolMode] = useState("stocksFirst");
  const [editSymbolKey, setEditSymbolKey] = useState("symbol");
  const [editMaxSymbols, setEditMaxSymbols] = useState("");
  const [editCallTypeFallback, setEditCallTypeFallback] = useState("");
  const [editOrderType, setEditOrderType] = useState("MARKET");
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
  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);

  const webhookBase = useMemo(() => {
    const base =
      process.env.NEXT_PUBLIC_WEBHOOK_URL || API_BASE_URL;
    return `${base}/api/v1/webhooks/chartink`;
  }, []);

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

  const renderInfoButton = (infoKey: string, variant: InfoButtonVariant = "inline") => (
    <button
      className={`info-button${variant === "chip" ? " info-button-chip" : ""}`}
      type="button"
      aria-label={`Explain ${INFO_CONTENT[infoKey]?.title || "setting"}`}
      onClick={() => setActiveInfoKey(infoKey)}
    >
      <span className="info-button-icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 8.1V13.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="5.8" r="0.9" fill="currentColor" />
        </svg>
      </span>
      {variant === "chip" ? <span className="info-button-text">Info</span> : null}
    </button>
  );

  const renderLabelWithInfo = (htmlFor: string, label: string, infoKey: string) => (
    <div className="label-row">
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {renderInfoButton(infoKey)}
    </div>
  );

  const renderTitleWithInfo = (title: string, infoKey: string, style?: React.CSSProperties) => (
    <div className="section-title-row" style={style}>
      <div className="page-title">{title}</div>
      {renderInfoButton(infoKey, "chip")}
    </div>
  );

  const resolveWebhookUrl = (item?: Strategy | null) => {
    if (!item) return webhookBase;
    if (item.webhookPath) {
      return `${webhookBase}${item.webhookPath.replace("/api/v1/webhooks/chartink", "")}`;
    }
    if (item.webhookKey) {
      return `${webhookBase}?key=${item.webhookKey}`;
    }
    return webhookBase;
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

  const openWebhookTester = (url: string) => {
    setTestWebhookUrl(url);
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
      const trimmedBufferBy = bufferBy.trim();
      const trimmedBufferPoints = bufferPoints.trim();
      const trimmedDailyTradeLimit = dailyTradeLimit.trim();

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
        if (trimmedBufferBy && !trimmedBufferPoints) {
          setError("Trade buffer value is required when buffer type is selected.");
          return;
        }
        if (trimmedBufferPoints && !trimmedBufferBy) {
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
        symbolMode,
        ...(symbolMode === "payloadSymbol" && symbolKey.trim()
          ? { symbolKey: symbolKey.trim() }
          : {}),
        ...(symbolMode !== "stocksFirst" && maxSymbols.trim()
          ? { maxSymbols: maxSymbols.trim() }
          : {}),
        ...(callTypeFallback ? { callTypeFallback } : {}),
        ...(!exitFallbackSelected ? { orderType } : {}),
        ...(!exitFallbackSelected && limitPrice.trim() ? { limitPrice: limitPrice.trim() } : {}),
        ...(!exitFallbackSelected && trimmedBufferBy ? { bufferBy: trimmedBufferBy } : {}),
        ...(!exitFallbackSelected && trimmedBufferPoints
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
        webhookUrl: webhookBase,
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
      setSymbolMode("stocksFirst");
      setSymbolKey("symbol");
      setMaxSymbols("");
      setCallTypeFallback("");
      setOrderType("MARKET");
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
      setShowModal(false);
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
    setEditing({ ...item, _id: normalizeId(item._id) });
    setEditName(item.name || "");
    setEditEnabled(Boolean(item.enabled));
    setEditMarketMayaToken("");
    const mm = item.marketMaya || {};
    setEditSymbolMode(mm.symbolMode || "stocksFirst");
    setEditSymbolKey(mm.symbolKey || "symbol");
    setEditMaxSymbols(mm.maxSymbols ? String(mm.maxSymbols) : "");
    setEditCallTypeFallback(mm.callTypeFallback || "");
    setEditOrderType(mm.orderType || "MARKET");
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
    setEditing(null);
    setEditName("");
    setEditEnabled(false);
    setEditMarketMayaToken("");
    setEditSymbolMode("stocksFirst");
    setEditSymbolKey("symbol");
    setEditMaxSymbols("");
    setEditCallTypeFallback("");
    setEditOrderType("MARKET");
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
      const trimmedBufferBy = editBufferBy.trim();
      const trimmedBufferPoints = editBufferPoints.trim();
      const trimmedDailyTradeLimit = editDailyTradeLimit.trim();

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
        if (trimmedBufferBy && !trimmedBufferPoints) {
          setError("Trade buffer value is required when buffer type is selected.");
          return;
        }
        if (trimmedBufferPoints && !trimmedBufferBy) {
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
        marketMayaClear.add("limitPrice");
      }
      if (editExitFallbackSelected || !trimmedBufferBy || !trimmedBufferPoints) {
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

      const token = getToken();
      const marketMaya: Record<string, unknown> = {
        symbolMode: editSymbolMode,
        ...(editSymbolMode === "payloadSymbol" && editSymbolKey.trim()
          ? { symbolKey: editSymbolKey.trim() }
          : {}),
        ...(editSymbolMode !== "stocksFirst" && editMaxSymbols.trim()
          ? { maxSymbols: editMaxSymbols.trim() }
          : {}),
        ...(editCallTypeFallback ? { callTypeFallback: editCallTypeFallback } : {}),
        ...(!editExitFallbackSelected ? { orderType: editOrderType } : {}),
        ...(!editExitFallbackSelected && editLimitPrice.trim()
          ? { limitPrice: editLimitPrice.trim() }
          : {}),
        ...(!editExitFallbackSelected && trimmedBufferBy ? { bufferBy: trimmedBufferBy } : {}),
        ...(!editExitFallbackSelected && trimmedBufferPoints
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
          onClick={() => setShowModal(true)}
        >
          Add strategy
        </button>
      </div>

      {showPageError ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}
      {recentWebhookUrl ? (
        <div className="card">
          <div className="page-title">Webhook URL ready</div>
          <div className="helper">
            Use this URL in Chartink for{" "}
            {recentStrategyName ? `"${recentStrategyName}"` : "your strategy"}.
          </div>
          <div className="list-item" style={{ justifyContent: "space-between", marginTop: "12px" }}>
            <code className="mono">{recentWebhookUrl}</code>
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
                onClick={() => openWebhookTester(recentWebhookUrl)}
              >
                Test
              </button>
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
                      copyToClipboard(resolveWebhookUrl(item));
                    }}
                  >
                    Copy Webhook
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => openWebhookTester(resolveWebhookUrl(item))}
                  >
                    Test
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
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            {renderTitleWithInfo("Add strategy", "strategyName")}
            <form className="form" onSubmit={handleSubmit} style={{ marginTop: "16px" }}>
              <div className="input-group">
                {renderLabelWithInfo("strategy-name", "Strategy name", "strategyName")}
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
                {renderLabelWithInfo("market-enable", "Enable Market Maya", "marketMayaEnable")}
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
                  {renderLabelWithInfo("market-token", "Market Maya Token", "marketMayaToken")}
                  <input
                    className="input"
                    id="market-token"
                    type="password"
                    value={marketMayaToken}
                    onChange={(event) => setMarketMayaToken(event.target.value)}
                    placeholder="Paste token here"
                  />
                  <div className="helper">
                    Required for live trades. Leave blank to use server default.
                  </div>
                </div>
              ) : null}

              {renderTitleWithInfo("Symbol handling", "symbolSource", { marginTop: "10px" })}
              <div className="helper">
                Control how symbols are picked from webhook payloads.
              </div>

              <div className="grid-2">
                <div className="input-group">
                  {renderLabelWithInfo("symbol-mode", "Symbol source", "symbolSource")}
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
                  {renderLabelWithInfo("max-symbols", "Max symbols", "maxSymbols")}
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
                  {renderLabelWithInfo("symbol-key", "Symbol key", "symbolKey")}
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

              {renderTitleWithInfo("Trade defaults", "tradeSideFallback", { marginTop: "10px" })}
              <div className="helper">
                Payload `call_type` is used first. Fallback is used only when payload side is missing.
              </div>

              <div className="grid-2">
                <div className="input-group">
                  {renderLabelWithInfo("market-trade-start", "Trade start time", "tradeWindow")}
                  <input
                    className="input"
                    id="market-trade-start"
                    type="time"
                    value={tradeWindowStart}
                    onChange={(event) => setTradeWindowStart(event.target.value)}
                  />
                </div>
                <div className="input-group">
                  {renderLabelWithInfo("market-trade-end", "Trade end time", "tradeWindow")}
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
                  Default window is 09:15 to 15:30 (server time).
                </div>

              <div className="grid-2">
                <div className="input-group">
                  {renderLabelWithInfo("market-calltype", "Trade side fallback", "tradeSideFallback")}
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
                    {renderLabelWithInfo("market-ordertype", "Order type", "orderType")}
                    <select
                      className="select"
                      id="market-ordertype"
                      value={orderType}
                      onChange={(event) => {
                        const next = event.target.value;
                        setOrderType(next);
                        if (next !== "LIMIT") {
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
                    <div className="input-group">
                      {renderLabelWithInfo("market-limit-price", "Limit price", "limitPrice")}
                      <input
                        className="input"
                        id="market-limit-price"
                        value={limitPrice}
                        onChange={(event) => setLimitPrice(event.target.value)}
                        placeholder="e.g. 123.45"
                      />
                      <div className="helper">
                        If blank, trigger price (plus buffer) is used.
                      </div>
                    </div>
                  ) : null}

                  <div className="grid-2">
                    <div className="input-group">
                      {renderLabelWithInfo("market-buffer-by", "Trade buffer by", "tradeBuffer")}
                      <select
                        className="select"
                        id="market-buffer-by"
                        value={bufferBy}
                        onChange={(event) => {
                          const next = event.target.value;
                          setBufferBy(next);
                          if (!next) setBufferPoints("");
                        }}
                        disabled={orderType !== "LIMIT"}
                      >
                        <option value="">No buffer</option>
                        <option value="Point">Point</option>
                        <option value="Percentage">Percentage</option>
                      </select>
                    </div>
                    <div className="input-group">
                      {renderLabelWithInfo("market-buffer-points", "Trade buffer value", "tradeBuffer")}
                      <input
                        className="input"
                        id="market-buffer-points"
                        type="number"
                        min="0"
                        step="0.01"
                        value={bufferPoints}
                        onChange={(event) => setBufferPoints(event.target.value)}
                        placeholder={bufferBy === "Percentage" ? "e.g. 1" : "e.g. 1"}
                        disabled={orderType !== "LIMIT" || !bufferBy}
                      />
                    </div>
                  </div>
                  <div className="helper">
                    Buffer is only used for LIMIT orders. BUY = trigger + buffer, SELL = trigger - buffer.
                  </div>

                  <div className="grid-2">
                    <div className="input-group">
                      {renderLabelWithInfo("market-qty-distribution", "Qty distribution", "qtyDistribution")}
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
                      {renderLabelWithInfo("market-qty-value", "Qty value", "qtyValue")}
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
                      {renderLabelWithInfo("market-capital-amount", "Capital amount", "capitalAmount")}
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
                {renderLabelWithInfo("market-daily-trade-limit", "Daily trade limit", "dailyTradeLimit")}
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
                  {renderLabelWithInfo(
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
                    {renderLabelWithInfo("market-use-target", "Target", "targetToggle")}
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
                        {renderLabelWithInfo("market-target-by", "Target by", "targetBy")}
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
                        {renderLabelWithInfo("market-target", "Target", "targetValue")}
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
                    {renderLabelWithInfo("market-use-sl", "Stop loss", "stopLossToggle")}
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
                        {renderLabelWithInfo("market-sl-by", "Stop loss by", "stopLossBy")}
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
                        {renderLabelWithInfo("market-sl", "Stop loss", "stopLossValue")}
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
                    {renderLabelWithInfo("market-trail-sl", "Trail SL", "trailSl")}
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
                        {renderLabelWithInfo("market-sl-move", "SL move", "slMove")}
                        <input
                          className="input"
                          id="market-sl-move"
                          value={slMove}
                          onChange={(event) => setSlMove(event.target.value)}
                          placeholder="e.g. 10"
                        />
                      </div>
                      <div className="input-group">
                        {renderLabelWithInfo("market-profit-move", "Profit move", "profitMove")}
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
                {renderLabelWithInfo("email-enable", "Email alerts", "emailAlerts")}
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
                {renderLabelWithInfo("telegram-enable", "Telegram alerts", "telegramAlerts")}
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
                  onClick={() => setShowModal(false)}
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
            <div className="page-title">Edit strategy</div>
            <form className="form" onSubmit={handleUpdate} style={{ marginTop: "16px" }}>
              <div className="input-group">
                {renderLabelWithInfo("edit-strategy-name", "Strategy name", "strategyName")}
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
                  {renderInfoButton("webhookUrl")}
                </div>
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <code className="mono">{resolveWebhookUrl(editing)}</code>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => copyToClipboard(resolveWebhookUrl(editing))}
                  >
                    Copy
                  </button>
                </div>
                <div className="helper">Webhook key stays the same.</div>
              </div>

              <div className="input-group">
                {renderLabelWithInfo("edit-market-enable", "Enable Market Maya", "marketMayaEnable")}
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
                  {renderLabelWithInfo("edit-market-token", "Market Maya Token", "marketMayaToken")}
                  <input
                    className="input"
                    id="edit-market-token"
                    type="password"
                    value={editMarketMayaToken}
                    onChange={(event) => setEditMarketMayaToken(event.target.value)}
                    placeholder="Paste new token to update"
                  />
                  <div className="helper">Optional. Leave blank to keep the existing token.</div>
                </div>
              ) : null}

              {renderTitleWithInfo("Symbol handling", "symbolSource", { marginTop: "10px" })}
              <div className="helper">
                Control how symbols are picked from webhook payloads.
              </div>

              <div className="grid-2">
                <div className="input-group">
                  {renderLabelWithInfo("edit-symbol-mode", "Symbol source", "symbolSource")}
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
                  {renderLabelWithInfo("edit-max-symbols", "Max symbols", "maxSymbols")}
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
                  {renderLabelWithInfo("edit-symbol-key", "Symbol key", "symbolKey")}
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

              {renderTitleWithInfo("Trade defaults", "tradeSideFallback", { marginTop: "10px" })}
              <div className="helper">
                Payload `call_type` is used first. Fallback is used only when payload side is missing.
              </div>

              <div className="grid-2">
                <div className="input-group">
                  {renderLabelWithInfo("edit-market-trade-start", "Trade start time", "tradeWindow")}
                  <input
                    className="input"
                    id="edit-market-trade-start"
                    type="time"
                    value={editTradeWindowStart}
                    onChange={(event) => setEditTradeWindowStart(event.target.value)}
                  />
                </div>
                <div className="input-group">
                  {renderLabelWithInfo("edit-market-trade-end", "Trade end time", "tradeWindow")}
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
                Default window is 09:15 to 15:30 (server time).
              </div>

              <div className="grid-2">
                <div className="input-group">
                  {renderLabelWithInfo("edit-market-calltype", "Trade side fallback", "tradeSideFallback")}
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
                    {renderLabelWithInfo("edit-market-ordertype", "Order type", "orderType")}
                    <select
                      className="select"
                      id="edit-market-ordertype"
                      value={editOrderType}
                      onChange={(event) => {
                        const next = event.target.value;
                        setEditOrderType(next);
                        if (next !== "LIMIT") {
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
                    <div className="input-group">
                      {renderLabelWithInfo("edit-market-limit-price", "Limit price", "limitPrice")}
                      <input
                        className="input"
                        id="edit-market-limit-price"
                        value={editLimitPrice}
                        onChange={(event) => setEditLimitPrice(event.target.value)}
                        placeholder="e.g. 123.45"
                      />
                      <div className="helper">
                        If blank, trigger price (plus buffer) is used.
                      </div>
                    </div>
                  ) : null}

                  <div className="grid-2">
                    <div className="input-group">
                      {renderLabelWithInfo("edit-market-buffer-by", "Trade buffer by", "tradeBuffer")}
                      <select
                        className="select"
                        id="edit-market-buffer-by"
                        value={editBufferBy}
                        onChange={(event) => {
                          const next = event.target.value;
                          setEditBufferBy(next);
                          if (!next) setEditBufferPoints("");
                        }}
                        disabled={editOrderType !== "LIMIT"}
                      >
                        <option value="">No buffer</option>
                        <option value="Point">Point</option>
                        <option value="Percentage">Percentage</option>
                      </select>
                    </div>
                    <div className="input-group">
                      {renderLabelWithInfo("edit-market-buffer-points", "Trade buffer value", "tradeBuffer")}
                      <input
                        className="input"
                        id="edit-market-buffer-points"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editBufferPoints}
                        onChange={(event) => setEditBufferPoints(event.target.value)}
                        placeholder={editBufferBy === "Percentage" ? "e.g. 1" : "e.g. 1"}
                        disabled={editOrderType !== "LIMIT" || !editBufferBy}
                      />
                    </div>
                  </div>
                  <div className="helper">
                    Buffer is only used for LIMIT orders. BUY = trigger + buffer, SELL = trigger - buffer.
                  </div>

                  <div className="grid-2">
                    <div className="input-group">
                      {renderLabelWithInfo(
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
                      {renderLabelWithInfo("edit-market-qty-value", "Qty value", "qtyValue")}
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
                      {renderLabelWithInfo(
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
                {renderLabelWithInfo(
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
                  {renderLabelWithInfo(
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
                    {renderLabelWithInfo("edit-market-use-target", "Target", "targetToggle")}
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
                        {renderLabelWithInfo("edit-market-target-by", "Target by", "targetBy")}
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
                        {renderLabelWithInfo("edit-market-target", "Target", "targetValue")}
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
                    {renderLabelWithInfo("edit-market-use-sl", "Stop loss", "stopLossToggle")}
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
                        {renderLabelWithInfo("edit-market-sl-by", "Stop loss by", "stopLossBy")}
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
                        {renderLabelWithInfo("edit-market-sl", "Stop loss", "stopLossValue")}
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
                    {renderLabelWithInfo("edit-market-trail-sl", "Trail SL", "trailSl")}
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
                        {renderLabelWithInfo("edit-market-sl-move", "SL move", "slMove")}
                        <input
                          className="input"
                          id="edit-market-sl-move"
                          value={editSlMove}
                          onChange={(event) => setEditSlMove(event.target.value)}
                          placeholder="e.g. 10"
                        />
                      </div>
                      <div className="input-group">
                        {renderLabelWithInfo("edit-market-profit-move", "Profit move", "profitMove")}
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
                {renderLabelWithInfo("edit-email-enable", "Email alerts", "emailAlerts")}
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
                {renderLabelWithInfo("edit-telegram-enable", "Telegram alerts", "telegramAlerts")}
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
              Paste Chartink-like payload and click test to verify strategy webhook.
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
                placeholder="https://.../api/v1/webhooks/chartink?key=..."
              />
            </div>

            <div className="input-group">
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
                Example keys: `alert_name`, `scan_name`, `stocks`, `trigger_price`. Optional: `call_type` (strategy fallback is used when missing).
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
