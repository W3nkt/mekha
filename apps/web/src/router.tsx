import { createBrowserRouter } from "react-router-dom";

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
import { SellerDashboardPage } from "./pages/dashboard";
import { ProductFormPage, ProductListPage } from "./pages/products";
import { OrderEntryPage } from "./pages/order-entry";
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
