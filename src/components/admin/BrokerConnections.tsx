"use client";
import SharekhanFeedCard from "./SharekhanFeedCard";
import MStockTypeBSessionCard from "./MStockTypeBSessionCard";
import { BrokerIcon } from "./BrokerUi";

export default function BrokerConnections() {
  return <div className="broker-page">
    <div className="broker-heading"><div><span className="broker-eyebrow">PRIVATE SHAREKHAN CONSOLE</span><h1>Broker connections</h1><p>Manage the shared Sharekhan feed and your broker session.</p></div><span className="broker-private"><BrokerIcon kind="shield" /> Sharekhan access only</span></div>
    <div className="broker-banner"><span className="broker-icon"><BrokerIcon /></span><div><strong>Sharekhan powers live order prices</strong><p>One shared price feed for all users. Every trade uses the user&apos;s own broker account.</p></div></div>
    <div className="broker-grid"><SharekhanFeedCard /></div>
    <p className="broker-footnote"><BrokerIcon kind="key" /> API settings stay saved across restarts. When a broker session expires, reconnect your account using the saved keys.</p>
  </div>;
}
