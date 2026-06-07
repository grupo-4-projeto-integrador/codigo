import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import logo from "../../imports/image-4.png";

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      await login(email, senha);
      navigate("/seguros");
    } catch (err: any) {
      setError("Email ou senha incorretos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100vh] bg-gray-50 dark:bg-[#0a0a0a] flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="w-[380px] bg-white dark:bg-[#151515] p-8 shadow-sm border border-gray-100 dark:border-[#222222] rounded-2xl flex flex-col items-center">
        
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#c4151f] to-[#8a0f16] shadow flex items-center justify-center p-2.5 mb-6">
          <img src={logo} alt="Flamboyant" className="w-full h-full object-contain filter brightness-0 invert" />
        </div>
        
        <h2 className="text-2xl text-gray-900 dark:text-white font-[300] mb-8">
          Bem-vindo de volta
        </h2>

        <form className="w-full space-y-4" onSubmit={handleLogin}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              E-mail
            </label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ex: admin@flamboyant.com"
              required
              className="w-full bg-gray-50 dark:bg-[#0a0a0a]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Senha
            </label>
            <Input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-gray-50 dark:bg-[#0a0a0a]"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c4151f] hover:bg-[#a01119] text-white py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            
            {error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400 text-center font-medium">
                {error}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
