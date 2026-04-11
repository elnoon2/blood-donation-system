import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "sonner";

import { AuthProvider } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </ChatProvider>
    </AuthProvider>
  );
}