import { lazy, type ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import App from "./App";

const lazyPage = <T extends Record<string, unknown>, K extends keyof T>(
  loader: () => Promise<T>,
  exportName: K,
) =>
  lazy(async () => ({
    default: (await loader())[exportName] as ComponentType<any>,
  }));

const ComingSoonPage = lazyPage(() => import("./pages/coming-soon"), "ComingSoonPage");
const SellerSearchPage = lazyPage(() => import("./pages/search"), "SellerSearchPage");
const LoginPage = lazyPage(() => import("./pages/login"), "LoginPage");
const ComponentsPage = lazyPage(() => import("./pages/dev-components"), "ComponentsPage");
const NotFoundPage = lazyPage(() => import("./pages/404"), "NotFoundPage");
const SellerProfilePage = lazyPage(() => import("./pages/seller-profile"), "SellerProfilePage");
const RegisterPhonePage = lazyPage(() => import("./pages/register"), "RegisterPhonePage");
const RegisterProfilePage = lazyPage(() => import("./pages/register"), "RegisterProfilePage");
const RegisterVerifyPage = lazyPage(() => import("./pages/register"), "RegisterVerifyPage");
const SellerVerificationPage = lazyPage(() => import("./pages/seller-verification"), "SellerVerificationPage");
const AdminVerificationsPage = lazyPage(() => import("./pages/admin-verifications"), "AdminVerificationsPage");
const ReportProblemPage = lazyPage(() => import("./pages/report-problem"), "ReportProblemPage");
const DashboardTrustPage = lazyPage(() => import("./pages/dashboard-trust"), "DashboardTrustPage");
const SellerDashboardPage = lazyPage(() => import("./pages/dashboard"), "SellerDashboardPage");
const ProductFormPage = lazyPage(() => import("./pages/products"), "ProductFormPage");
const ProductListPage = lazyPage(() => import("./pages/products"), "ProductListPage");
const OrderEntryPage = lazyPage(() => import("./pages/order-entry"), "OrderEntryPage");
const OrderDetailPage = lazyPage(() => import("./pages/orders"), "OrderDetailPage");
const OrderListPage = lazyPage(() => import("./pages/orders"), "OrderListPage");
const CustomerDetailPage = lazyPage(() => import("./pages/customers"), "CustomerDetailPage");
const CustomerListPage = lazyPage(() => import("./pages/customers"), "CustomerListPage");
const FinancePage = lazyPage(() => import("./pages/finance"), "FinancePage");
const SettingsPage = lazyPage(() => import("./pages/settings"), "SettingsPage");
const DataExportPage = lazyPage(() => import("./pages/data-export"), "DataExportPage");
const SafeOrderCreatePage = lazyPage(() => import("./pages/safe-order"), "SafeOrderCreatePage");
const SafeOrderPage = lazyPage(() => import("./pages/safe-order"), "SafeOrderPage");
const TrackOrderPage = lazyPage(() => import("./pages/track-order"), "TrackOrderPage");

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
      { path: "/track", element: <TrackOrderPage /> },
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
