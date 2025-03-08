'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserAuth } from '../context/AuthContext';
import { collection, query, orderBy, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  credits: number;
  admin: boolean;
  createdAt: any;
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

interface FormData {
  titulo: string;
  descricao: string;
  dificuldade: 'Fácil' | 'Médio' | 'Difícil';
  destaque: boolean;
}

interface CreditAction {
  userId: string;
  amount: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { currentUser, isAdmin } = UserAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [redacoes, setRedacoes] = useState<Redacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'usuarios' | 'redacoes' | 'temas'>('usuarios');
  const [formData, setFormData] = useState<FormData>({
    titulo: '',
    descricao: '',
    dificuldade: 'Médio',
    destaque: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [creditActions, setCreditActions] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (!isAdmin) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        // Buscar usuários
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, orderBy('createdAt', 'desc'));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData: User[] = [];
        usersSnapshot.forEach((doc) => {
          usersData.push({ id: doc.id, ...doc.data() } as User);
        });
        setUsers(usersData);

        // Buscar redações
        const redacoesRef = collection(db, 'redacoes');
        const redacoesQuery = query(redacoesRef, orderBy('createdAt', 'desc'));
        const redacoesSnapshot = await getDocs(redacoesQuery);
        const redacoesData: Redacao[] = [];
        redacoesSnapshot.forEach((doc) => {
          redacoesData.push({ id: doc.id, ...doc.data() } as Redacao);
        });
        setRedacoes(redacoesData);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, isAdmin, router]);

  const handleCreditChange = (userId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setCreditActions(prev => ({
      ...prev,
      [userId]: numValue
    }));
  };

  const handleUpdateCredits = async (userId: string, action: 'add' | 'subtract' | 'zero') => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const currentCredits = userSnap.data()?.credits || 0;
      let newCredits = currentCredits;
      
      switch (action) {
        case 'add':
          newCredits = currentCredits + (creditActions[userId] || 0);
          break;
        case 'subtract':
          newCredits = Math.max(0, currentCredits - (creditActions[userId] || 0));
          break;
        case 'zero':
          newCredits = 0;
          break;
      }
      
      await updateDoc(userRef, {
        credits: newCredits
      });

      // Atualizar a lista de usuários
      setUsers(users.map(user => {
        if (user.id === userId) {
          return { ...user, credits: newCredits };
        }
        return user;
      }));

      // Limpar o valor da ação para este usuário
      setCreditActions(prev => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });

      alert('Créditos atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar créditos:', error);
      alert('Erro ao atualizar créditos');
    }
  };

  const handleAddTema = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const temasRef = collection(db, 'temas');
      await addDoc(temasRef, {
        ...formData,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.email,
      });

      alert('Tema adicionado com sucesso!');
      setFormData({
        titulo: '',
        descricao: '',
        dificuldade: 'Médio',
        destaque: false,
      });
    } catch (error) {
      console.error('Erro ao adicionar tema:', error);
      alert('Erro ao adicionar tema. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
                onClick={() => setActiveTab('usuarios')}
                className={`${
                  activeTab === 'usuarios'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200`}
              >
                Usuários
              </button>
              <button
                onClick={() => setActiveTab('redacoes')}
                className={`${
                  activeTab === 'redacoes'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200`}
              >
                Redações
              </button>
              <button
                onClick={() => setActiveTab('temas')}
                className={`${
                  activeTab === 'temas'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200`}
              >
                Adicionar Tema
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Content */}
        {activeTab === 'usuarios' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li key={user.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt=""
                          className="h-12 w-12 rounded-full object-cover border-2 border-purple-100"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center border-2 border-purple-100">
                          <span className="text-base font-semibold text-white">
                            {user.email[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-900">
                          {user.displayName || user.email}
                        </h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-purple-600">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                        <span className="text-sm font-semibold text-purple-700">
                          {user.credits} créditos
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            value={creditActions[user.id] || ''}
                            onChange={(e) => handleCreditChange(user.id, e.target.value)}
                            className="w-24 rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-gray-900 font-medium pl-3 pr-1 py-1.5"
                            placeholder="Qtd"
                            min="0"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateCredits(user.id, 'add')}
                            disabled={!creditActions[user.id]}
                            className="inline-flex items-center p-1.5 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Adicionar créditos"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleUpdateCredits(user.id, 'subtract')}
                            disabled={!creditActions[user.id]}
                            className="inline-flex items-center p-1.5 border border-transparent rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Remover créditos"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleUpdateCredits(user.id, 'zero')}
                            className="inline-flex items-center p-1.5 border border-transparent rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            title="Zerar créditos"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'redacoes' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <ul className="divide-y divide-gray-200">
              {redacoes.map((redacao) => (
                <li
                  key={redacao.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/admin/corrigir/${redacao.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {redacao.titulo || `Redação - ${new Date(redacao.createdAt?.toDate()).toLocaleDateString()}`}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {users.find(u => u.id === redacao.userId)?.email || 'Usuário não encontrado'} - {new Date(redacao.createdAt?.toDate()).toLocaleDateString()}
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
                        <span className="text-sm font-medium text-gray-600">
                          Nota: {redacao.nota}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'temas' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Adicionar Novo Tema</h2>
              <p className="mt-1 text-sm text-gray-500">Preencha os campos abaixo para criar um novo tema de redação.</p>
            </div>
            
            <form onSubmit={handleAddTema} className="space-y-8">
              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-2">
                  <label htmlFor="titulo" className="block text-sm font-semibold text-gray-900">
                    Título do Tema
                  </label>
                  <input
                    type="text"
                    id="titulo"
                    name="titulo"
                    required
                    value={formData.titulo}
                    onChange={handleChange}
                    className="block w-full rounded-lg border-gray-300 bg-gray-50 py-3 px-4 text-gray-900 placeholder-gray-500 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base font-medium"
                    placeholder="Ex: A Importância da Educação Financeira no Brasil"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="descricao" className="block text-sm font-semibold text-gray-900">
                    Descrição Detalhada
                  </label>
                  <textarea
                    id="descricao"
                    name="descricao"
                    required
                    value={formData.descricao}
                    onChange={handleChange}
                    rows={6}
                    className="block w-full rounded-lg border-gray-300 bg-gray-50 py-3 px-4 text-gray-900 placeholder-gray-500 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base font-medium"
                    placeholder="Descreva o tema, incluindo pontos importantes a serem abordados, contexto e orientações para os alunos..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="dificuldade" className="block text-sm font-semibold text-gray-900">
                      Nível de Dificuldade
                    </label>
                    <select
                      id="dificuldade"
                      name="dificuldade"
                      value={formData.dificuldade}
                      onChange={handleChange}
                      className="block w-full rounded-lg border-gray-300 bg-gray-50 py-3 px-4 text-gray-900 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base font-medium"
                    >
                      <option value="Fácil">Fácil</option>
                      <option value="Médio">Médio</option>
                      <option value="Difícil">Difícil</option>
                    </select>
                  </div>

                  <div className="flex items-center h-full">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="destaque"
                        name="destaque"
                        checked={formData.destaque}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      <span className="ml-3 text-sm font-semibold text-gray-900">Marcar como Destaque</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`
                    inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white
                    ${submitting ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200
                  `}
                >
                  {submitting ? (
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
                      Adicionando Tema...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Adicionar Tema
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
} 