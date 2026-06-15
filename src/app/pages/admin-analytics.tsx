import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import api from "../../lib/api";
import { PageLoader } from "../components/loading-spinner";

type Totals = {
  donors: number; patients: number; hospitalAccounts: number;
  requests: number; donations: number; hospitals: number;
};
type BloodRow = { type: string; donors: number; requests: number };
type GovRow = { governorate: string; requests: number };
type TrendRow = { month: string; requests: number };
type Analytics = {
  totals: Totals;
  bloodTypeDistribution: BloodRow[];
  governorateDistribution: GovRow[];
  urgencyBreakdown: Record<"NORMAL" | "URGENT" | "CRITICAL", number>;
  monthlyTrend: TrendRow[];
};

const URGENCY_COLORS: Record<string, string> = {
  NORMAL: "#10b981",
  URGENT: "#f59e0b",
  CRITICAL: "#dc2626",
};

function KpiCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accent ?? "text-gray-900"}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

export function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Analytics>("/admin/analytics")
      .then((r) => setData(r.data))
      .catch((err) => {
        toast.error("Failed to load analytics.");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) {
    return (
      <div className="p-8 text-center text-gray-600">
        Analytics unavailable. Check backend logs.
      </div>
    );
  }

  const urgencyChartData = (["CRITICAL", "URGENT", "NORMAL"] as const).map((k) => ({
    name: k,
    value: data.urgencyBreakdown[k] ?? 0,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-600">Live metrics across donors, requests, and donations.</p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total donors" value={data.totals.donors} accent="text-red-700" />
        <KpiCard label="Total patients" value={data.totals.patients} />
        <KpiCard label="Hospital accounts" value={data.totals.hospitalAccounts} />
        <KpiCard label="Requests" value={data.totals.requests} />
        <KpiCard label="Donations" value={data.totals.donations} accent="text-green-700" />
        <KpiCard label="Hospitals" value={data.totals.hospitals} />
      </section>

      {/* Blood-type distribution */}
      <section className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Blood type — donors vs requests</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.bloodTypeDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="donors" fill="#dc2626" name="Donors" />
            <Bar dataKey="requests" fill="#1f2937" name="Requests" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgency pie */}
        <section className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Requests by urgency</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={urgencyChartData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                label={(d) => `${d.name}: ${d.value}`}
              >
                {urgencyChartData.map((d) => (
                  <Cell key={d.name} fill={URGENCY_COLORS[d.name]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </section>

        {/* Governorate top 10 */}
        <section className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Top governorates by requests</h2>
          {data.governorateDistribution.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No request data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.governorateDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="governorate" width={100} />
                <Tooltip />
                <Bar dataKey="requests" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      {/* Monthly trend */}
      <section className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Monthly trend (requests)</h2>
        {data.monthlyTrend.length === 0 ? (
          <div className="text-center text-gray-500 py-12">No historical data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="requests" stroke="#dc2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  );
}

export default AdminAnalyticsPage;
