"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";
import { getToken } from "@/lib/auth";

type MarketMayaResponse = unknown;

function pretty(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function TradePage() {
  const [tokenInput, setTokenInput] = useState("");
  const [execute, setExecute] = useState(false);

  const [exchange, setExchange] = useState("NSE");
  const [segment, setSegment] = useState("EQ");
  const [symbolCode, setSymbolCode] = useState("");
  const [symbol, setSymbol] = useState("");
  const [contract, setContract] = useState("NEAR");
  const [expiry, setExpiry] = useState("WEEKLY");
  const [expiryDate, setExpiryDate] = useState("");
  const [optionType, setOptionType] = useState("CE");
  const [atm, setAtm] = useState("0");
  const [strikePrice, setStrikePrice] = useState("");
  const [callType, setCallType] = useState("BUY");

  const [qtyDistribution, setQtyDistribution] = useState("");
  const [qtyValue, setQtyValue] = useState("");
  const [targetBy, setTargetBy] = useState("");
  const [target, setTarget] = useState("");
  const [slBy, setSlBy] = useState("");
  const [sl, setSl] = useState("");
  const [trailSl, setTrailSl] = useState(false);
  const [slMove, setSlMove] = useState("");
  const [profitMove, setProfitMove] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MarketMayaResponse | null>(null);

  const tokenTrimmed = tokenInput.trim();
  const tokenWarning =
    tokenTrimmed && tokenTrimmed.length !== 36
      ? `Token length looks wrong (${tokenTrimmed.length}). Expected 36.`
      : null;

  const usingSymbolCode = symbolCode.trim().length > 0;
  const normalizedSegment = segment.trim().toUpperCase();
  const showDerivativeFields =
    !usingSymbolCode && (normalizedSegment === "FUT" || normalizedSegment === "OPT");
  const showOptionFields = !usingSymbolCode && normalizedSegment === "OPT";

  const fillExample = () => {
    setExecute(false);
    setExchange("NSE");
    setSegment("EQ");
    setSymbolCode("");
    setSymbol("ONGC");
    setCallType("BUY");
    setQtyDistribution("Fix");
    setQtyValue("1");
    setTargetBy("");
    setTarget("");
    setSlBy("");
    setSl("");
    setTrailSl(false);
    setSlMove("");
    setProfitMove("");
    setResult(null);
    setError(null);
  };

  const submitTrade = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!usingSymbolCode && !symbol.trim()) {
        setError("Symbol is required (or use Symbol code).");
        return;
      }

      if (!usingSymbolCode && (normalizedSegment === "FUT" || normalizedSegment === "OPT")) {
        if (!expiryDate.trim() && (!contract.trim() || !expiry.trim())) {
          setError("For FUT/OPT: contract + expiry (or expiry date) is required.");
          return;
        }
      }

      if (!usingSymbolCode && normalizedSegment === "OPT") {
        if (!optionType.trim()) {
          setError("For OPT: option type is required.");
          return;
        }
        if (!strikePrice.trim() && !atm.trim()) {
          setError("For OPT: atm or strike price is required.");
          return;
        }
      }

      const token = getToken();

      const payload: Record<string, unknown> = {
        token: tokenTrimmed || undefined,
        execute,
        exchange,
        call_type: callType,
        qty_distribution: qtyDistribution || undefined,
        qty_value: qtyValue || undefined,
        target_by: targetBy || undefined,
        target: target || undefined,
        sl_by: slBy || undefined,
        sl: sl || undefined,
        ...(trailSl ? { is_trail_sl: true } : {}),
        sl_move: slMove || undefined,
        profit_move: profitMove || undefined,
      };

      if (usingSymbolCode) {
        payload.symbol_code = symbolCode.trim();
      } else {
        payload.segment = normalizedSegment || undefined;
        payload.symbol = symbol.trim() ? symbol.trim() : undefined;

        if (normalizedSegment === "FUT" || normalizedSegment === "OPT") {
          if (expiryDate.trim()) {
            payload.expiry_date = expiryDate.trim();
          } else {
            payload.contract = contract.trim() ? contract.trim() : undefined;
            payload.expiry = expiry.trim() ? expiry.trim() : undefined;
          }
        }

        if (normalizedSegment === "OPT") {
          payload.option_type = optionType.trim() ? optionType.trim() : undefined;
          if (strikePrice.trim()) {
            payload.strike_price = strikePrice.trim();
          } else if (atm.trim()) {
            payload.atm = atm.trim();
          }
        }
      }

      const data = await apiPost(
        "/api/v1/marketmaya/trade",
        payload,
        token
      );
      setResult(data);
      const maybe = data as { ok?: boolean; error?: string };
      if (maybe && typeof maybe === "object" && maybe.ok === false) {
        setError(maybe.error || "Market Maya request failed");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Trade failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const token = getToken();
      const data = await apiPost(
        "/api/v1/marketmaya/getcallhistory",
        { token: tokenTrimmed || undefined },
        token
      );
      setResult(data);
      const maybe = data as { ok?: boolean; error?: string };
      if (maybe && typeof maybe === "object" && maybe.ok === false) {
        setError(maybe.error || "Market Maya request failed");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Fetch failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosition = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const token = getToken();
      const data = await apiPost(
        "/api/v1/marketmaya/getsymbolposition",
        { token: tokenTrimmed || undefined },
        token
      );
      setResult(data);
      const maybe = data as { ok?: boolean; error?: string };
      if (maybe && typeof maybe === "object" && maybe.ok === false) {
        setError(maybe.error || "Market Maya request failed");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Fetch failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Market Maya</div>
          <div className="helper">Create manual trades and fetch call history.</div>
        </div>
        <button className="btn btn-secondary" type="button" onClick={fillExample}>
          Fill example
        </button>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="page-title">Manual trade</div>
        <div className="helper">
          Preview mode by default. Enable Execute only when you want to place a real
          order.
        </div>

        <form className="form" onSubmit={submitTrade} style={{ marginTop: "16px" }}>
          <div className="input-group">
            <label className="label" htmlFor="mm-token">
              Market Maya token (optional)
            </label>
            <input
              className="input"
              id="mm-token"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Leave empty to use backend MARKETMAYA_TOKEN"
            />
            <div className="helper">Token is sent only to your backend.</div>
            {tokenWarning ? <div className="helper">{tokenWarning}</div> : null}
          </div>

          <div className="grid-2">
            <div className="input-group">
              <label className="label" htmlFor="mm-exchange">
                Exchange
              </label>
              <select
                className="select"
                id="mm-exchange"
                value={exchange}
                onChange={(event) => setExchange(event.target.value)}
              >
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
                <option value="NFO">NFO</option>
                <option value="BFO">BFO</option>
                <option value="CDS">CDS</option>
                <option value="MCX">MCX</option>
              </select>
            </div>

            <div className="input-group">
              <label className="label" htmlFor="mm-segment">
                Segment
              </label>
              <select
                className="select"
                id="mm-segment"
                value={segment}
                onChange={(event) => setSegment(event.target.value)}
                disabled={usingSymbolCode}
              >
                <option value="EQ">EQ</option>
                <option value="FUT">FUT</option>
                <option value="OPT">OPT</option>
              </select>
              {usingSymbolCode ? (
                <div className="helper">Segment is ignored when Symbol code is set.</div>
              ) : null}
            </div>
          </div>

          <div className="grid-2">
            <div className="input-group">
              <label className="label" htmlFor="mm-symbol-code">
                Symbol code (optional)
              </label>
              <input
                className="input"
                id="mm-symbol-code"
                value={symbolCode}
                onChange={(event) => setSymbolCode(event.target.value)}
                placeholder="e.g. 2885"
              />
              <div className="helper">
                If set, Segment/Symbol and derivative fields are ignored.
              </div>
            </div>

            <div className="input-group">
              <label className="label" htmlFor="mm-symbol">
                Symbol
              </label>
              <input
                className="input"
                id="mm-symbol"
                value={symbol}
                onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                placeholder="e.g. RELIANCE / BANKNIFTY"
                disabled={usingSymbolCode}
              />
              {usingSymbolCode ? (
                <div className="helper">Disabled because Symbol code is set.</div>
              ) : null}
            </div>
          </div>

          <div className="grid-2">
            <div className="input-group">
              <label className="label" htmlFor="mm-call-type">
                Call type
              </label>
              <select
                className="select"
                id="mm-call-type"
                value={callType}
                onChange={(event) => setCallType(event.target.value)}
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
                <option value="BUY EXIT">BUY EXIT</option>
                <option value="SELL EXIT">SELL EXIT</option>
                <option value="BUY ADD">BUY ADD</option>
                <option value="SELL ADD">SELL ADD</option>
                <option value="PARTIAL BUY EXIT">PARTIAL BUY EXIT</option>
                <option value="PARTIAL SELL EXIT">PARTIAL SELL EXIT</option>
                <option value="CANCEL">CANCEL</option>
                <option value="RESET">RESET</option>
                <option value="MODIFY">MODIFY</option>
              </select>
            </div>

            <div className="input-group">
              <label className="label" htmlFor="mm-execute">
                Execute
              </label>
              <div className="list-item" style={{ justifyContent: "space-between" }}>
                <span>Place real order</span>
                <input
                  id="mm-execute"
                  type="checkbox"
                  checked={execute}
                  onChange={(event) => setExecute(event.target.checked)}
                />
              </div>
              <div className="helper">
                Keep this OFF to preview the generated request.
              </div>
            </div>
          </div>

          {showDerivativeFields ? (
            <>
              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="mm-contract">
                    Contract
                  </label>
                  <select
                    className="select"
                    id="mm-contract"
                    value={contract}
                    onChange={(event) => setContract(event.target.value)}
                  >
                    <option value="NEAR">NEAR</option>
                    <option value="NEXT">NEXT</option>
                    <option value="FAR">FAR</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="mm-expiry">
                    Expiry
                  </label>
                  <select
                    className="select"
                    id="mm-expiry"
                    value={expiry}
                    onChange={(event) => setExpiry(event.target.value)}
                  >
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="mm-expiry-date">
                  Expiry date (optional, dd-MM-yyyy)
                </label>
                <input
                  className="input"
                  id="mm-expiry-date"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                  placeholder="e.g. 25-09-2024"
                />
                <div className="helper">If Expiry date is set, Contract/Expiry are ignored.</div>
              </div>
            </>
          ) : null}

          {showOptionFields ? (
            <>
              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="mm-option-type">
                    Option type
                  </label>
                  <select
                    className="select"
                    id="mm-option-type"
                    value={optionType}
                    onChange={(event) => setOptionType(event.target.value)}
                  >
                    <option value="CE">CE</option>
                    <option value="PE">PE</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="mm-atm">
                    ATM (optional)
                  </label>
                  <input
                    className="input"
                    id="mm-atm"
                    value={atm}
                    onChange={(event) => setAtm(event.target.value)}
                    placeholder="0 / 100 / -100"
                  />
                  <div className="helper">Ignored if Strike price is set.</div>
                </div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="mm-strike">
                  Strike price (optional)
                </label>
                <input
                  className="input"
                  id="mm-strike"
                  value={strikePrice}
                  onChange={(event) => setStrikePrice(event.target.value)}
                  placeholder="e.g. 53500"
                />
              </div>
            </>
          ) : null}

          <div className="page-title" style={{ marginTop: "10px" }}>
            Optional risk params
          </div>

          <div className="grid-2">
            <div className="input-group">
              <label className="label" htmlFor="mm-qty-distribution">
                Qty distribution
              </label>
              <input
                className="input"
                id="mm-qty-distribution"
                value={qtyDistribution}
                onChange={(event) => setQtyDistribution(event.target.value)}
                placeholder="Fix / Capital(%) / Capital Risk(%)"
              />
            </div>
            <div className="input-group">
              <label className="label" htmlFor="mm-qty-value">
                Qty value
              </label>
              <input
                className="input"
                id="mm-qty-value"
                value={qtyValue}
                onChange={(event) => setQtyValue(event.target.value)}
                placeholder="e.g. 10"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="input-group">
              <label className="label" htmlFor="mm-target-by">
                Target by
              </label>
              <input
                className="input"
                id="mm-target-by"
                value={targetBy}
                onChange={(event) => setTargetBy(event.target.value)}
                placeholder="Money / Point / Percentage / Price"
              />
            </div>
            <div className="input-group">
              <label className="label" htmlFor="mm-target">
                Target
              </label>
              <input
                className="input"
                id="mm-target"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="e.g. 50"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="input-group">
              <label className="label" htmlFor="mm-sl-by">
                SL by
              </label>
              <input
                className="input"
                id="mm-sl-by"
                value={slBy}
                onChange={(event) => setSlBy(event.target.value)}
                placeholder="Money / Point / Percentage / Price"
              />
            </div>
            <div className="input-group">
              <label className="label" htmlFor="mm-sl">
                SL
              </label>
              <input
                className="input"
                id="mm-sl"
                value={sl}
                onChange={(event) => setSl(event.target.value)}
                placeholder="e.g. 25"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="label" htmlFor="mm-trail">
              Trail SL
            </label>
            <div className="list-item" style={{ justifyContent: "space-between" }}>
              <span>Enable trail SL</span>
              <input
                id="mm-trail"
                type="checkbox"
                checked={trailSl}
                onChange={(event) => setTrailSl(event.target.checked)}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="input-group">
              <label className="label" htmlFor="mm-sl-move">
                SL move
              </label>
              <input
                className="input"
                id="mm-sl-move"
                value={slMove}
                onChange={(event) => setSlMove(event.target.value)}
                placeholder="e.g. 10"
              />
            </div>
            <div className="input-group">
              <label className="label" htmlFor="mm-profit-move">
                Profit move
              </label>
              <input
                className="input"
                id="mm-profit-move"
                value={profitMove}
                onChange={(event) => setProfitMove(event.target.value)}
                placeholder="e.g. 20"
              />
            </div>
          </div>

          <div className="cta-row" style={{ marginTop: "8px" }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Submitting..." : execute ? "Execute trade" : "Preview trade"}
            </button>
            <button className="btn btn-ghost" type="button" disabled={loading} onClick={fetchHistory}>
              Call history
            </button>
            <button className="btn btn-ghost" type="button" disabled={loading} onClick={fetchPosition}>
              Symbol position
            </button>
          </div>
        </form>
      </div>

      {result ? (
        <div className="card">
          <div className="page-title">Response</div>
          <pre className="mono" style={{ marginTop: "12px", whiteSpace: "pre-wrap" }}>
            {pretty(result)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
