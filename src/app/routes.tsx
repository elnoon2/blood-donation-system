import { createBrowserRouter } from "react-router";
import { LandingPage } from "./pages/landing";
import { LoginPage } from "./pages/login";
import { RegisterPage } from "./pages/register";
import { DashboardPage } from "./pages/dashboard";
import { DonorProfilePage } from "./pages/donor-profile";
import { DonorFormPage } from "./pages/donor-form";
import { RequestBloodPage } from "./pages/request-blood";
import { SearchDonorsPage } from "./pages/search-donors";
import { AdminDashboardPage } from "./pages/admin-dashboard";
import { HospitalDashboardPage } from "./pages/hospital-dashboard";
import { ContactUsPage } from "./pages/contact-us";
import { DesignSystemPage } from "./pages/design-system";
import { NotFoundPage } from "./pages/not-found";
import VerifyDonation from "./pages/verify-donation";
import { ProtectedRoute, PublicRoute } from "./components/auth-guards";
import { EligibilityForm } from "./pages/eligibility-form";
import { EligibilityResult } from "./pages/eligibility-result";
import { DonationOptions } from "./pages/donation-options";
import { HomeCollectionForm } from "./pages/home-collection-form";
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
        <AdminDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/contact-us",
    Component: ContactUsPage,
  },
  {
    path: "/design-system",
    Component: DesignSystemPage,
  },
  {
    path: "/verify-donation",
    Component: VerifyDonation,
  },
  {
    path: "/eligibility-form",
    Component: EligibilityForm,
  },
  {
    path: "/eligibility-result",
    Component: EligibilityResult,
  },
  {
    path: "/donation-options",
    Component: DonationOptions,
  },
  {
    path: "/home-collection-form",
    Component: HomeCollectionForm,
  },
  {
    path: "*",
    Component: NotFoundPage,
  },
]);