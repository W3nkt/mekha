import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

import App from "./App";
import { SellerSearchPage } from "./pages/search";

const ComingSoonPage = lazy(() =>
  import("./pages/coming-soon").then((m) => ({ default: m.ComingSoonPage })),
);
const LoginPage = lazy(() =>
  import("./pages/login").then((m) => ({ default: m.LoginPage })),
);
const ComponentsPage = lazy(() =>
  import("./pages/dev-components").then((m) => ({ default: m.ComponentsPage })),
);
const NotFoundPage = lazy(() =>
  import("./pages/404").then((m) => ({ default: m.NotFoundPage })),
);
const SellerProfilePage = lazy(() =>
  import("./pages/seller-profile").then((m) => ({
    default: m.SellerProfilePage,
  })),
);
const RegisterPhonePage = lazy(() =>
  import("./pages/register").then((m) => ({ default: m.RegisterPhonePage })),
);
const RegisterVerifyPage = lazy(() =>
  import("./pages/register").then((m) => ({ default: m.RegisterVerifyPage })),
);
const RegisterProfilePage = lazy(() =>
  import("./pages/register").then((m) => ({
    default: m.RegisterProfilePage,
  })),
);
const SellerVerificationPage = lazy(() =>
  import("./pages/seller-verification").then((m) => ({
    default: m.SellerVerificationPage,
  })),
);
const AdminVerificationsPage = lazy(() =>
  import("./pages/admin-verifications").then((m) => ({
    default: m.AdminVerificationsPage,
  })),
);
const SellerDashboardPage = lazy(() =>
  import("./pages/dashboard").then((m) => ({
    default: m.SellerDashboardPage,
  })),
);
const ProductListPage = lazy(() =>
  import("./pages/products").then((m) => ({ default: m.ProductListPage })),
);
const ProductFormPage = lazy(() =>
  import("./pages/products").then((m) => ({ default: m.ProductFormPage })),
);
const OrderEntryPage = lazy(() =>
  import("./pages/order-entry").then((m) => ({ default: m.OrderEntryPage })),
);
const DataExportPage = lazy(() =>
  import("./pages/data-export").then((m) => ({ default: m.DataExportPage })),
);

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: "/", element: <SellerSearchPage /> },
      { path: "/search", element: <SellerSearchPage /> },
      { path: "/seller/:id", element: <SellerProfilePage /> },
      { path: "/s/:id", element: <SellerProfilePage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPhonePage /> },
      { path: "/register/verify", element: <RegisterVerifyPage /> },
      { path: "/register/profile", element: <RegisterProfilePage /> },
      { path: "/seller/verify", element: <SellerVerificationPage /> },
      { path: "/dashboard", element: <SellerDashboardPage /> },
      { path: "/dashboard/products", element: <ProductListPage /> },
      { path: "/dashboard/products/new", element: <ProductFormPage /> },
      { path: "/dashboard/products/:id", element: <ProductFormPage /> },
      { path: "/dashboard/orders/new", element: <OrderEntryPage /> },
      { path: "/dashboard/settings/export", element: <DataExportPage /> },
      { path: "/admin/verifications", element: <AdminVerificationsPage /> },
      {
        path: "/register/verification",
        element: <ComingSoonPage section="verification" />,
      },
      { path: "/dev/components", element: <ComponentsPage /> },
      { path: "/orders", element: <ComingSoonPage section="orders" /> },
      { path: "/products", element: <ComingSoonPage section="products" /> },
      { path: "/finance", element: <ComingSoonPage section="finance" /> },
      { path: "/trust", element: <ComingSoonPage section="trust" /> },
      { path: "/settings", element: <ComingSoonPage section="settings" /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
