import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "sonner";

import { AuthProvider } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { PhoneCompletionModal } from "./components/PhoneCompletionModal";

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <RouterProvider router={router} />
        <PhoneCompletionModal />
        <Toaster position="top-right" richColors />
      </ChatProvider>
    </AuthProvider>
  );
}