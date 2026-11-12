"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightIcon,
  CheckIcon,
  Cross2Icon,
  MixerHorizontalIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { PhoneImage } from "@/components/PhoneImage";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FiltersPanel } from "@/components/specs/FiltersPanel";
import { StatCards } from "@/components/specs/StatCards";
import { SpecsTable } from "@/components/specs/SpecsTable";
import { AssistantPanel } from "@/components/ai/AssistantPanel";
import rawPhones from "@/data/phones.raw.json";
import { normalizePhones } from "@/lib/normalize";
import { Phone as PhoneSchema, type Phone } from "@/lib/schema";
import {
  applyFilters,
  buildFilterOptions,
  createInitialFilters,
  deserializeFilters,
  serializeFilters,
  toggleSet,
  type FilterState,
} from "@/lib/filters";
import { computeStats } from "@/lib/stats";
import { formatCurrency } from "@/lib/format";
import type { SearchResponse } from "@/lib/ai/types";

const catalog = normalizePhones(rawPhones);
const STORAGE_KEY = "sparta:filters";
type ToggleKey =
  | "cpu"
  | "batteryMah"
  | "screenTech"
  | "refreshHz"
  | "chargingW"
  | "wireless";

function TradeoffMap({
  phones,
  currency,
}: {
  phones: Phone[];
  currency: string;
}) {
  const maxPrice = Math.max(...phones.map((p) => p.price ?? 0), 1);
  const plotted = phones.filter(
    (phone): phone is Phone & { batteryMah: number; price: number } =>
      phone.batteryMah !== null && phone.price !== null,
  );
  const minBattery = Math.min(...plotted.map((p) => p.batteryMah), 3000);
  const maxBattery = Math.max(
    ...plotted.map((p) => p.batteryMah),
    minBattery + 1000,
  );
  return (
    <div
      className="sc-map"
      aria-label="Price versus battery capacity for visible phones"
    >
      <div className="sc-map-heading">
        <strong>See the tradeoff</strong>
        <span>Price × battery</span>
        <span className="sc-map-legend">
          <i />
          Wireless charging <i />
          Wired only
          <i />
          Unknown charging
        </span>
      </div>
      <svg
        viewBox="0 0 700 130"
        role="img"
        aria-label={`${plotted.length} phones plotted by price and battery. ${phones.length - plotted.length} with unavailable price or battery capacity omitted. Full specifications appear below.`}
      >
        <path
          d="M30 12V102H680"
          fill="none"
          stroke="currentColor"
          opacity=".2"
        />
        {[30, 55, 80].map((y) => (
          <path
            key={y}
            d={`M30 ${y}H680`}
            fill="none"
            stroke="currentColor"
            opacity=".08"
          />
        ))}
        {plotted.map((p) => (
          <circle
            key={p.name}
            cx={45 + (p.price / maxPrice) * 615}
            cy={
              92 -
              ((p.batteryMah - minBattery) / (maxBattery - minBattery)) * 72
            }
            r="5"
            className={`sc-dot ${p.wirelessW === null ? "sc-dot-unknown" : p.wirelessW > 0 ? "" : "sc-dot-1"}`}
          >
            <title>{`${p.name}: ${formatCurrency(p.price, currency)}, ${p.batteryMah} mAh`}</title>
          </circle>
        ))}
        <text x="30" y="124">
          Lower price
        </text>
        <text x="580" y="124">
          Higher price
        </text>
        <text x="38" y="14">
          More battery
        </text>
      </svg>
      {plotted.length !== phones.length && (
        <p className="sc-map-omitted">
          {phones.length - plotted.length} phones have unavailable price or battery capacity
          and are not plotted.
        </p>
      )}
    </div>
  );
}

export default function ComparePage() {
  const [phones, setPhones] = useState<Phone[]>(catalog);
  const [filters, setFilters] = useState<FilterState>(() =>
    createInitialFilters(catalog),
  );
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState<"cards" | "specs">("specs");
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [currency, setCurrency] = useState("NGN");
  const [resultCurrency, setResultCurrency] = useState("NGN");
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const controller = useRef<AbortController | null>(null);
  const searchRef = useRef<HTMLTextAreaElement>(null);
  const filterRef = useRef<HTMLElement>(null);
  const savedCatalogFilters = useRef<FilterState | null>(null);
  const locationRequest = useRef<AbortController | null>(null);
  const displayedCurrency = result ? resultCurrency : "NGN";
  const options = useMemo(() => buildFilterOptions(phones), [phones]);
  const visible = useMemo(
    () => applyFilters(phones, filters),
    [phones, filters],
  );
  const comparisonPhones = useMemo(
    () =>
      selected.size
        ? visible.filter((phone) => selected.has(phone.name))
        : visible,
    [visible, selected],
  );
  const stats = useMemo(
    () => computeStats(visible, displayedCurrency),
    [visible, displayedCurrency],
  );
  const activeCount =
    (
      [
        "cpu",
        "batteryMah",
        "screenTech",
        "refreshHz",
        "chargingW",
        "wireless",
      ] as const
    ).reduce((n, k) => n + filters[k].size, 0) +
    Number(Boolean(filters.query)) +
    Number(
      filters.priceRange[0] !== options.priceRange[0] ||
        filters.priceRange[1] !== options.priceRange[1],
    );
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved)
        setFilters(
          deserializeFilters(JSON.parse(saved), createInitialFilters(catalog)),
        );
    } catch {
      /* Invalid storage uses defaults. */
    }
    setHydrated(true);
    return () => {
      controller.current?.abort();
      locationRequest.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (hydrated && !result) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(serializeFilters(filters)),
        );
      } catch {
        /* Comparison works without storage. */
      }
    }
  }, [filters, hydrated, result]);
  useEffect(() => {
    if (!sidebarOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const drawer = filterRef.current;
    drawer?.querySelector<HTMLElement>("button, input")?.focus();
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
      if (event.key === "Tab" && drawer) {
        const controls = Array.from(
          drawer.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      previousFocus?.focus();
    };
  }, [sidebarOpen]);
  useEffect(() => {
    if (assistantOpen)
      document
        .querySelector('[aria-label="Phone assistant"]')
        ?.scrollIntoView?.({ block: "start", behavior: "auto" });
  }, [assistantOpen]);
  const toggle = (key: ToggleKey, value: string | number) =>
    setFilters((prev) => ({
      ...prev,
      [key]: toggleSet(prev[key] as Set<string | number>, value),
    }));
  const reset = () => setFilters(createInitialFilters(phones));
  const useCatalog = () => {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setPhones(catalog);
    setResult(null);
    setError("");
    setSelected(new Set());
    setFilters(savedCatalogFilters.current ?? createInitialFilters(catalog));
  };
  async function research(nextQuery = query) {
    if (!nextQuery.trim() || busy) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: nextQuery,
          country,
          currency,
        }),
        signal: request.signal,
      });
      const data = await response.json();
      request.signal.throwIfAborted();
      if (!response.ok)
        throw new Error(
          data.error?.message ||
            data.error ||
            "Research could not finish. Try again.",
        );
      const validated = PhoneSchema.array().safeParse(data.phones);
      if (!validated.success)
        throw new Error(
          "Research returned incomplete specifications. Please retry.",
        );
      if (!result) savedCatalogFilters.current = filters;
      setResultCurrency(currency);
      setPhones(validated.data);
      setFilters(createInitialFilters(validated.data));
      setSelected(new Set());
      setResult({ ...data, phones: validated.data });
    } catch (cause) {
      if (!request.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Connection failed. Try again.",
        );
    } finally {
      if (controller.current === request) {
        setBusy(false);
        controller.current = null;
      }
    }
  }
  async function locateCountry() {
    if (!navigator.geolocation) {
      setLocationNote("Location is unavailable. Enter your country instead.");
      return;
    }
    locationRequest.current?.abort();
    const request = new AbortController();
    locationRequest.current = request;
    setLocating(true);
    setLocationNote("");
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 12000,
            maximumAge: 60000,
          }),
      );
      request.signal.throwIfAborted();
      const response = await fetch("/api/ai/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
        signal: request.signal,
      });
      const data = await response.json();
      request.signal.throwIfAborted();
      if (!response.ok || !data.country)
        throw new Error(
          "Country lookup did not finish. Enter your country instead.",
        );
      setCountry(data.country);
      setLocationNote(
        "Country selected. Check your preferred currency before researching.",
      );
    } catch {
      if (!request.signal.aborted)
        setLocationNote(
          "Location could not be determined. Enter your country instead.",
        );
    } finally {
      if (locationRequest.current === request) {
        setLocating(false);
        locationRequest.current = null;
      }
    }
  }
  return (
    <main className="sc-app">
      <a className="sc-skip" href="#results">
        Skip to phones
      </a>
      <header className="sc-header" data-testid="app-header">
        <a href="/" className="sc-brand" aria-label="Sparta Cells home">
          <span className="sc-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          Sparta Cells
        </a>
        <nav aria-label="Main navigation">
          <a href="#results" className="sc-nav-active">
            Discover & compare
          </a>
          <button
            onClick={() => setAssistantOpen((p) => !p)}
            aria-expanded={assistantOpen}
          >
            Phone advisor
          </button>
        </nav>
        <ThemeToggle />
      </header>
      <section className="sc-intro" aria-labelledby="workspace-title">
        <div className="sc-intro-copy">
          <h1 id="workspace-title">
            Your next phone.
            <br />
            <span>On your terms.</span>
          </h1>
          <p>
            Find the phones that fit your life. Then put every specification to
            the test.
          </p>
          <div className="sc-intro-note">
            <span className="sc-status-dot" />
            Real requirements. Clear tradeoffs.
          </div>
        </div>
        <form
          className="sc-research"
          onSubmit={(event) => {
            event.preventDefault();
            void research();
          }}
        >
          <label htmlFor="research-query">
            What matters in your next phone?
          </label>
          <textarea
            id="research-query"
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={2000}
            placeholder="A great camera, two-day battery, under ₦600,000…"
            rows={2}
          />
          <div className="sc-market-fields">
            <label htmlFor="market-country">
              Country
              <input
                id="market-country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                maxLength={160}
                required
                disabled={busy || locating}
              />
            </label>
            <label htmlFor="market-currency">
              Currency
              <input
                id="market-currency"
                value={currency}
                onChange={(event) =>
                  setCurrency(
                    event.target.value.toUpperCase().replace(/[^A-Z]/g, ""),
                  )
                }
                maxLength={3}
                pattern="[A-Z]{3}"
                title="Three-letter ISO currency code, such as NGN or USD"
                required
                disabled={busy || locating}
              />
            </label>
            {locating ? (
              <button
                type="button"
                onClick={() => {
                  locationRequest.current?.abort();
                  locationRequest.current = null;
                  setLocating(false);
                }}
              >
                Cancel location
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void locateCountry()}
                disabled={busy}
              >
                Use my location
              </button>
            )}
          </div>
          {locationNote && (
            <p className="sc-location-note" role="status">
              {locationNote}
            </p>
          )}
          <div className="sc-research-bottom">
            <span>
              {country} · {currency} · targets 20+ phones
            </span>
            <button
              className="sc-primary"
              disabled={
                busy ||
                locating ||
                !query.trim() ||
                !country.trim() ||
                currency.length !== 3
              }
              type="submit"
            >
              {busy ? "Researching" : "Find my phones"}
              <ArrowRightIcon />
            </button>
          </div>
          <div className="sc-prompts" aria-label="Example searches">
            {[
              "Camera first, under ₦600k",
              "Long battery, fast charging",
              "Android phones for gaming",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setQuery(prompt);
                  searchRef.current?.focus();
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </form>
      </section>
      {busy && (
        <div className="sc-progress" role="status">
          <span className="sc-progress-track" />
          <div>
            <strong>
              Finding real models and checking their specifications
            </strong>
            <p>
              Web research may take a minute. Your current comparison stays
              available.
            </p>
          </div>
          <button
            onClick={() => {
              controller.current?.abort();
              controller.current = null;
              setBusy(false);
            }}
          >
            Cancel research
          </button>
        </div>
      )}
      {error && (
        <div className="sc-notice sc-error" role="alert">
          <div>
            <strong>Research interrupted</strong>
            <p>{error}</p>
          </div>
          <button onClick={() => void research()}>Retry research</button>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <Cross2Icon />
          </button>
        </div>
      )}
      {result && (phones.length < 20 || result.status !== "complete") && (
        <div className="sc-notice sc-warning" role="status">
          <div>
            <strong>
              {phones.length} sourced phones found. The target is 20.
            </strong>
            <p>
              {result.message ||
                "We kept your requirements. Try a wider budget, fewer must-have features, or more brands."}
            </p>
          </div>
          <button onClick={() => searchRef.current?.focus()}>
            Adjust requirements
          </button>
        </div>
      )}
      <div className="sc-workspace">
        <aside
          ref={filterRef}
          role={sidebarOpen ? "dialog" : undefined}
          aria-modal={sidebarOpen ? true : undefined}
          className={`sc-filter-column ${sidebarOpen ? "sc-filters-open" : ""}`}
          aria-label="Phone filters"
        >
          <div className="sc-filter-title">
            <h2>Refine your list</h2>
            <button
              className="sc-mobile-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close filters"
            >
              <Cross2Icon />
            </button>
          </div>
          <FiltersPanel
            currency={displayedCurrency}
            filters={filters}
            options={options}
            onReset={reset}
            onQueryChange={(query) =>
              setFilters((prev) => ({ ...prev, query }))
            }
            onPriceChange={(priceRange) =>
              setFilters((prev) => ({ ...prev, priceRange }))
            }
            onToggle={toggle}
          />
        </aside>
        {sidebarOpen && (
          <button
            className="sc-filter-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close filter drawer"
          />
        )}
        <section id="results" className="sc-results" aria-label="Phone results">
          <div className="sc-results-heading">
            <div>
              <h2>
                {result ? "Your researched shortlist" : "Explore the catalog"}
                <span className="sc-count" aria-live="polite">
                  {visible.length}
                </span>
              </h2>
              <p>
                {result
                  ? "AI-researched specifications. Check linked sources before buying."
                  : `${phones.length} bundled phones · historical specifications and NGN prices`}
              </p>
            </div>
            <div className="sc-result-actions">
              <button
                className="sc-mobile-filter"
                onClick={() => setSidebarOpen(true)}
              >
                <MixerHorizontalIcon />
                Filters{activeCount > 0 && ` (${activeCount})`}
              </button>
              <div className="sc-view-switch" aria-label="Result view">
                <button
                  aria-pressed={view === "cards"}
                  onClick={() => setView("cards")}
                >
                  Overview
                </button>
                <button
                  aria-pressed={view === "specs"}
                  onClick={() => setView("specs")}
                >
                  Specifications
                </button>
              </div>
            </div>
          </div>
          <div className="sc-context-bar">
            <span className={result ? "sc-source-live" : "sc-source-catalog"}>
              {result ? "Web research" : "Bundled catalog"}
            </span>
            <span>
              {activeCount
                ? `${activeCount} active refinements`
                : "All specifications open"}
            </span>
            {result && <button onClick={useCatalog}>Return to catalog</button>}
            {activeCount > 0 && <button onClick={reset}>Clear filters</button>}
          </div>
          <StatCards stats={stats} />
          <TradeoffMap phones={visible} currency={displayedCurrency} />
          {visible.length === 0 ? (
            <div className="sc-empty">
              <MagnifyingGlassIcon />
              <h3>No phones match these refinements</h3>
              <p>
                Your source list still contains {phones.length} phones. Clear a
                filter or widen the price range to bring them back.
              </p>
              <button className="sc-primary" onClick={reset}>
                Reset filters
              </button>
            </div>
          ) : view === "cards" ? (
            <div className="sc-phone-grid">
              {visible.map((phone) => (
                <article className="sc-phone" key={phone.name}>
                  <div className="sc-phone-top">
                    <span>{phone.screen.tech ?? "Unknown display"}</span>
                    <button
                      aria-label={`${selected.has(phone.name) ? "Remove" : "Compare"} ${phone.name}`}
                      aria-pressed={selected.has(phone.name)}
                      onClick={() =>
                        setSelected((prev) => toggleSet(prev, phone.name))
                      }
                    >
                      {selected.has(phone.name) ? <CheckIcon /> : "+"}
                    </button>
                  </div>
                  <PhoneImage
                    name={phone.name}
                    evidence={result?.evidence.find(
                      (item) => item.name === phone.name,
                    )}
                  />
                  <h3>{phone.name}</h3>
                  <p className="sc-phone-price">
                    {formatCurrency(phone.price, displayedCurrency)}
                  </p>
                  <dl>
                    <div>
                      <dt>Battery</dt>
                      <dd>
                        {phone.batteryMah === null
                          ? "Unknown"
                          : `${phone.batteryMah.toLocaleString()} mAh`}
                      </dd>
                    </div>
                    <div>
                      <dt>Display</dt>
                      <dd>
                        {phone.refreshHz === null
                          ? "Unknown refresh"
                          : `${phone.refreshHz} Hz`}{" "}
                        ·{" "}
                        {phone.screen.sizeIn === null
                          ? "Unknown size"
                          : `${phone.screen.sizeIn}″`}
                      </dd>
                    </div>
                    <div>
                      <dt>Charging</dt>
                      <dd>
                        {phone.chargingW === null
                          ? "Unknown"
                          : `${phone.chargingW} W`}
                      </dd>
                    </div>
                    <div>
                      <dt>Processor</dt>
                      <dd>{phone.cpu ?? "Unknown"}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <SpecsTable
              currency={displayedCurrency}
              evidence={result?.evidence}
              phones={phones}
              visible={comparisonPhones}
            />
          )}
          {selected.size > 0 && (
            <div className="sc-selection">
              <span>{selected.size} phones selected</span>
              <button onClick={() => setView("specs")}>Compare selected</button>
              <button onClick={() => setSelected(new Set())}>
                Clear selection
              </button>
            </div>
          )}
          {result?.sources && result.sources.length > 0 && (
            <details className="sc-sources">
              <summary>Research sources ({result.sources.length})</summary>
              {result.evidence.map((item) => (
                <details key={item.name} className="sc-model-evidence">
                  <summary>{item.name} · source notes</summary>
                  <p>
                    {item.notes ||
                      "Sourced specifications; verify the regional variant and current price before buying."}
                  </p>
                  <ul>
                    {item.sources.map((source) => (
                      <li key={source.url}>
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
              <ul>
                {result.sources.map((source, i) => (
                  <li key={i}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title || source.url}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="sc-advisor-invite">
            <div>
              <h3>Specs tell half the story.</h3>
              <p>
                Ask about tradeoffs, compare cameras, or find a nearby store.
              </p>
            </div>
            <button
              onClick={() => setAssistantOpen((p) => !p)}
              aria-expanded={assistantOpen}
            >
              {assistantOpen ? "Close advisor" : "Open phone advisor"}
              <ArrowRightIcon />
            </button>
          </div>
          {assistantOpen && (
            <AssistantPanel
              phones={comparisonPhones}
              currency={displayedCurrency}
              onSearch={(text) => {
                setQuery(text);
                searchRef.current?.focus();
                window.scrollTo({ top: 0, behavior: "auto" });
              }}
            />
          )}
        </section>
      </div>
      <footer className="sc-footer">
        <span>Sparta Cells</span>
        <p>Choose with context. Verify with sources.</p>
        <a href="#workspace-title">Back to research</a>
      </footer>
    </main>
  );
}
