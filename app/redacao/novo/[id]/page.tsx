'use client';

import { Suspense } from 'react';
import NovaRedacaoForm from './NovaRedacaoForm';
import { use } from 'react';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-600 border-t-transparent mb-4"></div>
        <p className="text-gray-600">Carregando editor...</p>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

function NovaRedacaoWrapper({ params }: PageProps) {
  const resolvedParams = use(params);
  return <NovaRedacaoForm id={resolvedParams.id} />;
}

export default function Page({ params }: PageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NovaRedacaoWrapper params={params} />
    </Suspense>
  );
} 