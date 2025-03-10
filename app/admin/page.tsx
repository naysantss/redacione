'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserAuth } from '../context/AuthContext';
import { collection, query, orderBy, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import FileUploaderMinimal from '../components/FileUploaderMinimal';

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
  dificuldade: 'Fácil' | 'Médio' | 'Difícil';
  destaque: boolean;
  conteudos: {
    tipo: 'texto' | 'imagem';
    texto?: string;
    imagemUrl?: string;
  }[];
}

interface CreditAction {
  userId: string;
  amount: number;
}

interface Tema {
  id: string;
  titulo: string;
  dificuldade: 'Fácil' | 'Médio' | 'Difícil';
  destaque: boolean;
  conteudos: {
    tipo: 'texto' | 'imagem';
    texto?: string;
    imagemUrl?: string;
  }[];
  createdAt: any;
  createdBy: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { currentUser, isAdmin } = UserAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [redacoes, setRedacoes] = useState<Redacao[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'usuarios' | 'redacoes' | 'temas' | 'gerenciar-temas'>('usuarios');
  const [editingTema, setEditingTema] = useState<Tema | null>(null);
  const [formData, setFormData] = useState<FormData>({
    titulo: '',
    dificuldade: 'Médio',
    destaque: false,
    conteudos: [
      { tipo: 'texto', texto: '' },
      { tipo: 'texto', texto: '' },
      { tipo: 'texto', texto: '' }
    ]
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

        // Buscar temas
        const temasRef = collection(db, 'temas');
        const temasQuery = query(temasRef, orderBy('createdAt', 'desc'));
        const temasSnapshot = await getDocs(temasQuery);
        const temasData: Tema[] = [];
        temasSnapshot.forEach((doc) => {
          temasData.push({ id: doc.id, ...doc.data() } as Tema);
        });
        setTemas(temasData);
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

  const handleConteudoChange = (index: number, tipo: 'texto' | 'imagem', value: string) => {
    setFormData(prev => ({
      ...prev,
      conteudos: prev.conteudos.map((conteudo, i) => {
        if (i === index) {
          return {
            tipo,
            ...(tipo === 'texto' ? { texto: value, imagemUrl: undefined } : { imagemUrl: value, texto: undefined })
          };
        }
        return conteudo;
      })
    }));
  };

  const handleAddTema = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Limpar e validar os dados antes de enviar
      const conteudosLimpos = formData.conteudos.map(conteudo => {
        if (conteudo.tipo === 'texto') {
          return {
            tipo: 'texto',
            texto: conteudo.texto || ''
          };
        } else {
          return {
            tipo: 'imagem',
            imagemUrl: conteudo.imagemUrl || ''
          };
        }
      }).filter(conteudo => {
        if (conteudo.tipo === 'texto') {
          return conteudo.texto?.trim();
        }
        return conteudo.tipo === 'imagem' && conteudo.imagemUrl;
      });

      const temaData = {
        titulo: formData.titulo.trim(),
        dificuldade: formData.dificuldade,
        destaque: formData.destaque,
        conteudos: conteudosLimpos,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.email || ''
      };

      const temasRef = collection(db, 'temas');
      await addDoc(temasRef, temaData);

      alert('Tema adicionado com sucesso!');
      setFormData({
        titulo: '',
        dificuldade: 'Médio',
        destaque: false,
        conteudos: [
          { tipo: 'texto', texto: '' },
          { tipo: 'texto', texto: '' },
          { tipo: 'texto', texto: '' }
        ]
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

  const handleDeleteTema = async (temaId: string) => {
    if (!confirm('Tem certeza que deseja excluir este tema?')) return;

    try {
      await deleteDoc(doc(db, 'temas', temaId));
      setTemas(temas.filter(tema => tema.id !== temaId));
      alert('Tema excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir tema:', error);
      alert('Erro ao excluir tema. Tente novamente.');
    }
  };

  const handleEditTema = (tema: Tema) => {
    setEditingTema(tema);
    setFormData({
      titulo: tema.titulo,
      dificuldade: tema.dificuldade,
      destaque: tema.destaque,
      conteudos: tema.conteudos
    });
    setActiveTab('temas');
  };

  const handleUpdateTema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTema) return;

    setSubmitting(true);

    try {
      const conteudosLimpos = formData.conteudos
        .map(conteudo => {
          if (conteudo.tipo === 'texto') {
            return {
              tipo: 'texto' as const,
              texto: conteudo.texto || ''
            };
          } else {
            return {
              tipo: 'imagem' as const,
              imagemUrl: conteudo.imagemUrl || ''
            };
          }
        })
        .filter(conteudo => 
          (conteudo.tipo === 'texto' && conteudo.texto?.trim()) || 
          (conteudo.tipo === 'imagem' && conteudo.imagemUrl)
        );

      const temaData = {
        titulo: formData.titulo.trim(),
        dificuldade: formData.dificuldade,
        destaque: formData.destaque,
        conteudos: conteudosLimpos,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.email || ''
      };

      await updateDoc(doc(db, 'temas', editingTema.id), temaData);

      // Atualizar a lista de temas
      setTemas(prevTemas => 
        prevTemas.map(tema => {
          if (tema.id === editingTema.id) {
            return {
              ...tema,
              ...temaData,
              id: tema.id,
              createdAt: tema.createdAt,
              createdBy: tema.createdBy
            } as Tema;
          }
          return tema;
        })
      );

      alert('Tema atualizado com sucesso!');
      setEditingTema(null);
      setFormData({
        titulo: '',
        dificuldade: 'Médio',
        destaque: false,
        conteudos: [
          { tipo: 'texto', texto: '' },
          { tipo: 'texto', texto: '' },
          { tipo: 'texto', texto: '' }
        ]
      });
    } catch (error) {
      console.error('Erro ao atualizar tema:', error);
      alert('Erro ao atualizar tema. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
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
              <button
                onClick={() => setActiveTab('gerenciar-temas')}
                className={`${
                  activeTab === 'gerenciar-temas'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200`}
              >
                Gerenciar Temas
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

        {activeTab === 'gerenciar-temas' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Temas Existentes
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Gerencie os temas de redação existentes
              </p>
            </div>
            <ul className="divide-y divide-gray-200">
              {temas.map((tema) => (
                <li key={tema.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {tema.titulo}
                      </h3>
                      <div className="mt-1 flex items-center gap-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          tema.dificuldade === 'Fácil' ? 'bg-green-100 text-green-800' :
                          tema.dificuldade === 'Médio' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tema.dificuldade}
                        </span>
                        {tema.destaque && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                            Destaque
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          Criado em {new Date(tema.createdAt?.toDate()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditTema(tema)}
                        className="inline-flex items-center p-2 border border-transparent rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        title="Editar tema"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTema(tema.id)}
                        className="inline-flex items-center p-2 border border-transparent rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        title="Excluir tema"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
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
              <h2 className="text-2xl font-bold text-gray-900">
                {editingTema ? 'Editar Tema' : 'Adicionar Novo Tema'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {editingTema 
                  ? 'Atualize os campos abaixo para modificar o tema de redação.'
                  : 'Preencha os campos abaixo para criar um novo tema de redação.'}
              </p>
            </div>
            
            <form onSubmit={editingTema ? handleUpdateTema : handleAddTema} className="space-y-8">
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

                {formData.conteudos.map((conteudo, index) => (
                  <div key={index} className="space-y-4 p-6 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">Conteúdo {index + 1}</h3>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            checked={conteudo.tipo === 'texto'}
                            onChange={() => handleConteudoChange(index, 'texto', '')}
                            className="form-radio text-purple-600"
                          />
                          <span className="ml-2 text-sm text-gray-700">Texto</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            checked={conteudo.tipo === 'imagem'}
                            onChange={() => handleConteudoChange(index, 'imagem', '')}
                            className="form-radio text-purple-600"
                          />
                          <span className="ml-2 text-sm text-gray-700">Imagem</span>
                        </label>
                      </div>
                    </div>

                    {conteudo.tipo === 'texto' ? (
                      <textarea
                        value={conteudo.texto || ''}
                        onChange={(e) => handleConteudoChange(index, 'texto', e.target.value)}
                        rows={4}
                        className="block w-full rounded-lg border-gray-300 bg-gray-50 py-3 px-4 text-gray-900 placeholder-gray-500 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base font-medium"
                        placeholder="Digite o texto de apoio..."
                      />
                    ) : (
                      <div>
                        <FileUploaderMinimal
                          pubkey="5bceb696ca30c929948e"
                          multiple={false}
                          imgOnly
                          classNameUploader={'uc-light uc-purple'}
                          onChange={(info) => {
                            handleConteudoChange(index, 'imagem', info.cdnUrl);
                          }}
                        />
                        {conteudo.imagemUrl && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Imagem enviada com sucesso!
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

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
                {editingTema && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTema(null);
                      setFormData({
                        titulo: '',
                        dificuldade: 'Médio',
                        destaque: false,
                        conteudos: [
                          { tipo: 'texto', texto: '' },
                          { tipo: 'texto', texto: '' },
                          { tipo: 'texto', texto: '' }
                        ]
                      });
                    }}
                    className="mr-4 px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
                  >
                    Cancelar
                  </button>
                )}
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
                      {editingTema ? 'Atualizando Tema...' : 'Adicionando Tema...'}
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      {editingTema ? 'Atualizar Tema' : 'Adicionar Tema'}
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