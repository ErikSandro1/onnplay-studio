import React from 'react';
import { useLocation } from 'wouter';
import { Radio, Tv, Users, Mic, Sparkles, Video, Zap, Shield, Check } from 'lucide-react';

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">OnnPlay Studio</h1>
              </div>
            </div>

            {/* Nav */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/pricing')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Preços
              </button>
              <button
                onClick={() => navigate('/login-new')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={() => navigate('/login-new')}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
              >
                Começar Grátis
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-500 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Plataforma Profissional de Transmissão ao Vivo
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Transmita como um
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600"> Profissional</span>
          </h1>

          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Crie transmissões ao vivo incríveis com AI Studio Assistant, controle por voz em português e recursos profissionais que superam StreamYard e OBS.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login-new')}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-semibold text-lg"
            >
              Começar Grátis
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-semibold text-lg"
            >
              Ver Preços
            </button>
          </div>

          <p className="text-gray-500 text-sm mt-4">
            ✨ Grátis para sempre • Sem cartão de crédito • 1 hora/mês
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">AI Studio Assistant</h3>
            <p className="text-gray-400">
              Controle por voz em português. Peça para trocar câmeras, ajustar áudio e mais!
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4">
              <Tv className="w-6 h-6 text-cyan-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Multi-Plataforma</h3>
            <p className="text-gray-400">
              Transmita para YouTube, Twitch, Facebook e mais, tudo ao mesmo tempo.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Até 20 Participantes</h3>
            <p className="text-gray-400">
              Convide convidados e gerencie entrevistas ao vivo com facilidade.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Qualidade 4K</h3>
            <p className="text-gray-400">
              Transmita em até 4K com bitrate profissional e baixa latência.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center mb-4">
              <Mic className="w-6 h-6 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Mixer Profissional</h3>
            <p className="text-gray-400">
              Controle completo de áudio com EQ, compressor e efeitos em tempo real.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Controle PTZ</h3>
            <p className="text-gray-400">
              Controle câmeras PTZ profissionais diretamente do estúdio.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Por que escolher OnnPlay Studio?
          </h2>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left p-4 text-gray-400 font-medium">Recurso</th>
                  <th className="text-center p-4 text-orange-500 font-bold">OnnPlay</th>
                  <th className="text-center p-4 text-gray-400 font-medium">StreamYard</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-800">
                  <td className="p-4 text-white">AI Assistant</td>
                  <td className="text-center p-4">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center p-4 text-gray-600">—</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-4 text-white">Participantes</td>
                  <td className="text-center p-4 text-orange-500 font-bold">20</td>
                  <td className="text-center p-4 text-gray-400">10</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-4 text-white">Qualidade Máxima</td>
                  <td className="text-center p-4 text-orange-500 font-bold">4K</td>
                  <td className="text-center p-4 text-gray-400">1080p</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-4 text-white">Controle PTZ</td>
                  <td className="text-center p-4">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center p-4 text-gray-600">—</td>
                </tr>
                <tr>
                  <td className="p-4 text-white">Preço Pro/Mês</td>
                  <td className="text-center p-4 text-orange-500 font-bold">$29</td>
                  <td className="text-center p-4 text-gray-400">$39</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para transmitir como um profissional?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Comece grátis agora. Sem cartão de crédito. Faça upgrade quando quiser.
          </p>
          <button
            onClick={() => navigate('/login-new')}
            className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-semibold text-lg"
          >
            Começar Grátis Agora
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-950">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Radio className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold">OnnPlay Studio</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2024 OnnPlay Studio. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
