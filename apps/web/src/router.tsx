import { createBrowserRouter, Navigate } from "react-router-dom";

import App from "./App";
import { ComingSoonPage } from "./pages/coming-soon";
import { SellerSearchPage } from "./pages/search";
import { LoginPage } from "./pages/login";
import { ComponentsPage } from "./pages/dev-components";
import { NotFoundPage } from "./pages/404";
import { SellerProfilePage } from "./pages/seller-profile";
import {
  RegisterPhonePage,
  RegisterProfilePage,
  RegisterVerifyPage,
} from "./pages/register";
import { SellerVerificationPage } from "./pages/seller-verification";
import { AdminVerificationsPage } from "./pages/admin-verifications";
import { ReportProblemPage } from "./pages/report-problem";
import { DashboardTrustPage } from "./pages/dashboard-trust";
import { SellerDashboardPage } from "./pages/dashboard";
import { ProductFormPage, ProductListPage } from "./pages/products";
import { OrderEntryPage } from "./pages/order-entry";
import { OrderDetailPage, OrderListPage } from "./pages/orders";
import { CustomerDetailPage, CustomerListPage } from "./pages/customers";
import { FinancePage } from "./pages/finance";
import { SettingsPage } from "./pages/settings";
import { DataExportPage } from "./pages/data-export";
import { SafeOrderCreatePage, SafeOrderPage } from "./pages/safe-order";

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: "/", element: <SellerSearchPage /> },
      { path: "/search", element: <SellerSearchPage /> },
      { path: "/seller/:id", element: <SellerProfilePage /> },
      { path: "/s/:id", element: <SellerProfilePage /> },
      { path: "/order/new", element: <SafeOrderCreatePage /> },
      { path: "/order/:safeUrl", element: <SafeOrderPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPhonePage /> },
      { path: "/register/verify", element: <RegisterVerifyPage /> },
      { path: "/register/profile", element: <RegisterProfilePage /> },
      { path: "/seller/verify", element: <SellerVerificationPage /> },
      { path: "/dashboard", element: <SellerDashboardPage /> },
      { path: "/dashboard/products", element: <ProductListPage /> },
      { path: "/dashboard/products/new", element: <ProductFormPage /> },
      { path: "/dashboard/products/:id", element: <ProductFormPage /> },
      { path: "/dashboard/orders", element: <OrderListPage /> },
      { path: "/dashboard/orders/new", element: <OrderEntryPage /> },
      { path: "/dashboard/orders/:id", element: <OrderDetailPage /> },
      { path: "/dashboard/customers", element: <CustomerListPage /> },
      { path: "/dashboard/customers/:id", element: <CustomerDetailPage /> },
      { path: "/dashboard/finance", element: <FinancePage /> },
      { path: "/dashboard/settings", element: <SettingsPage /> },
      { path: "/dashboard/settings/export", element: <DataExportPage /> },
      { path: "/admin/verifications", element: <AdminVerificationsPage /> },
      { path: "/report-problem", element: <ReportProblemPage /> },
      { path: "/dashboard/trust", element: <DashboardTrustPage /> },
      {
        path: "/register/verification",
        element: <ComingSoonPage section="verification" />,
      },
      ...(import.meta.env.DEV
        ? [{ path: "/dev/components", element: <ComponentsPage /> }]
        : []),
      { path: "/orders", element: <Navigate to="/dashboard/orders" replace /> },
      { path: "/products", element: <Navigate to="/dashboard/products" replace /> },
      { path: "/finance", element: <Navigate to="/dashboard/finance" replace /> },
      { path: "/trust", element: <Navigate to="/dashboard/trust" replace /> },
      { path: "/settings", element: <Navigate to="/dashboard/settings" replace /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
