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
import { SellerSectionPage } from "./pages/seller-section";

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
      { path: "/dashboard/orders", element: <SellerSectionPage /> },
      { path: "/dashboard/orders/new", element: <SellerSectionPage /> },
      { path: "/dashboard/orders/:id", element: <SellerSectionPage /> },
      { path: "/dashboard/products", element: <SellerSectionPage /> },
      { path: "/dashboard/products/new", element: <SellerSectionPage /> },
      { path: "/dashboard/products/:id", element: <SellerSectionPage /> },
      { path: "/dashboard/finance", element: <SellerSectionPage /> },
      { path: "/dashboard/trust", element: <SellerSectionPage /> },
      { path: "/dashboard/settings", element: <SellerSectionPage /> },
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
