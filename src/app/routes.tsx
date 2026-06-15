import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";
import { LandingPage } from "./pages/landing";
import { LoginPage } from "./pages/login";
import { RegisterPage } from "./pages/register";
import { DashboardPage } from "./pages/dashboard";
import { DonorProfilePage } from "./pages/donor-profile";
import { DonorFormPage } from "./pages/donor-form";
import { RequestBloodPage } from "./pages/request-blood";
import { SearchDonorsPage } from "./pages/search-donors";
import { ContactUsPage } from "./pages/contact-us";
import { NotFoundPage } from "./pages/not-found";
import { ProtectedRoute, PublicRoute } from "./components/auth-guards";
import { PageLoader } from "./components/loading-spinner";

// Heavy / role-gated routes are code-split so the initial landing-page bundle
// stays small. Each route only downloads its chunk when first visited.
const AdminDashboardPage = lazy(() =>
  import("./pages/admin-dashboard").then((m) => ({ default: m.AdminDashboardPage }))
);
const HospitalDashboardPage = lazy(() =>
  import("./pages/hospital-dashboard").then((m) => ({ default: m.HospitalDashboardPage }))
);
const DesignSystemPage = lazy(() =>
  import("./pages/design-system").then((m) => ({ default: m.DesignSystemPage }))
);
const VerifyDonation = lazy(() => import("./pages/verify-donation"));
const VerifyLegacyRedirect = lazy(() => import("./pages/verify-legacy-redirect"));
const EligibilityForm = lazy(() =>
  import("./pages/eligibility-form").then((m) => ({ default: m.EligibilityForm }))
);
const EligibilityResult = lazy(() =>
  import("./pages/eligibility-result").then((m) => ({ default: m.EligibilityResult }))
);
const DonationOptions = lazy(() =>
  import("./pages/donation-options").then((m) => ({ default: m.DonationOptions }))
);
const HomeCollectionForm = lazy(() =>
  import("./pages/home-collection-form").then((m) => ({ default: m.HomeCollectionForm }))
);
const AdminAnalyticsPage = lazy(() =>
  import("./pages/admin-analytics").then((m) => ({ default: m.AdminAnalyticsPage }))
);

const withSuspense = (node: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{node}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <DonorProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/donor-form",
    element: <DonorFormPage />,
  },
  {
    path: "/request-blood",
    element: (
      <ProtectedRoute roles={["PATIENT"]}>
        <RequestBloodPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/search-donors",
    element: (
      <ProtectedRoute roles={["PATIENT"]}>
        <SearchDonorsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute roles={["ADMIN"]}>
        {withSuspense(<AdminDashboardPage />)}
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/analytics",
    element: (
      <ProtectedRoute roles={["ADMIN"]}>
        {withSuspense(<AdminAnalyticsPage />)}
      </ProtectedRoute>
    ),
  },
  {
    path: "/hospital",
    element: (
      <ProtectedRoute roles={["HOSPITAL"]}>
        {withSuspense(<HospitalDashboardPage />)}
      </ProtectedRoute>
    ),
  },
  {
    path: "/contact-us",
    Component: ContactUsPage,
  },
  {
    path: "/design-system",
    element: withSuspense(<DesignSystemPage />),
  },
  {
    path: "/verify-donation",
    element: withSuspense(<VerifyDonation />),
  },
  // Legacy QR fallbacks: old QRs hit /verify.html?v=<id> or /verify?v=<id>.
  // Those URLs are missing the secure token, so we render a friendly
  // "regenerate the QR" message instead of a generic 404.
  {
    path: "/verify.html",
    element: withSuspense(<VerifyLegacyRedirect />),
  },
  {
    path: "/verify",
    element: withSuspense(<VerifyLegacyRedirect />),
  },
  {
    path: "/eligibility-form",
    element: withSuspense(<EligibilityForm />),
  },
  {
    path: "/eligibility-result",
    element: withSuspense(<EligibilityResult />),
  },
  {
    path: "/donation-options",
    element: withSuspense(<DonationOptions />),
  },
  {
    path: "/home-collection-form",
    element: withSuspense(<HomeCollectionForm />),
  },
  {
    path: "*",
    Component: NotFoundPage,
  },
]);
