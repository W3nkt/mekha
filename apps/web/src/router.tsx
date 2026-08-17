import { createBrowserRouter } from "react-router-dom";

import App from "./App";
import { ComingSoonPage } from "./pages/coming-soon";
import { HomePage } from "./pages/index";
import { LoginPage } from "./pages/login";
import { NotFoundPage } from "./pages/404";

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/orders", element: <ComingSoonPage section="orders" /> },
      { path: "/products", element: <ComingSoonPage section="products" /> },
      { path: "/finance", element: <ComingSoonPage section="finance" /> },
      { path: "/trust", element: <ComingSoonPage section="trust" /> },
      { path: "/settings", element: <ComingSoonPage section="settings" /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
