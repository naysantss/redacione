import { NextResponse } from 'next/server';
import { storage } from '@/app/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const temaId = formData.get('temaId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Verificar tamanho do arquivo (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'O arquivo deve ter no máximo 10MB' },
        { status: 400 }
      );
    }

    // Verificar tipo do arquivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use PDF ou imagens (JPG, PNG)' },
        { status: 400 }
      );
    }

    const fileExtension = file.name.split('.').pop();
    const fileName = `redacoes/${userId}/${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, fileName);

    const metadata = {
      contentType: file.type,
      customMetadata: {
        userId,
        temaId,
        originalName: file.name
      }
    };

    const buffer = await file.arrayBuffer();
    await uploadBytes(storageRef, buffer, metadata);
    const downloadURL = await getDownloadURL(storageRef);

    return NextResponse.json({ url: downloadURL });
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer upload do arquivo' },
      { status: 500 }
    );
  }
} 