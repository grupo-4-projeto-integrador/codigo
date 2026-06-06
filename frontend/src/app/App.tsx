import { RouterProvider } from "react-router";
import { Toaster } from "./components/ui/sonner";
import { router } from "./routes";
import { FocusModeProvider } from "./contexts/FocusModeContext";

export default function App() {
  return (
    <FocusModeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </FocusModeProvider>
  );
}
