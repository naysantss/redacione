'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserAuth } from '../context/AuthContext';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { XMarkIcon, Bars3Icon, ChartBarIcon, DocumentTextIcon, BookOpenIcon } from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Tema {
  id: string;
  titulo: string;
  descricao: string;
  dificuldade: 'Fácil' | 'Médio' | 'Difícil';
  destaque?: boolean;
}

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

interface Estatisticas {
  mediaGeral: number;
  redacoesFeitas: number;
  melhorNota: number;
  ultimaNota: number;
  historicoNotas: {
    datas: string[];
    notas: number[];
  };
}

export default function Home() {
  const router = useRouter();
  const { currentUser, logout, credits, checkCredits, updateCredits } = UserAuth();
  const [activeTab, setActiveTab] = useState('temas');
  const [temas, setTemas] = useState<Tema[]>([]);
  const [temaDestaque, setTemaDestaque] = useState<Tema | null>(null);
  const [loading, setLoading] = useState(true);
  const [redacoes, setRedacoes] = useState<Redacao[]>([]);
  const [loadingRedacoes, setLoadingRedacoes] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [loadingTemaId, setLoadingTemaId] = useState<string | null>(null);
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    mediaGeral: 0,
    redacoesFeitas: 0,
    melhorNota: 0,
    ultimaNota: 0,
    historicoNotas: {
      datas: [],
      notas: []
    }
  });
  const [creditAmount, setCreditAmount] = useState<number>(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
  }, [currentUser, router]);

  useEffect(() => {
    const fetchTemas = async () => {
      try {
        const temasRef = collection(db, 'temas');
        const q = query(temasRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const temasData: Tema[] = [];
        querySnapshot.forEach((doc) => {
          const tema = { id: doc.id, ...doc.data() } as Tema;
          if (tema.destaque) {
            setTemaDestaque(tema);
          } else {
            temasData.push(tema);
          }
        });
        
        setTemas(temasData);
      } catch (error) {
        console.error('Erro ao buscar temas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemas();
  }, []);

  const fetchRedacoes = async () => {
    if (!currentUser) return;

    setLoadingRedacoes(true);
    try {
      const redacoesRef = collection(db, 'redacoes');
      const q = query(
        redacoesRef,
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const redacoesData: Redacao[] = [];
      querySnapshot.forEach((doc) => {
        redacoesData.push({ id: doc.id, ...doc.data() } as Redacao);
      });
      
      setRedacoes(redacoesData);
    } catch (error) {
      console.error('Erro ao buscar redações:', error);
    } finally {
      setLoadingRedacoes(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // Carregar redações imediatamente se estiver na aba de desempenho ou minhas redações
    if (activeTab === 'desempenho' || activeTab === 'minhas-redacoes') {
      fetchRedacoes();
    }
  }, [currentUser, router, activeTab]);

  useEffect(() => {
    const calcularEstatisticas = () => {
      if (!redacoes.length) return;

      // Atualiza redacoesFeitas com o total de redações, independente do status
      const totalRedacoes = redacoes.length;

      const redacoesCorrigidas = redacoes.filter(r => r.status === 'corrigida' && r.nota);
      if (!redacoesCorrigidas.length) {
        // Mesmo sem redações corrigidas, atualiza o total de redações
        setEstatisticas(prev => ({
          ...prev,
          redacoesFeitas: totalRedacoes,
          mediaGeral: 0,
          melhorNota: 0,
          ultimaNota: 0,
          historicoNotas: {
            datas: [],
            notas: []
          }
        }));
        return;
      }

      const notas = redacoesCorrigidas.map(r => r.nota || 0);
      const mediaGeral = Math.round(notas.reduce((a, b) => a + b, 0) / notas.length);
      const melhorNota = Math.max(...notas);
      const ultimaNota = redacoesCorrigidas[0].nota || 0;

      // Preparar dados para o gráfico
      const historicoOrdenado = redacoesCorrigidas
        .sort((a, b) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime())
        .slice(-10); // Últimas 10 redações

      const datas = historicoOrdenado.map(r => 
        new Date(r.createdAt.toDate()).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      );
      const notasOrdenadas = historicoOrdenado.map(r => r.nota || 0);

      setEstatisticas({
        mediaGeral,
        redacoesFeitas: totalRedacoes, // Usa o total de redações
        melhorNota,
        ultimaNota,
        historicoNotas: {
          datas,
          notas: notasOrdenadas
        }
      });
    };

    calcularEstatisticas();
  }, [redacoes]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 1000,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 12
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12
          }
        }
      }
    }
  };

  const chartData = {
    labels: estatisticas.historicoNotas.datas,
    datasets: [
      {
        label: 'Nota',
        data: estatisticas.historicoNotas.notas,
        borderColor: '#9333EA',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#9333EA',
        pointBorderColor: '#FFF',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2
      }
    ]
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleStartRedacao = async (temaId: string) => {
    setLoadingTemaId(temaId);
    
    try {
      const hasCredits = await checkCredits();
      
      if (!hasCredits) {
        alert('Você não possui créditos suficientes para enviar uma nova redação.');
        return;
      }

      router.push(`/redacao/novo/${temaId}`);
    } catch (error) {
      console.error('Erro ao iniciar redação:', error);
      alert('Ocorreu um erro ao iniciar a redação. Tente novamente.');
    } finally {
      setLoadingTemaId(null);
    }
  };

  const menuItems = [
    {
      name: 'Temas para Redação',
      icon: <BookOpenIcon className="w-5 h-5" />,
      tab: 'temas'
    },
    {
      name: 'Minhas Redações',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      tab: 'minhas-redacoes'
    },
    {
      name: 'Meu Desempenho',
      icon: <ChartBarIcon className="w-5 h-5" />,
      tab: 'desempenho'
    }
  ];

  const handleMenuClick = (tab: string) => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-20 transition-all duration-300 ${
        isScrolled ? 'bg-white/90 backdrop-blur-sm shadow-sm' : 'bg-white'
      }`}>
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="p-2 -ml-2 md:hidden text-gray-500 hover:text-gray-600"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              <img src="/logo.png" alt="Logo" className="h-8 w-8" />
              <h1 className="text-xl font-regular bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                Redacione
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div 
                className="group relative px-4 h-8 flex items-center bg-white border border-purple-100 rounded-full hover:border-purple-300 hover:bg-purple-50/50 transition-all duration-300 cursor-help"
              >
                <span className="text-sm font-medium text-purple-700">
                  {credits} {credits <= 1 ? 'crédito' : 'créditos'}
                </span>

                {/* Tooltip */}
                <div className="absolute left-0 -bottom-20 w-60 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <div className="bg-gray-800 rounded-lg px-4 py-2 shadow-sm">
                    <p className="text-white text-xs">
                      {credits} {credits <= 1 ? 'crédito restante' : 'créditos restantes'} neste mês
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      Não acumulativo para o próximo mês
                    </p>
                  </div>
                </div>
              </div>

              {/* Desktop Logout Button - Hidden on Mobile */}
              <div className="hidden md:block">
                <div 
                  className="group w-10 h-10 flex items-center justify-start rounded-full bg-gray-50 hover:bg-gray-100 transition-all duration-300 cursor-pointer overflow-hidden hover:w-[5.5rem] relative pl-1.5"
                  onClick={handleLogout}
                >
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Foto do perfil"
                      className="w-8 h-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-purple-700">
                        {currentUser?.email?.[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="absolute ml-1 left-10 text-sm text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Sair
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Drawer */}
      <div className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 md:hidden ${
        isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`} onClick={() => setIsDrawerOpen(false)}>
        <div 
          className={`fixed inset-y-0 left-0 w-64 bg-white transform transition-transform duration-300 ease-in-out ${
            isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Logo" className="h-8 w-8" />
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <nav className="space-y-1 px-3">
                {menuItems.map((item) => (
                  <button
                    key={item.tab}
                    onClick={() => handleMenuClick(item.tab)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === item.tab
                        ? 'bg-purple-50 text-purple-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-3 px-3">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="Foto do perfil"
                    className="w-8 h-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-purple-700">
                      {currentUser?.email?.[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="flex-1 text-left text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        {/* Desktop Tabs - Hidden on Mobile */}
        <div className="border-b border-gray-200 hidden md:block">
          <nav className="-mb-px flex space-x-8">
            {menuItems.map((item) => (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`${
                  activeTab === item.tab
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200`}
              >
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile Title */}
        <div className="md:hidden py-4">
          <h2 className="text-lg font-medium text-gray-900">
            {menuItems.find(item => item.tab === activeTab)?.name}
          </h2>
        </div>

        {/* Content based on active tab */}
        <div className="py-6">
          {activeTab === 'temas' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Temas Disponíveis</h2>
                <div className="flex gap-3">
                  <a
                    href="/FOLHA.pdf"
                    download
                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors shadow-sm hover:shadow focus:outline-none"
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
                    Folha de Redação
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {temaDestaque && (
                  <div 
                    onClick={() => handleStartRedacao(temaDestaque.id)}
                    className="col-span-full bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-[1.01] hover:shadow-xl cursor-pointer relative"
                  >
                    {loadingTemaId === temaDestaque.id && (
                      <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                      </div>
                    )}
                    <h2 className="text-xl font-semibold mb-2">Tema em Destaque</h2>
                    <p className="mb-4 text-lg">{temaDestaque.titulo}</p>
                    <p className="mb-4 text-gray-100 line-clamp-3 max-h-32">{temaDestaque.descricao}</p>
                    <div 
                      className="inline-flex bg-white text-purple-600 px-4 py-2 rounded-full font-medium hover:bg-purple-50 transition-colors shadow-sm"
                    >
                      Começar Redação
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="col-span-full flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : (
                  temas.map((tema) => (
                    <div 
                      key={tema.id} 
                      onClick={() => handleStartRedacao(tema.id)}
                      className="bg-white rounded-lg shadow p-6 flex flex-col h-[220px] hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer relative"
                    >
                      {loadingTemaId === tema.id && (
                        <div className="absolute inset-0 bg-black/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
                        </div>
                      )}
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-grow">{tema.titulo}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          tema.dificuldade === 'Fácil' ? 'bg-green-100 text-green-800' :
                          tema.dificuldade === 'Médio' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tema.dificuldade}
                        </span>
                      </div>
                      <div className="flex-grow">
                        <p className="text-gray-600 text-sm line-clamp-3">{tema.descricao}</p>
                      </div>
                      <div 
                        className="text-purple-600 hover:text-purple-700 font-medium mt-4 inline-flex items-center group text-sm"
                      >
                        Começar redação
                        <svg
                          className="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                          />
                        </svg>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'minhas-redacoes' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {loadingRedacoes ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : redacoes.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Você ainda não tem redações.</p>
                    <button
                      onClick={() => setActiveTab('temas')}
                      className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Começar uma redação →
                    </button>
                  </div>
                ) : (
                  redacoes.map((redacao) => (
                    <li key={redacao.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {redacao.titulo || `Redação - ${new Date(redacao.createdAt?.toDate()).toLocaleDateString()}`}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {new Date(redacao.createdAt?.toDate()).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            redacao.status === 'corrigida' ? 'bg-green-100 text-green-800' :
                            redacao.status === 'em_correcao' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {redacao.status === 'corrigida' ? 'Corrigida' :
                             redacao.status === 'em_correcao' ? 'Em correção' :
                             'Pendente'}
                          </span>
                          {redacao.nota && (
                            <span className="text-sm font-semibold text-purple-600">
                              {redacao.nota} pontos
                            </span>
                          )}
                          <div className="flex gap-2">
                            {redacao.arquivoUrl && (
                              <a
                                href={redacao.arquivoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors"
                              >
                                <svg
                                  className="w-4 h-4 mr-1"
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
                                Redação
                              </a>
                            )}
                            {redacao.arquivoCorrigidoUrl && redacao.status === 'corrigida' && (
                              <a
                                href={redacao.arquivoCorrigidoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 transition-colors"
                              >
                                <svg
                                  className="w-4 h-4 mr-1"
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
                                Correção
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {activeTab === 'desempenho' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Média Geral</h3>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.mediaGeral}</p>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Redações Feitas</h3>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.redacoesFeitas}</p>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Melhor Nota</h3>
                  <p className="text-2xl font-bold text-green-600">{estatisticas.melhorNota}</p>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Última Nota</h3>
                  <p className="text-2xl font-bold text-purple-600">{estatisticas.ultimaNota}</p>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Evolução das Notas</h2>
                {estatisticas.historicoNotas.notas.length > 0 ? (
                  <div className="h-64">
                    <Line options={chartOptions} data={chartData} />
                  </div>
                ) : (
                  <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Você ainda não tem redações corrigidas.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}