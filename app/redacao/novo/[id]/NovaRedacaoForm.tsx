'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { UserAuth } from '../../../context/AuthContext';
import { collection, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { FileUploaderMinimal } from '@uploadcare/react-uploader/next';
import '@uploadcare/react-uploader/core.css';
import { MoonIcon, SunIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Tema {
  id: string;
  titulo: string;
  dificuldade: 'Fácil' | 'Médio' | 'Difícil';
  destaque?: boolean;
  conteudos: {
    tipo: 'texto' | 'imagem';
    texto?: string;
    imagemUrl?: string;
  }[];
}

interface RedacaoData {
  titulo: string;
  arquivoUrl: string;
  status: 'pendente' | 'em_correcao' | 'corrigida';
  temaId: string;
  userId: string;
  nota?: number;
}

interface NovaRedacaoFormProps {
  id: string;
}

export default function NovaRedacaoForm({ id }: NovaRedacaoFormProps) {
  const router = useRouter();
  const { currentUser, credits, updateCredits } = UserAuth();
  const [tema, setTema] = useState<Tema | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [arquivoUrl, setArquivoUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!currentUser) {
        router.push('/login');
        return;
      }

      if (!id) return;
      
      try {
        const temaDoc = await getDoc(doc(db, 'temas', id));
        if (!isMounted) return;
        
        if (temaDoc.exists()) {
          setTema({ id: temaDoc.id, ...temaDoc.data() } as Tema);
        } else {
          setError('Tema não encontrado');
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Erro ao buscar tema:', error);
        setError('Erro ao carregar o tema');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [id, currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !tema) return;
    if (!titulo.trim()) {
      setError('O título da redação não pode estar vazio');
      return;
    }

    if (credits <= 0) {
      setError('Você não possui créditos suficientes para enviar uma redação');
      return;
    }

    if (!arquivoUrl) {
      setError('Nenhum arquivo enviado');
      return;
    }

    setEnviando(true);
    setError('');

    try {
      const redacaoData: RedacaoData = {
        titulo,
        arquivoUrl,
        status: 'pendente',
        temaId: tema.id,
        userId: currentUser.uid,
      };

      const redacoesRef = collection(db, 'redacoes');
      await addDoc(redacoesRef, {
        ...redacaoData,
        createdAt: serverTimestamp(),
      });

      await updateCredits(credits - 1);

      alert('Redação enviada com sucesso!');
      router.push('/');
    } catch (error) {
      console.error('Erro ao enviar redação:', error);
      setError(error instanceof Error ? error.message : 'Erro ao enviar redação');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !tema) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Tema não encontrado'}</p>
          <button
            onClick={() => router.push('/')}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Voltar para a página inicial
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      {/* Header */}
      <header className={`${
        darkMode 
          ? isScrolled ? 'bg-gray-800/80 backdrop-blur-sm' : 'bg-gray-800'
          : isScrolled ? 'bg-white/80 backdrop-blur-sm' : 'bg-white'
        } shadow-sm fixed top-0 w-full z-10 transition-all duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/')}
              className={`${darkMode ? 'text-gray-200' : 'text-gray-600'} hover:text-purple-600 p-2`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>

            {/* Desktop Controls */}
            <div className="hidden md:flex items-center space-x-6">
              <div className={`flex items-center gap-6 px-4 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full`}>
                <button
                  onClick={() => setShowModal(true)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${
                    darkMode ? 'text-gray-200 hover:text-purple-400' : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  <InformationCircleIcon className="h-4 w-4" />
                  Texto de Apoio
                </button>

                <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />

                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${
                    darkMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  {darkMode ? (
                    <>
                      <SunIcon className="h-4 w-4" />
                      Modo Claro
                    </>
                  ) : (
                    <>
                      <MoonIcon className="h-4 w-4" />
                      Modo Escuro
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Controls */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setShowModal(true)}
                className={`p-2 rounded-full ${
                  darkMode ? 'text-gray-200 hover:text-purple-400' : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                <InformationCircleIcon className="h-5 w-5" />
              </button>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full ${
                  darkMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4">
          <div className={`${darkMode ? 'bg-gray-800/95 text-white' : 'bg-white/95 text-gray-900'} rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col backdrop-blur-sm m-4`}>
            <div className="flex justify-between items-start p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold">Texto de Apoio</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {tema.conteudos
                .filter(conteudo => 
                  (conteudo.tipo === 'texto' && conteudo.texto?.trim()) || 
                  (conteudo.tipo === 'imagem' && conteudo.imagemUrl)
                )
                .map((conteudo, index) => (
                  <div key={index} className="space-y-4">
                    <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Texto {index + 1}
                    </h3>
                    {conteudo.tipo === 'imagem' && conteudo.imagemUrl && (
                      <div className="relative w-full rounded-lg overflow-hidden group">
                        <div className="aspect-[16/9]">
                          <img
                            src={conteudo.imagemUrl}
                            alt={`Imagem ${index + 1} do tema`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <button
                          onClick={() => setShowFullImage(true)}
                          className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
                          title="Ampliar imagem"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                          </svg>
                        </button>
                        <div 
                          onClick={() => setShowFullImage(true)}
                          className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors cursor-pointer"
                        />
                      </div>
                    )}
                    {conteudo.tipo === 'texto' && conteudo.texto && (
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed whitespace-pre-wrap text-sm sm:text-base`}>
                        {conteudo.texto}
                      </p>
                    )}
                  </div>
                ))}
            </div>
            <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm hover:bg-purple-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Imagem em Tela Cheia */}
      {showFullImage && tema.conteudos.some(c => c.tipo === 'imagem' && c.imagemUrl) && (
        <div 
          className="fixed inset-0 bg-black z-[60] flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-8 w-8" />
          </button>
          <div 
            className="w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={tema.conteudos.find(c => c.tipo === 'imagem' && c.imagemUrl)?.imagemUrl}
              alt="Imagem do tema em tela cheia"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className={`text-center font-light text-xl sm:text-2xl mb-6 sm:mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {tema.titulo}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className={`max-w-2xl mx-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg rounded-lg overflow-hidden`}>
              <div className="p-4 sm:p-8">
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título da sua redação"
                  className={`w-full text-lg sm:text-xl font-semibold mb-6 border-0 ${
                    darkMode 
                      ? 'bg-gray-800 text-white placeholder-gray-500' 
                      : 'bg-white text-gray-900 placeholder-gray-400'
                  } focus:ring-0 focus:outline-none`}
                  required
                />

                <div>
                  <FileUploaderMinimal
                    pubkey="5bceb696ca30c929948e"
                    multiple={false}
                    imgOnly
                    classNameUploader={darkMode ? 'uc-dark uc-purple' : 'uc-light uc-purple'}
                    onChange={(info) => {
                      const url = info.allEntries[0].cdnUrl;
                      console.log('URL do arquivo:', url);
                      setArquivoUrl(url);
                    }}
                  />
                  {arquivoUrl && (
                    <p className={`mt-4 text-sm sm:text-base ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      Arquivo enviado com sucesso!
                    </p>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-center text-sm">{error}</p>
            )}

            {/* Submit Button */}
            <div className="fixed bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-20 w-full px-4 sm:px-0 sm:w-auto">
              <button
                type="submit"
                disabled={enviando || !arquivoUrl}
                className={`
                  w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-3 rounded-full shadow-lg text-sm font-medium text-white
                  ${(enviando || !arquivoUrl)
                    ? 'bg-purple-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                  }
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
                  transition-all duration-200 ease-in-out
                  ${darkMode ? 'shadow-purple-500/20' : 'shadow-purple-500/30'}
                `}
              >
                {enviando ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    Enviando...
                  </>
                ) : (
                  'Enviar Redação'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 