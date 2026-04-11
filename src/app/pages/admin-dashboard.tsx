import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { StatsCard } from "../components/stats-card";
import { 
  Users, 
  Droplet, 
  Building2, 
  Search, 
  Menu, 
  X,
  LayoutDashboard,
  UserCircle,
  Heart,
  Hospital,
  Settings,
  LogOut,
  Filter,
  MapPin,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Activity,
  ChevronRight,
  ClipboardList,
  Trash2,
  Plus
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAuth } from "../context/AuthContext";
import api from "../../lib/api";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { GOVERNORATES, BLOOD_TYPES, HOSPITALS_BY_GOVERNORATE } from "../../lib/location-data";

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    totalDonors: 0,
    totalPatients: 0,
    totalRequests: 0,
    totalHospitals: 0,
    totalDonations: 0,
  });

  const [dataLists, setDataLists] = useState<any>({
    donors: [],
    patients: [],
    requests: [],
    hospitals: []
  });

  const [filters, setFilters] = useState({
    bloodType: "all",
    governorate: "all",
    searchTerm: ""
  });

  const [error, setError] = useState<string | null>(null);
  const [isAddHospitalOpen, setIsAddHospitalOpen] = useState(false);
  const [newHospital, setNewHospital] = useState({
    name: "",
    governorate: "Cairo",
    location: "",
    phone: "",
    email: ""
  });

  const fetchDashboardStats = async () => {
    try {
      setError(null);
      const response = await api.get("/admin/dashboard");
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch admin stats", error);
      setError("Failed to synchronize dashboard stats. Please refresh.");
    }
  };

  const fetchListData = async (tab: string) => {
    if (tab === "overview") return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.governorate !== "all") params.append("governorate", filters.governorate);
      if (filters.bloodType !== "all") params.append("bloodType", filters.bloodType);
      
      let endpoint = "";
      if (tab === "donors") endpoint = "/admin/donors";
      else if (tab === "patients") endpoint = "/admin/patients";
      else if (tab === "requests") endpoint = "/admin/requests";
      else if (tab === "hospitals") endpoint = "/admin/hospitals";
      
      if (endpoint) {
        const url = `${endpoint}?${params.toString()}`;
        const response = await api.get(url);
        setDataLists((prev: any) => ({ ...prev, [tab]: response.data }));
      }
    } catch (error) {
      console.error(`Failed to fetch ${tab} data`, error);
      setError(`Unable to retrieve ${tab} records. Please check your connection.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    if (activeTab !== "overview") {
      fetchListData(activeTab);
    }
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleDeleteItem = async (id: number, type: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${type.slice(0, -1)}? This action cannot be undone.`)) return;
    
    try {
      setLoading(true);
      let endpoint = "";
      if (type === "donors" || type === "patients") {
        endpoint = `/admin/users/${id}`;
      } else {
        endpoint = `/admin/${type}/${id}`;
      }
      
      await api.delete(endpoint);
      // Refresh the current list
      fetchListData(activeTab);
      fetchDashboardStats();
    } catch (error) {
      console.error(`Failed to delete ${type} item`, error);
      setError("Failed to delete record. Please check permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (requestId: number, newStatus: string) => {
    try {
      setLoading(true);
      await api.patch(`/admin/requests/${requestId}/status?status=${newStatus}`);
      toast.success(`Request status updated`);
      fetchListData("requests");
      fetchDashboardStats();
    } catch (error) {
      console.error("Failed to update status", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post("/admin/hospitals", newHospital);
      toast.success("Hospital added!");
      setIsAddHospitalOpen(false);
      setNewHospital({ name: "", governorate: "Cairo", location: "", phone: "", email: "" });
      fetchListData("hospitals");
    } catch (error) {
      console.error("Failed to add hospital", error);
    } finally {
      setLoading(false);
    }
  };

  const filterData = (list: any[]) => {
    return list.filter(item => {
      const u = item.user || item;
      // Hospitals don't have blood types, so skip that filter for them
      const matchesBlood = activeTab === "hospitals" || filters.bloodType === "all" || u.bloodType === filters.bloodType;
      const matchesGov = filters.governorate === "all" || (u.governorate === filters.governorate || item.governorate === filters.governorate);
      const matchesSearch = !filters.searchTerm || 
        (u.name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) || 
         item.name?.toLowerCase().includes(filters.searchTerm.toLowerCase()));
      return matchesBlood && matchesGov && matchesSearch;
    });
  };

  const monthlyData = [
    { month: "Jan", donations: 145, requests: 132 },
    { month: "Feb", donations: 168, requests: 149 },
    { month: "Mar", donations: 192, requests: 171 },
    { month: "Apr", donations: 178, requests: 156 },
  ];

  const bloodTypeData = [
    { name: "O+", value: 38, color: "hsl(0, 84%, 41%)" },
    { name: "A+", value: 28, color: "hsl(0, 100%, 24%)" },
    { name: "B+", value: 15, color: "hsl(33, 100%, 91%)" },
    { name: "AB+", value: 8, color: "hsl(200, 100%, 14%)" },
    { name: "O-", value: 6, color: "hsl(203, 39%, 57%)" },
    { name: "A-", value: 3, color: "hsl(0, 84%, 41%)" },
    { name: "B-", value: 1.5, color: "hsl(0, 100%, 24%)" },
    { name: "AB-", value: 0.5, color: "hsl(33, 100%, 91%)" },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-all">
          <div className="bg-gradient-to-br from-primary to-primary-foreground rounded-xl p-2.5 shadow-lg shadow-primary/20">
            <Droplet className="w-6 h-6 text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">LifeFlow</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-primary/60">Admin Systems</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Main Menu</p>
        {[
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "donors", label: "Donors", icon: Droplet },
          { id: "patients", label: "Patients", icon: Users },
          { id: "requests", label: "Requests", icon: Heart },
          { id: "hospitals", label: "Hospitals", icon: Hospital },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              activeTab === item.id 
                ? "bg-primary text-white shadow-md shadow-primary/30" 
                : "text-gray-600 hover:bg-primary/5 hover:text-primary"
            }`}
          >
            <item.icon className={`w-5 h-5 ${activeTab === item.id ? "scale-110" : "group-hover:scale-110"} transition-transform`} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-1.5">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans selection:bg-primary/20">
      <aside className="hidden lg:block w-72 bg-white border-r border-gray-100 fixed h-screen z-50">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white shadow-2xl animate-in slide-in-from-left">
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className="flex-1 lg:ml-72 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
          <div className="px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button className="lg:hidden p-2 hover:bg-gray-100 rounded-lg" onClick={() => setSidebarOpen(true)}>
                  <Menu className="w-6 h-6 text-gray-600" />
                </button>
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                  <span className="capitalize">{activeTab}</span>
                  <span className="mx-1 text-gray-300">/</span>
                  <span className="text-gray-900">{new Date().toLocaleDateString('en-EG', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {activeTab === "hospitals" && (
                  <Button 
                    onClick={() => setIsAddHospitalOpen(true)}
                    className="h-10 px-4 rounded-xl shadow-lg shadow-primary/20 bg-primary text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    New Hospital
                  </Button>
                )}
                <div className="hidden sm:flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <Search className="w-4 h-4 text-gray-400 mr-2" />
                  <input 
                    type="text" 
                    placeholder="Global search..." 
                    className="bg-transparent border-none outline-none text-sm w-48 text-gray-600 placeholder:text-gray-400"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-bold text-gray-900 leading-none">{user?.name || "System Admin"}</p>
                    <p className="text-[10px] text-primary font-bold uppercase tracking-tight mt-1">Super Admin</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-foreground flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
                    AD
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="px-6 lg:px-8 py-8 flex-1">
          {activeTab === "overview" ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2rem] p-8 text-white">
                <div className="relative z-10 max-w-2xl">
                  <h1 className="text-3xl font-bold mb-3">Welcome back, Administrator 👋</h1>
                  <p className="text-gray-300 text-lg">
                    System health is <span className="text-green-400 font-bold uppercase tracking-wider text-sm">Excellent</span>. 
                    You have <span className="text-white font-bold underline decoration-primary underline-offset-4">{stats.totalRequests}</span> pending blood requests to review today.
                  </p>
                </div>
                <div className="absolute right-[-5%] top-[-20%] w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
                <div className="absolute left-[40%] bottom-[-50%] w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "primary" },
                    { label: "Active Donors", value: stats.totalDonors, icon: Droplet, color: "red" },
                    { label: "Patients", value: stats.totalPatients, icon: UserCircle, color: "blue" },
                    { label: "Blood Requests", value: stats.totalRequests, icon: Heart, color: "pink" },
                    { label: "Total Hospitals", value: stats.totalHospitals, icon: Hospital, color: "indigo" },
                    { label: "Donations", value: stats.totalDonations, icon: Droplet, color: "green" },
                ].map((s, idx) => (
                    <Card key={idx} className="p-5 border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-[1.25rem] group overflow-hidden bg-white">
                        <div className="relative z-10">
                            <div className={`w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 mb-3 group-hover:scale-110 transition-transform duration-300`}>
                                <s.icon className="w-5 h-5" />
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                            <h3 className="text-2xl font-black text-gray-900 mt-1">{s.value?.toLocaleString() || 0}</h3>
                        </div>
                    </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <Card className="p-8 border-none shadow-sm rounded-[2rem]">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">System Activity</h2>
                        <p className="text-gray-500 text-sm font-medium">Monthly donations vs requests</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-[10px] font-bold text-primary uppercase">Donations</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-gray-500" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Requests</span>
                        </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Bar dataKey="donations" fill="hsl(0, 84%, 44%)" radius={[6, 6, 0, 0]} barSize={20} />
                      <Bar dataKey="requests" fill="#CBD5E1" radius={[6, 6, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-8 border-none shadow-sm rounded-[2rem]">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Blood Demographics</h2>
                    <p className="text-gray-500 text-sm font-medium">Real-time inventory distribution</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 items-center">
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                        <Pie
                            data={bloodTypeData}
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                        >
                            {bloodTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 pl-8 border-l border-gray-100 hidden md:block">
                        {bloodTypeData.slice(0, 4).map((b, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                                    <span className="text-sm font-bold text-gray-700">{b.name}</span>
                                </div>
                                <span className="text-sm font-black text-gray-900">{b.value}%</span>
                            </div>
                        ))}
                        <div className="pt-2">
                             <Button variant="ghost" size="sm" className="w-full text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/5">View Full Report</Button>
                        </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
               {error && (
                 <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                    <Button variant="ghost" size="sm" className="ml-auto text-xs font-bold uppercase" onClick={() => activeTab === "overview" ? fetchDashboardStats() : fetchListData(activeTab)}>Retry</Button>
                 </div>
               )}

               <Card className="p-6 border-none shadow-sm rounded-2xl mb-8 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Search & Identity</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                                placeholder="Search by name or email..." 
                                className="pl-10 h-11 border-gray-100 focus:ring-primary/20 rounded-xl bg-gray-50/50"
                                value={filters.searchTerm}
                                onChange={(e) => setFilters(f => ({ ...f, searchTerm: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Blood Classification</Label>
                        <select
                            className="w-full h-11 px-4 rounded-xl border border-gray-100 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none bg-gray-50/50 transition-all"
                            value={filters.bloodType}
                            onChange={(e) => setFilters(f => ({ ...f, bloodType: e.target.value }))}
                        >
                            <option value="all">All Blood Types</option>
                            {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Egyptian Governorate</Label>
                        <select
                            className="w-full h-11 px-4 rounded-xl border border-gray-100 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none bg-gray-50/50 transition-all"
                            value={filters.governorate}
                            onChange={(e) => setFilters(f => ({ ...f, governorate: e.target.value }))}
                        >
                            <option value="all">Across All Egypt</option>
                            {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <Button className="flex-1 h-11 rounded-xl shadow-lg shadow-primary/20 font-bold uppercase text-[10px] tracking-widest" onClick={() => fetchListData(activeTab)}>
                            <Filter className="w-4 h-4 mr-2" />
                            Apply Filters
                        </Button>
                        <Button variant="outline" className="h-11 w-11 p-0 rounded-xl border-gray-100" onClick={() => setFilters({ bloodType: 'all', governorate: 'all', searchTerm: '' })}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                  </div>
               </Card>

               <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Synchronizing Database...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/80">
                                {activeTab === "donors" && (
                                    <TableRow className="border-none hover:bg-transparent">
                                        <TableHead className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Donor Identity</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Blood Type</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Governorate</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Donation</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right px-8">Actions</TableHead>
                                    </TableRow>
                                )}
                                {activeTab === "patients" && (
                                    <TableRow className="border-none hover:bg-transparent">
                                        <TableHead className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient Identity</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Type Needed</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Governorate</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right px-8">Actions</TableHead>
                                    </TableRow>
                                )}
                                {activeTab === "requests" && (
                                    <TableRow className="border-none hover:bg-transparent">
                                        <TableHead className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Requester</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Blood Type</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Quantity</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Governorate</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Requested On</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right px-8">Actions</TableHead>
                                    </TableRow>
                                )}
                                {activeTab === "hospitals" && (
                                    <TableRow className="border-none hover:bg-transparent">
                                        <TableHead className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Hospital Name</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Governorate</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Location / Address</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact (Phone/Email)</TableHead>
                                        <TableHead className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right px-8">Actions</TableHead>
                                    </TableRow>
                                )}
                            </TableHeader>
                            <TableBody>
                                {dataLists[activeTab]?.length > 0 ? (
                                    dataLists[activeTab].map((item: any) => {
                                        const u = item.user || item;
                                        return (
                                            <TableRow key={item.id} className="border-gray-50 hover:bg-gray-50/30 transition-colors group">
                                                {activeTab === "donors" && (
                                                    <>
                                                        <TableCell className="px-8 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">
                                                                    {u.name?.charAt(0) || '?'}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-gray-900 text-sm leading-none">{u.name || 'Anonymous'}</p>
                                                                    <p className="text-[10px] text-gray-400 mt-1">{u.email}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-5 text-center">
                                                            <Badge variant="outline" className="border-red-200 text-red-600 px-3 truncate">{u.bloodType || 'N/A'}</Badge>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <span className="text-xs font-medium text-gray-600">{u.governorate || 'N/A'}</span>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <span className="text-xs font-medium text-gray-600">{u.phone || 'N/A'}</span>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <Badge className={`${item.availabilityStatus === 'AVAILABLE' ? 'bg-green-500' : 'bg-gray-400'} text-white text-[9px] font-black`}>
                                                                {item.availabilityStatus || 'UNKNOWN'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {item.lastDonationDate || '--'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-5 text-right px-8">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                                onClick={() => handleDeleteItem(u.id, "donors")}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </>
                                                )}
                                                {activeTab === "patients" && (
                                                    <>
                                                        <TableCell className="px-8 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs text-center">
                                                                    {u.name?.charAt(0) || '?'}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-gray-900 text-sm leading-none">{u.name || 'Anonymous'}</p>
                                                                    <p className="text-[10px] text-gray-400 mt-1">{u.email}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-5 text-center">
                                                            <Badge variant="outline" className="border-blue-200 text-blue-600 px-3">{u.bloodType || 'N/A'}</Badge>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <span className="text-xs font-medium text-gray-600">{u.governorate || 'N/A'}</span>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <span className="text-xs font-medium text-gray-600">{u.phone || 'N/A'}</span>
                                                        </TableCell>
                                                        <TableCell className="py-5 text-right px-8 space-x-2">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                                onClick={() => handleDeleteItem(u.id, "patients")}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </>
                                                )}
                                                {activeTab === "requests" && (
                                                    <>
                                                        <TableCell className="px-8 py-5">
                                                            <div>
                                                                <p className="font-bold text-gray-900 text-sm leading-none">{item.user?.name || 'Unknown Requester'}</p>
                                                                <p className="text-[10px] text-gray-400 mt-1">ID: #{item.id}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-5 text-center">
                                                            <Badge className="bg-red-600 text-white font-black text-[10px]">
                                                                {item.bloodType || '??'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="py-5 text-center">
                                                            <span className="text-sm font-black text-gray-700">{item.quantityNeeded || 0}</span>
                                                            <span className="text-[10px] text-gray-400 ml-1 font-bold">Units</span>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <span className="text-xs font-medium text-gray-600">{item.governorate || 'N/A'}</span>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <div className="flex flex-col gap-1.5">
                                                                <Badge className={`${item.status === 'PENDING' ? 'bg-orange-500' : item.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'} text-white text-[9px] font-black`}>
                                                                    {item.status || 'UNKNOWN'}
                                                                </Badge>
                                                                <select 
                                                                    className="text-[9px] bg-transparent border-none outline-none font-bold text-gray-400 cursor-pointer hover:text-primary transition-colors"
                                                                    value={item.status}
                                                                    onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                                                                >
                                                                    <option value="PENDING">Pending</option>
                                                                    <option value="APPROVED">Approve</option>
                                                                    <option value="REJECTED">Reject</option>
                                                                </select>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <span className="text-xs text-gray-500">{item.requestDate || '--'}</span>
                                                        </TableCell>
                                                        <TableCell className="py-5 text-right px-8">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                                onClick={() => handleDeleteItem(item.id, "requests")}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </>
                                                )}
                                                {activeTab === "hospitals" && (
                                                    <>
                                                        <TableCell className="px-8 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-gray-100 p-2 rounded-lg">
                                                                    <Building2 className="w-4 h-4 text-gray-500" />
                                                                </div>
                                                                <p className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{item.name || 'Untitled Medical Center'}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <span className="text-xs font-bold text-primary px-2 py-1 bg-primary/5 rounded-md uppercase tracking-tight">{item.governorate || 'N/A'}</span>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 max-w-[220px]">
                                                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                                <span className="truncate">{item.location || 'Address not listed'}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-700">
                                                                    <Phone className="w-3 h-3" /> {item.phone || '--'}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                                    <Mail className="w-3 h-3" /> {item.email || '--'}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-5">
                                                            <Badge className="bg-green-500 text-white text-[9px] font-black">OPERATIONAL</Badge>
                                                        </TableCell>
                                                        <TableCell className="py-5 text-right px-8">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                                onClick={() => handleDeleteItem(item.id, "hospitals")}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </>
                                                )}
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={activeTab === "hospitals" ? 5 : activeTab === "requests" ? 6 : activeTab === "donors" ? 6 : 5} className="py-32 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-4">
                                                <div className="bg-gray-50 p-4 rounded-full">
                                                    <ClipboardList className="w-10 h-10 text-gray-300" />
                                                </div>
                                                <div>
                                                    <p className="text-gray-900 font-bold">No records found matching these criteria</p>
                                                    <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or "All" to browse everything.</p>
                                                </div>
                                                <Button variant="outline" size="sm" className="rounded-xl border-gray-100 font-bold uppercase text-[10px]" onClick={() => setFilters({ bloodType: 'all', governorate: 'all', searchTerm: '' })}>Clear Selection</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
               </Card>
            </div>
          )}
        </div>
      </main>

      {isAddHospitalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsAddHospitalOpen(false)} />
          <Card className="relative z-10 w-full max-w-md p-8 border-none shadow-2xl rounded-[2rem] bg-white animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Register New Hospital</h2>
            <form onSubmit={handleAddHospital} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400">Hospital Name</Label>
                <Input required value={newHospital.name} onChange={e => setNewHospital({...newHospital, name: e.target.value})} placeholder="e.g. Kasr Al Ainy Hospital" className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">Governorate</Label>
                    <select className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" value={newHospital.governorate} onChange={e => setNewHospital({...newHospital, governorate: e.target.value})}>
                      {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">Phone</Label>
                    <Input required value={newHospital.phone} onChange={e => setNewHospital({...newHospital, phone: e.target.value})} placeholder="02-XXXXXXXX" className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400">Address / Location</Label>
                <Input required value={newHospital.location} onChange={e => setNewHospital({...newHospital, location: e.target.value})} placeholder="Street name, District" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400">Contact Email</Label>
                <Input type="email" value={newHospital.email} onChange={e => setNewHospital({...newHospital, email: e.target.value})} placeholder="hospital@example.com" className="rounded-xl" />
              </div>
              <div className="pt-4 flex gap-3">
                <Button type="button" variant="ghost" className="flex-1 rounded-xl font-bold uppercase text-[10px]" onClick={() => setIsAddHospitalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 rounded-xl shadow-lg shadow-primary/20 font-bold uppercase text-[10px]">Save Hospital</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
