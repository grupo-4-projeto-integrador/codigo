import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { NewClaim } from "./pages/NewClaim";
import { ClaimDetails } from "./pages/ClaimDetails";
import { ClaimsHistory } from "./pages/ClaimsHistory";
import { StoreDirectory } from "./pages/StoreDirectory";
import { Reports } from "./pages/Reports";
import { Insurance } from "./pages/Insurance";
import { PolicyDetail } from "./pages/PolicyDetail";
import { PolicyEdit } from "./pages/PolicyEdit";
import { PolicyNew } from "./pages/PolicyNew";
import { PrivateRoute } from "./components/PrivateRoute";
import { PresentationMode } from "./components/PresentationMode";
import { GraphView } from "./components/GraphView";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: PrivateRoute,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
      { path: "dashboard", Component: Dashboard },
      { path: "novo-sinistro", Component: NewClaim },
      { path: "sinistro/:id", Component: ClaimDetails },
      { path: "historico", Component: ClaimsHistory },
      { path: "seguros", Component: Insurance },
      { path: "seguros/apolice/nova", Component: PolicyNew },
      { path: "seguros/apolice/:id", Component: PolicyDetail },
      { path: "seguros/apolice/:id/editar", Component: PolicyEdit },
      { path: "lojistas", Component: StoreDirectory },
      { path: "relatorios", Component: Reports },
        ],
      },
      { path: "apresentacao", Component: PresentationMode },
      { path: "graph", Component: GraphView },
    ],
  },
]);

