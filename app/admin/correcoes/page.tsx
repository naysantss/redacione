'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

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

export default function Page() {
  const router = useRouter();
  const [redacoes, setRedacoes] = useState<Redacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRedacoes = async () => {
      try {
        const redacoesRef = collection(db, 'redacoes');
        const q = query(redacoesRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const redacoesData: Redacao[] = [];
        querySnapshot.forEach((doc) => {
          redacoesData.push({ id: doc.id, ...doc.data() } as Redacao);
        });
        
        setRedacoes(redacoesData);
      } catch (error) {
        console.error('Erro ao buscar redações:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRedacoes();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              Correções Pendentes
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : redacoes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Não há redações pendentes de correção.</p>
            </div>
          ) : (
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
                      <svg
                        className="h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
} 