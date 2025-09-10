// front/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import { Brain } from "lucide-react";

export default function LoginPage() {
  const [showRegister, setShowRegister] = useState(false);

  const toggleForm = () => setShowRegister((prev) => !prev);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-4">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Flashify</h1>
          <p className="text-muted-foreground">Acelere seu aprendizado</p>
        </div>
        {showRegister ? (
          <RegisterForm onToggleForm={toggleForm} />
        ) : (
          <LoginForm onToggleForm={toggleForm} />
        )}
      </div>
    </div>
  );
}