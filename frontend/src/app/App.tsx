import { RouterProvider } from "react-router";
import { Toaster } from "./components/ui/sonner";
import { router } from "./routes";
import { AuthProvider } from "./contexts/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  );
}
