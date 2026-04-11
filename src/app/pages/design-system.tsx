import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { StatsCard } from "../components/stats-card";
import { BloodTypeBadge } from "../components/blood-type-badge";
import { Droplet, Heart, Users, Search, Bell, Shield } from "lucide-react";
import { Link } from "react-router";

export function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Design System</h1>
              <p className="text-gray-600">Smart Blood Donation System UI/UX Components</p>
            </div>
            <Button asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Color Palette */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="bg-primary h-20 rounded-lg mb-4"></div>
              <h3 className="font-semibold text-gray-900">Primary</h3>
              <p className="text-sm text-gray-600">#C1121F</p>
            </Card>
            <Card className="p-6">
              <div className="bg-gray-900 h-20 rounded-lg mb-4"></div>
              <h3 className="font-semibold text-gray-900">Dark Gray</h3>
              <p className="text-sm text-gray-600">#111827</p>
            </Card>
            <Card className="p-6">
              <div className="bg-gray-100 h-20 rounded-lg mb-4 border border-gray-200"></div>
              <h3 className="font-semibold text-gray-900">Light Gray</h3>
              <p className="text-sm text-gray-600">#F3F4F6</p>
            </Card>
            <Card className="p-6">
              <div className="bg-white h-20 rounded-lg mb-4 border border-gray-200"></div>
              <h3 className="font-semibold text-gray-900">White</h3>
              <p className="text-sm text-gray-600">#FFFFFF</p>
            </Card>
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Typography</h2>
          <Card className="p-8 space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Heading 1</h1>
              <p className="text-sm text-gray-500">Font size: 36px, Weight: Bold</p>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Heading 2</h2>
              <p className="text-sm text-gray-500">Font size: 30px, Weight: Bold</p>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Heading 3</h3>
              <p className="text-sm text-gray-500">Font size: 24px, Weight: Semibold</p>
            </div>
            <div>
              <p className="text-lg text-gray-900 mb-2">Body Large</p>
              <p className="text-sm text-gray-500">Font size: 18px, Weight: Regular</p>
            </div>
            <div>
              <p className="text-base text-gray-900 mb-2">Body Regular</p>
              <p className="text-sm text-gray-500">Font size: 16px, Weight: Regular</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Body Small</p>
              <p className="text-sm text-gray-500">Font size: 14px, Weight: Regular</p>
            </div>
          </Card>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Buttons</h2>
          <Card className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 mb-4">Primary Buttons</h3>
                <Button size="lg">Large Button</Button>
                <Button>Default Button</Button>
                <Button size="sm">Small Button</Button>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 mb-4">Outline Buttons</h3>
                <Button variant="outline" size="lg">Large Outline</Button>
                <Button variant="outline">Default Outline</Button>
                <Button variant="outline" size="sm">Small Outline</Button>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 mb-4">With Icons</h3>
                <Button>
                  <Droplet className="w-4 h-4 mr-2" fill="currentColor" />
                  Donate Blood
                </Button>
                <Button variant="outline">
                  <Heart className="w-4 h-4 mr-2" />
                  Request Blood
                </Button>
                <Button variant="outline" size="sm">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* Form Elements */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Form Elements</h2>
          <Card className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Text Input</Label>
                <Input placeholder="Enter your email" />
              </div>
              <div className="space-y-2">
                <Label>Input with Icon</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input placeholder="Search..." className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Disabled Input</Label>
                <Input placeholder="Disabled" disabled />
              </div>
              <div className="space-y-2">
                <Label>Password Input</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
            </div>
          </Card>
        </section>

        {/* Badges */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Badges</h2>
          <Card className="p-8">
            <div className="flex flex-wrap gap-4">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Blood Type Badges</h3>
              <div className="flex flex-wrap gap-4">
                <BloodTypeBadge bloodType="A+" size="sm" />
                <BloodTypeBadge bloodType="O-" size="md" />
                <BloodTypeBadge bloodType="AB+" size="lg" />
              </div>
            </div>
          </Card>
        </section>

        {/* Stats Cards */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Stats Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Active Donors"
              value="12,458"
              icon={Users}
              trend={{ value: 12, isPositive: true }}
            />
            <StatsCard
              title="Lives Saved"
              value="8,742"
              icon={Heart}
              trend={{ value: 23, isPositive: true }}
            />
            <StatsCard
              title="Total Donations"
              value="24,891"
              icon={Droplet}
              trend={{ value: 8, isPositive: true }}
            />
          </div>
        </section>

        {/* Icons */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Icons</h2>
          <Card className="p-8">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-8">
              <div className="flex flex-col items-center gap-2">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <Droplet className="w-8 h-8 text-primary" fill="currentColor" />
                </div>
                <span className="text-xs text-gray-600">Droplet</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <span className="text-xs text-gray-600">Heart</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <span className="text-xs text-gray-600">Users</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <Bell className="w-8 h-8 text-primary" />
                </div>
                <span className="text-xs text-gray-600">Bell</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <span className="text-xs text-gray-600">Shield</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <Search className="w-8 h-8 text-primary" />
                </div>
                <span className="text-xs text-gray-600">Search</span>
              </div>
            </div>
          </Card>
        </section>

        {/* Spacing System */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Spacing System</h2>
          <Card className="p-8 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 text-sm text-gray-600">4px</div>
              <div className="h-4 bg-primary" style={{ width: '4px' }}></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 text-sm text-gray-600">8px</div>
              <div className="h-4 bg-primary" style={{ width: '8px' }}></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 text-sm text-gray-600">16px</div>
              <div className="h-4 bg-primary" style={{ width: '16px' }}></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 text-sm text-gray-600">24px</div>
              <div className="h-4 bg-primary" style={{ width: '24px' }}></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 text-sm text-gray-600">32px</div>
              <div className="h-4 bg-primary" style={{ width: '32px' }}></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 text-sm text-gray-600">48px</div>
              <div className="h-4 bg-primary" style={{ width: '48px' }}></div>
            </div>
          </Card>
        </section>

        {/* Border Radius */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Border Radius</h2>
          <Card className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="bg-primary h-20 rounded-sm"></div>
                <p className="text-sm text-gray-600">Small (2px)</p>
              </div>
              <div className="space-y-2">
                <div className="bg-primary h-20 rounded"></div>
                <p className="text-sm text-gray-600">Medium (4px)</p>
              </div>
              <div className="space-y-2">
                <div className="bg-primary h-20 rounded-lg"></div>
                <p className="text-sm text-gray-600">Large (8px)</p>
              </div>
              <div className="space-y-2">
                <div className="bg-primary h-20 rounded-full"></div>
                <p className="text-sm text-gray-600">Full (50%)</p>
              </div>
            </div>
          </Card>
        </section>

        {/* Shadows */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shadows</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-8 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Small Shadow</h3>
              <p className="text-sm text-gray-600">Subtle elevation</p>
            </Card>
            <Card className="p-8 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">Medium Shadow</h3>
              <p className="text-sm text-gray-600">Default cards</p>
            </Card>
            <Card className="p-8 shadow-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Large Shadow</h3>
              <p className="text-sm text-gray-600">Hover states</p>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
