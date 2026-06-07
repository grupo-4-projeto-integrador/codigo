import { RouterProvider } from "react-router";
import { Toaster } from "./components/ui/sonner";
import { router } from "./routes";
import { FocusModeProvider } from "./contexts/FocusModeContext";
import { AuthProvider } from "./contexts/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <FocusModeProvider>
        <RouterProvider router={router} />
        <Toaster />
      </FocusModeProvider>
    </AuthProvider>
  );
}
