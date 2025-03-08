'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { FileUploaderMinimal } from '@uploadcare/react-uploader/next';
import '@uploadcare/react-uploader/core.css';

interface Redacao {
  id: string;
  titulo?: string;
  texto?: string;
  arquivoUrl?: string;
  arquivoCorrigidoUrl?: string;
  status: 'pendente' | 'em_correcao' | 'corrigida';
  temaId: string;
  userId: string;
  nota?: number;
  createdAt: any;
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function Page({ params }: PageProps) {
  const router = useRouter();
  const [redacao, setRedacao] = useState<Redacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [nota, setNota] = useState<number>(0);
  const [arquivoCorrigidoUrl, setArquivoCorrigidoUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { id } = use(params);

  useEffect(() => {
    const fetchRedacao = async () => {
      try {
        const redacaoDoc = await getDoc(doc(db, 'redacoes', id));
        if (redacaoDoc.exists()) {
          setRedacao({ id: redacaoDoc.id, ...redacaoDoc.data() } as Redacao);
          if (redacaoDoc.data().nota) {
            setNota(redacaoDoc.data().nota);
          }
          if (redacaoDoc.data().arquivoCorrigidoUrl) {
            setArquivoCorrigidoUrl(redacaoDoc.data().arquivoCorrigidoUrl);
          }
        } else {
          setError('Redação não encontrada');
        }
      } catch (error) {
        console.error('Erro ao buscar redação:', error);
        setError('Erro ao carregar a redação');
      } finally {
        setLoading(false);
      }
    };

    fetchRedacao();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redacao) return;

    setEnviando(true);
    setError('');

    try {
      const redacaoRef = doc(db, 'redacoes', redacao.id);
      await updateDoc(redacaoRef, {
        status: 'corrigida',
        nota,
        arquivoCorrigidoUrl,
      });

      alert('Correção enviada com sucesso!');
      router.push('/admin/correcoes');
    } catch (error) {
      console.error('Erro ao enviar correção:', error);
      setError('Erro ao enviar correção');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !redacao) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Redação não encontrada'}</p>
          <button
            onClick={() => router.push('/admin/correcoes')}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Voltar para a lista de correções
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              Painel Administrativo
            </h1>
            <button
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-purple-600 p-2"
            >
              Voltar para Home
            </button>
          </div>
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => router.push('/admin')}
                className="whitespace-nowrap py-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm transition-all duration-200"
              >
                Usuários
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="whitespace-nowrap py-3 px-1 border-b-2 border-purple-500 text-purple-600 font-medium text-sm transition-all duration-200"
              >
                Redações
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="whitespace-nowrap py-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm transition-all duration-200"
              >
                Adicionar Tema
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center text-gray-600 hover:text-purple-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Voltar para lista de redações
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              {redacao.titulo || `Redação - ${new Date(redacao.createdAt?.toDate()).toLocaleDateString()}`}
            </h2>
            <p className="text-sm text-gray-500">
              Data de envio: {new Date(redacao.createdAt?.toDate()).toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-6">
            {redacao.arquivoUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Redação do Aluno</h3>
                <a
                  href={redacao.arquivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Visualizar Redação
                </a>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-2">
                  <label htmlFor="nota" className="block text-sm font-semibold text-gray-900">
                    Nota da Redação
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="nota"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={nota}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d+$/.test(value)) {
                          const numValue = parseInt(value) || 0;
                          setNota(Math.min(1000, Math.max(0, numValue)));
                        }
                      }}
                      className="block w-full rounded-lg border-gray-300 bg-gray-50 py-3 px-4 text-gray-900 placeholder-gray-500 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base font-medium"
                      placeholder="Digite a nota (0-1000)"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <span className="text-sm text-gray-500">/ 1000</span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Atribua uma nota entre 0 e 1000 para a redação
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    Upload da Redação Corrigida
                  </label>
                  <div className="mt-1">
                    <FileUploaderMinimal
                      pubkey="5bceb696ca30c929948e"
                      multiple={false}
                      imgOnly
                      classNameUploader={'uc-light uc-purple'}
                      onChange={(info) => {
                        const url = info.allEntries[0].cdnUrl;
                        setArquivoCorrigidoUrl(url);
                      }}
                    />
                    {arquivoCorrigidoUrl && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Arquivo de correção enviado com sucesso!
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Faça o upload da redação com suas correções e comentários
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end pt-6">
                <button
                  type="submit"
                  disabled={enviando || !arquivoCorrigidoUrl}
                  className={`
                    inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white
                    ${enviando || !arquivoCorrigidoUrl ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200
                  `}
                >
                  {enviando ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Enviando Correção...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Enviar Correção
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
} 