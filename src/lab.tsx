import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowUpRight, ArrowRight, FlaskConical } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useRemote, safeURL } from "./api";
import { Artwork, PageIntro, State, SaveButton } from "./components";
import type {
  DimensionData,
  EMData,
  Evaluation,
  Experiment,
  FactorData,
  GMMData,
  HierarchyData,
  KData,
  ModelInfo,
  PCAData,
  Track,
} from "./types";

const colors = [
  "#b499ff",
  "#ff9b82",
  "#73d5c3",
  "#e4c77e",
  "#7da6d6",
  "#db8fb9",
  "#a7bd88",
  "#edb8e0",
  "#d7d1bc",
  "#a3a4d2",
];
const topics = [
  {
    id: "kmeans",
    name: "K-Means",
    subtitle: "Find the common threads",
    text: "K-Means minimizes squared distance to cluster centroids. The app groups standardized recording descriptors, then compares your selected-track mean with the fitted centroids.",
  },
  {
    id: "gmm",
    name: "Gaussian mixtures",
    subtitle: "Room between the categories",
    text: "A Gaussian mixture models multiple distributions. A song can have soft membership across components; these are model probabilities, not a chance that you will like it.",
  },
  {
    id: "em",
    name: "Expectation–Maximization",
    subtitle: "How the mixture learns",
    text: "The E-step calculates responsibilities for mixture components. The M-step updates weights, means and covariance estimates. Repetition improves the fitted likelihood until convergence.",
  },
  {
    id: "pca",
    name: "Principal components",
    subtitle: "A different perspective",
    text: "PCA finds directions of maximum variance. The Universe uses the first two principal components; nearby points in 2D need not be nearest in the full feature space.",
  },
  {
    id: "dimensions",
    name: "Latent dimensions",
    subtitle: "How much is enough?",
    text: "Dimension selection compares useful structure with unnecessary complexity. Here we compare held-out likelihoods and cumulative explained variance, without calling either a prediction accuracy.",
  },
  {
    id: "factors",
    name: "Factor Analysis",
    subtitle: "Beneath the surface",
    text: "Factor Analysis models shared variation plus feature-specific noise. Loadings describe relationships with latent factors. Factor signs are arbitrary; semantic names require supporting evidence.",
  },
  {
    id: "hierarchy",
    name: "Hierarchical clustering",
    subtitle: "The family tree of sound",
    text: "Agglomerative clustering merges nearby groups. This dendrogram uses Ward linkage on a bounded representative sample and Euclidean distance in the standardized feature space.",
  },
  {
    id: "distances",
    name: "Distance & dissimilarity",
    subtitle: "What makes two records close?",
    text: "Recommendation distance compares standardized numerical descriptors. Euclidean distance captures magnitude and direction; cosine compares direction after normalization. Neither measures enjoyment.",
  },
  {
    id: "evaluation",
    name: "Clustering evaluation",
    subtitle: "Let the results speak",
    text: "Inertia measures within-cluster squared distance. Silhouette measures separation. Seed stability checks repeatability. GMM AIC/BIC balance fit and complexity; held-out likelihood tests generalization.",
  },
];
type LabTopic = (typeof topics)[number];
function PointDetail({ id }: { id: string | null }) {
  const t = useRemote<Track>(id ? "/tracks/" + encodeURIComponent(id) : null);
  return (
    <aside className="point-detail">
      {!id ? (
        <>
          <span className="eyebrow">FOLLOW A FREQUENCY</span>
          <h3>Every dot is a record.</h3>
          <p>
            Select a point with your mouse, keyboard or the accessible record
            selector.
          </p>
        </>
      ) : t.loading || t.error ? (
        <State loading={t.loading} error={t.error} retry={t.retry} />
      ) : t.data ? (
        <>
          <Artwork track={t.data} />
          <h3>{t.data.title}</h3>
          <p>{t.data.artist}</p>
          <span className="tag">{t.data.genres[0]}</span>
          <SaveButton track={t.data} />
          <a
            className="text-link"
            href={safeURL(t.data.provider_url)}
            target="_blank"
            rel="noreferrer"
          >
            Original source
            <ArrowUpRight size={15} />
          </a>
          <small>
            Published FMA descriptors. Playback is not verified for this
            research record.
          </small>
        </>
      ) : null}
    </aside>
  );
}
function Scatter({
  ids,
  coordinates,
  labels,
  filter,
  onSelect,
  selected,
}: {
  ids: string[];
  coordinates: number[][];
  labels: number[];
  filter: string;
  onSelect: (id: string) => void;
  selected: string | null;
}) {
  const bounds = useMemo(() => {
    const x = coordinates.map((p) => p[0]),
      y = coordinates.map((p) => p[1]);
    return {
      xmin: Math.min(...x),
      xmax: Math.max(...x),
      ymin: Math.min(...y),
      ymax: Math.max(...y),
    };
  }, [coordinates]);
  const x = (n: number) =>
      55 + ((n - bounds.xmin) / (bounds.xmax - bounds.xmin || 1)) * 790,
    y = (n: number) =>
      430 - ((n - bounds.ymin) / (bounds.ymax - bounds.ymin || 1)) * 380;
  return (
    <svg
      className="scatter"
      viewBox="0 0 900 490"
      role="img"
      aria-label="Actual PCA song coordinates colored by fitted cluster"
    >
      <title>
        FMA song projection. Select records using the adjacent selector for a
        keyboard alternative.
      </title>
      {[0.25, 0.5, 0.75].map((f) => (
        <g key={f}>
          <line x1={55 + f * 790} x2={55 + f * 790} y1="40" y2="430" />
          <line x1="55" x2="845" y1={430 - f * 380} y2={430 - f * 380} />
        </g>
      ))}
      <line x1="55" x2="845" y1="430" y2="430" />
      <line x1="55" x2="55" y1="40" y2="430" />
      <text x="450" y="473" textAnchor="middle">
        PRINCIPAL COMPONENT 1
      </text>
      <text x="18" y="245" transform="rotate(-90 18 245)" textAnchor="middle">
        PRINCIPAL COMPONENT 2
      </text>
      {coordinates.map((p, i) =>
        filter === "all" || labels[i] === Number(filter) ? (
          <circle
            key={ids[i]}
            cx={x(p[0])}
            cy={y(p[1])}
            r={selected === ids[i] ? 8 : 4}
            fill={colors[labels[i] % colors.length]}
            stroke={selected === ids[i] ? "#fff5e5" : "none"}
            opacity={selected === ids[i] ? 1 : 0.75}
            onClick={() => onSelect(ids[i])}
          >
            <title>
              {ids[i]} / cluster {labels[i] + 1} / PC1 {p[0].toFixed(2)}, PC2{" "}
              {p[1].toFixed(2)}
            </title>
          </circle>
        ) : null,
      )}
    </svg>
  );
}
function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}
function ChartBox({ children }: { children: React.ReactNode }) {
  return <div className="chart-box">{children}</div>;
}
const chartTheme = { stroke: "#343347", fill: "#a6a4b8", fontSize: 11 };
function KMeansPanel() {
  const [k, setK] = useState(4),
    [id, setId] = useState<string | null>(null);
  const e = useRemote<Experiment<KData>>("/ml/kmeans?k=" + k);
  if (e.loading || e.error)
    return <State loading={e.loading} error={e.error} retry={e.retry} />;
  const d = e.data!.result;
  return (
    <>
      <div className="lab-control">
        <label htmlFor="k-control">
          Number of clusters <strong>K = {k}</strong>
        </label>
        <input
          id="k-control"
          aria-label="Number of clusters"
          type="range"
          min={2}
          max={10}
          value={k}
          onChange={(e) => setK(Number(e.target.value))}
        />
        <small>
          Switches between independently trained, reproducible model artifacts.
        </small>
      </div>
      <div className="metrics">
        <Metric
          label="TRAINING INERTIA"
          value={d.inertia.toFixed(2)}
          note="Lower within-cluster squared distance"
        />
        <Metric
          label="VALIDATION SILHOUETTE"
          value={d.silhouette?.toFixed(3) ?? "Not applicable"}
          note="−1 to 1; higher separation"
        />
        <Metric
          label="SEED STABILITY / ARI"
          value={d.stability_ari.toFixed(3)}
          note="Comparison on validation records"
        />
      </div>
      <div className="plot-layout">
        <section>
          <Scatter
            ids={d.ids}
            coordinates={d.coordinates}
            labels={d.labels}
            filter="all"
            selected={id}
            onSelect={setId}
          />
          <RecordSelect ids={d.ids} id={id} setId={setId} />
        </section>
        <PointDetail id={id} />
      </div>
      <details className="method-details">
        <summary>Inspect real centroids and cluster sizes</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cluster</th>
                <th>Catalogue assignments</th>
                <th>Centroid, first 5 scaled descriptors</th>
              </tr>
            </thead>
            <tbody>
              {d.centroids.map((c, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{d.cluster_sizes[i]}</td>
                  <td>
                    {c
                      .slice(0, 5)
                      .map((v) => v.toFixed(3))
                      .join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
function RecordSelect({
  ids,
  id,
  setId,
}: {
  ids: string[];
  id: string | null;
  setId: (s: string) => void;
}) {
  return (
    <label className="record-select">
      Inspect a record
      <select
        aria-label="Inspect research record"
        value={id || ""}
        onChange={(e) => setId(e.target.value)}
      >
        <option value="" disabled>
          Select a record ID
        </option>
        {ids.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </label>
  );
}
function GMMPanel() {
  const g = useRemote<Experiment<GMMData>>("/ml/gmm"),
    k = useRemote<Experiment<KData>>("/ml/kmeans?k=4");
  const [id, setId] = useState("");
  if (g.loading || g.error)
    return <State loading={g.loading} error={g.error} retry={g.retry} />;
  const d = g.data!.result,
    index = Math.max(0, d.ids.indexOf(id)),
    selected = d.ids[index],
    data = d.probabilities[index].map((probability, i) => ({
      component: "C" + (i + 1),
      probability,
    }));
  return (
    <>
      <div className="metrics">
        <Metric label="FITTED COMPONENTS" value={String(d.components)} />
        <Metric label="COVARIANCE" value={d.covariance_type} />
        <Metric label="CONVERGED" value={d.converged ? "Yes" : "No"} />
      </div>
      <div className="plot-layout">
        <section>
          <RecordSelect ids={d.ids} id={selected} setId={setId} />
          <ChartBox>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid stroke={chartTheme.stroke} vertical={false} />
                <XAxis dataKey="component" tick={chartTheme} />
                <YAxis domain={[0, 1]} tick={chartTheme} />
                <Tooltip
                  contentStyle={{
                    background: "#171728",
                    border: "1px solid #585067",
                  }}
                />
                <Bar
                  dataKey="probability"
                  fill="#b499ff"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
          <p className="muted">
            Posterior membership conditional on the fitted mixture. Sum:{" "}
            {d.probabilities[index].reduce((a, b) => a + b, 0).toFixed(6)}.
            K-Means K=4 hard assignment:{" "}
            {k.data
              ? k.data.result.labels[k.data.result.ids.indexOf(selected)] + 1
              : "loading"}
            .
          </p>
        </section>
        <PointDetail id={selected} />
      </div>
    </>
  );
}
function EMPanel() {
  const e = useRemote<Experiment<EMData>>("/ml/em");
  if (e.loading || e.error)
    return <State loading={e.loading} error={e.error} retry={e.retry} />;
  const d = e.data!.result;
  return (
    <>
      <div className="metrics">
        <Metric label="ACTUAL EM ITERATIONS" value={String(d.iterations)} />
        <Metric label="CONVERGED" value={d.converged ? "Yes" : "No"} />
        <Metric
          label="FINAL LOWER BOUND"
          value={d.lower_bounds.at(-1)?.toFixed(3) || "Unavailable"}
        />
      </div>
      <ChartBox>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={d.lower_bounds.map((bound, i) => ({
              iteration: i + 1,
              bound,
            }))}
          >
            <CartesianGrid stroke={chartTheme.stroke} />
            <XAxis dataKey="iteration" tick={chartTheme} />
            <YAxis domain={["auto", "auto"]} tick={chartTheme} />
            <Tooltip contentStyle={{ background: "#171728" }} />
            <Line
              type="linear"
              dataKey="bound"
              name="Mean log-likelihood lower bound"
              stroke="#ff9b82"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>
      <p className="muted">{d.note}</p>
      <div className="two-columns">
        <div className="method-card">
          <h3>E-step</h3>
          <p>
            Compute each record’s posterior component responsibility using the
            current means, covariance estimates and mixture weights.
          </p>
          <code>rᵢₖ ∝ πₖ N(xᵢ | μₖ, Σₖ)</code>
        </div>
        <div className="method-card">
          <h3>M-step</h3>
          <p>
            Use those responsibilities as weights to update component mass,
            means and covariance estimates. The recorded curve comes from actual
            GMM fitting.
          </p>
          <code>μₖ = Σᵢ rᵢₖxᵢ / Σᵢ rᵢₖ</code>
        </div>
      </div>
      <details className="method-details">
        <summary>
          Inspect final responsibilities for actual training records
        </summary>
        <table>
          <thead>
            <tr>
              <th>Record</th>
              <th>Responsibilities</th>
            </tr>
          </thead>
          <tbody>
            {d.example_ids.map((id, i) => (
              <tr key={id}>
                <td>{id}</td>
                <td>
                  {d.responsibilities[i].map((v) => v.toFixed(5)).join(" / ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
function PCAPanel({
  universe = false,
  clusterK = 4,
}: {
  universe?: boolean;
  clusterK?: number;
}) {
  const e = useRemote<Experiment<PCAData>>("/ml/pca"),
    k = useRemote<Experiment<KData>>("/ml/kmeans?k=" + clusterK);
  const [params, setParams] = useSearchParams();
  const filter = params.get("cluster") || "all";
  const [id, setId] = useState<string | null>(null),
    [components, setComponents] = useState(2);
  if (e.loading || e.error || k.loading || k.error)
    return (
      <State
        loading={e.loading || k.loading}
        error={e.error || k.error}
        retry={() => {
          e.retry();
          k.retry();
        }}
      />
    );
  const d = e.data!.result,
    labels = k.data!.result.labels;
  return (
    <>
      <div className="universe-toolbar">
        <div className="cluster-filters">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setParams({})}
          >
            All clusters
          </button>
          {Array.from({ length: clusterK }, (_, c) => c).map((c) => (
            <button
              key={c}
              className={filter === String(c) ? "active" : ""}
              onClick={() => setParams({ cluster: String(c) })}
            >
              <span style={{ background: colors[c] }} />
              Cluster {c + 1}
            </button>
          ))}
        </div>
        <span>
          {d.ids.length} real records · K={clusterK} view
        </span>
      </div>
      <div className="plot-layout">
        <section>
          <Scatter
            ids={d.ids}
            coordinates={d.coordinates}
            labels={labels}
            filter={filter}
            selected={id}
            onSelect={setId}
          />
          <RecordSelect
            ids={d.ids.filter(
              (_, i) => filter === "all" || labels[i] === Number(filter),
            )}
            id={id}
            setId={setId}
          />
        </section>
        <PointDetail id={id} />
      </div>
      <p className="muted">
        PC1: {(d.explained_variance_ratio[0] * 100).toFixed(1)}% variance · PC2:{" "}
        {(d.explained_variance_ratio[1] * 100).toFixed(1)}% variance.
        Coordinates are fitted PCA projections; clustering uses all descriptors.
      </p>
      {!universe ? (
        <>
          <div className="lab-control">
            <label htmlFor="components">
              Retained components: {components} ·{" "}
              {(
                d.explained_variance_ratio
                  .slice(0, components)
                  .reduce((a, b) => a + b, 0) * 100
              ).toFixed(1)}
              % variance
            </label>
            <input
              id="components"
              type="range"
              min={1}
              max={d.explained_variance_ratio.length}
              value={components}
              onChange={(e) => setComponents(Number(e.target.value))}
            />
          </div>
          <ChartBox>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={d.explained_variance_ratio.map((v, i) => ({
                  component: i + 1,
                  variance: v * 100,
                }))}
              >
                <CartesianGrid stroke={chartTheme.stroke} vertical={false} />
                <XAxis dataKey="component" tick={chartTheme} />
                <YAxis tick={chartTheme} unit="%" />
                <Tooltip contentStyle={{ background: "#171728" }} />
                <Bar dataKey="variance" fill="#b499ff" />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </>
      ) : null}
      <details className="method-details">
        <summary>Inspect principal-component loadings</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>PC1</th>
                <th>PC2</th>
              </tr>
            </thead>
            <tbody>
              {d.feature_names.map((name, i) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{d.loadings[0][i].toFixed(4)}</td>
                  <td>{d.loadings[1][i].toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
function DimensionsPanel() {
  const e = useRemote<Experiment<DimensionData>>("/ml/dimensions");
  if (e.loading || e.error)
    return <State loading={e.loading} error={e.error} retry={e.retry} />;
  const d = e.data!.result;
  return (
    <>
      <div className="metrics">
        <Metric
          label="SELECTED FA DIMENSIONS"
          value={String(d.selected_factors)}
          note="Best validation log-likelihood"
        />
        <Metric
          label="PCA / 90% VARIANCE"
          value={String(d.pca_90_percent)}
          note="Separate descriptive threshold"
        />
      </div>
      <ChartBox>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={d.rows}>
            <CartesianGrid stroke={chartTheme.stroke} />
            <XAxis dataKey="dimensions" tick={chartTheme} />
            <YAxis domain={["auto", "auto"]} tick={chartTheme} />
            <Tooltip contentStyle={{ background: "#171728" }} />
            <Legend />
            <Line
              dataKey="fa_validation_log_likelihood"
              name="Factor Analysis"
              stroke="#b499ff"
            />
            <Line
              dataKey="pca_validation_log_likelihood"
              name="Probabilistic PCA"
              stroke="#ff9b82"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>
      <p>{d.rule}</p>
      <p className="muted">
        Models with different dimension counts are compared on the same held-out
        observations and original descriptor space.
      </p>
    </>
  );
}
function FactorsPanel() {
  const e = useRemote<Experiment<FactorData>>("/ml/factors");
  const [factor, setFactor] = useState(0);
  if (e.loading || e.error)
    return <State loading={e.loading} error={e.error} retry={e.retry} />;
  const d = e.data!.result;
  return (
    <>
      <div className="metrics">
        <Metric label="FITTED FACTORS" value={String(d.dimensions)} />
        <Metric
          label="TEST LOG-LIKELIHOOD"
          value={d.test_log_likelihood.toFixed(3)}
        />
      </div>
      <label className="record-select">
        Inspect factor
        <select
          value={factor}
          onChange={(e) => setFactor(Number(e.target.value))}
          aria-label="Inspect factor"
        >
          {Array.from({ length: d.dimensions }, (_, i) => (
            <option key={i} value={i}>
              Factor {i + 1}
            </option>
          ))}
        </select>
      </label>
      <ChartBox>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={d.feature_names.map((name, i) => ({
              name,
              loading: d.loadings[i][factor],
            }))}
            layout="vertical"
            margin={{ left: 80 }}
          >
            <CartesianGrid stroke={chartTheme.stroke} horizontal={false} />
            <XAxis type="number" tick={chartTheme} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ ...chartTheme, fontSize: 9 }}
              width={120}
            />
            <Tooltip contentStyle={{ background: "#171728" }} />
            <Bar dataKey="loading" fill="#73d5c3" />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
      <p className="muted">{d.note}</p>
      <details className="method-details">
        <summary>All loadings and feature-specific noise</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                {Array.from({ length: d.dimensions }, (_, i) => (
                  <th key={i}>F{i + 1}</th>
                ))}
                <th>Noise variance</th>
              </tr>
            </thead>
            <tbody>
              {d.feature_names.map((name, i) => (
                <tr key={name}>
                  <td>{name}</td>
                  {d.loadings[i].map((v, j) => (
                    <td
                      key={j}
                      style={{
                        background: `rgba(155,124,255,${Math.min(Math.abs(v), 1) * 0.3})`,
                      }}
                    >
                      {v.toFixed(3)}
                    </td>
                  ))}
                  <td>{d.noise_variance[i].toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
function HierarchyPanel() {
  const e = useRemote<Experiment<HierarchyData>>("/ml/hierarchy");
  const [fraction, setFraction] = useState(0.5),
    [id, setId] = useState<string | null>(null);
  if (e.loading || e.error)
    return <State loading={e.loading} error={e.error} retry={e.retry} />;
  const d = e.data!.result,
    n = d.ids.length,
    max = d.linkage.at(-1)![2],
    cut = max * fraction;
  const members = new Map<number, number[]>();
  for (let i = 0; i < n; i++) members.set(i, [i]);
  d.linkage.forEach((r, i) =>
    members.set(n + i, [...members.get(r[0])!, ...members.get(r[1])!]),
  );
  const labels = Array.from({ length: n }, (_, i) => i);
  d.linkage.forEach((r, i) => {
    if (r[2] <= cut) {
      const leaves = members.get(n + i)!;
      for (const leaf of leaves) labels[leaf] = leaves[0];
    }
  });
  const groups = Array.from(new Set(labels)),
    order = members.get(2 * n - 2)!;
  const nodes = new Map<number, { x: number; y: number }>();
  order.forEach((leaf, i) => nodes.set(leaf, { x: 25 + i * 10, y: 330 }));
  const lines = d.linkage.map((r, i) => {
    const a = nodes.get(r[0])!,
      b = nodes.get(r[1])!,
      y = 330 - (r[2] / max) * 300;
    nodes.set(n + i, { x: (a.x + b.x) / 2, y });
    return (
      <path
        key={i}
        d={`M${a.x},${a.y} V${y} H${b.x} V${b.y}`}
        stroke={r[2] <= cut ? "#b499ff" : "#77748a"}
        fill="none"
        strokeWidth="1.5"
      />
    );
  });
  return (
    <>
      <div className="lab-control">
        <label htmlFor="cut-height">
          Cut height: {cut.toFixed(2)} · {groups.length} clusters · {n} sampled
          records
        </label>
        <input
          id="cut-height"
          aria-label="Dendrogram cut height"
          type="range"
          min={0.01}
          max={1}
          step={0.01}
          value={fraction}
          onChange={(e) => setFraction(Number(e.target.value))}
        />
      </div>
      <div className="dendrogram-scroll">
        <svg
          width={n * 10 + 50}
          height="365"
          role="img"
          aria-label="Real Ward linkage dendrogram"
        >
          <title>
            Ward hierarchy for {n} actual records; dashed line shows adjustable
            cut height.
          </title>
          {lines}
          <line
            x1="20"
            x2={n * 10 + 30}
            y1={330 - (cut / max) * 300}
            y2={330 - (cut / max) * 300}
            stroke="#ff9b82"
            strokeDasharray="5 4"
          />
          {order.map((leaf, i) => (
            <circle
              key={leaf}
              cx={25 + i * 10}
              cy="338"
              r="3"
              fill={colors[groups.indexOf(labels[leaf]) % colors.length]}
              onClick={() => setId(d.ids[leaf])}
            >
              <title>{d.ids[leaf]}</title>
            </circle>
          ))}
        </svg>
      </div>
      <p className="muted">
        {d.method} · Cophenetic correlation:{" "}
        {d.cophenetic_correlation.toFixed(3)}. The tree represents this sample,
        not the entire catalogue.
      </p>
      <RecordSelect ids={d.ids} id={id} setId={setId} />
      {id ? <PointDetail id={id} /> : null}
      <details className="method-details">
        <summary>Record-to-cut-cluster assignments</summary>
        <table>
          <thead>
            <tr>
              <th>Record</th>
              <th>Cut cluster</th>
            </tr>
          </thead>
          <tbody>
            {d.ids.map((id, i) => (
              <tr key={id}>
                <td>{id}</td>
                <td>{groups.indexOf(labels[i]) + 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
function DistancesPanel() {
  const e =
    useRemote<
      Experiment<{ ids: string[]; vectors: number[][]; metric: string }>
    >("/ml/distances");
  const [left, setLeft] = useState(""),
    [right, setRight] = useState("");
  if (e.loading || e.error)
    return <State loading={e.loading} error={e.error} retry={e.retry} />;
  const d = e.data!.result,
    a = Math.max(0, d.ids.indexOf(left)),
    b = right ? Math.max(0, d.ids.indexOf(right)) : 1,
    x = d.vectors[a],
    y = d.vectors[b],
    contributions = x.map((v, i) => (v - y[i]) ** 2),
    euclidean = Math.sqrt(contributions.reduce((a, b) => a + b, 0)),
    norm = Math.hypot(...x) * Math.hypot(...y),
    // Bound floating-point roundoff to the mathematical cosine-distance range.
    cosine = norm
      ? Math.max(
          0,
          Math.min(2, 1 - x.reduce((sum, v, i) => sum + v * y[i], 0) / norm),
        )
      : 0;
  return (
    <>
      <div className="two-columns">
        <RecordSelect ids={d.ids} id={d.ids[a]} setId={setLeft} />
        <RecordSelect ids={d.ids} id={d.ids[b]} setId={setRight} />
      </div>
      <div className="metrics">
        <Metric
          label="EUCLIDEAN DISTANCE"
          value={euclidean.toFixed(5)}
          note="Lower is closer in scaled space"
        />
        <Metric
          label="COSINE DISTANCE"
          value={cosine.toFixed(5)}
          note="Direction after L2 normalization"
        />
      </div>
      <div className="two-columns">
        <PointDetail id={d.ids[a]} />
        <PointDetail id={d.ids[b]} />
      </div>
      <p className="muted">
        {d.metric} The profile ranks by distance from the average selected-track
        vector, rather than this pairwise distance.
      </p>
      <details className="method-details">
        <summary>Inspect squared-distance contributions</summary>
        <code>
          {contributions
            .map((v, i) => `Descriptor ${i + 1}: ${v.toFixed(5)}`)
            .join("\n")}
        </code>
      </details>
    </>
  );
}
function EvaluationPanel() {
  const e = useRemote<Experiment<Evaluation>>("/ml/evaluation");
  const [metric, setMetric] = useState<
    "silhouette" | "inertia" | "stability_ari"
  >("silhouette");
  if (e.loading || e.error)
    return <State loading={e.loading} error={e.error} retry={e.retry} />;
  const d = e.data!.result;
  return (
    <>
      <div className="metrics">
        <Metric
          label="SELECTED K"
          value={String(d.chosen_k)}
          note="Validation silhouette selection"
        />
        <Metric
          label="HELD-OUT SILHOUETTE"
          value={d.test_silhouette?.toFixed(3) ?? "N/A"}
        />
        <Metric
          label="GMM TEST LOG-LIKELIHOOD"
          value={d.test_gmm_log_likelihood.toFixed(3)}
        />
      </div>
      <label className="record-select">
        Compare K-Means runs
        <select
          aria-label="Evaluation metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value as typeof metric)}
        >
          <option value="silhouette">Validation silhouette</option>
          <option value="inertia">Training inertia / elbow</option>
          <option value="stability_ari">Seed stability ARI</option>
        </select>
      </label>
      <ChartBox>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={d.kmeans}>
            <CartesianGrid stroke={chartTheme.stroke} />
            <XAxis dataKey="k" tick={chartTheme} />
            <YAxis domain={["auto", "auto"]} tick={chartTheme} />
            <Tooltip contentStyle={{ background: "#171728" }} />
            <Line dataKey={metric} stroke="#b499ff" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>
      <h3>Gaussian mixture model selection</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Components</th>
              <th>AIC</th>
              <th>BIC</th>
              <th>Validation log-likelihood</th>
              <th>Converged</th>
            </tr>
          </thead>
          <tbody>
            {d.gmm.map((g) => (
              <tr key={g.components}>
                <td>{g.components}</td>
                <td>{g.aic.toFixed(1)}</td>
                <td>{g.bic.toFixed(1)}</td>
                <td>{g.validation_log_likelihood.toFixed(3)}</td>
                <td>{g.converged ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="notice">{d.limitations}</p>
    </>
  );
}
const panels: Record<string, () => React.ReactNode> = {
  kmeans: KMeansPanel,
  gmm: GMMPanel,
  em: EMPanel,
  pca: () => <PCAPanel />,
  dimensions: DimensionsPanel,
  factors: FactorsPanel,
  hierarchy: HierarchyPanel,
  distances: DistancesPanel,
  evaluation: EvaluationPanel,
};
export default function Lab({ universe = false }: { universe?: boolean }) {
  const { experiment } = useParams();
  const models = useRemote<ModelInfo>("/ml/models");
  const topic = topics.find((t) => t.id === experiment);
  const Panel = topic ? panels[topic.id] : null;
  return (
    <div className="page lab-page">
      <PageIntro
        eyebrow={
          universe
            ? "MAP THE SPACE BETWEEN RECORDS"
            : "ML LAB — UNIT 3 IN ACTION"
        }
        title={
          universe
            ? "A UNIVERSE\nOF SOUND."
            : topic
              ? topic.name.toUpperCase()
              : "BEHIND\nTHE FREQUENCY."
        }
        description={
          universe
            ? "Every point is a real recording. Follow a cluster, find a neighbor, and discover the patterns in measured sound."
            : topic
              ? topic.subtitle
              : "Not a black box. An open record. Explore the algorithms, data and decisions behind your musical portrait."
        }
      />
      {models.loading || models.error ? (
        <State
          loading={models.loading}
          error={models.error}
          retry={models.retry}
        />
      ) : (
        <>
          <div className="lab-release">
            <span className="status-dot" />
            <strong>REAL COMPUTED ARTIFACTS</strong>
            <span>
              {models.data!.training.train_count +
                models.data!.training.validation_count +
                models.data!.training.test_count}{" "}
              recordings
            </span>
            <span>{models.data!.features.length} descriptors</span>
            <code>{models.data!.release}</code>
          </div>
          {universe ? (
            <PCAPanel universe clusterK={models.data!.chosen_k} />
          ) : topic && Panel ? (
            <>
              <nav className="lab-tabs" aria-label="Experiments">
                {topics.map((t) => (
                  <Link
                    key={t.id}
                    className={topic.id === t.id ? "active" : ""}
                    to={"/ml-lab/" + t.id}
                  >
                    {t.name}
                  </Link>
                ))}
              </nav>
              <p className="experiment-explainer">{topic.text}</p>
              <Panel />
              <ExperimentEvidence topic={topic} model={models.data!} />
            </>
          ) : (
            <>
              <div className="lab-intro">
                <FlaskConical size={33} />
                <div>
                  <h2>Less magic. More method.</h2>
                  <p>
                    All experiments use published FMA audio descriptors and
                    reproducible offline training. Controls retrieve actual
                    model outputs; nothing is trained inside a page request.
                  </p>
                </div>
                <Link className="text-link" to="/ml-lab/kmeans">
                  Start exploring
                  <ArrowRight size={18} />
                </Link>
              </div>
              <div className="experiment-grid">
                {topics.map((t, i) => (
                  <Link
                    className="experiment-card"
                    key={t.id}
                    to={"/ml-lab/" + t.id}
                  >
                    <span className="eyebrow">
                      EXPERIMENT {String(i + 1).padStart(2, "0")}
                    </span>
                    <div
                      className={"experiment-glyph glyph-" + (i % 4)}
                      aria-hidden="true"
                    >
                      {["∴", "◉", "↻", "↗", "≋", "⊞", "⋔", "↔", "∿"][i]}
                    </div>
                    <h2>{t.name}</h2>
                    <p>{t.subtitle}</p>
                    <span className="experiment-link">
                      Explore experiment
                      <ArrowUpRight size={16} />
                    </span>
                  </Link>
                ))}
              </div>
              <section className="method-card dataset-card">
                <span className="eyebrow">THE RECORD BEHIND THE RESULTS</span>
                <h2>{models.data!.dataset}</h2>
                <p>{models.data!.provenance.source}</p>
                <p>{models.data!.training.split}</p>
                <p>{models.data!.provenance.note}</p>
                <a
                  className="text-link"
                  href={safeURL(models.data!.provenance.url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source & attribution
                  <ArrowUpRight size={16} />
                </a>
                <code>Dataset SHA256: {models.data!.dataset_hash}</code>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
function ExperimentEvidence({
  topic,
  model,
}: {
  topic: LabTopic;
  model: ModelInfo;
}) {
  return (
    <details className="method-details evidence">
      <summary>Implementation, inputs & Unit 3 reference</summary>
      <dl>
        <dt>Implementation</dt>
        <dd>ml/train.py · backend/engine.py · src/lab.tsx</dd>
        <dt>Dataset</dt>
        <dd>
          {model.dataset} / {model.provenance.license}
        </dd>
        <dt>Inputs</dt>
        <dd>
          {model.features.map((f) => f.label).join(", ")}. First five
          descriptors log-transformed; all standardized with training-set
          parameters.
        </dd>
        <dt>Application use</dt>
        <dd>{topic.text}</dd>
        <dt>Unit 3 topic</dt>
        <dd>
          {topic.name}. Course 21CSC305P. Exact slide number pending the
          supplied course deck.
        </dd>
        <dt>Release</dt>
        <dd>
          {model.release} / {model.feature_schema}
        </dd>
        <dt>Random seed</dt>
        <dd>
          {model.training.seed}; separate artist groups across evaluation
          partitions.
        </dd>
      </dl>
    </details>
  );
}
